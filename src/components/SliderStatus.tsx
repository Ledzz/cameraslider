import { Activity, Gauge, Zap, AlertTriangle, Power } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSliderStore, DriverStatus } from '@/store/sliderStore';

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;
  return (
    <Badge variant="destructive" className="text-xs">
      {label}
    </Badge>
  );
}

function DriverStatusDisplay({ status }: { status: DriverStatus }) {
  const hasErrors =
    status.over_temperature_warning ||
    status.over_temperature_shutdown ||
    status.short_to_ground_a ||
    status.short_to_ground_b ||
    status.low_side_short_a ||
    status.low_side_short_b ||
    status.open_load_a ||
    status.open_load_b;

  if (!hasErrors && !status.stealth_chop_mode && status.standstill) {
    return (
      <div className="text-xs text-muted-foreground">
        No issues • {status.standstill ? 'Standstill' : 'Moving'}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      <StatusBadge active={status.over_temperature_warning} label="Temp Warning" />
      <StatusBadge active={status.over_temperature_shutdown} label="Temp Shutdown" />
      <StatusBadge active={status.short_to_ground_a} label="Short A" />
      <StatusBadge active={status.short_to_ground_b} label="Short B" />
      <StatusBadge active={status.low_side_short_a} label="Low Short A" />
      <StatusBadge active={status.low_side_short_b} label="Low Short B" />
      <StatusBadge active={status.open_load_a} label="Open A" />
      <StatusBadge active={status.open_load_b} label="Open B" />
      {status.stealth_chop_mode && (
        <Badge variant="secondary" className="text-xs">StealthChop</Badge>
      )}
      {status.standstill && (
        <Badge variant="outline" className="text-xs">Standstill</Badge>
      )}
    </div>
  );
}

export function SliderStatus() {
  const { sliderState, connection, activeMode } = useSliderStore();

  return (
    <Card className="bg-card/80 backdrop-blur border-border">
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Position */}
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Position</div>
              <div className="font-mono font-semibold">
                {sliderState.position.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Velocity */}
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground">Velocity</div>
              <div className="font-mono font-semibold">
                {sliderState.velocity.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Mode & Status */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" />
            <div>
              <div className="text-xs text-muted-foreground">Mode</div>
              <div className="font-medium capitalize">
                {activeMode}
                {sliderState.isMoving && (
                  <span className="ml-1 text-xs text-primary animate-pulse">• Moving</span>
                )}
              </div>
            </div>
          </div>

          {/* Driver Enabled */}
          <div className="flex items-center gap-2">
            <Power className={`w-4 h-4 ${sliderState.driverEnabled ? 'text-success' : 'text-destructive'}`} />
            <div>
              <div className="text-xs text-muted-foreground">Driver</div>
              <div className={`font-medium ${sliderState.driverEnabled ? 'text-success' : 'text-destructive'}`}>
                {sliderState.driverEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>

          {/* Stall Guard */}
          <div className="flex items-center gap-2 col-span-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">StallGuard Result</div>
              <div className="font-mono">{sliderState.stallGuardResult}</div>
            </div>
          </div>

          {/* Driver Status */}
          <div className="col-span-2 border-t border-border pt-2 mt-1">
            <div className="text-xs text-muted-foreground mb-1">Driver Status</div>
            <DriverStatusDisplay status={sliderState.driverStatus} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
