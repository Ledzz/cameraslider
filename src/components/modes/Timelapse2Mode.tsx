import { Camera, Play, Square, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { SliderStatus } from "@/components/SliderStatus";
import { clearTl2Ui, setTl2Ui, startTimelapse2, stop, useSliderStore } from "@/store/sliderStore";
import { useToast } from "@/hooks/use-toast";

export function Timelapse2Mode() {
  const { toast } = useToast();
  const isConnected = useSliderStore((s) => s.isConnected);
  const sliderState = useSliderStore((s) => s.sliderState);
  const isCalibrated = sliderState.homed && sliderState.rightPoint > sliderState.leftPoint;

  const [startPercent, setStartPercent] = useState(0);
  const [endPercent, setEndPercent] = useState(100);
  const [stepCount, setStepCount] = useState(100);
  const [delay, setDelay] = useState(sliderState.timelapse2DelayMs || 20);
  const isRunning = sliderState.mode === "timelapse2";

  useEffect(() => {
    setTl2Ui(startPercent, endPercent);
  }, [startPercent, endPercent]);

  useEffect(() => {
    return () => {
      clearTl2Ui();
    };
  }, []);

  const handleStart = async () => {
    const success = await startTimelapse2({
      startPercent,
      endPercent,
      stepCount,
      delay,
    });

    toast({
      title: success ? "Timelapse2 started" : "Timelapse2 failed",
      description: success ? `Steps: ${stepCount}` : "Command was rejected by device",
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
            <Camera className="w-4 h-4 text-primary" />
            Timelapse 2
          </CardTitle>
          <p className="text-xs text-muted-foreground">Discrete trigger-driven step movement.</p>
        </CardHeader>

        <CardContent className="space-y-5">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Step Count</Label>
              <Input type="number" min={1} value={stepCount} onChange={(e) => setStepCount(Number(e.target.value) || 1)} className="bg-secondary border-border font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Delay (ms)</Label>
              <Input type="number" min={0} value={delay} onChange={(e) => setDelay(Number(e.target.value) || 0)} className="bg-secondary border-border font-mono" />
            </div>
          </div>

          <div className="text-xs text-muted-foreground rounded-md bg-secondary/40 px-3 py-2">
            Progress: {sliderState.stepsExecuted} / {sliderState.stepCount || stepCount}
          </div>

          {isRunning ? (
            <Button variant="destructive" onClick={handleStop} disabled={!isConnected} className="w-full gap-2">
              <Square className="w-4 h-4" />
              Stop
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={!isConnected || !isCalibrated} className="w-full gap-2">
              <Play className="w-4 h-4" />
              Start
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
