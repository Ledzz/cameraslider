import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PointInputs } from '@/components/PointInputs';
import { DurationPicker } from '@/components/DurationPicker';
import { PositionVisualization } from '@/components/PositionVisualization';
import { FreeToggle } from '@/components/FreeToggle';
import { ControlButtons } from '@/components/ControlButtons';
import { ModeConfig } from '@/hooks/useSliderState';
import { SliderCommand } from '@/hooks/useBluetooth';

interface Timelapse1ModeProps {
  config: ModeConfig;
  currentPosition: number;
  isRunning: boolean;
  isConnected: boolean;
  onConfigChange: (updates: Partial<ModeConfig>) => void;
  onSetPointFromPosition: (point: 'A' | 'B') => void;
  onStart: () => void;
  onStop: () => void;
  onFreeToggle: (enabled: boolean) => void;
}

export function Timelapse1Mode({
  config,
  currentPosition,
  isRunning,
  isConnected,
  onConfigChange,
  onSetPointFromPosition,
  onStart,
  onStop,
  onFreeToggle,
}: Timelapse1ModeProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Timelapse 1 — Slow Pan
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Smoothly move from Point A to Point B over the specified duration
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Position Visualization */}
        <PositionVisualization
          currentPosition={currentPosition}
          pointA={config.pointA}
          pointB={config.pointB}
          isRunning={isRunning}
        />

        {/* Point Inputs */}
        <PointInputs
          pointA={config.pointA}
          pointB={config.pointB}
          currentPosition={currentPosition}
          onPointAChange={(value) => onConfigChange({ pointA: value })}
          onPointBChange={(value) => onConfigChange({ pointB: value })}
          onSetPointAFromPosition={() => onSetPointFromPosition('A')}
          onSetPointBFromPosition={() => onSetPointFromPosition('B')}
          disabled={isRunning}
        />

        {/* Duration */}
        <DurationPicker
          value={config.duration}
          onChange={(duration) => onConfigChange({ duration })}
          label="Duration (A → B)"
          disabled={isRunning}
        />

        {/* Free Toggle */}
        <FreeToggle
          enabled={config.freeMode}
          onToggle={onFreeToggle}
          disabled={isRunning}
        />

        {/* Control Buttons */}
        <ControlButtons
          isRunning={isRunning}
          onStart={onStart}
          onStop={onStop}
          disabled={!isConnected}
        />
      </CardContent>
    </Card>
  );
}
