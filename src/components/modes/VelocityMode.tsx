import { Gauge, Play, Square } from "lucide-react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  resetVelocityTarget,
  setVelocity,
  setVelocityTarget,
  setEnabled,
  stop,
  useSliderStore,
} from "@/store/sliderStore";
import { SliderStatus } from "@/components/SliderStatus";
import { useToast } from "@/hooks/use-toast";

export function VelocityMode() {
  const { toast } = useToast();
  const velocityMode = useSliderStore((s) => s.velocityMode);
  const sliderState = useSliderStore((s) => s.sliderState);
  const activeMode = useSliderStore((s) => s.activeMode);
  const isConnected = useSliderStore((s) => s.isConnected);

  useEffect(() => {
    if (activeMode !== "velocity") {
      return;
    }

    resetVelocityTarget();
    if (isConnected) {
      void setVelocity({ velocity: 0 });
    }
  }, [activeMode, isConnected]);

  const isRunning = sliderState.mode === "velocity" && sliderState.isMoving;

  const handleStart = async () => {
    await setEnabled(true);
    const success = await setVelocity({ velocity: velocityMode.speed });
    toast({
      title: success ? "Started" : "Start failed",
      variant: success ? "default" : "destructive",
    });
  };

  const handleStop = async () => {
    const success = await stop();
    if (success) {
      resetVelocityTarget();
    }
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
            <Gauge className="w-4 h-4 text-primary" />
            Velocity Mode
          </CardTitle>
          <p className="text-xs text-muted-foreground">Direct velocity control in both directions.</p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Target Speed</Label>
              <span className="text-sm font-mono text-primary">{velocityMode.speed}%</span>
            </div>
            <Slider
              value={[velocityMode.speed]}
              onValueChange={([v]) => setVelocityTarget(v)}
              min={-100}
              max={100}
              step={1}
              disabled={!isConnected}
            />
          </div>

          {isRunning ? (
            <Button
              variant="destructive"
              disabled={!isConnected}
              onClick={handleStop}
              className="w-full gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </Button>
          ) : (
            <Button
              disabled={!isConnected || velocityMode.speed === 0}
              onClick={handleStart}
              className="w-full gap-2"
            >
              <Play className="w-4 h-4" />
              Start
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
