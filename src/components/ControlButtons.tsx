import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ControlButtonsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function ControlButtons({
  isRunning,
  onStart,
  onStop,
  disabled = false,
}: ControlButtonsProps) {
  return (
    <div className="flex gap-3">
      {isRunning ? (
        <Button
          variant="destructive"
          size="lg"
          onClick={onStop}
          disabled={disabled}
          className="flex-1 gap-2 h-12"
        >
          <Square className="w-5 h-5" />
          Stop
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={onStart}
          disabled={disabled}
          className="flex-1 gap-2 h-12 bg-primary hover:bg-primary/90 glow-primary"
        >
          <Play className="w-5 h-5" />
          Start
        </Button>
      )}
    </div>
  );
}
