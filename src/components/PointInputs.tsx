import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PointInputsProps {
  pointA: number;
  pointB: number;
  currentPosition: number;
  onPointAChange: (value: number) => void;
  onPointBChange: (value: number) => void;
  onSetPointAFromPosition: () => void;
  onSetPointBFromPosition: () => void;
  disabled?: boolean;
}

export function PointInputs({
  pointA,
  pointB,
  currentPosition,
  onPointAChange,
  onPointBChange,
  onSetPointAFromPosition,
  onSetPointBFromPosition,
  disabled = false,
}: PointInputsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Point A */}
      <div className="space-y-2">
        <Label className="text-xs text-point-a font-semibold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-point-a" />
          Point A
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={pointA}
            onChange={(e) => onPointAChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="font-mono text-sm h-9 bg-secondary border-border"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onSetPointAFromPosition}
            disabled={disabled}
            className="h-9 px-2 border-point-a text-point-a hover:bg-point-a hover:text-primary-foreground"
            title={`Set from current position (${currentPosition.toFixed(1)})`}
          >
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Point B */}
      <div className="space-y-2">
        <Label className="text-xs text-point-b font-semibold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-point-b" />
          Point B
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={pointB}
            onChange={(e) => onPointBChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="font-mono text-sm h-9 bg-secondary border-border"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onSetPointBFromPosition}
            disabled={disabled}
            className="h-9 px-2 border-point-b text-point-b hover:bg-point-b hover:text-primary-foreground"
            title={`Set from current position (${currentPosition.toFixed(1)})`}
          >
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
