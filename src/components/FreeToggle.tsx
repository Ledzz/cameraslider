import { Unlock, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface FreeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function FreeToggle({ enabled, onToggle, disabled = false }: FreeToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border">
      <div className="flex items-center gap-2">
        {enabled ? (
          <Unlock className="w-4 h-4 text-warning" />
        ) : (
          <Lock className="w-4 h-4 text-muted-foreground" />
        )}
        <Label className="text-sm cursor-pointer" htmlFor="free-mode">
          Free Mode
        </Label>
      </div>
      <Switch
        id="free-mode"
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
