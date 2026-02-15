import { create } from "zustand";
import { persist } from "zustand/middleware";

const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const COMMAND_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";
const STATUS_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef2";
const RESPONSE_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef3";

const DEFAULT_MAX_SPEED = 25000;
const COMMAND_TIMEOUT_MS = 2000;
const CONNECT_PING_TIMEOUT_MS = 3000;

export enum StandstillMode {
  NORMAL = 0,
  FREEWHEELING = 1,
  STRONG_BRAKING = 2,
  BRAKING = 3,
}

export type PlayMode = "ping-pong" | "loop";
export type TriggerMode = "button" | "timeout";
export type ActiveMode = "goto" | "timelapse1" | "timelapse2" | "velocity";

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
  controlSign: number;
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
  maxSpeedLimit: number;
  acceleration: number;
  accelerationLimit: number;
  homingSpeed: number;
  gotoMaxVel: number;
  timelapse1TotalTimeMs: number;
  timelapse1PingPong: boolean;
  timelapse1Vel: number;
  timelapse2Vel: number;
  timelapse2DelayMs: number;
}

interface VelocityModeState {
  speed: number;
}

interface SliderStore {
  activeMode: ActiveMode;
  targetPercentUi: number | null;
  tl1Ui: { startPercent: number; endPercent: number } | null;
  tl2Ui: { startPercent: number; endPercent: number } | null;
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
  c?: string;
  r?: string;
  rid?: string;
  sid?: number;
  m?: string;
  e?: string;
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
  controlSign: 0,
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
  maxSpeedLimit: DEFAULT_MAX_SPEED,
  acceleration: 180000,
  accelerationLimit: 180000,
  homingSpeed: 9000,
  gotoMaxVel: 8000,
  timelapse1TotalTimeMs: 120000,
  timelapse1PingPong: false,
  timelapse1Vel: 6000,
  timelapse2Vel: 3000,
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

const resolveSinglePendingCommand = (response: AckResponse) => {
  const pendingEntries = Array.from(pendingCommands.entries());
  if (pendingEntries.length !== 1) {
    return false;
  }

  const [requestId, pending] = pendingEntries[0];
  clearTimeout(pending.timeoutId);
  pendingCommands.delete(requestId);
  pending.resolve(response);
  return true;
};

const toUserError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const pickNumber = (source: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = source[key];
    if (isNumber(value)) {
      return value;
    }
  }
  return null;
};

const pickString = (source: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = source[key];
    if (isString(value)) {
      return value;
    }
  }
  return null;
};

const pickBoolean = (source: Record<string, unknown>, keys: string[]): boolean | null => {
  for (const key of keys) {
    const value = source[key];
    if (isBoolean(value)) {
      return value;
    }
  }
  return null;
};

const isMicrostepsValue = (value: number): value is SliderState["microsteps"] =>
  [1, 2, 4, 8, 16, 32, 64, 128, 256].includes(value);

const isPdVoltageValue = (value: number): value is SliderState["pdVoltage"] =>
  [5, 12, 15, 20].includes(value);

const isStandstillModeValue = (value: number): value is StandstillMode =>
  value >= 0 && value <= 3;

const normalizeDriverStatus = (
  value: unknown,
  previous: DriverStatus,
): DriverStatus | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const next: DriverStatus = { ...previous };
  let changed = false;

  const boolKeys: Array<Exclude<keyof DriverStatus, "current_scaling">> = [
    "over_temperature_warning",
    "over_temperature_shutdown",
    "short_to_ground_a",
    "short_to_ground_b",
    "low_side_short_a",
    "low_side_short_b",
    "open_load_a",
    "open_load_b",
    "over_temperature_120c",
    "over_temperature_143c",
    "over_temperature_150c",
    "over_temperature_157c",
    "stealth_chop_mode",
    "standstill",
  ];

  for (const key of boolKeys) {
    const rawValue = raw[key as string];
    if (isBoolean(rawValue)) {
      next[key] = rawValue;
      changed = true;
    }
  }

  if (isNumber(raw.current_scaling)) {
    next.current_scaling = raw.current_scaling;
    changed = true;
  }

  return changed ? next : null;
};

