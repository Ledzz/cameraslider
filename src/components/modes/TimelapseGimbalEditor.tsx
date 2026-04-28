import { Camera, Crosshair, Focus, Save } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { captureCurrentGimbalPose, GimbalPose, useSliderStore } from "@/store/sliderStore";

type Endpoint = "a" | "b";

interface TimelapseGimbalEditorProps {
  title: string;
  description: string;
  poses: {
    a: GimbalPose;
    b: GimbalPose;
  };
  onChange: (endpoint: Endpoint, pose: GimbalPose) => void;
}

const AXIS_CONFIG = [
  { key: "yaw" as const, label: "Yaw", min: -180, max: 180, step: 0.1, suffix: "°" },
  { key: "roll" as const, label: "Roll", min: -30, max: 30, step: 0.1, suffix: "°" },
  { key: "pitch" as const, label: "Pitch", min: -30, max: 30, step: 0.1, suffix: "°" },
  { key: "focus" as const, label: "Focus", min: 0, max: 1000, step: 1, suffix: "" },
];

function EndpointEditor({
  endpoint,
  pose,
  onChange,
}: {
  endpoint: Endpoint;
  pose: GimbalPose;
  onChange: (pose: GimbalPose) => void;
}) {
  const { toast } = useToast();
  const gimbalState = useSliderStore((s) => s.gimbalState);
  const canCapture = gimbalState.connected && !gimbalState.connecting;

  const handleCapture = () => {
    const nextPose = captureCurrentGimbalPose();
    onChange(nextPose);
    toast({
      title: `Gimbal ${endpoint.toUpperCase()} captured`,
      description: `Saved yaw ${nextPose.yaw.toFixed(1)}°, roll ${nextPose.roll.toFixed(1)}°, pitch ${nextPose.pitch.toFixed(1)}°, focus ${nextPose.focus}`,
    });
  };

  return (
    <div className="rounded-md border border-border bg-secondary/20 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Gimbal {endpoint.toUpperCase()}</div>
          <div className="text-xs text-muted-foreground">Stored endpoint pose for this timelapse leg.</div>
        </div>
        <Button variant="outline" size="sm" onClick={handleCapture} disabled={!canCapture} className="gap-2">
          <Save className="w-4 h-4" />
          Set {endpoint.toUpperCase()} From Current
        </Button>
      </div>

      {AXIS_CONFIG.map((axis) => {
        const value = pose[axis.key];
        return (
          <div className="space-y-2" key={`${endpoint}-${axis.key}`}>
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">{axis.label}</Label>
              <span className="text-xs font-mono text-primary">
                {axis.key === "focus" ? `${Math.round(value)}` : `${value.toFixed(1)}${axis.suffix}`}
              </span>
            </div>
            <Slider
              value={[value]}
              onValueChange={([nextValue]) =>
                onChange({
                  ...pose,
                  [axis.key]: axis.key === "focus" ? Math.round(nextValue) : nextValue,
                })
              }
              min={axis.min}
              max={axis.max}
              step={axis.step}
            />
          </div>
        );
      })}
    </div>
  );
}

export function TimelapseGimbalEditor({ title, description, poses, onChange }: TimelapseGimbalEditorProps) {
  const gimbalState = useSliderStore((s) => s.gimbalState);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <EndpointEditor endpoint="a" pose={poses.a} onChange={(pose) => onChange("a", pose)} />
          <EndpointEditor endpoint="b" pose={poses.b} onChange={(pose) => onChange("b", pose)} />
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-md bg-secondary/30 p-3">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Crosshair className="h-4 w-4 text-primary" />
              Orientation
            </div>
            <div className="mt-1">A/B each include yaw, roll, and pitch.</div>
          </div>
          <div className="rounded-md bg-secondary/30 p-3">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Focus className="h-4 w-4 text-primary" />
              Focus
            </div>
            <div className="mt-1">Focus is included per endpoint and interpolated during the run.</div>
          </div>
          <div className="rounded-md bg-secondary/30 p-3">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Save className="h-4 w-4 text-primary" />
              Capture
            </div>
            <div className="mt-1">
              {gimbalState.connected
                ? "Use the capture buttons to pull the current live gimbal pose into A or B."
                : "Connect the gimbal bridge to capture the current pose, or enter values manually."}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
