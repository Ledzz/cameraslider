import { Gauge, Play, Pause, Square } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  setAcceleration,
  setModeFree,
  setModeIdle,
  setVelocity,
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
  const isConnected = useSliderStore((s) => s.isConnected);
  const [acceleration, setAccelerationValue] = useState(sliderState.acceleration);

  const runAction = async (action: () => Promise<boolean>, successTitle: string, failTitle: string) => {
    const success = await action();
    toast({
      title: success ? successTitle : failTitle,
      variant: success ? "default" : "destructive",
    });
  };

  const handleSpeedChange = async (value: number) => {
    await setEnabled(true);
    await setVelocity({ velocity: value });
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
          <p className="text-xs text-muted-foreground">Direct velocity control plus free/idle commands.</p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-center justify-center p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-primary">{sliderState.velocity.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">Current Velocity</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Target Speed</Label>
              <span className="text-sm font-mono text-primary">{velocityMode.speed}%</span>
            </div>
            <Slider
              value={[velocityMode.speed]}
              onValueChange={([v]) => handleSpeedChange(v)}
              min={0}
              max={100}
              step={1}
              disabled={!isConnected}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Acceleration (raw)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                value={acceleration}
                onChange={(e) => setAccelerationValue(Number(e.target.value) || 0)}
                className="bg-secondary border-border font-mono"
              />
              <Button
                variant="outline"
                disabled={!isConnected}
                onClick={() => runAction(() => setAcceleration(acceleration), "Acceleration set", "Acceleration failed")}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" disabled={!isConnected} onClick={() => runAction(setModeFree, "Free mode", "Free mode failed")} className="gap-2">
              <Play className="w-4 h-4" />
              Free
            </Button>
            <Button variant="secondary" disabled={!isConnected} onClick={() => runAction(setModeIdle, "Idle mode", "Idle mode failed")} className="gap-2">
              <Pause className="w-4 h-4" />
              Idle
            </Button>
            <Button variant="destructive" disabled={!isConnected} onClick={() => runAction(stop, "Stopped", "Stop failed")} className="gap-2">
              <Square className="w-4 h-4" />
              Stop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
