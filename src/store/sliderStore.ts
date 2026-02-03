import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// BLE UUIDs - these should match your slider's firmware
const SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const COMMAND_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef1';
const STATUS_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef2';

export type StopBehavior = 'free' | 'hold' | 'brake';
export type PlayMode = 'ping-pong' | 'loop';
export type TriggerMode = 'button' | 'timeout';
export type ActiveMode = 'position' | 'velocity';

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
  microsteps: 1 | 4 | 16 | 32 | 64 | 128 | 256;
  voltage: 5 | 9 | 12 | 15 | 20;
  leftPointEncoder: number;
  rightPointEncoder: number;
  stopBehavior: StopBehavior;
}

export interface SliderState {
  position: number; // 0-100
  velocity: number; // 0-100
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

interface SliderStore {
  // Active mode
  activeMode: ActiveMode;
  setActiveMode: (mode: ActiveMode) => void;

  // Connection
  connection: BluetoothConnection;
  connect: () => Promise<void>;
  disconnect: () => void;

  // Slider state (from device)
  sliderState: SliderState;
  updateSliderState: (state: Partial<SliderState>) => void;

  // Settings
  settings: SliderSettings;
  updateSettings: (settings: Partial<SliderSettings>) => void;
  saveSettingsToDevice: () => Promise<boolean>;
  loadSettingsFromDevice: () => Promise<boolean>;

  // Position mode
  positionMode: PositionModeConfig;
  updatePositionMode: (config: Partial<PositionModeConfig>) => void;
  addPoint: (point: number) => void;
  removePoint: (index: number) => void;
  updatePoint: (index: number, value: number) => void;
  goToPoint: (index: number) => Promise<boolean>;
  nextPoint: () => Promise<boolean>;
  startPositionMode: () => Promise<boolean>;
  stopPositionMode: () => Promise<boolean>;

  // Velocity mode
  velocityMode: VelocityModeConfig;
  updateVelocityMode: (config: Partial<VelocityModeConfig>) => void;
  setVelocity: (speed: number) => Promise<boolean>;
  startVelocityMode: () => Promise<boolean>;
  stopVelocityMode: () => Promise<boolean>;

  // Driver control
  enableDriver: () => Promise<boolean>;
  disableDriver: () => Promise<boolean>;
  setStopBehavior: (behavior: StopBehavior) => Promise<boolean>;

  // Generic command
  sendCommand: (command: Record<string, unknown>) => Promise<boolean>;
}

export const useSliderStore = create<SliderStore>()(
  persist(
    (set, get) => ({
      activeMode: 'position',
      setActiveMode: (mode) => set({ activeMode: mode }),

      connection: {
        isConnected: false,
        isConnecting: false,
        deviceName: null,
        error: null,
      },

      sliderState: {
        position: 0,
        velocity: 0,
        isMoving: false,
        stallGuardResult: 0,
        driverEnabled: false,
        driverStatus: DEFAULT_DRIVER_STATUS,
      },

      settings: {
        stallThreshold: 50,
        currentLimit: 50,
        microsteps: 16,
        voltage: 12,
        leftPointEncoder: 0,
        rightPointEncoder: 10000,
        stopBehavior: 'hold',
      },

      positionMode: {
        points: [0, 50, 100],
        playMode: 'ping-pong',
        triggerMode: 'button',
        timeout: 5,
        maxSpeed: 50,
        acceleration: 50,
        currentPointIndex: 0,
        isRunning: false,
      },

      velocityMode: {
        speed: 50,
        acceleration: 50,
        deceleration: 50,
        playMode: 'ping-pong',
        isRunning: false,
      },

      updateSliderState: (state) =>
        set((prev) => ({ sliderState: { ...prev.sliderState, ...state } })),

      updateSettings: (settings) =>
        set((prev) => ({ settings: { ...prev.settings, ...settings } })),

      updatePositionMode: (config) =>
        set((prev) => ({ positionMode: { ...prev.positionMode, ...config } })),

      updateVelocityMode: (config) =>
        set((prev) => ({ velocityMode: { ...prev.velocityMode, ...config } })),

      addPoint: (point) =>
        set((prev) => ({
          positionMode: {
            ...prev.positionMode,
            points: [...prev.positionMode.points, point].sort((a, b) => a - b),
          },
        })),

      removePoint: (index) =>
        set((prev) => ({
          positionMode: {
            ...prev.positionMode,
            points: prev.positionMode.points.filter((_, i) => i !== index),
          },
        })),

      updatePoint: (index, value) =>
        set((prev) => {
          const newPoints = [...prev.positionMode.points];
          newPoints[index] = value;
          return {
            positionMode: {
              ...prev.positionMode,
              points: newPoints.sort((a, b) => a - b),
            },
          };
        }),

      connect: async () => {
        const nav = navigator as Navigator & {
          bluetooth?: { requestDevice(options: unknown): Promise<BLEDevice> };
        };
        const bluetooth = nav.bluetooth;

        if (!bluetooth) {
          set((prev) => ({
            connection: { ...prev.connection, error: 'Web Bluetooth not supported' },
          }));
          return;
        }

        set((prev) => ({
          connection: { ...prev.connection, isConnecting: true, error: null },
        }));

        const handleDisconnection = () => {
          set({
            connection: {
              isConnected: false,
              isConnecting: false,
              deviceName: null,
              error: 'Device disconnected',
            },
          });
          deviceRef = null;
          commandCharRef = null;
          statusCharRef = null;
        };

        const handleStatusNotification = (event: Event) => {
          const target = event.target as unknown as BLECharacteristic | null;
          const value = target?.value;
          if (value) {
            const decoder = new TextDecoder();
            const data = decoder.decode(value);
            try {
              const parsed = JSON.parse(data);
              get().updateSliderState(parsed);
            } catch {
              console.warn('Failed to parse status notification');
            }
          }
        };

        try {
          const device = await bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }],
            optionalServices: [SERVICE_UUID],
          });

          device.addEventListener('gattserverdisconnected', handleDisconnection);
          deviceRef = device;

          const server = await device.gatt?.connect();
          if (!server) throw new Error('Failed to connect to GATT server');

          const service = await server.getPrimaryService(SERVICE_UUID);

          commandCharRef = await service.getCharacteristic(COMMAND_CHARACTERISTIC_UUID);

          try {
            statusCharRef = await service.getCharacteristic(STATUS_CHARACTERISTIC_UUID);
            await statusCharRef.startNotifications();
            statusCharRef.addEventListener('characteristicvaluechanged', handleStatusNotification);
          } catch {
            console.warn('Status characteristic not available');
          }

          set({
            connection: {
              isConnected: true,
              isConnecting: false,
              deviceName: device.name || 'Camera Slider',
              error: null,
            },
          });

          // Load settings from device after connection
          await get().loadSettingsFromDevice();
        } catch (error) {
          set({
            connection: {
              isConnected: false,
              isConnecting: false,
              deviceName: null,
              error: error instanceof Error ? error.message : 'Failed to connect',
            },
          });
        }
      },

