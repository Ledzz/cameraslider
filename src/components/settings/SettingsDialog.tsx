import { Save, BluetoothOff, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {useSliderStore, StandstillMode, saveSettingsToDevice, disconnect, updateSettings} from '@/store/sliderStore';
import { useToast } from '@/hooks/use-toast';
import { SliderStatus } from '@/components/SliderStatus';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MICROSTEP_OPTIONS = [1, 4, 16, 32, 64, 128, 256] as const;
const VOLTAGE_OPTIONS = [5, 9, 12, 15, 20] as const;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  // const {
  //   sliderState,
  //     isConnected,
  // } = useSliderStore();
  const sliderState = useSliderStore(s => s.sliderState);
  const isConnected = useSliderStore(s => s.isConnected);

  const handleSave = async () => {
    const success = await saveSettingsToDevice();
    if (success) {
      toast({ title: 'Settings Saved', description: 'Settings applied to device' });
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onOpenChange(false);
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
              value={sliderState.standstillMode}
              onValueChange={(v) => updateSettings({ standstillMode: v as StandstillMode })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={0}>Free (No Holding)</SelectItem>
                <SelectItem value={1}>Hold Position</SelectItem>
                <SelectItem value={2}>Brake (Passive)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Encoder Values (Read-only display) */}
          <div className="space-y-4 pt-2 border-t border-border">
            <h4 className="text-sm font-semibold">Encoder Calibration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Left Point</Label>
                <Input
                  type="number"
                  value={sliderState.leftPoint}
                  onChange={(e) => updateSettings({ leftPoint: parseInt(e.target.value) || 0 })}
                  className="font-mono bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Right Point</Label>
                <Input
                  type="number"
                  value={sliderState.rightPoint}
                  onChange={(e) => updateSettings({ rightPoint: parseInt(e.target.value) || 0 })}
                  className="font-mono bg-secondary border-border"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!isConnected}
            className="w-full gap-2"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
          {!isConnected && (
            <p className="text-xs text-center text-muted-foreground">
              Connect to device to save settings
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
