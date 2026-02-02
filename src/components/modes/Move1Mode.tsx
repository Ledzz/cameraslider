import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PointInputs } from '@/components/PointInputs';
import { DurationPicker } from '@/components/DurationPicker';
import { PositionVisualization } from '@/components/PositionVisualization';
import { FreeToggle } from '@/components/FreeToggle';
import { ControlButtons } from '@/components/ControlButtons';
import { ModeConfig } from '@/hooks/useSliderState';

interface Move1ModeProps {
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

export function Move1Mode({
  config,
  currentPosition,
  isRunning,
  isConnected,
  onConfigChange,
  onSetPointFromPosition,
  onStart,
  onStop,
  onFreeToggle,
}: Move1ModeProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 text-primary ${isRunning ? 'animate-spin' : ''}`} />
          Move 1 — Periodic
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Continuously move back and forth between Point A and Point B
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

        {/* Cycle Time */}
        <DurationPicker
          value={config.duration}
          onChange={(duration) => onConfigChange({ duration })}
          label="Cycle Time (A → B → A)"
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
