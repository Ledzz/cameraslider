import { useState } from 'react';
import { Wrench, Play, Loader2 } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';

interface CalibrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isConnected: boolean;
  onStartCalibration: () => Promise<void>;
  onSaveManualValues: (stallLeft: number, stallRight: number) => void;
}

export function CalibrationDialog({
  open,
  onOpenChange,
  isConnected,
  onStartCalibration,
  onSaveManualValues,
}: CalibrationDialogProps) {
  const [stallLeft, setStallLeft] = useState(50);
  const [stallRight, setStallRight] = useState(50);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationStatus, setCalibrationStatus] = useState('');

  const handleAutoCalibration = async () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationStatus('Starting calibration...');

    // Simulate calibration progress
    const steps = [
      { progress: 20, status: 'Moving to left limit...' },
      { progress: 40, status: 'Detecting left stall...' },
      { progress: 60, status: 'Moving to right limit...' },
      { progress: 80, status: 'Detecting right stall...' },
      { progress: 100, status: 'Calibration complete!' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCalibrationProgress(step.progress);
      setCalibrationStatus(step.status);
    }

    await onStartCalibration();
    setIsCalibrating(false);
  };

  const handleSaveManual = () => {
    onSaveManualValues(stallLeft, stallRight);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Calibration
          </DialogTitle>
          <DialogDescription>
            Calibrate your slider's stall detection values
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Auto Calibration */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Auto Calibration</h4>
            {isCalibrating ? (
              <div className="space-y-3">
                <Progress value={calibrationProgress} className="h-2" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {calibrationStatus}
                </div>
              </div>
            ) : (
              <Button
                onClick={handleAutoCalibration}
                disabled={!isConnected}
                className="w-full gap-2"
              >
                <Play className="w-4 h-4" />
                Start Auto Calibration
              </Button>
            )}
            {!isConnected && (
              <p className="text-xs text-destructive">
                Connect to device to run calibration
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
            </div>
          </div>

          {/* Manual Values */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Manual Stall Values</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Left Stall</Label>
                <Input
                  type="number"
                  value={stallLeft}
                  onChange={(e) => setStallLeft(parseInt(e.target.value) || 0)}
                  className="font-mono bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Right Stall</Label>
                <Input
                  type="number"
                  value={stallRight}
                  onChange={(e) => setStallRight(parseInt(e.target.value) || 0)}
                  className="font-mono bg-secondary border-border"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleSaveManual}
              className="w-full"
            >
              Save Manual Values
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
