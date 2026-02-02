import { useState, useCallback, useEffect } from 'react';

export interface ModeConfig {
  pointA: number;
  pointB: number;
  duration: number; // in seconds
  steps: number;
  freeMode: boolean;
}

export interface Preset {
  id: string;
  name: string;
  mode: 'timelapse1' | 'timelapse2' | 'move1';
  config: ModeConfig;
}

export interface MotorSettings {
  stallLeft: number;
  stallRight: number;
  voltage: number;
  power: number;
}

interface SliderState {
  timelapse1: ModeConfig;
  timelapse2: ModeConfig;
  move1: ModeConfig;
  presets: Preset[];
  motorSettings: MotorSettings;
  isRunning: boolean;
  currentStep: number;
}

const DEFAULT_CONFIG: ModeConfig = {
  pointA: 0,
  pointB: 100,
  duration: 60,
  steps: 10,
  freeMode: false,
};

const DEFAULT_MOTOR_SETTINGS: MotorSettings = {
  stallLeft: 50,
  stallRight: 50,
  voltage: 12,
  power: 80,
};

const STORAGE_KEY = 'camera-slider-state';

export function useSliderState() {
  const [state, setState] = useState<SliderState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Invalid saved state
      }
    }
    return {
      timelapse1: { ...DEFAULT_CONFIG },
      timelapse2: { ...DEFAULT_CONFIG },
      move1: { ...DEFAULT_CONFIG },
      presets: [],
      motorSettings: { ...DEFAULT_MOTOR_SETTINGS },
      isRunning: false,
      currentStep: 0,
    };
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateModeConfig = useCallback((
    mode: 'timelapse1' | 'timelapse2' | 'move1',
    updates: Partial<ModeConfig>
  ) => {
    setState(prev => ({
      ...prev,
      [mode]: { ...prev[mode], ...updates },
    }));
  }, []);

  const setPointFromPosition = useCallback((
    mode: 'timelapse1' | 'timelapse2' | 'move1',
    point: 'A' | 'B',
    position: number
  ) => {
    const key = point === 'A' ? 'pointA' : 'pointB';
    updateModeConfig(mode, { [key]: position });
  }, [updateModeConfig]);

  const savePreset = useCallback((
    name: string,
    mode: 'timelapse1' | 'timelapse2' | 'move1'
  ) => {
    const preset: Preset = {
      id: Date.now().toString(),
      name,
      mode,
      config: { ...state[mode] },
    };
    setState(prev => ({
      ...prev,
      presets: [...prev.presets, preset],
    }));
  }, [state]);

  const loadPreset = useCallback((presetId: string) => {
    const preset = state.presets.find(p => p.id === presetId);
    if (preset) {
      updateModeConfig(preset.mode, preset.config);
    }
  }, [state.presets, updateModeConfig]);

  const deletePreset = useCallback((presetId: string) => {
    setState(prev => ({
      ...prev,
      presets: prev.presets.filter(p => p.id !== presetId),
    }));
  }, []);

  const updateMotorSettings = useCallback((updates: Partial<MotorSettings>) => {
    setState(prev => ({
      ...prev,
      motorSettings: { ...prev.motorSettings, ...updates },
    }));
  }, []);

  const setRunning = useCallback((isRunning: boolean) => {
    setState(prev => ({ ...prev, isRunning, currentStep: isRunning ? 0 : prev.currentStep }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const incrementStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, []);

  return {
    ...state,
    updateModeConfig,
    setPointFromPosition,
    savePreset,
    loadPreset,
    deletePreset,
    updateMotorSettings,
    setRunning,
    setCurrentStep,
    incrementStep,
  };
}
