import { Target, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionVisualization } from "@/components/PositionVisualization";
import { SliderStatus } from "@/components/SliderStatus";
import { useToast } from "@/hooks/use-toast";
import { goToPercent, useSliderStore } from "@/store/sliderStore";

export function PositionMode() {
  const { toast } = useToast();
  const isConnected = useSliderStore((s) => s.isConnected);
  const sliderState = useSliderStore((s) => s.sliderState);
  const [targetPercent, setTargetPercent] = useState<number | null>(null);
  const isCalibrated = sliderState.homed && sliderState.rightPoint > sliderState.leftPoint;

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
          <PositionVisualization
            currentPosition={sliderState.position}
            pointA={0}
            pointB={100}
            targetPercent={targetPercent}
            interactive={isConnected && isCalibrated}
            onSeekPreview={setTargetPercent}
            onSeek={onGoTo}
          />

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
