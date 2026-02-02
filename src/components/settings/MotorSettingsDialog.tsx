import { Save, BluetoothOff } from 'lucide-react';
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
import { MotorSettings } from '@/hooks/useSliderState';

interface MotorSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: MotorSettings;
  isConnected: boolean;
  deviceName: string | null;
  onSettingsChange: (updates: Partial<MotorSettings>) => void;
  onSave: () => void;
  onDisconnect: () => void;
}

export function MotorSettingsDialog({
  open,
  onOpenChange,
  settings,
  isConnected,
  deviceName,
  onSettingsChange,
  onSave,
  onDisconnect,
}: MotorSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Motor Settings</DialogTitle>
          <DialogDescription>
            Configure motor parameters and connection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Connection Info */}
          {isConnected && (
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border">
              <div>
                <p className="text-sm font-medium">{deviceName}</p>
                <p className="text-xs text-success">Connected</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <BluetoothOff className="w-4 h-4" />
                Disconnect
              </Button>
            </div>
          )}

          {/* Stall Values */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Stall Sensitivity</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Left Stall</Label>
                <Input
                  type="number"
                  value={settings.stallLeft}
                  onChange={(e) => onSettingsChange({ stallLeft: parseInt(e.target.value) || 0 })}
                  className="font-mono bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Right Stall</Label>
                <Input
                  type="number"
                  value={settings.stallRight}
                  onChange={(e) => onSettingsChange({ stallRight: parseInt(e.target.value) || 0 })}
                  className="font-mono bg-secondary border-border"
                />
              </div>
            </div>
          </div>

          {/* Voltage */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Operating Voltage (V)</Label>
            <Input
              type="number"
              step={0.1}
              value={settings.voltage}
              onChange={(e) => onSettingsChange({ voltage: parseFloat(e.target.value) || 0 })}
              className="font-mono bg-secondary border-border"
            />
          </div>

          {/* Power Percentage */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Power Percentage</Label>
              <span className="text-sm font-mono text-primary">{settings.power}%</span>
            </div>
            <Slider
              value={[settings.power]}
              onValueChange={([value]) => onSettingsChange({ power: value })}
              min={0}
              max={100}
              step={1}
              className="py-2"
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={onSave}
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
