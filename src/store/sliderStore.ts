import { create } from "zustand";
import { persist } from "zustand/middleware";

const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const COMMAND_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";
const STATUS_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef2";
const RESPONSE_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef3";

const DEFAULT_MAX_SPEED = 25000;
const COMMAND_TIMEOUT_MS = 2000;

export enum StandstillMode {
  NORMAL = 0,
  FREEWHEELING = 1,
  STRONG_BRAKING = 2,
  BRAKING = 3,
}

export type PlayMode = "ping-pong" | "loop";
export type TriggerMode = "button" | "timeout";
export type ActiveMode = "goto" | "timelapse1" | "timelapse2" | "move1" | "velocity";

export interface DriverStatus {
  over_temperature_warning: boolean;
  over_temperature_shutdown: boolean;
  short_to_ground_a: boolean;
  short_to_ground_b: boolean;
  low_side_short_a: boolean;
  low_side_short_b: boolean;
  open_load_a: boolean;
  open_load_b: boolean;
  over_temperature_120c: boolean;
  over_temperature_143c: boolean;
  over_temperature_150c: boolean;
  over_temperature_157c: boolean;
  current_scaling: number;
  stealth_chop_mode: boolean;
  standstill: boolean;
}

export interface SliderState {
  position: number;
  velocity: number;
  isMoving: boolean;
  homed: boolean;
  stallGuardResult: number;
  driverEnabled: boolean;
  driverStatus: DriverStatus;
  mode: string;
  sessionId: number | null;
  fw: string;
  error: string;
  target: number;
  velocityCmd: number;
  stepCount: number;
  stepsExecuted: number;
  aux2: boolean;
  encoderRejected: number;
  encoderReadErrors: number;

  currentLimit: number;
  stallThreshold: number;
  microsteps: 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256;
  pdVoltage: 5 | 12 | 15 | 20;
  standstillMode: StandstillMode;
  leftPoint: number;
  rightPoint: number;

  maxSpeed: number;
  acceleration: number;
  homingSpeed: number;
  gotoMaxVel: number;
  timelapse1Vel: number;
  timelapse2Vel: number;
  move1Vel: number;
  timelapse2DelayMs: number;
}

interface VelocityModeState {
  speed: number;
}

interface SliderStore {
  activeMode: ActiveMode;
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  sliderState: SliderState;
  velocityMode: VelocityModeState;
}

interface AckResponse {
  ok?: boolean;
  cmd?: string;
  reason?: string;
  requestId?: string;
  sessionId?: number;
  fw?: string;
  mode?: string;
  error?: string;
}

type CommandPayload = Record<string, unknown> & { cmd: string };

