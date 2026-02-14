import { Target, Send, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PositionVisualization } from "@/components/PositionVisualization";
import { SliderStatus } from "@/components/SliderStatus";
import { useToast } from "@/hooks/use-toast";
import { goToPercent, useSliderStore } from "@/store/sliderStore";

export function PositionMode() {
  const { toast } = useToast();
  const isConnected = useSliderStore((s) => s.isConnected);
  const sliderState = useSliderStore((s) => s.sliderState);
  const [targetPercent, setTargetPercent] = useState(0);
  const isCalibrated = sliderState.homed && sliderState.rightPoint > sliderState.leftPoint;

  const onGoTo = async () => {
    const success = await goToPercent(targetPercent, sliderState.gotoMaxVel);
    if (success) {
      toast({
        title: "Goto sent",
        description: `Moving to ${targetPercent.toFixed(1)}%`,
      });
    } else {
      toast({
        title: "Goto failed",
        description: "Device rejected goto command",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <SliderStatus />

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Goto Mode
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Move to a specific target position between calibrated points.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <PositionVisualization
            currentPosition={sliderState.position}
            pointA={0}
            pointB={100}
          />

          {!isCalibrated && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">
                Slider is not calibrated. Open Settings and run calibration first.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Target Position</Label>
              <span className="text-sm font-mono text-primary">
                {targetPercent.toFixed(1)}%
              </span>
            </div>
            <Slider
              value={[targetPercent]}
              onValueChange={([value]) => setTargetPercent(value)}
              min={0}
              max={100}
              step={0.1}
              disabled={!isConnected}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Left Point (raw)</Label>
              <Input
                value={sliderState.leftPoint}
                readOnly
                className="font-mono bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Right Point (raw)</Label>
              <Input
                value={sliderState.rightPoint}
                readOnly
                className="font-mono bg-secondary border-border"
              />
            </div>
          </div>

          <Button
            onClick={onGoTo}
            disabled={!isConnected || !isCalibrated}
            className="w-full gap-2"
          >
            <Send className="w-4 h-4" />
            Go To Target
          </Button>

          {!isCalibrated && (
            <p className="text-xs text-center text-muted-foreground">
              Waiting for calibration status and valid endpoints from device.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
