import { Gauge, Zap, AlertTriangle, Power } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { startCalibration, stop, useSliderStore } from '@/store/sliderStore';

export function SliderStatus() {
  const activeMode = useSliderStore(s => s.activeMode);
  const sliderState = useSliderStore(s => s.sliderState);
  const isConnected = useSliderStore(s => s.isConnected);
  const targetPercentUi = useSliderStore(s => s.targetPercentUi);
  const tl1Ui = useSliderStore(s => s.tl1Ui);
  const tl2Ui = useSliderStore(s => s.tl2Ui);

  const targetPercent = (() => {
    if (typeof targetPercentUi === 'number') {
      return Math.max(0, Math.min(100, targetPercentUi));
    }

    const range = sliderState.rightPoint - sliderState.leftPoint;
    if (range > 0) {
      const percent = ((sliderState.target - sliderState.leftPoint) / range) * 100;
      return Math.max(0, Math.min(100, percent));
    }

    return Math.max(0, Math.min(100, sliderState.position));
  })();

  const showGotoFill = activeMode === 'goto' && sliderState.mode === 'goto' && sliderState.isMoving;
  const showTl1Markers = activeMode === 'timelapse1' && !!tl1Ui;
  const showTl2Markers = activeMode === 'timelapse2' && !!tl2Ui;
  const markerStart = showTl1Markers
    ? Math.max(0, Math.min(100, tl1Ui.startPercent))
    : showTl2Markers
      ? Math.max(0, Math.min(100, tl2Ui.startPercent))
      : 0;
  const markerEnd = showTl1Markers
    ? Math.max(0, Math.min(100, tl1Ui.endPercent))
    : showTl2Markers
      ? Math.max(0, Math.min(100, tl2Ui.endPercent))
      : 0;
  const currentPercent = Math.max(0, Math.min(100, sliderState.position));
  const velocityArrow = sliderState.velocity > 0.5 ? '←' : sliderState.velocity < -0.5 ? '→' : '•';
  const velocityAbs = Math.abs(sliderState.velocity);
  const isCalibrated = sliderState.homed && sliderState.rightPoint > sliderState.leftPoint;
  const isCalibrating = sliderState.mode === 'calibrating';

  return (
    <Card className="bg-card/80 backdrop-blur border-border">
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Velocity */}
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground">Velocity</div>
              <div className="font-mono font-semibold text-accent">{velocityArrow} {velocityAbs.toFixed(1)}%</div>
            </div>
          </div>

          {/* Mode & Status */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" />
            <div>
              <div className="text-xs text-muted-foreground">Mode</div>
              <div className="font-medium capitalize">
                {sliderState.mode || "idle"}
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
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">StallGuard Result</div>
              <div className="font-mono">{sliderState.stallGuardResult}</div>
            </div>
          </div>

          {!isCalibrated && (
            <div className="col-span-2 flex items-start justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-warning">
              <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">
                Slider is not calibrated. Open Settings and run calibration.
              </p>
              </div>
              <Button
                size="sm"
                variant={isCalibrating ? 'destructive' : 'secondary'}
                disabled={!isConnected}
                onClick={() => {
                  void (isCalibrating ? stop() : startCalibration());
                }}
                className="h-7 px-2"
              >
                {isCalibrating ? 'Stop' : 'Calibrate'}
              </Button>
            </div>
          )}

          <div className="col-span-2 border-t border-border pt-3 mt-1 space-y-2">
            <div className="relative">
              <div
                className="absolute -top-[18px] -translate-x-1/2 text-[10px] font-mono font-semibold text-primary"
                style={{ left: `${currentPercent}%` }}
              >
                {currentPercent.toFixed(1)}%
              </div>

              <div className="relative h-8 rounded-md bg-secondary overflow-hidden">
              {(showTl1Markers || showTl2Markers) && (
                <>
                  <div
                    className="absolute inset-y-0 bg-primary/10"
                    style={{
                      left: `${Math.min(markerStart, markerEnd)}%`,
                      width: `${Math.abs(markerEnd - markerStart)}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-point-a"
                    style={{ left: `${markerStart}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-point-b"
                    style={{ left: `${markerEnd}%` }}
                  />
                </>
              )}

              {showGotoFill && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/20"
                  style={{ width: `${targetPercent}%` }}
                />
              )}
              <div
                className="absolute top-1 bottom-1 w-4 rounded-sm bg-accent transition-all duration-100"
                style={{ left: `${currentPercent}%`, transform: 'translateX(-50%)' }}
              />
              {showGotoFill && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary"
                  style={{ left: `${targetPercent}%` }}
                />
              )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