const mapRawPositionToPercent = (position: number, leftPoint: number, rightPoint: number) => {
  const range = rightPoint - leftPoint;
  if (!Number.isFinite(range) || range === 0) return 0;
  return clamp(((position - leftPoint) / range) * 100, 0, 100);
};

const mapRawVelocityToPercent = (velocity: number, maxSpeed: number) => {
  const base = maxSpeed > 0 ? maxSpeed : DEFAULT_MAX_SPEED;
  return clamp((velocity / base) * 100, -100, 100);
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
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const response: AckResponse = {
      ok: pickBoolean(parsed, ["ok"]) ?? undefined,
      cmd: pickString(parsed, ["c", "cmd"]) ?? undefined,
      reason: pickString(parsed, ["r", "reason"]) ?? undefined,
      requestId: pickString(parsed, ["rid", "requestId"]) ?? undefined,
      sessionId: pickNumber(parsed, ["sid", "sessionId"]) ?? undefined,
      fw: pickString(parsed, ["fw"]) ?? undefined,
      mode: pickString(parsed, ["m", "mode"]) ?? undefined,
      error: pickString(parsed, ["e", "error"]) ?? undefined,
    };

    if (typeof response.sessionId === "number") {
      onSessionChange(response.sessionId);
    }

    if (typeof response.sessionId === "number" || response.fw || response.mode || response.error) {
      useSliderStore.setState((state) => ({
        sliderState: {
          ...state.sliderState,
          sessionId:
            typeof response.sessionId === "number"
              ? response.sessionId
              : state.sliderState.sessionId,
          fw: typeof response.fw === "string" ? response.fw : state.sliderState.fw,
          mode: typeof response.mode === "string" ? response.mode : state.sliderState.mode,
          error: typeof response.error === "string" ? response.error : state.sliderState.error,
        },
      }));
    }

    if (!response.requestId) {
      resolveSinglePendingCommand(response);
      return;
    }

    const pending = pendingCommands.get(response.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    pendingCommands.delete(response.requestId);
    pending.resolve(response);
  } catch {
    useSliderStore.setState({ error: "Malformed BLE response payload" });
  }
};

