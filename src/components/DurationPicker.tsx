import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DurationPickerProps {
  value: number; // in seconds
  onChange: (seconds: number) => void;
  label?: string;
  disabled?: boolean;
}

export function DurationPicker({
  value,
  onChange,
  label = "Duration",
  disabled = false,
}: DurationPickerProps) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  const handleChange = (h: number, m: number, s: number) => {
    const totalSeconds = h * 3600 + m * 60 + s;
    onChange(totalSeconds);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <Input
            type="number"
            min={0}
            max={99}
            value={hours}
            onChange={(e) => handleChange(parseInt(e.target.value) || 0, minutes, seconds)}
            disabled={disabled}
            className="font-mono text-sm h-9 bg-secondary border-border text-center"
          />
          <span className="text-[10px] text-muted-foreground block text-center mt-0.5">hrs</span>
        </div>
        <span className="text-lg text-muted-foreground font-bold">:</span>
        <div className="flex-1">
          <Input
            type="number"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) => handleChange(hours, parseInt(e.target.value) || 0, seconds)}
            disabled={disabled}
            className="font-mono text-sm h-9 bg-secondary border-border text-center"
          />
          <span className="text-[10px] text-muted-foreground block text-center mt-0.5">min</span>
        </div>
        <span className="text-lg text-muted-foreground font-bold">:</span>
        <div className="flex-1">
          <Input
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(e) => handleChange(hours, minutes, parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="font-mono text-sm h-9 bg-secondary border-border text-center"
          />
          <span className="text-[10px] text-muted-foreground block text-center mt-0.5">sec</span>
        </div>
      </div>
    </div>
  );
}
