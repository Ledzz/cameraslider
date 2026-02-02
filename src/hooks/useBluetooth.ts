import { useState, useCallback, useEffect, useRef } from 'react';

// BLE UUIDs - these should match your slider's firmware
const SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const COMMAND_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef1';
const POSITION_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef2';

export interface SliderCommand {
  type: 'timelapse1' | 'timelapse2' | 'move1' | 'stop' | 'free' | 'calibrate' | 'settings' | 'nextStep' | 'goto';
  pointA?: number;
  pointB?: number;
  duration?: number; // in seconds
  steps?: number;
  enabled?: boolean;
  stallLeft?: number;
  stallRight?: number;
  voltage?: number;
  power?: number;
  position?: number;
}

interface BluetoothState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  currentPosition: number;
  error: string | null;
}

const STORAGE_KEY = 'camera-slider-device';

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
  addEventListener(type: string, listener: (event: Event) => void): void;
};

export function useBluetooth() {
  const [state, setState] = useState<BluetoothState>({
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    currentPosition: 0,
    error: null,
  });

  const deviceRef = useRef<BLEDevice | null>(null);
  const commandCharRef = useRef<BLECharacteristic | null>(null);
  const positionCharRef = useRef<BLECharacteristic | null>(null);

  // Handle position notifications
  const handlePositionNotification = useCallback((event: Event) => {
    const target = event.target as unknown as BLECharacteristic | null;
    const value = target?.value;
    if (value) {
      const decoder = new TextDecoder();
      const data = decoder.decode(value);
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed.position === 'number') {
          setState(prev => ({ ...prev, currentPosition: parsed.position }));
        }
      } catch {
        // Try parsing as plain number
        const position = parseFloat(data);
        if (!isNaN(position)) {
          setState(prev => ({ ...prev, currentPosition: position }));
        }
      }
    }
  }, []);

  // Handle device disconnection
  const handleDisconnection = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      deviceName: null,
      error: 'Device disconnected',
    }));
    deviceRef.current = null;
    commandCharRef.current = null;
    positionCharRef.current = null;
  }, []);

  // Connect to device
  const connect = useCallback(async () => {
    // Access Web Bluetooth API through window.navigator
    const nav = navigator as Navigator & { bluetooth?: { requestDevice(options: unknown): Promise<BLEDevice> } };
    const bluetooth = nav.bluetooth;
    
    if (!bluetooth) {
      setState(prev => ({ ...prev, error: 'Web Bluetooth is not supported in this browser' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const device = await bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });

      device.addEventListener('gattserverdisconnected', handleDisconnection);
      deviceRef.current = device;

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      const service = await server.getPrimaryService(SERVICE_UUID);
      
      // Get command characteristic
      commandCharRef.current = await service.getCharacteristic(COMMAND_CHARACTERISTIC_UUID);
      
      // Get position characteristic and subscribe to notifications
      try {
        positionCharRef.current = await service.getCharacteristic(POSITION_CHARACTERISTIC_UUID);
        await positionCharRef.current.startNotifications();
        positionCharRef.current.addEventListener('characteristicvaluechanged', handlePositionNotification);
      } catch {
        console.warn('Position characteristic not available');
      }

      // Save device info
      localStorage.setItem(STORAGE_KEY, device.name || 'Camera Slider');

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        deviceName: device.name || 'Camera Slider',
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      }));
    }
  }, [handleDisconnection, handlePositionNotification]);

  // Disconnect from device
  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    localStorage.removeItem(STORAGE_KEY);
    handleDisconnection();
  }, [handleDisconnection]);

  // Send command to slider
  const sendCommand = useCallback(async (command: SliderCommand) => {
    if (!commandCharRef.current) {
      setState(prev => ({ ...prev, error: 'Not connected to device' }));
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(command));
      await commandCharRef.current.writeValue(data);
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send command',
      }));
      return false;
    }
  }, []);

  // Check for previously connected device on mount
  useEffect(() => {
    const savedDevice = localStorage.getItem(STORAGE_KEY);
    if (savedDevice) {
      // Device was previously connected - show reconnect option
      setState(prev => ({ ...prev, deviceName: savedDevice }));
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendCommand,
  };
}
