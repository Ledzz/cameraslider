import { Plus, Trash2, Play, Square, SkipForward, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSliderStore, PlayMode, TriggerMode } from '@/store/sliderStore';
import { PositionVisualization } from '@/components/PositionVisualization';
import { SliderStatus } from '@/components/SliderStatus';
import { useToast } from '@/hooks/use-toast';

export function PositionMode() {
  const { toast } = useToast();
  const {
    positionMode,
    sliderState,
    connection,
    updatePositionMode,
    addPoint,
    removePoint,
    goToPoint,
    nextPoint,
    startPositionMode,
    stopPositionMode,
    enableDriver,
    disableDriver,
  } = useSliderStore();

  const handleAddPoint = () => {
    addPoint(sliderState.position);
    toast({ title: 'Point Added', description: `Added point at ${sliderState.position.toFixed(1)}%` });
  };

  const handleGoToPoint = async (index: number) => {
    const success = await goToPoint(index);
    if (success) {
      toast({ title: 'Moving', description: `Going to point ${index + 1}` });
    }
  };

  const handleStart = async () => {
    const success = await startPositionMode();
    if (success) {
      toast({ title: 'Started', description: 'Position mode activated' });
    }
  };

  const handleStop = async () => {
    const success = await stopPositionMode();
    if (success) {
      toast({ title: 'Stopped', description: 'Movement stopped' });
    }
  };

  const handleNext = async () => {
    const success = await nextPoint();
    if (success) {
      toast({ title: 'Next Point', description: `Moving to point ${positionMode.currentPointIndex + 1}` });
    }
  };

  const handleDriverToggle = async (enabled: boolean) => {
    if (enabled) {
      await enableDriver();
    } else {
      await disableDriver();
    }
  };

  return (
    <div className="space-y-4">
      {/* Slider Status */}
      <SliderStatus />

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Position Mode
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Move to defined points with loop or ping-pong behavior
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Position Visualization */}
          <PositionVisualization
            currentPosition={sliderState.position}
            pointA={0}
            pointB={100}
            stepMarkers={positionMode.points}
            isRunning={positionMode.isRunning}
          />

          {/* Points List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Points</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPoint}
                disabled={!connection.isConnected}
                className="h-7 gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Current
              </Button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {positionMode.points.map((point, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-md bg-secondary/50 border ${
                    index === positionMode.currentPointIndex && positionMode.isRunning
                      ? 'border-primary'
                      : 'border-transparent'
                  }`}
                >
                  <span className="text-sm font-mono">
                    {index + 1}. {point.toFixed(1)}%
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGoToPoint(index)}
                      disabled={!connection.isConnected || positionMode.isRunning}
                      className="h-6 px-2"
                    >
                      Go
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePoint(index)}
                      disabled={positionMode.isRunning || positionMode.points.length <= 2}
                      className="h-6 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Play Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Play Mode</Label>
              <Select
                value={positionMode.playMode}
                onValueChange={(v) => updatePositionMode({ playMode: v as PlayMode })}
                disabled={positionMode.isRunning}
              >
                <SelectTrigger className="bg-secondary border-border h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ping-pong">Ping-Pong</SelectItem>
                  <SelectItem value="loop">Loop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Trigger</Label>
              <Select
                value={positionMode.triggerMode}
                onValueChange={(v) => updatePositionMode({ triggerMode: v as TriggerMode })}
                disabled={positionMode.isRunning}
              >
                <SelectTrigger className="bg-secondary border-border h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="button">Button</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timeout (if timeout trigger) */}
          {positionMode.triggerMode === 'timeout' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Wait Time: {positionMode.timeout}s
              </Label>
              <Slider
                value={[positionMode.timeout]}
                onValueChange={([v]) => updatePositionMode({ timeout: v })}
                min={1}
                max={60}
                step={1}
                disabled={positionMode.isRunning}
              />
            </div>
          )}

          {/* Speed & Acceleration */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Max Speed</Label>
                <span className="text-xs font-mono text-primary">{positionMode.maxSpeed}%</span>
              </div>
              <Slider
                value={[positionMode.maxSpeed]}
                onValueChange={([v]) => updatePositionMode({ maxSpeed: v })}
                min={1}
                max={100}
                step={1}
                disabled={positionMode.isRunning}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Acceleration</Label>
                <span className="text-xs font-mono text-primary">{positionMode.acceleration}%</span>
              </div>
              <Slider
                value={[positionMode.acceleration]}
                onValueChange={([v]) => updatePositionMode({ acceleration: v })}
                min={1}
                max={100}
                step={1}
                disabled={positionMode.isRunning}
              />
            </div>
          </div>

          {/* Driver Enable */}
          <div className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border">
            <div>
              <Label className="text-sm">Enable Driver</Label>
              <p className="text-xs text-muted-foreground">Motor power control</p>
            </div>
            <Switch
              checked={sliderState.driverEnabled}
              onCheckedChange={handleDriverToggle}
              disabled={!connection.isConnected}
            />
          </div>

          {/* Control Buttons */}
          <div className="space-y-2">
            {positionMode.isRunning && positionMode.triggerMode === 'button' && (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleNext}
                disabled={!connection.isConnected}
                className="w-full gap-2 h-12"
              >
                <SkipForward className="w-5 h-5" />
                Next Point
              </Button>
            )}
            <div className="flex gap-3">
              {positionMode.isRunning ? (
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleStop}
                  disabled={!connection.isConnected}
                  className="flex-1 gap-2 h-12"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleStart}
                  disabled={!connection.isConnected || positionMode.points.length < 2}
                  className="flex-1 gap-2 h-12 bg-primary hover:bg-primary/90 glow-primary"
                >
                  <Play className="w-5 h-5" />
                  Start
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
