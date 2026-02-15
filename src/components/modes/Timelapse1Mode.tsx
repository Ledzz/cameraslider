import { Clock3, Play, Square, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { PositionVisualization } from "@/components/PositionVisualization";
import { SliderStatus } from "@/components/SliderStatus";
import { startTimelapse1, stop, useSliderStore } from "@/store/sliderStore";
import { useToast } from "@/hooks/use-toast";

export function Timelapse1Mode() {
  const { toast } = useToast();
  const isConnected = useSliderStore((s) => s.isConnected);
  const sliderState = useSliderStore((s) => s.sliderState);
  const isCalibrated = sliderState.homed && sliderState.rightPoint > sliderState.leftPoint;

  const [startPercent, setStartPercent] = useState(0);
  const [endPercent, setEndPercent] = useState(100);
  const [velocity, setVelocity] = useState(sliderState.timelapse1Vel);

  const handleStart = async () => {
    const success = await startTimelapse1({
      startPercent,
      endPercent,
      vel: velocity,
    });

    toast({
      title: success ? "Timelapse1 started" : "Timelapse1 failed",
      description: success
        ? `Running ${startPercent.toFixed(1)}% -> ${endPercent.toFixed(1)}%`
        : "Command was rejected by device",
      variant: success ? "default" : "destructive",
    });
  };

  const handleStop = async () => {
    const success = await stop();
    toast({
      title: success ? "Stopped" : "Stop failed",
      variant: success ? "default" : "destructive",
    });
  };

  return (
    <div className="space-y-4">
      <SliderStatus />

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-primary" />
            Timelapse 1
          </CardTitle>
          <p className="text-xs text-muted-foreground">Smooth move from point A to point B.</p>
        </CardHeader>

        <CardContent className="space-y-5">
          <PositionVisualization currentPosition={sliderState.position} pointA={startPercent} pointB={endPercent} />

          {!isCalibrated && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">Calibration required before timelapse commands.</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <span className="text-xs font-mono text-primary">{startPercent.toFixed(1)}%</span>
            </div>
            <Slider value={[startPercent]} onValueChange={([v]) => setStartPercent(v)} min={0} max={100} step={0.1} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">End</Label>
              <span className="text-xs font-mono text-primary">{endPercent.toFixed(1)}%</span>
            </div>
            <Slider value={[endPercent]} onValueChange={([v]) => setEndPercent(v)} min={0} max={100} step={0.1} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Velocity (raw)</Label>
            <Input
              type="number"
              min={1}
              value={velocity}
              onChange={(e) => setVelocity(Number(e.target.value) || 0)}
              className="bg-secondary border-border font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleStart} disabled={!isConnected || !isCalibrated} className="gap-2">
              <Play className="w-4 h-4" />
              Start
            </Button>
            <Button variant="destructive" onClick={handleStop} disabled={!isConnected} className="gap-2">
              <Square className="w-4 h-4" />
              Stop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
