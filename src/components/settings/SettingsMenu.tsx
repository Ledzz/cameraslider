import { Wrench, Cog } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SettingsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCalibrationClick: () => void;
  onMotorSettingsClick: () => void;
}

export function SettingsMenu({
  open,
  onOpenChange,
  onCalibrationClick,
  onMotorSettingsClick,
}: SettingsMenuProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xs">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              onCalibrationClick();
            }}
            className="w-full justify-start gap-3 h-12"
          >
            <Wrench className="w-5 h-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">Calibration</div>
              <div className="text-xs text-muted-foreground">Set stall values</div>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              onMotorSettingsClick();
            }}
            className="w-full justify-start gap-3 h-12"
          >
            <Cog className="w-5 h-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">Motor Settings</div>
              <div className="text-xs text-muted-foreground">Voltage, power, connection</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