type PendingCommand = {
  resolve: (response: AckResponse) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const DEFAULT_DRIVER_STATUS: DriverStatus = {
  over_temperature_warning: false,
  over_temperature_shutdown: false,
  short_to_ground_a: false,
  short_to_ground_b: false,
  low_side_short_a: false,
  low_side_short_b: false,
  open_load_a: false,
  open_load_b: false,
  over_temperature_120c: false,
  over_temperature_143c: false,
  over_temperature_150c: false,
  over_temperature_157c: false,
  current_scaling: 0,
  stealth_chop_mode: false,
  standstill: true,
};

const DEFAULT_SLIDER_STATE: SliderState = {
  position: 0,
  velocity: 0,
  isMoving: false,
  homed: false,
  stallGuardResult: 0,
  driverEnabled: false,
  driverStatus: DEFAULT_DRIVER_STATUS,
  mode: "idle",
  sessionId: null,
  fw: "",
  error: "",
  target: 0,
  velocityCmd: 0,
  stepCount: 0,
  stepsExecuted: 0,
  aux2: false,
  encoderRejected: 0,
  encoderReadErrors: 0,

  currentLimit: 50,
  stallThreshold: 50,
  microsteps: 16,
  pdVoltage: 12,
  standstillMode: StandstillMode.NORMAL,
  leftPoint: 0,
  rightPoint: 10000,

  maxSpeed: DEFAULT_MAX_SPEED,
  acceleration: 180000,
  homingSpeed: 9000,
  gotoMaxVel: 8000,
  timelapse1Vel: 6000,
  timelapse2Vel: 3000,
  move1Vel: 7000,
  timelapse2DelayMs: 20,
};

let deviceRef: BluetoothDevice | null = null;
let commandCharRef: BluetoothRemoteGATTCharacteristic | null = null;
let statusCharRef: BluetoothRemoteGATTCharacteristic | null = null;
let responseCharRef: BluetoothRemoteGATTCharacteristic | null = null;

let statusListener: ((event: Event) => void) | null = null;
let responseListener: ((event: Event) => void) | null = null;
let disconnectListener: (() => void) | null = null;
let requestCounter = 0;
let currentSessionId: number | null = null;

const pendingCommands = new Map<string, PendingCommand>();

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const nextRequestId = () => {
  requestCounter += 1;
  return `req-${Date.now()}-${requestCounter}`;
};

const clearPendingCommands = (reason: string) => {
  for (const [, pending] of pendingCommands) {
    clearTimeout(pending.timeoutId);
    pending.reject(new Error(reason));
  }
  pendingCommands.clear();
};

const toUserError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const mapRawPositionToPercent = (position: number, leftPoint: number, rightPoint: number) => {
  const range = rightPoint - leftPoint;
  if (!Number.isFinite(range) || range === 0) return 0;
  return clamp(((position - leftPoint) / range) * 100, 0, 100);
};

const mapRawVelocityToPercent = (velocity: number, maxSpeed: number) => {
  const base = maxSpeed > 0 ? maxSpeed : DEFAULT_MAX_SPEED;
  return clamp((Math.abs(velocity) / base) * 100, 0, 100);
};

const onSessionChange = (nextSessionId: number) => {
  if (currentSessionId === null) {
    currentSessionId = nextSessionId;
    return;
  }

  if (currentSessionId !== nextSessionId) {
    currentSessionId = nextSessionId;
    clearPendingCommands("BLE session changed");
  }
};

const handleResponseNotification = (event: Event) => {
  const target = event.target as unknown as BluetoothRemoteGATTCharacteristic | null;
  const value = target?.value;
  if (!value) return;

  try {
    const data = new TextDecoder().decode(value.buffer);
    const parsed = JSON.parse(data) as AckResponse;

    if (typeof parsed.sessionId === "number") {
      onSessionChange(parsed.sessionId);
    }

    if (typeof parsed.sessionId === "number" || parsed.fw || parsed.mode || parsed.error) {
      useSliderStore.setState((state) => ({
        sliderState: {
          ...state.sliderState,
          sessionId:
            typeof parsed.sessionId === "number"
              ? parsed.sessionId
              : state.sliderState.sessionId,
          fw: typeof parsed.fw === "string" ? parsed.fw : state.sliderState.fw,
          mode: typeof parsed.mode === "string" ? parsed.mode : state.sliderState.mode,
          error: typeof parsed.error === "string" ? parsed.error : state.sliderState.error,
        },
      }));
    }

    if (!parsed.requestId) {
      return;
    }

    const pending = pendingCommands.get(parsed.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    pendingCommands.delete(parsed.requestId);
    pending.resolve(parsed);
  } catch {
    useSliderStore.setState({ error: "Malformed BLE response payload" });
  }
};

const applyStatusUpdate = (payload: Record<string, unknown>) => {
  useSliderStore.setState((state) => {
    const leftPoint =
      typeof payload.leftPoint === "number"
        ? payload.leftPoint
        : state.sliderState.leftPoint;
    const rightPoint =
      typeof payload.rightPoint === "number"
        ? payload.rightPoint
        : state.sliderState.rightPoint;
    const rawPosition =
      typeof payload.position === "number"
        ? payload.position
        : mapRawPositionToPercent(state.sliderState.position, leftPoint, rightPoint);
    const maxSpeed =
      typeof payload.maxSpeed === "number"
        ? payload.maxSpeed
        : state.sliderState.maxSpeed;

    const velocityFromPayload =
      typeof payload.velocity === "number"
        ? payload.velocity
        : typeof payload.velocityCmd === "number"
          ? payload.velocityCmd
          : null;

    if (typeof payload.sessionId === "number") {
      onSessionChange(payload.sessionId);
    }

    return {
      sliderState: {
        ...state.sliderState,
        ...payload,
        leftPoint,
        rightPoint,
        maxSpeed,
        position:
          typeof payload.position === "number"
            ? mapRawPositionToPercent(rawPosition, leftPoint, rightPoint)
            : state.sliderState.position,
        velocity:
          typeof velocityFromPayload === "number"
            ? mapRawVelocityToPercent(velocityFromPayload, maxSpeed)
            : state.sliderState.velocity,
        mode: typeof payload.mode === "string" ? payload.mode : state.sliderState.mode,
        sessionId:
          typeof payload.sessionId === "number"
            ? payload.sessionId
            : state.sliderState.sessionId,
        fw: typeof payload.fw === "string" ? payload.fw : state.sliderState.fw,
        error: typeof payload.error === "string" ? payload.error : state.sliderState.error,
      },
    };
  });
};

const handleStatusNotification = (event: Event) => {
  const target = event.target as unknown as BluetoothRemoteGATTCharacteristic | null;
  const value = target?.value;
  if (!value) return;

  try {
    const data = new TextDecoder().decode(value.buffer);
    const parsed = JSON.parse(data) as Record<string, unknown>;
    applyStatusUpdate(parsed);
  } catch {
    useSliderStore.setState({ error: "Malformed BLE status payload" });
  }
};

const executeCommand = async (
  command: CommandPayload,
  timeoutMs = COMMAND_TIMEOUT_MS,
): Promise<boolean> => {
  if (!commandCharRef) {
    useSliderStore.setState({ error: "Not connected to BLE device" });
    return false;
  }

  if (!responseCharRef) {
    useSliderStore.setState({ error: "BLE response characteristic unavailable" });
    return false;
  }

  const requestId = nextRequestId();
  const payload = { ...command, requestId };

  try {
    const responsePromise = new Promise<AckResponse>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingCommands.delete(requestId);
        reject(new Error("BLE command timeout"));
      }, timeoutMs);

      pendingCommands.set(requestId, { resolve, reject, timeoutId });
    });

    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    await commandCharRef.writeValue(encoded);

    const ack = await responsePromise;
    if (!ack.ok) {
      const reason = ack.reason || ack.error || "Command rejected";
      useSliderStore.setState({ error: reason });
      return false;
    }

    useSliderStore.setState({ error: "" });
    return true;
  } catch (error) {
    const message = toUserError(error, "Failed to send command");
    useSliderStore.setState({ error: message });
    return false;
  }
};

