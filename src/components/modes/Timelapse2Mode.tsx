import { SkipForward } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PointInputs } from '@/components/PointInputs';
import { PositionVisualization } from '@/components/PositionVisualization';
import { FreeToggle } from '@/components/FreeToggle';
import { ControlButtons } from '@/components/ControlButtons';
import { ModeConfig } from '@/hooks/useSliderState';

interface Timelapse2ModeProps {
  config: ModeConfig;
  currentPosition: number;
  currentStep: number;
  isRunning: boolean;
  isConnected: boolean;
  onConfigChange: (updates: Partial<ModeConfig>) => void;
  onSetPointFromPosition: (point: 'A' | 'B') => void;
  onStart: () => void;
  onStop: () => void;
  onNextStep: () => void;
  onFreeToggle: (enabled: boolean) => void;
}

export function Timelapse2Mode({
  config,
  currentPosition,
  currentStep,
  isRunning,
  isConnected,
  onConfigChange,
  onSetPointFromPosition,
  onStart,
  onStop,
  onNextStep,
  onFreeToggle,
}: Timelapse2ModeProps) {
  // Calculate step markers
  const stepMarkers: number[] = [];
  if (config.steps > 1) {
    const range = config.pointB - config.pointA;
    for (let i = 0; i <= config.steps; i++) {
      stepMarkers.push(config.pointA + (range / config.steps) * i);
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Timelapse 2 — Step by Step
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Move in discrete steps, triggered by external signal or app button
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Position Visualization with step markers */}
        <PositionVisualization
          currentPosition={currentPosition}
          pointA={config.pointA}
          pointB={config.pointB}
          stepMarkers={stepMarkers}
          isRunning={isRunning}
        />

        {/* Step Status */}
        {isRunning && (
          <div className="flex items-center justify-between p-3 rounded-md bg-primary/10 border border-primary/30">
            <span className="text-sm font-medium">Current Progress</span>
            <span className="text-lg font-mono text-primary">
              Step {currentStep} of {config.steps}
            </span>
          </div>
        )}

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

        {/* Steps Input */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Number of Steps</Label>
          <Input
            type="number"
            min={1}
            max={1000}
            value={config.steps}
            onChange={(e) => onConfigChange({ steps: parseInt(e.target.value) || 1 })}
            disabled={isRunning}
            className="font-mono text-sm h-9 bg-secondary border-border"
          />
        </div>

        {/* Free Toggle */}
        <FreeToggle
          enabled={config.freeMode}
          onToggle={onFreeToggle}
          disabled={isRunning}
        />

        {/* Control Buttons + Next Step */}
        <div className="space-y-3">
          {isRunning && (
            <Button
              variant="secondary"
              size="lg"
              onClick={onNextStep}
              disabled={!isConnected || currentStep >= config.steps}
              className="w-full gap-2 h-12"
            >
              <SkipForward className="w-5 h-5" />
              Next Step
            </Button>
          )}
          <ControlButtons
            isRunning={isRunning}
            onStart={onStart}
            onStop={onStop}
            disabled={!isConnected}
          />
        </div>
      </CardContent>
    </Card>
  );
}
