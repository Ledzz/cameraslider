import { useState } from "react";
import {
  Aperture,
  BatteryCharging,
  Camera,
  Crosshair,
  Power,
  RotateCcw,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  gimbalConnect,
  gimbalDisconnect,
  gimbalFocusZero,
  gimbalRecenter,
  gimbalSetAngle,
  gimbalSetFocusTarget,
  gimbalShutter,
  gimbalSleep,
  gimbalWake,
  useSliderStore,
} from "@/store/sliderStore";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function GimbalControls({ showLiveControlSections = true }: { showLiveControlSections?: boolean }) {
  const { toast } = useToast();
  const isConnected = useSliderStore((s) => s.isConnected);
  const gimbalState = useSliderStore((s) => s.gimbalState);

  const [yaw, setYaw] = useState(0);
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [focusTarget, setFocusTarget] = useState(0);

  const canRequestConnect = isConnected && !gimbalState.connected && !gimbalState.connecting;
  const canControlGimbal = isConnected && gimbalState.connected && !gimbalState.connecting;

  const runAction = async (
    action: () => Promise<boolean>,
    successTitle: string,
    successDescription: string,
    failureTitle: string,
  ) => {
    const success = await action();
    toast({
      title: success ? successTitle : failureTitle,
      description: success ? successDescription : "Device rejected the gimbal request",
      variant: success ? "default" : "destructive",
    });
  };

  const handleSendAngle = async () => {
    await runAction(
      () => gimbalSetAngle({ yaw, roll, pitch }),
      "Angle sent",
      `Yaw ${yaw.toFixed(1)}°, Roll ${roll.toFixed(1)}°, Pitch ${pitch.toFixed(1)}°`,
      "Angle send failed",
    );
  };

  const handleFocusCommit = async (value: number) => {
    const safeValue = clamp(Math.round(value), 0, 1000);
    setFocusTarget(safeValue);
    await runAction(
      () => gimbalSetFocusTarget(safeValue),
      "Focus target sent",
      `Estimated focus position set to ${safeValue}`,
      "Focus command failed",
    );
  };

  const connectionBadge = gimbalState.connected
    ? { label: "Connected", variant: "default" as const }
    : gimbalState.connecting
      ? { label: "Connecting", variant: "secondary" as const }
      : { label: "Disconnected", variant: "outline" as const };

  const sleepBadge = gimbalState.sleeping
    ? { label: "Sleeping", variant: "secondary" as const }
    : { label: "Awake", variant: "outline" as const };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            Gimbal Status
          </CardTitle>
          <CardDescription>
            The slider stays paired with the web app while its BLE client bridges commands to the gimbal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={connectionBadge.variant}>{connectionBadge.label}</Badge>
            <Badge variant={sleepBadge.variant}>{sleepBadge.label}</Badge>
            {gimbalState.focusInitialized && <Badge variant="outline">Focus Ready</Badge>}
            {gimbalState.hasError && <Badge variant="destructive">Bridge Error</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="text-xs text-muted-foreground">Bridge Link</div>
              <div className="mt-1 flex items-center gap-2 font-medium">
                {gimbalState.connected ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                <span>{gimbalState.connected ? "Gimbal online" : gimbalState.connecting ? "Connecting..." : "Waiting for connect"}</span>
              </div>
            </div>

            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="text-xs text-muted-foreground">Battery</div>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <BatteryCharging className="h-4 w-4 text-primary" />
                <span>{gimbalState.batteryKnown ? `${gimbalState.batteryLevel}%` : "Unknown"}</span>
              </div>
            </div>

            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="text-xs text-muted-foreground">Yaw / Roll / Pitch</div>
              <div className="mt-1 font-mono text-sm">
                {gimbalState.orientationKnown
                  ? `${gimbalState.yaw.toFixed(1)}° / ${gimbalState.roll.toFixed(1)}° / ${gimbalState.pitch.toFixed(1)}°`
                  : "Waiting for telemetry"}
              </div>
            </div>

            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="text-xs text-muted-foreground">Focus Estimate</div>
              <div className="mt-1 font-mono text-sm">{gimbalState.focusEstimate} / 1000</div>
            </div>
          </div>

          {gimbalState.hasError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {gimbalState.error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Power className="w-4 h-4 text-primary" />
            Gimbal Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => void runAction(gimbalConnect, "Connect requested", "Bridge is scanning for a gimbal", "Connect request failed")}
              disabled={!canRequestConnect}
              className="gap-2"
            >
              <Wifi className="w-4 h-4" />
              Connect
            </Button>
            <Button
              variant="outline"
              onClick={() => void runAction(gimbalDisconnect, "Disconnect requested", "Bridge will close the gimbal link", "Disconnect request failed")}
              disabled={!isConnected || gimbalState.connecting || !gimbalState.connected}
              className="gap-2"
            >
              <WifiOff className="w-4 h-4" />
              Disconnect
            </Button>
            <Button
              variant="secondary"
              onClick={() => void runAction(gimbalRecenter, "Recenter sent", "Gimbal recenter command queued", "Recenter failed")}
              disabled={!canControlGimbal}
              className="gap-2"
            >
              <Crosshair className="w-4 h-4" />
              Recenter
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void runAction(
                  gimbalState.sleeping ? gimbalWake : gimbalSleep,
                  gimbalState.sleeping ? "Wake sent" : "Sleep sent",
                  gimbalState.sleeping ? "Gimbal wake command queued" : "Gimbal sleep command queued",
                  gimbalState.sleeping ? "Wake failed" : "Sleep failed",
                )
              }
              disabled={!canControlGimbal}
              className="gap-2"
            >
              <Power className="w-4 h-4" />
              {gimbalState.sleeping ? "Wake" : "Sleep"}
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => void runAction(gimbalShutter, "Shutter sent", "Shutter command queued", "Shutter failed")}
            disabled={!canControlGimbal}
            className="w-full gap-2"
          >
            <Aperture className="w-4 h-4" />
            Trigger Shutter
          </Button>
        </CardContent>
      </Card>

      {showLiveControlSections && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Angle Control
            </CardTitle>
            <CardDescription>Absolute angle commands sent through the slider bridge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Yaw</Label>
                <span className="text-sm font-mono text-primary">{yaw.toFixed(1)}°</span>
              </div>
              <Slider value={[yaw]} onValueChange={([v]) => setYaw(v)} min={-180} max={180} step={0.1} disabled={!canControlGimbal} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Roll</Label>
                <span className="text-sm font-mono text-primary">{roll.toFixed(1)}°</span>
              </div>
              <Slider value={[roll]} onValueChange={([v]) => setRoll(v)} min={-30} max={30} step={0.1} disabled={!canControlGimbal} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Pitch</Label>
                <span className="text-sm font-mono text-primary">{pitch.toFixed(1)}°</span>
              </div>
              <Slider value={[pitch]} onValueChange={([v]) => setPitch(v)} min={-30} max={30} step={0.1} disabled={!canControlGimbal} />
            </div>

            <Button onClick={() => void handleSendAngle()} disabled={!canControlGimbal} className="w-full gap-2">
              <Send className="w-4 h-4" />
              Send Angle
            </Button>
          </CardContent>
        </Card>
      )}

      {showLiveControlSections && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Focus Control
            </CardTitle>
            <CardDescription>Estimated focus position only. This does not read true lens position.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Focus Target</Label>
                <span className="text-sm font-mono text-primary">{focusTarget}</span>
              </div>
              <Slider
                value={[focusTarget]}
                onValueChange={([v]) => setFocusTarget(Math.round(v))}
                onValueCommit={([v]) => void handleFocusCommit(v)}
                min={0}
                max={1000}
                step={1}
                disabled={!canControlGimbal}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => void handleFocusCommit(focusTarget)}
                disabled={!canControlGimbal}
                className="flex-1 gap-2"
              >
                <Send className="w-4 h-4" />
                Send Focus
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void runAction(
                    gimbalFocusZero,
                    "Estimate zeroed",
                    "Focus estimate reset to 0",
                    "Focus zero failed",
                  )
                }
                disabled={!canControlGimbal}
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Zero Estimate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
