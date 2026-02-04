import { create } from "zustand";
import { persist } from "zustand/middleware";

// BLE UUIDs - these should match your slider's firmware
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const COMMAND_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";
const STATUS_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef2";

enum StandstillMode {
  NORMAL = 0,
  FREEWHEELING = 1,
  STRONG_BRAKING = 2,
  BRAKING = 3,
}
export type PlayMode = "ping-pong" | "loop";
export type TriggerMode = "button" | "timeout";
export type ActiveMode = "position" | "velocity";

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

export interface SliderSettings {
  stallThreshold: number; // 0-100
  currentLimit: number; // 0-100
  pdVoltage: 1 | 4 | 16 | 32 | 64 | 128 | 256;
  voltage: 5 | 9 | 12 | 15 | 20;
  leftPoint: number; // raw encoder steps
  rightPoint: number; // raw encoder steps
  standstillMode: StandstillMode;
}

export interface SliderState {
  position: number; // 0-100 (mapped from encoder)
  positionEncoder: number; // raw encoder steps from device
  velocity: number; // 0-100 (mapped)
  velocityEncoder: number; // raw encoder steps/s from device
  isMoving: boolean;
  stallGuardResult: number;
  driverEnabled: boolean;
  driverStatus: DriverStatus;
}

export interface PositionModeConfig {
  points: number[]; // 0-100 values
  playMode: PlayMode;
  triggerMode: TriggerMode;
  timeout: number; // seconds
  maxSpeed: number; // 0-100
  acceleration: number; // 0-100
  currentPointIndex: number;
  direction: 1 | -1; // for ping-pong
  isRunning: boolean;
}

export interface VelocityModeConfig {
  speed: number; // 0-100
  acceleration: number; // 0-100
  deceleration: number; // 0-100
  playMode: PlayMode; // ping-pong or stop on stall
  isRunning: boolean;
}

export interface BluetoothConnection {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  error: string | null;
}

// Device commands - minimal set in encoder steps
export interface DeviceCommand {
  cmd:
    | "goto"
    | "velocity"
    | "stop"
    | "driver"
    | "settings"
    | "get_settings"
    | "stop_behavior";
  // goto command
  target?: number; // encoder steps
  vel?: number; // encoder steps/s
  accel?: number; // encoder steps/s²
  decel?: number; // encoder steps/s²
  // velocity command
  mode?: "ping-pong" | "stop"; // on stall behavior
  // driver command
  enable?: boolean;
  // settings command
  stall?: number;
  current?: number;
  microsteps?: number;
  voltage?: number;
  // stop behavior command
  behavior?: StandstillMode;
}

// Type definitions for Web Bluetooth API
type BLEDevice = {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<BLEServer>;
    disconnect(): void;
  };
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

type BLEServer = {
  getPrimaryService(service: string): Promise<BLEService>;
};

type BLEService = {
  getCharacteristic(characteristic: string): Promise<BLECharacteristic>;
};

type BLECharacteristic = {
  value: DataView | null;
  startNotifications(): Promise<BLECharacteristic>;
  writeValue(value: BufferSource): Promise<void>;
  readValue(): Promise<DataView>;
  addEventListener(type: string, listener: (event: Event) => void): void;
};

// BLE refs stored outside store
let deviceRef: BLEDevice | null = null;
let commandCharRef: BLECharacteristic | null = null;
let statusCharRef: BLECharacteristic | null = null;

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

// Conversion constants for speed/acceleration
const MAX_ENCODER_VELOCITY = 10000; // max encoder steps per second
const MAX_ENCODER_ACCELERATION = 1000; // max encoder steps per second²


const log = console.log;

export const autoConnect = async () => {
  try {
    log("Getting existing permitted Bluetooth devices...");
    const devices = await navigator.bluetooth.getDevices();

    log("> Got " + devices.length + " Bluetooth devices.");
    // These devices may not be powered on or in range, so scan for
    // advertisement packets from them before connecting.
    for (const device of devices) {
      connectToDevice(device);
    }
  } catch (error) {
    log("Argh! " + error);
  }
}