const cleanupConnection = (message?: string) => {
  if (statusCharRef && statusListener) {
    statusCharRef.removeEventListener("characteristicvaluechanged", statusListener);
  }
  if (responseCharRef && responseListener) {
    responseCharRef.removeEventListener("characteristicvaluechanged", responseListener);
  }
  if (deviceRef && disconnectListener) {
    deviceRef.removeEventListener("gattserverdisconnected", disconnectListener);
  }

  clearPendingCommands("BLE disconnected");

  commandCharRef = null;
  statusCharRef = null;
  responseCharRef = null;
  statusListener = null;
  responseListener = null;
  disconnectListener = null;
  currentSessionId = null;

  useSliderStore.setState({
    isConnected: false,
    isConnecting: false,
    error: message || "",
  });
};

const connectToDevice = async (device: BluetoothDevice) => {
  useSliderStore.setState({ isConnecting: true, error: "" });

  try {
    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error("Failed to connect to GATT server");
    }

    const service = await server.getPrimaryService(SERVICE_UUID);

    commandCharRef = await service.getCharacteristic(COMMAND_CHARACTERISTIC_UUID);
    statusCharRef = await service.getCharacteristic(STATUS_CHARACTERISTIC_UUID);
    responseCharRef = await service.getCharacteristic(RESPONSE_CHARACTERISTIC_UUID);

    if (statusListener) {
      statusCharRef.removeEventListener("characteristicvaluechanged", statusListener);
    }
    statusListener = handleStatusNotification;
    await statusCharRef.startNotifications();
    statusCharRef.addEventListener("characteristicvaluechanged", statusListener);

    if (responseListener) {
      responseCharRef.removeEventListener("characteristicvaluechanged", responseListener);
    }
    responseListener = handleResponseNotification;
    await responseCharRef.startNotifications();
    responseCharRef.addEventListener("characteristicvaluechanged", responseListener);

    if (disconnectListener) {
      device.removeEventListener("gattserverdisconnected", disconnectListener);
    }
    disconnectListener = () => {
      cleanupConnection("Device disconnected");
    };
    device.addEventListener("gattserverdisconnected", disconnectListener);

    deviceRef = device;

    const pingOk = await executeCommand({ cmd: "ping" });
    if (!pingOk) {
      throw new Error("Ping failed after connect");
    }

    useSliderStore.setState({ isConnecting: false, isConnected: true, error: "" });
  } catch (error) {
    cleanupConnection(toUserError(error, "Failed to connect"));
  }
};