const applyStatusUpdate = (payload: Record<string, unknown>) => {
  useSliderStore.setState((state) => {
    const next: SliderState = { ...state.sliderState };

    const sessionId = pickNumber(payload, ["sid", "sessionId"]);
    if (sessionId !== null) {
      onSessionChange(sessionId);
      next.sessionId = sessionId;
    }

    const mode = pickString(payload, ["m", "mode"]);
    if (mode !== null) next.mode = mode;

    const fw = pickString(payload, ["fw"]);
    if (fw !== null) next.fw = fw;

    const error = pickString(payload, ["e", "error"]);
    if (error !== null) next.error = error;

    const leftPoint = pickNumber(payload, ["lp", "leftPoint"]);
    if (leftPoint !== null) next.leftPoint = leftPoint;

    const rightPoint = pickNumber(payload, ["rp", "rightPoint"]);
    if (rightPoint !== null) next.rightPoint = rightPoint;

    const homed = pickBoolean(payload, ["h", "homed"]);
    if (homed !== null) next.homed = homed;

    const driverEnabled = pickBoolean(payload, ["de", "driverEnabled"]);
    if (driverEnabled !== null) next.driverEnabled = driverEnabled;

    const aux2 = pickBoolean(payload, ["x2", "aux2"]);
    if (aux2 !== null) next.aux2 = aux2;

    const targetValue = pickNumber(payload, ["t", "target"]);
    if (targetValue !== null) next.target = targetValue;

    const stepCount = pickNumber(payload, ["sc", "stepCount"]);
    if (stepCount !== null) next.stepCount = stepCount;

    const stepsExecuted = pickNumber(payload, ["se", "stepsExecuted"]);
    if (stepsExecuted !== null) next.stepsExecuted = stepsExecuted;

    const controlSign = pickNumber(payload, ["controlSign"]);
    if (controlSign !== null) next.controlSign = controlSign;

    const encoderRejected = pickNumber(payload, ["encoderRejected"]);
    if (encoderRejected !== null) next.encoderRejected = encoderRejected;

    const encoderReadErrors = pickNumber(payload, ["encoderReadErrors"]);
    if (encoderReadErrors !== null) next.encoderReadErrors = encoderReadErrors;

    const stallGuardResult = pickNumber(payload, ["stallGuardResult"]);
    if (stallGuardResult !== null) next.stallGuardResult = stallGuardResult;

    const currentLimit = pickNumber(payload, ["cl", "currentLimit"]);
    if (currentLimit !== null) next.currentLimit = currentLimit;

    const stallThreshold = pickNumber(payload, ["stallThreshold"]);
    if (stallThreshold !== null) next.stallThreshold = stallThreshold;

    const microsteps = pickNumber(payload, ["ms", "microsteps"]);
    if (microsteps !== null && isMicrostepsValue(microsteps)) {
      next.microsteps = microsteps;
    }

    const pdVoltage = pickNumber(payload, ["pv", "pdVoltage"]);
    if (pdVoltage !== null && isPdVoltageValue(pdVoltage)) {
      next.pdVoltage = pdVoltage;
    }

    const standstillMode = pickNumber(payload, ["sm", "standstillMode"]);
    if (standstillMode !== null && isStandstillModeValue(standstillMode)) {
      next.standstillMode = standstillMode;
    }

    const maxSpeed = pickNumber(payload, ["mx", "maxSpeed"]);
    if (maxSpeed !== null && maxSpeed > 0) next.maxSpeed = maxSpeed;

    const maxSpeedLimit = pickNumber(payload, ["mxl", "maxSpeedLimit"]);
    if (maxSpeedLimit !== null && maxSpeedLimit > 0) next.maxSpeedLimit = maxSpeedLimit;

    const acceleration = pickNumber(payload, ["a", "acceleration"]);
    if (acceleration !== null && acceleration >= 0) {
      next.acceleration = acceleration;
    }

    const accelerationLimit = pickNumber(payload, ["al", "accelerationLimit"]);
    if (accelerationLimit !== null && accelerationLimit > 0) {
      next.accelerationLimit = accelerationLimit;
    }

    const homingSpeed = pickNumber(payload, ["hs", "homingSpeed"]);
    if (homingSpeed !== null && homingSpeed > 0) {
      next.homingSpeed = homingSpeed;
    }

    const gotoMaxVel = pickNumber(payload, ["gv", "gotoMaxVel"]);
    if (gotoMaxVel !== null && gotoMaxVel > 0) {
      next.gotoMaxVel = gotoMaxVel;
    }

    const timelapse1Vel = pickNumber(payload, ["t1v", "timelapse1Vel"]);
    if (timelapse1Vel !== null && timelapse1Vel > 0) {
      next.timelapse1Vel = timelapse1Vel;
    }

    const timelapse1TotalTimeMs = pickNumber(payload, ["t1tm", "timelapse1TotalTimeMs"]);
    if (timelapse1TotalTimeMs !== null && timelapse1TotalTimeMs > 0) {
      next.timelapse1TotalTimeMs = timelapse1TotalTimeMs;
    }

    const timelapse1PingPong = pickBoolean(payload, ["t1pp", "timelapse1PingPong"]);
    if (timelapse1PingPong !== null) {
      next.timelapse1PingPong = timelapse1PingPong;
    }

    const timelapse2Vel = pickNumber(payload, ["t2v", "timelapse2Vel"]);
    if (timelapse2Vel !== null && timelapse2Vel > 0) {
      next.timelapse2Vel = timelapse2Vel;
    }

    const timelapse2DelayMs = pickNumber(payload, ["d2", "timelapse2DelayMs"]);
    if (timelapse2DelayMs !== null && timelapse2DelayMs >= 0) {
      next.timelapse2DelayMs = timelapse2DelayMs;
    }

    const driverStatus = normalizeDriverStatus(payload.driverStatus, next.driverStatus);
    if (driverStatus) {
      next.driverStatus = driverStatus;
    }

    const rawPosition = pickNumber(payload, ["p", "position"]);
    if (rawPosition !== null) {
      next.position = mapRawPositionToPercent(rawPosition, next.leftPoint, next.rightPoint);
    }

    const rawVelocity = pickNumber(payload, ["v", "velocityCmd", "velocity"]);

    if (rawVelocity !== null) {
      next.velocityCmd = rawVelocity;
      next.velocity = mapRawVelocityToPercent(rawVelocity, next.maxSpeed);
      next.isMoving = Math.abs(rawVelocity) > 0;
    } else if (isBoolean(payload.isMoving)) {
      next.isMoving = payload.isMoving;
    }

    return {
      sliderState: next,
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

    const pingOk = await executeCommand({ cmd: "ping" }, CONNECT_PING_TIMEOUT_MS);
    useSliderStore.setState({
      isConnecting: false,
      isConnected: true,
      error: pingOk ? "" : "Ping failed after connect, continuing with status sync",
    });
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

export const setTargetPercentUi = (targetPercentUi: number | null) => {
  useSliderStore.setState({ targetPercentUi });
};

export const setTl1Ui = (startPercent: number, endPercent: number) => {
  useSliderStore.setState({
    tl1Ui: {
      startPercent: clamp(startPercent, 0, 100),
      endPercent: clamp(endPercent, 0, 100),
    },
  });
};

export const clearTl1Ui = () => {
  useSliderStore.setState({ tl1Ui: null });
};

export const setTl2Ui = (startPercent: number, endPercent: number) => {
  useSliderStore.setState({
    tl2Ui: {
      startPercent: clamp(startPercent, 0, 100),
      endPercent: clamp(endPercent, 0, 100),
    },
  });
};

export const clearTl2Ui = () => {
  useSliderStore.setState({ tl2Ui: null });
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
    timelapse1TotalTimeMs: s.timelapse1TotalTimeMs,
    timelapse1PingPong: s.timelapse1PingPong,
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
  const clamped = clamp(velocity, -100, 100);
  const maxSpeed = useSliderStore.getState().sliderState.maxSpeed || DEFAULT_MAX_SPEED;
  const vel = Math.round(((-clamped) / 100) * maxSpeed);

  const success = await executeCommand({ cmd: "velocity", vel });
  if (success) {
    useSliderStore.setState((state) => ({
      velocityMode: { ...state.velocityMode, speed: clamped },
    }));
  }
  return success;
};

export const setVelocityTarget = (velocity: number) => {
  const clamped = clamp(velocity, -100, 100);
  useSliderStore.setState((state) => ({
    velocityMode: { ...state.velocityMode, speed: clamped },
  }));
};

export const resetVelocityTarget = () => {
  useSliderStore.setState((state) => ({
    velocityMode: { ...state.velocityMode, speed: 0 },
    sliderState: {
      ...state.sliderState,
      velocity: 0,
      velocityCmd: 0,
      isMoving: false,
    },
  }));
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
  const clampedPercent = clamp(percent, 0, 100);
  setTargetPercentUi(clampedPercent);

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
  totalTimeMs: number;
  pingpong?: boolean;
}) => {
  const start = percentToRawTarget(params.startPercent);
  const end = percentToRawTarget(params.endPercent);
  if (start === null || end === null) {
    return false;
  }

  const totalTimeMs = Math.max(1, Math.round(params.totalTimeMs));

  const payload: CommandPayload = {
    cmd: "mode",
    mode: "timelapse1",
    start,
    end,
    totalTimeMs,
  };

  if (typeof params.pingpong === "boolean") {
    payload.pingpong = params.pingpong;
  }

  return executeCommand(payload);
};

export const startTimelapse2 = async (params: {
  startPercent: number;
  endPercent: number;
  stepCount: number;
  delay?: number;
}) => {
  const start = percentToRawTarget(params.startPercent);
  const end = percentToRawTarget(params.endPercent);
  if (start === null || end === null) {
    return false;
  }

  const safeStepCount = Math.max(1, Math.round(params.stepCount));
  const safeDelay = Math.max(0, Math.round(params.delay ?? 20));

  const payload: CommandPayload = {
    cmd: "mode",
    mode: "timelapse2",
    start,
    end,
    stepCount: safeStepCount,
    delay: safeDelay,
  };

  return executeCommand(payload);
};

export const useSliderStore = create<SliderStore>()(
  persist(
    () => ({
      activeMode: "goto",
      targetPercentUi: null,
      tl1Ui: null,
      tl2Ui: null,
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
