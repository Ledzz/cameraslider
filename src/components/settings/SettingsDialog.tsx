import { BluetoothOff, Settings2, AlertTriangle, Compass } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {useSliderStore, StandstillMode, saveSettingsToDevice, disconnect, updateSettings, startCalibration} from '@/store/sliderStore';
import { useToast } from '@/hooks/use-toast';
import { SliderStatus } from '@/components/SliderStatus';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MICROSTEP_OPTIONS = [1, 2, 4, 8, 16, 32, 64, 128, 256] as const;
const VOLTAGE_OPTIONS = [5, 12, 15, 20] as const;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  // const {
  //   sliderState,
  //     isConnected,
  // } = useSliderStore();
  const sliderState = useSliderStore(s => s.sliderState);
  const isConnected = useSliderStore(s => s.isConnected);
  const isCalibrated = sliderState.homed && sliderState.rightPoint > sliderState.leftPoint;
  const lastSentSettingsRef = useRef<string | null>(null);

  const hasAccelerationLimit = sliderState.accelerationLimit > 0;
  const accelerationLimit = hasAccelerationLimit ? sliderState.accelerationLimit : 1;
  const accelerationPercent = Math.max(
    0,
    Math.min(100, Math.round((sliderState.acceleration / accelerationLimit) * 100)),
  );

  const settingsSnapshot = useMemo(
    () =>
      JSON.stringify({
        currentLimit: sliderState.currentLimit,
        microsteps: sliderState.microsteps,
        pdVoltage: sliderState.pdVoltage,
        standstillMode: sliderState.standstillMode,
        maxSpeed: sliderState.maxSpeed,
        acceleration: sliderState.acceleration,
        homingSpeed: sliderState.homingSpeed,
        gotoMaxVel: sliderState.gotoMaxVel,
        timelapse1TotalTimeMs: sliderState.timelapse1TotalTimeMs,
        timelapse1PingPong: sliderState.timelapse1PingPong,
        timelapse2Vel: sliderState.timelapse2Vel,
        timelapse2DelayMs: sliderState.timelapse2DelayMs,
      }),
    [
      sliderState.currentLimit,
      sliderState.microsteps,
      sliderState.pdVoltage,
      sliderState.standstillMode,
      sliderState.maxSpeed,
      sliderState.acceleration,
      sliderState.homingSpeed,
      sliderState.gotoMaxVel,
      sliderState.timelapse1TotalTimeMs,
      sliderState.timelapse1PingPong,
      sliderState.timelapse2Vel,
      sliderState.timelapse2DelayMs,
    ],
  );

  useEffect(() => {
    if (!open) {
      lastSentSettingsRef.current = null;
      return;
    }
    if (lastSentSettingsRef.current === null) {
      lastSentSettingsRef.current = settingsSnapshot;
    }
  }, [open, settingsSnapshot]);

  useEffect(() => {
    if (!open || !isConnected) {
      return;
    }

    if (lastSentSettingsRef.current === settingsSnapshot) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      const success = await saveSettingsToDevice();
      if (success) {
        lastSentSettingsRef.current = settingsSnapshot;
      } else {
        toast({
          title: 'Autosave failed',
          description: 'Could not save changed settings',
          variant: 'destructive',
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [open, isConnected, settingsSnapshot, toast]);

  const handleDisconnect = () => {
    disconnect();
    onOpenChange(false);
  };

  const handleCalibrate = async () => {
    const success = await startCalibration();
    if (success) {
      toast({
        title: 'Calibration started',
        description: 'Slider entered calibrating mode',
      });
    } else {
      toast({
        title: 'Calibration failed',
        description: 'Could not start calibration',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure motor and driver settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Connection Info */}
          {isConnected && (
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border">
              <div>
                <p className="text-xs text-success">Connected</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <BluetoothOff className="w-4 h-4" />
                Disconnect
              </Button>
            </div>
          )}

          {/* Slider Status in Settings */}
          <SliderStatus />

          {!isCalibrated && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">
                Slider is not calibrated. Run calibration before using Goto mode.
              </p>
            </div>
          )}

          {/* Stall Threshold */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Stall Threshold</Label>
              <span className="text-sm font-mono text-primary">{sliderState.stallThreshold}%</span>
            </div>
            <Slider
              value={[sliderState.stallThreshold]}
              onValueChange={([v]) => updateSettings({ stallThreshold: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Current Limit */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Current Limit</Label>
              <span className="text-sm font-mono text-primary">{sliderState.currentLimit}%</span>
            </div>
            <Slider
              value={[sliderState.currentLimit]}
              onValueChange={([v]) => updateSettings({ currentLimit: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Acceleration</Label>
              <span className="text-sm font-mono text-primary">{accelerationPercent}%</span>
            </div>
            <Slider
              value={[accelerationPercent]}
              onValueChange={([v]) =>
                updateSettings({
                  acceleration: Math.round((accelerationLimit * v) / 100),
                })
              }
              min={0}
              max={100}
              step={1}
              disabled={!hasAccelerationLimit}
            />
          </div>

          {/* Microsteps */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Microsteps</Label>
            <Select
              value={String(sliderState.microsteps)}
              onValueChange={(v) => updateSettings({ microsteps: Number(v) as typeof sliderState.microsteps })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MICROSTEP_OPTIONS.map((ms) => (
                  <SelectItem key={ms} value={String(ms)}>
                    {ms} microsteps
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voltage */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Operating Voltage</Label>
            <Select
              value={String(sliderState.pdVoltage)}
              onValueChange={(v) => updateSettings({ pdVoltage: Number(v) as typeof sliderState.pdVoltage })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOLTAGE_OPTIONS.map((v) => (
                  <SelectItem key={v} value={String(v)}>
                    {v}V
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stop Behavior */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Standstill mode</Label>
            <Select
              value={String(sliderState.standstillMode)}
              onValueChange={(v) => updateSettings({ standstillMode: Number(v) as StandstillMode })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="0">Normal</SelectItem>
                  <SelectItem value="1">Freewheeling</SelectItem>
                  <SelectItem value="2">Strong Braking</SelectItem>
                  <SelectItem value="3">Braking</SelectItem>
                </SelectContent>
              </Select>
          </div>

          {/* Encoder Calibration */}
          <div className="space-y-4 pt-2 border-t border-border">
            <h4 className="text-sm font-semibold">Encoder Calibration</h4>
            <Button
              variant="secondary"
              onClick={handleCalibrate}
              disabled={!isConnected}
              className="w-full gap-2"
            >
              <Compass className="w-4 h-4" />
              Start Calibration
            </Button>
          </div>
          {!isConnected && (
            <p className="text-xs text-center text-muted-foreground">
              Connect to device to autosave settings
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