export const autoConnect = async () => {
  if (!navigator.bluetooth) {
    useSliderStore.setState({ error: "Web Bluetooth not supported in this browser" });
    return;
  }

  try {
    const bluetooth = navigator.bluetooth as Bluetooth & {
      getDevices?: () => Promise<BluetoothDevice[]>;
    };

    if (!bluetooth.getDevices) {
      return;
    }

    const devices = await bluetooth.getDevices();
    for (const device of devices) {
      await connectToDevice(device);
      if (useSliderStore.getState().isConnected) {
        return;
      }
    }
  } catch (error) {
    useSliderStore.setState({ error: toUserError(error, "Auto connect failed") });
  }
};

export const manualConnect = async () => {
  if (!navigator.bluetooth) {
    useSliderStore.setState({ error: "Web Bluetooth not supported in this browser" });
    return;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });

    await connectToDevice(device);
  } catch (error) {
    useSliderStore.setState({ error: toUserError(error, "BLE device selection failed") });
  }
};

export const disconnect = () => {
  if (deviceRef?.gatt?.connected) {
    deviceRef.gatt.disconnect();
  }

  cleanupConnection();
  deviceRef = null;
};

export const setActiveMode = (activeMode: ActiveMode) => {
  useSliderStore.setState({ activeMode });
};

export const updateSettings = (partialSetting: Partial<SliderState>) => {
  useSliderStore.setState((state) => ({
    sliderState: {
      ...state.sliderState,
      ...partialSetting,
    },
  }));
};

export const saveSettingsToDevice = async () => {
  const s = useSliderStore.getState().sliderState;

  return executeCommand({
    cmd: "settings",
    currentLimit: s.currentLimit,
    microsteps: s.microsteps,
    pdVoltage: s.pdVoltage,
    standstillMode: s.standstillMode,
    maxSpeed: s.maxSpeed,
    acceleration: s.acceleration,
    homingSpeed: s.homingSpeed,
    gotoMaxVel: s.gotoMaxVel,
    timelapse1Vel: s.timelapse1Vel,
    timelapse2Vel: s.timelapse2Vel,
    move1Vel: s.move1Vel,
    timelapse2DelayMs: s.timelapse2DelayMs,
  });
};

export const setEnabled = async (enable: boolean) => {
  const success = await executeCommand({ cmd: "driver", enable });
  if (success) {
    useSliderStore.setState((state) => ({
      sliderState: {
        ...state.sliderState,
        driverEnabled: enable,
      },
    }));
  }
  return success;
};

export const setVelocity = async ({ velocity }: { velocity: number }) => {
  const clamped = clamp(velocity, 0, 100);
  const maxSpeed = useSliderStore.getState().sliderState.maxSpeed || DEFAULT_MAX_SPEED;
  const vel = Math.round((clamped / 100) * maxSpeed);

  const success = await executeCommand({ cmd: "velocity", vel });
  if (success) {
    useSliderStore.setState((state) => ({
      velocityMode: { ...state.velocityMode, speed: clamped },
    }));
  }
  return success;
};