      disconnect: () => {
        if (deviceRef?.gatt?.connected) {
          deviceRef.gatt.disconnect();
        }
        set({
          connection: {
            isConnected: false,
            isConnecting: false,
            deviceName: null,
            error: null,
          },
        });
        deviceRef = null;
        commandCharRef = null;
        statusCharRef = null;
      },

      sendCommand: async (command) => {
        if (!commandCharRef) {
          set((prev) => ({
            connection: { ...prev.connection, error: 'Not connected to device' },
          }));
          return false;
        }

        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify(command));
          await commandCharRef.writeValue(data);
          return true;
        } catch (error) {
          set((prev) => ({
            connection: {
              ...prev.connection,
              error: error instanceof Error ? error.message : 'Failed to send command',
            },
          }));
          return false;
        }
      },

      saveSettingsToDevice: async () => {
        const { settings, sendCommand } = get();
        return sendCommand({
          type: 'saveSettings',
          ...settings,
        });
      },

      loadSettingsFromDevice: async () => {
        const { sendCommand, updateSettings } = get();
        const success = await sendCommand({ type: 'getSettings' });
        // Settings will be received via status notification
        return success;
      },

      goToPoint: async (index) => {
        const { positionMode, sendCommand, updatePositionMode } = get();
        const point = positionMode.points[index];
        if (point === undefined) return false;
        updatePositionMode({ currentPointIndex: index });
        return sendCommand({
          type: 'goto',
          position: point,
          speed: positionMode.maxSpeed,
          acceleration: positionMode.acceleration,
        });
      },

      nextPoint: async () => {
        const { positionMode, goToPoint, updatePositionMode } = get();
        const { currentPointIndex, points, playMode } = positionMode;
        
        let nextIndex = currentPointIndex + 1;
        if (nextIndex >= points.length) {
          if (playMode === 'loop') {
            nextIndex = 0;
          } else {
            // ping-pong: reverse would be handled by firmware or we track direction
            nextIndex = points.length - 1;
          }
        }
        
        updatePositionMode({ currentPointIndex: nextIndex });
        return goToPoint(nextIndex);
      },

      startPositionMode: async () => {
        const { positionMode, sendCommand, updatePositionMode } = get();
        const success = await sendCommand({
          type: 'startPosition',
          points: positionMode.points,
          playMode: positionMode.playMode,
          triggerMode: positionMode.triggerMode,
          timeout: positionMode.timeout,
          speed: positionMode.maxSpeed,
          acceleration: positionMode.acceleration,
        });
        if (success) updatePositionMode({ isRunning: true, currentPointIndex: 0 });
        return success;
      },

      stopPositionMode: async () => {
        const { sendCommand, updatePositionMode } = get();
        const success = await sendCommand({ type: 'stop' });
        if (success) updatePositionMode({ isRunning: false });
        return success;
      },

      setVelocity: async (speed) => {
        const { velocityMode, sendCommand, updateVelocityMode } = get();
        updateVelocityMode({ speed });
        return sendCommand({
          type: 'setVelocity',
          speed,
          acceleration: velocityMode.acceleration,
          deceleration: velocityMode.deceleration,
        });
      },

      startVelocityMode: async () => {
        const { velocityMode, sendCommand, updateVelocityMode } = get();
        const success = await sendCommand({
          type: 'startVelocity',
          speed: velocityMode.speed,
          acceleration: velocityMode.acceleration,
          deceleration: velocityMode.deceleration,
          playMode: velocityMode.playMode,
        });
        if (success) updateVelocityMode({ isRunning: true });
        return success;
      },

      stopVelocityMode: async () => {
        const { sendCommand, updateVelocityMode } = get();
        const success = await sendCommand({ type: 'stop' });
        if (success) updateVelocityMode({ isRunning: false });
        return success;
      },

      enableDriver: async () => {
        return get().sendCommand({ type: 'enableDriver', enabled: true });
      },

      disableDriver: async () => {
        return get().sendCommand({ type: 'enableDriver', enabled: false });
      },

      setStopBehavior: async (behavior) => {
        const { sendCommand, updateSettings } = get();
        updateSettings({ stopBehavior: behavior });
        return sendCommand({ type: 'setStopBehavior', behavior });
      },
    }),
    {
      name: 'camera-slider-storage',
      partialize: (state) => ({
        settings: state.settings,
        positionMode: state.positionMode,
        velocityMode: state.velocityMode,
        activeMode: state.activeMode,
      }),
    }
  )
);
