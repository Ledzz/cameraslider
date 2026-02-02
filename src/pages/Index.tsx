import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { Timelapse1Mode } from '@/components/modes/Timelapse1Mode';
import { Timelapse2Mode } from '@/components/modes/Timelapse2Mode';
import { Move1Mode } from '@/components/modes/Move1Mode';
import { PresetManager } from '@/components/PresetManager';
import { SettingsMenu } from '@/components/settings/SettingsMenu';
import { CalibrationDialog } from '@/components/settings/CalibrationDialog';
import { MotorSettingsDialog } from '@/components/settings/MotorSettingsDialog';
import { useBluetooth } from '@/hooks/useBluetooth';
import { useSliderState } from '@/hooks/useSliderState';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { toast } = useToast();
  const bluetooth = useBluetooth();
  const sliderState = useSliderState();

  const [activeTab, setActiveTab] = useState<'timelapse1' | 'timelapse2' | 'move1'>('timelapse1');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [motorSettingsOpen, setMotorSettingsOpen] = useState(false);

  // Handle free mode toggle
  const handleFreeToggle = useCallback(async (mode: 'timelapse1' | 'timelapse2' | 'move1', enabled: boolean) => {
    sliderState.updateModeConfig(mode, { freeMode: enabled });
    if (bluetooth.isConnected) {
      await bluetooth.sendCommand({ type: 'free', enabled });
    }
  }, [bluetooth, sliderState]);

  // Handle start command
  const handleStart = useCallback(async (mode: 'timelapse1' | 'timelapse2' | 'move1') => {
    const config = sliderState[mode];
    const success = await bluetooth.sendCommand({
      type: mode,
      pointA: config.pointA,
      pointB: config.pointB,
      duration: config.duration,
      steps: config.steps,
    });
    if (success) {
      sliderState.setRunning(true);
      toast({ title: 'Started', description: `${mode} mode activated` });
    }
  }, [bluetooth, sliderState, toast]);

  // Handle stop command
  const handleStop = useCallback(async () => {
    const success = await bluetooth.sendCommand({ type: 'stop' });
    if (success) {
      sliderState.setRunning(false);
      toast({ title: 'Stopped', description: 'Movement stopped' });
    }
  }, [bluetooth, sliderState, toast]);

  // Handle next step in timelapse2
  const handleNextStep = useCallback(async () => {
    const success = await bluetooth.sendCommand({ type: 'nextStep' });
    if (success) {
      sliderState.incrementStep();
    }
  }, [bluetooth, sliderState]);

  // Handle calibration
  const handleCalibration = useCallback(async () => {
    await bluetooth.sendCommand({ type: 'calibrate' });
    toast({ title: 'Calibration Complete', description: 'Stall values updated' });
  }, [bluetooth, toast]);

  // Handle save motor settings
  const handleSaveMotorSettings = useCallback(async () => {
    const success = await bluetooth.sendCommand({
      type: 'settings',
      ...sliderState.motorSettings,
    });
    if (success) {
      toast({ title: 'Settings Saved', description: 'Motor settings applied' });
      setMotorSettingsOpen(false);
    }
  }, [bluetooth, sliderState.motorSettings, toast]);

  return (
    <div className="min-h-screen bg-background technical-grid">
      <Header
        isConnected={bluetooth.isConnected}
        isConnecting={bluetooth.isConnecting}
        deviceName={bluetooth.deviceName}
        onConnect={bluetooth.connect}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <main className="container max-w-lg mx-auto px-4 py-4">
        {/* Error Display */}
        {bluetooth.error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {bluetooth.error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-secondary">
              <TabsTrigger value="timelapse1" className="text-xs">
                Timelapse 1
              </TabsTrigger>
              <TabsTrigger value="timelapse2" className="text-xs">
                Timelapse 2
              </TabsTrigger>
              <TabsTrigger value="move1" className="text-xs">
                Move 1
              </TabsTrigger>
            </TabsList>
            <PresetManager
              presets={sliderState.presets}
              currentMode={activeTab}
              onSavePreset={(name) => sliderState.savePreset(name, activeTab)}
              onLoadPreset={sliderState.loadPreset}
              onDeletePreset={sliderState.deletePreset}
            />
          </div>

          <TabsContent value="timelapse1" className="mt-0">
            <Timelapse1Mode
              config={sliderState.timelapse1}
              currentPosition={bluetooth.currentPosition}
              isRunning={sliderState.isRunning}
              isConnected={bluetooth.isConnected}
              onConfigChange={(updates) => sliderState.updateModeConfig('timelapse1', updates)}
              onSetPointFromPosition={(point) =>
                sliderState.setPointFromPosition('timelapse1', point, bluetooth.currentPosition)
              }
              onStart={() => handleStart('timelapse1')}
              onStop={handleStop}
              onFreeToggle={(enabled) => handleFreeToggle('timelapse1', enabled)}
            />
          </TabsContent>

          <TabsContent value="timelapse2" className="mt-0">
            <Timelapse2Mode
              config={sliderState.timelapse2}
              currentPosition={bluetooth.currentPosition}
              currentStep={sliderState.currentStep}
              isRunning={sliderState.isRunning}
              isConnected={bluetooth.isConnected}
              onConfigChange={(updates) => sliderState.updateModeConfig('timelapse2', updates)}
              onSetPointFromPosition={(point) =>
                sliderState.setPointFromPosition('timelapse2', point, bluetooth.currentPosition)
              }
              onStart={() => handleStart('timelapse2')}
              onStop={handleStop}
              onNextStep={handleNextStep}
              onFreeToggle={(enabled) => handleFreeToggle('timelapse2', enabled)}
            />
          </TabsContent>

          <TabsContent value="move1" className="mt-0">
            <Move1Mode
              config={sliderState.move1}
              currentPosition={bluetooth.currentPosition}
              isRunning={sliderState.isRunning}
              isConnected={bluetooth.isConnected}
              onConfigChange={(updates) => sliderState.updateModeConfig('move1', updates)}
              onSetPointFromPosition={(point) =>
                sliderState.setPointFromPosition('move1', point, bluetooth.currentPosition)
              }
              onStart={() => handleStart('move1')}
              onStop={handleStop}
              onFreeToggle={(enabled) => handleFreeToggle('move1', enabled)}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Settings Dialogs */}
      <SettingsMenu
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onCalibrationClick={() => setCalibrationOpen(true)}
        onMotorSettingsClick={() => setMotorSettingsOpen(true)}
      />

      <CalibrationDialog
        open={calibrationOpen}
        onOpenChange={setCalibrationOpen}
        isConnected={bluetooth.isConnected}
        onStartCalibration={handleCalibration}
        onSaveManualValues={(stallLeft, stallRight) =>
          sliderState.updateMotorSettings({ stallLeft, stallRight })
        }
      />

      <MotorSettingsDialog
        open={motorSettingsOpen}
        onOpenChange={setMotorSettingsOpen}
        settings={sliderState.motorSettings}
        isConnected={bluetooth.isConnected}
        deviceName={bluetooth.deviceName}
        onSettingsChange={sliderState.updateMotorSettings}
        onSave={handleSaveMotorSettings}
        onDisconnect={bluetooth.disconnect}
      />
    </div>
  );
};

export default Index;
