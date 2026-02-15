import { Target, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SliderStatus } from "@/components/SliderStatus";
import { useToast } from "@/hooks/use-toast";
import { goToPercent, setTargetPercentUi, useSliderStore } from "@/store/sliderStore";

export function PositionMode() {
  const { toast } = useToast();
  const isConnected = useSliderStore((s) => s.isConnected);
  const sliderState = useSliderStore((s) => s.sliderState);
  const targetPercentUi = useSliderStore((s) => s.targetPercentUi);
  const isCalibrated = sliderState.homed && sliderState.rightPoint > sliderState.leftPoint;

  const targetPercent =
    typeof targetPercentUi === "number"
      ? Math.max(0, Math.min(100, targetPercentUi))
      : Math.max(0, Math.min(100, sliderState.position));
  const showTargetValue = sliderState.mode === "goto" && sliderState.isMoving;

  const onGoTo = async (percent: number) => {
    const success = await goToPercent(percent, sliderState.gotoMaxVel);
    if (success) {
      toast({
        title: "Goto sent",
        description: `Moving to ${percent.toFixed(1)}%`,
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
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Target Position</Label>
              <span className="text-sm font-mono text-primary">
                {showTargetValue ? `${targetPercent.toFixed(1)}%` : "--"}
              </span>
            </div>
            <Slider
              value={[targetPercent]}
              onValueChange={([v]) => setTargetPercentUi(v)}
              onValueCommit={([v]) => onGoTo(v)}
              min={0}
              max={100}
              step={0.1}
              disabled={!isConnected || !isCalibrated}
            />
          </div>

          {!isCalibrated && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">
                Slider is not calibrated. Open Settings and run calibration first.
              </p>
            </div>
          )}

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