const connectToDevice = async (device: BluetoothDevice) => {
  const abortController = new AbortController();

  device.addEventListener(
      "advertisementreceived",
      async (event: BluetoothAdvertisingEvent) => {
        log('> Received advertisement from "' + device.name + '"...');
        // Stop watching advertisements to conserve battery life.
        abortController.abort();
        useSliderStore.setState({isConnecting: true});
        log('Connecting to GATT Server from "' + device.name + '"...');
        try {
          const server = await device.gatt?.connect();
          log('> Bluetooth device "' + device.name + " connected.");

          const service = await server?.getPrimaryService(SERVICE_UUID);
          commandCharRef = await service?.getCharacteristic(COMMAND_CHARACTERISTIC_UUID);
          statusCharRef = await service?.getCharacteristic(STATUS_CHARACTERISTIC_UUID);
          // document.getElementById("status").textContent = "Connected!";
          useSliderStore.setState({isConnecting: false});
          useSliderStore.setState({isConnected: true});

            await statusCharRef.startNotifications();
          let prevSettings=  "";
                statusCharRef.addEventListener(
                  "characteristicvaluechanged",
                    event => {
                        const target = event.target as unknown as BLECharacteristic | null;
                        const value = target?.value;
                        if (value) {
                          const decoder = new TextDecoder();
                          const data = decoder.decode(value);
                          if (prevSettings === data) {
                            return;
                          }
                          prevSettings = data;
                          try {
                            const parsed = JSON.parse(data);
                            useSliderStore.setState({sliderState: {...useSliderStore.getState().sliderState, ...parsed}});

                            console.log("characteristicvaluechanged", useSliderStore.getState().sliderState);
                          } catch {
                            console.warn("Failed to parse status notification");
                          }
                        } })

        } catch (error) {
          log("Argh! " + error);
        }
      },
      { once: true },
  );

  try {
    log('Watching advertisements from "' + device.name + '"...');
    await device.watchAdvertisements({ signal: abortController.signal });
  } catch (error) {
    log("Argh! " + error);
  }
}

export const manualConnect = async () => {
  try {
    log("Requesting any Bluetooth device...");
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        {
          services: [SERVICE_UUID],
        },
      ],
    });

    log("> Requested " + device.name);
  } catch (error) {
    log("Argh! " + error);
  }
}

export const setActiveMode = (activeMode: ActiveMode) => {
  useSliderStore.setState({activeMode})
}

// interface SliderStore {
  // // Active mode
  // activeMode: ActiveMode;
  // setActiveMode: (mode: ActiveMode) => void;
  //
  // // Connection
  // connection: BluetoothConnection;
  // connect: () => Promise<void>;
  // disconnect: () => void;
  //
  // // Slider state (from device)
  // sliderState: SliderState;
  // updateSliderState: (state: Partial<SliderState>) => void;
  //
  // // Settings
  // settings: SliderSettings;
  // updateSettings: (settings: Partial<SliderSettings>) => void;
  // saveSettingsToDevice: () => Promise<boolean>;
  // loadSettingsFromDevice: () => Promise<boolean>;
  //
  // // Position mode (app-side logic)
  // positionMode: PositionModeConfig;
  // updatePositionMode: (config: Partial<PositionModeConfig>) => void;
  // addPoint: (point: number) => void;
  // removePoint: (index: number) => void;
  // updatePoint: (index: number, value: number) => void;
  // goToPoint: (index: number) => Promise<boolean>;
  // nextPoint: () => Promise<boolean>;
  // startPositionMode: () => Promise<boolean>;
  // stopPositionMode: () => Promise<boolean>;
  //
  // // Velocity mode (app-side logic)
  // velocityMode: VelocityModeConfig;
  // updateVelocityMode: (config: Partial<VelocityModeConfig>) => void;
  // setVelocity: (speed: number) => Promise<boolean>;
  // startVelocityMode: () => Promise<boolean>;
  // stopVelocityMode: () => Promise<boolean>;
  //
  // // Device commands (minimal set)
  // sendCommand: (command: DeviceCommand) => Promise<boolean>;
  // gotoPosition: (
  //   encoderSteps: number,
  //   velocity: number,
  //   acceleration: number,
  //   deceleration: number,
  // ) => Promise<boolean>;
  // setDeviceVelocity: (
  //   velocity: number,
  //   acceleration: number,
  //   deceleration: number,
  //   mode: "ping-pong" | "stop",
  // ) => Promise<boolean>;
  // stopDevice: () => Promise<boolean>;
  // enableDriver: () => Promise<boolean>;
  // disableDriver: () => Promise<boolean>;
  // setStandstillMode: (behavior: StandstillMode) => Promise<boolean>;
  //
  // // Utility functions
  // percentToEncoder: (percent: number) => number;
  // encoderToPercent: (encoder: number) => number;
  // percentToVelocity: (percent: number) => number;
  // percentToAcceleration: (percent: number) => number;