export const stop = async () => executeCommand({ cmd: "stop" });

export const setModeIdle = async () => executeCommand({ cmd: "mode", mode: "idle" });

export const setModeFree = async () => executeCommand({ cmd: "mode", mode: "free" });

export const setAcceleration = async (acc: number) => {
  const safeAcc = Math.max(0, Math.round(acc));
  return executeCommand({ cmd: "acc", acc: safeAcc });
};

export const startCalibration = async () =>
  executeCommand({
    cmd: "mode",
    mode: "calibrating",
  });

const percentToRawTarget = (percent: number) => {
  const state = useSliderStore.getState().sliderState;
  const leftPoint = state.leftPoint;
  const rightPoint = state.rightPoint;

  if (!state.homed) {
    useSliderStore.setState({ error: "Slider is not calibrated yet." });
    return null;
  }

  if (rightPoint <= leftPoint) {
    useSliderStore.setState({
      error: "Invalid calibration range. Set left/right points first.",
    });
    return null;
  }

  const clamped = clamp(percent, 0, 100);
  return Math.round(leftPoint + ((rightPoint - leftPoint) * clamped) / 100);
};

export const goToPercent = async (percent: number, maxVel?: number) => {
  const target = percentToRawTarget(percent);
  if (target === null) {
    return false;
  }

  const payload: CommandPayload = {
    cmd: "mode",
    mode: "goto",
    target,
  };

  if (typeof maxVel === "number" && maxVel > 0) {
    payload.maxVel = maxVel;
  }

  return executeCommand(payload);
};

export const startTimelapse1 = async (params: {
  startPercent: number;
  endPercent: number;
  vel?: number;
}) => {
  const start = percentToRawTarget(params.startPercent);
  const end = percentToRawTarget(params.endPercent);
  if (start === null || end === null) {
    return false;
  }

  const payload: CommandPayload = {
    cmd: "mode",
    mode: "timelapse1",
    start,
    end,
  };

  if (typeof params.vel === "number" && params.vel > 0) {
    payload.vel = Math.round(params.vel);
  }

  return executeCommand(payload);
};

export const startTimelapse2 = async (params: {
  startPercent: number;
  endPercent: number;
  stepCount: number;
  stepIntervalMs: number;
  delay?: number;
  vel?: number;
}) => {
  const start = percentToRawTarget(params.startPercent);
  const end = percentToRawTarget(params.endPercent);
  if (start === null || end === null) {
    return false;
  }

  const safeStepCount = Math.max(1, Math.round(params.stepCount));
  const safeStepIntervalMs = Math.max(1, Math.round(params.stepIntervalMs));
  const safeDelay = Math.max(0, Math.round(params.delay ?? 20));

  const payload: CommandPayload = {
    cmd: "mode",
    mode: "timelapse2",
    start,
    end,
    stepCount: safeStepCount,
    stepIntervalMs: safeStepIntervalMs,
    delay: safeDelay,
  };

  if (typeof params.vel === "number" && params.vel > 0) {
    payload.vel = Math.round(params.vel);
  }

  return executeCommand(payload);
};

export const startMove1 = async (params?: { vel?: number }) => {
  const payload: CommandPayload = {
    cmd: "mode",
    mode: "move1",
  };

  if (typeof params?.vel === "number" && params.vel > 0) {
    payload.vel = Math.round(params.vel);
  }

  return executeCommand(payload);
};

export const useSliderStore = create<SliderStore>()(
  persist(
    () => ({
      activeMode: "goto",
      isConnected: false,
      isConnecting: false,
      error: "",
      sliderState: { ...DEFAULT_SLIDER_STATE },
      velocityMode: {
        speed: 0,
      },
    }),
    {
      name: "camera-slider-storage",
      partialize: (state) => ({
        activeMode: state.activeMode,
        sliderState: state.sliderState,
        velocityMode: state.velocityMode,
      }),
    },
  ),
);