// }

// export const connect

export const saveSettingsToDevice = () => {}
export const disconnect = () => {}
export const updateSettings = (partialSetting) => {
}
export const sendCommand = async (command: any) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(command));
      console.log('sendCommand', JSON.stringify(command));
      await commandCharRef.writeValue(data);
      return true;
    } catch (e) {
      // set((prev) => ({
      //   connection: {
      //     ...prev.connection,
      //     error:
      //       error instanceof Error
      //         ? error.message
      //         : "Failed to send command",
      //   },
      // }));
      const error =   e instanceof Error
              ? e.message
              : "Failed to send command";
      useSliderStore.setState({
        error
      })
      return false;
    }
}


export const setVelocity = async ({velocity}) => {
  await sendCommand({cmd: 'velocity', vel: velocity*MAX_ENCODER_VELOCITY})

}
export const setEnabled=async (enable: boolean) => {
  await sendCommand({cmd: 'driver', enable})

}
export const stop = async () => {
  await sendCommand({cmd: 'stop'})
}
export const useSliderStore = create()(
  persist(
    (set, get) => ({
      activeMode: "position",
      isConnected: false,
      isConnecting: false,
      error: "",

      sliderState: {
        wasStopped: false,
        stallThreshold: 50,
        currentLimit: 50,
        microsteps: 16,
        pdVoltage: 5,
        leftPoint: 0,
        rightPoint: 0,
        standstillMode: StandstillMode.NORMAL,
        position: 0,
        driverEnabled: false,
        velocity: 0,
      },
      // connection: {
      //   isConnected: false,
      //   isConnecting: false,
      //   deviceName: null,
      //   error: null,
      // },
      //
      // sliderState: {
      //   position: 0,
      //   positionEncoder: 0,
      //   velocity: 0,
      //   velocityEncoder: 0,
      //   isMoving: false,
      //   stallGuardResult: 0,
      //   driverEnabled: false,
      //   driverStatus: DEFAULT_DRIVER_STATUS,
      // },
      //
      // settings: {
      //   stallThreshold: 50,
      //   currentLimit: 50,
      //   microsteps: 16,
      //   voltage: 12,
      //   leftPoint: 0,
      //   rightPoint: 10000,
      //   standstillMode: StandstillMode.NORMAL,
      // },
      //
      // positionMode: {
      //   points: [0, 50, 100],
      //   playMode: "ping-pong",
      //   triggerMode: "button",
      //   timeout: 5,
      //   maxSpeed: 50,
      //   acceleration: 50,
      //   currentPointIndex: 0,
      //   direction: 1,
      //   isRunning: false,
      // },
      //
      velocityMode: {
        speed: 50,
      //   acceleration: 50,
      //   deceleration: 50,
      //   playMode: "ping-pong",
      //   isRunning: false,
      },
      //
      // // Utility: Convert 0-100% to encoder steps
      // percentToEncoder: (percent) => {
      //   const { leftPoint, rightPoint } = get().settings;
      //   const range = rightPoint - leftPoint;
      //   return Math.round(leftPoint + (percent / 100) * range);
      // },
      //
      // // Utility: Convert encoder steps to 0-100%
      // encoderToPercent: (encoder) => {
      //   const { leftPoint, rightPoint } = get().settings;
      //   const range = rightPoint - leftPoint;
      //   if (range === 0) return 0;
      //   return Math.max(
      //     0,
      //     Math.min(100, ((encoder - leftPoint) / range) * 100),
      //   );
      // },
      //
      // // Utility: Convert 0-100% speed to encoder velocity
      // percentToVelocity: (percent) => {
      //   return Math.round((percent / 100) * MAX_ENCODER_VELOCITY);
      // },
      //
      // // Utility: Convert 0-100% to encoder acceleration
      // percentToAcceleration: (percent) => {
      //   return Math.round((percent / 100) * MAX_ENCODER_ACCELERATION);
      // },
      //
      // updateSliderState: (state) =>
      //   set((prev) => {
      //     // If we receive raw encoder values, also update the mapped percent values
      //     const newState = { ...prev.sliderState, ...state };
      //     if (state.position !== undefined) {
      //       newState.position = get().encoderToPercent(state.position);
      //     }
      //     if (state.velocity !== undefined) {
      //       newState.velocity = Math.min(
      //         100,
      //         (Math.abs(state.velocity) / MAX_ENCODER_VELOCITY) * 100,
      //       );
      //     }
      //     return { sliderState: newState };
      //   }),
      //
      // updateSettings: (settings) =>
      //   set((prev) => ({ settings: { ...prev.settings, ...settings } })),
      //
      // updatePositionMode: (config) =>
      //   set((prev) => ({ positionMode: { ...prev.positionMode, ...config } })),
      //
      // updateVelocityMode: (config) =>
      //   set((prev) => ({ velocityMode: { ...prev.velocityMode, ...config } })),
      //
      // addPoint: (point) =>
      //   set((prev) => ({
      //     positionMode: {
      //       ...prev.positionMode,
      //       points: [...prev.positionMode.points, point].sort((a, b) => a - b),
      //     },
      //   })),
      //
      // removePoint: (index) =>
      //   set((prev) => ({
      //     positionMode: {
      //       ...prev.positionMode,
      //       points: prev.positionMode.points.filter((_, i) => i !== index),
      //     },
      //   })),
      //
      // updatePoint: (index, value) =>
      //   set((prev) => {
      //     const newPoints = [...prev.positionMode.points];
      //     newPoints[index] = value;
      //     return {
      //       positionMode: {
      //         ...prev.positionMode,
      //         points: newPoints.sort((a, b) => a - b),
      //       },
      //     };
      //   }),
      //
      // connect: async () => {
      //   const nav = navigator as Navigator & {
      //     bluetooth?: { requestDevice(options: unknown): Promise<BLEDevice> };
      //   };
      //   const bluetooth = nav.bluetooth;
      //
      //   if (!bluetooth) {
      //     set((prev) => ({
      //       connection: {
      //         ...prev.connection,
      //         error: "Web Bluetooth not supported",
      //       },
      //     }));
      //     return;
      //   }
      //
      //   set((prev) => ({
      //     connection: { ...prev.connection, isConnecting: true, error: null },
      //   }));
      //
      //   const handleDisconnection = () => {
      //     set({
      //       connection: {
      //         isConnected: false,
      //         isConnecting: false,
      //         deviceName: null,
      //         error: "Device disconnected",
      //       },
      //     });
      //     deviceRef = null;
      //     commandCharRef = null;
      //     statusCharRef = null;
      //   };
      //
      //   let prevSettings;
      //
      //   const handleStatusNotification = (event: Event) => {
      //     const target = event.target as unknown as BLECharacteristic | null;
      //     const value = target?.value;
      //     if (value) {
      //       const decoder = new TextDecoder();
      //       const data = decoder.decode(value);
      //       if (prevSettings === data) {
      //         return;
      //       }
      //       prevSettings = data;
      //       try {
      //         const parsed = JSON.parse(data);
      //         get().updateSliderState(parsed);
      //         get().updateSettings(parsed);
      //         console.log(parsed.driverEnabled);
      //         if (get().velocityMode.isRunning && parsed.wasStopped) {
      //           get().updateVelocityMode({isRunning: false})
      //         }
      //       } catch {
      //         console.warn("Failed to parse status notification");
      //       }
      //     }
      //   };
      //
      //   try {
      //     const device = await bluetooth.requestDevice({
      //       filters: [{ services: [SERVICE_UUID] }],
      //       optionalServices: [SERVICE_UUID],
      //     });
      //
      //     device.addEventListener(
      //       "gattserverdisconnected",
      //       handleDisconnection,
      //     );
      //     deviceRef = device;
      //
      //     const server = await device.gatt?.connect();
      //     if (!server) throw new Error("Failed to connect to GATT server");
      //
      //     const service = await server.getPrimaryService(SERVICE_UUID);
      //
      //     commandCharRef = await service.getCharacteristic(
      //       COMMAND_CHARACTERISTIC_UUID,
      //     );
      //
      //     try {
      //       statusCharRef = await service.getCharacteristic(
      //         STATUS_CHARACTERISTIC_UUID,
      //       );
      //       await statusCharRef.startNotifications();
      //       statusCharRef.addEventListener(
      //         "characteristicvaluechanged",
      //         handleStatusNotification,
      //       );
      //     } catch {
      //       console.warn("Status characteristic not available");
      //     }
      //
      //     set({
      //       connection: {
      //         isConnected: true,
      //         isConnecting: false,
      //         deviceName: device.name || "Camera Slider",
      //         error: null,
      //       },
      //     });
      //
      //     // Load settings from device after connection
      //     await get().loadSettingsFromDevice();
      //   } catch (error) {
      //     set({
      //       connection: {
      //         isConnected: false,
      //         isConnecting: false,
      //         deviceName: null,
      //         error:
      //           error instanceof Error ? error.message : "Failed to connect",
      //       },
      //     });
      //   }
      // },
      //
      // disconnect: () => {
      //   if (deviceRef?.gatt?.connected) {
      //     deviceRef.gatt.disconnect();
      //   }
      //   set({
      //     connection: {
      //       isConnected: false,
      //       isConnecting: false,
      //       deviceName: null,
      //       error: null,
      //     },
      //   });
      //   deviceRef = null;
      //   commandCharRef = null;
      //   statusCharRef = null;
      // },
      //
      // // Send raw command to device
      // sendCommand: async (command) => {
      //
      //   if (!commandCharRef) {
      //     set((prev) => ({
      //       connection: {
      //         ...prev.connection,
      //         error: "Not connected to device",
      //       },
      //     }));
      //     return false;
      //   }
      //
      //   try {
      //     const encoder = new TextEncoder();
      //     const data = encoder.encode(JSON.stringify(command));
      //     console.log('sendCommand', JSON.stringify(command));
      //     await commandCharRef.writeValue(data);
      //     return true;
      //   } catch (error) {
      //     set((prev) => ({
      //       connection: {
      //         ...prev.connection,
      //         error:
      //           error instanceof Error
      //             ? error.message
      //             : "Failed to send command",
      //       },
      //     }));
      //     return false;
      //   }
      // },
      //
      // // Device command: Go to position (in encoder steps)
      // gotoPosition: async (
      //   encoderSteps,
      //   velocity,
      //   acceleration,
      //   deceleration,
      // ) => {
      //   return get().sendCommand({
      //     cmd: "goto",
      //     target: encoderSteps,
      //     vel: velocity,
      //     accel: acceleration,
      //     decel: deceleration,
      //   });
      // },
      //
      // // Device command: Set velocity (in encoder steps/s)
      // setDeviceVelocity: async (velocity, acceleration, deceleration, mode) => {
      //   return get().sendCommand({
      //     cmd: "velocity",
      //     vel: velocity,
      //     accel: acceleration,
      //     decel: deceleration,
      //     mode,
      //   });
      // },
      //
      // // Device command: Stop
      // stopDevice: async () => {
      //   return get().sendCommand({ cmd: "stop" });
      // },
      //
      // saveSettingsToDevice: async () => {
      //   const { settings, sendCommand } = get();
      //   return sendCommand({
      //     cmd: "settings",
      //     ...settings
      //   });
      // },
      //
      // loadSettingsFromDevice: async () => {
      //   return get().sendCommand({ cmd: "get_settings" });
      // },
      //
      // // App-level: Go to a point by index (handles 0-100 to encoder conversion)
      // goToPoint: async (index) => {
      //   const {
      //     positionMode,
      //     percentToEncoder,
      //     percentToVelocity,
      //     percentToAcceleration,
      //     gotoPosition,
      //     updatePositionMode,
      //   } = get();
      //   const point = positionMode.points[index];
      //   if (point === undefined) return false;
      //
      //   updatePositionMode({ currentPointIndex: index });
      //
      //   const encoderTarget = percentToEncoder(point);
      //   const velocity = percentToVelocity(positionMode.maxSpeed);
      //   const acceleration = percentToAcceleration(positionMode.acceleration);
      //
      //   return gotoPosition(
      //     encoderTarget,
      //     velocity,
      //     acceleration,
      //     acceleration,
      //   );
      // },
      //
      // // App-level: Next point logic (handles ping-pong/loop)
      // nextPoint: async () => {
      //   const { positionMode, goToPoint, updatePositionMode } = get();
      //   const { currentPointIndex, points, playMode, direction } = positionMode;
      //
      //   let nextIndex = currentPointIndex + direction;
      //   let newDirection = direction;
      //
      //   if (nextIndex >= points.length) {
      //     if (playMode === "loop") {
      //       nextIndex = 0;
      //     } else {
      //       // ping-pong: reverse direction
      //       newDirection = -1;
      //       nextIndex = points.length - 2;
      //       if (nextIndex < 0) nextIndex = 0;
      //     }
      //   } else if (nextIndex < 0) {
      //     if (playMode === "loop") {
      //       nextIndex = points.length - 1;
      //     } else {
      //       // ping-pong: reverse direction
      //       newDirection = 1;
      //       nextIndex = 1;
      //       if (nextIndex >= points.length) nextIndex = 0;
      //     }
      //   }
      //
      //   updatePositionMode({
      //     currentPointIndex: nextIndex,
      //     direction: newDirection,
      //   });
      //   return goToPoint(nextIndex);
      // },
      //
      // startPositionMode: async () => {
      //   const { goToPoint, updatePositionMode } = get();
      //   updatePositionMode({
      //     isRunning: true,
      //     currentPointIndex: 0,
      //     direction: 1,
      //   });
      //   return goToPoint(0);
      // },
      //
      // stopPositionMode: async () => {
      //   const { stopDevice, updatePositionMode } = get();
      //   const success = await stopDevice();
      //   if (success) updatePositionMode({ isRunning: false });
      //   return success;
      // },
      //
      // // App-level: Set velocity (handles 0-100 to encoder conversion)
      // setVelocity: async (speed) => {
      //   const {
      //     velocityMode,
      //     percentToVelocity,
      //     percentToAcceleration,
      //     setDeviceVelocity,
      //     updateVelocityMode,
      //   } = get();
      //   updateVelocityMode({ speed });
      //
      //   const velocity = percentToVelocity(speed);
      //   const acceleration = percentToAcceleration(velocityMode.acceleration);
      //   const deceleration = percentToAcceleration(velocityMode.deceleration);
      //   const mode =
      //     velocityMode.playMode === "ping-pong" ? "ping-pong" : "stop";
      //
      //   return setDeviceVelocity(velocity, acceleration, deceleration, mode);
      // },
      //
      // startVelocityMode: async () => {
      //   const { velocityMode, setVelocity, updateVelocityMode } = get();
      //   updateVelocityMode({ isRunning: true });
      //   return setVelocity(velocityMode.speed);
      // },
      //
      // stopVelocityMode: async () => {
      //   const { stopDevice, updateVelocityMode } = get();
      //   const success = await stopDevice();
      //   if (success) updateVelocityMode({ isRunning: false });
      //   return success;
      // },
      //
      // enableDriver: async () => {
      //   return get().sendCommand({ cmd: "driver", enable: true });
      // },
      //
      // disableDriver: async () => {
      //   return get().sendCommand({ cmd: "driver", enable: false });
      // },
      //
      // setStandstillMode: async (behavior) => {
      //   const { sendCommand, updateSettings } = get();
      //   updateSettings({ standstillMode: behavior });
      //   return sendCommand({ cmd: "stop_behavior", behavior });
      // },
    }),
    {
      name: "camera-slider-storage",
      partialize: (state) => ({
        settings: state.settings,
        positionMode: state.positionMode,
        velocityMode: state.velocityMode,
        activeMode: state.activeMode,
      }),
    },
  ),
);
