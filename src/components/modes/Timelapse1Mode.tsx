import { Clock3, Play, Square, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SliderStatus } from "@/components/SliderStatus";
import { GimbalControls } from "@/components/modes/GimbalControls";
import { TimelapseGimbalEditor } from "@/components/modes/TimelapseGimbalEditor";
import {
  clearTl1Ui,
  setTl1GimbalPose,
  setTl1Ui,
  startTimelapse1,
  stop,
  useSliderStore,
} from "@/store/sliderStore";
import { useToast } from "@/hooks/use-toast";

type Tl1Phase = "idle" | "toA" | "ab";

const formatMmSs = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
};

export function Timelapse1Mode() {
  const { toast } = useToast();
  const isConnected = useSliderStore((s) => s.isConnected);
  const sliderState = useSliderStore((s) => s.sliderState);
  const tl1GimbalUi = useSliderStore((s) => s.tl1GimbalUi);
  const isCalibrated = sliderState.homed && sliderState.rightPoint > sliderState.leftPoint;

  const [startPercent, setStartPercent] = useState(0);
  const [endPercent, setEndPercent] = useState(100);
  const [totalSeconds, setTotalSeconds] = useState(
    Math.max(1, Math.round(sliderState.timelapse1TotalTimeMs / 1000)),
  );
  const [pingPong, setPingPong] = useState(sliderState.timelapse1PingPong);

  const [phase, setPhase] = useState<Tl1Phase>("idle");
  const [reachedStart, setReachedStart] = useState(false);
  const [travelStartedAtMs, setTravelStartedAtMs] = useState<number | null>(null);
  const [tickMs, setTickMs] = useState(Date.now());
  const [iteration, setIteration] = useState(0);
  const [legDirection, setLegDirection] = useState<"A->B" | "B->A">("A->B");

  const prevPositionRef = useRef<number | null>(null);
  const movementDirRef = useRef<number | null>(null);

  const totalTimeMs = Math.max(1000, Math.round(totalSeconds) * 1000);
  const isRunning = sliderState.mode === "timelapse1";

  useEffect(() => {
    setTl1Ui(startPercent, endPercent);
  }, [startPercent, endPercent]);

  useEffect(() => {
    return () => {
      clearTl1Ui();
    };
  }, []);

  useEffect(() => {
    if (phase !== "ab") {
      return;
    }
    const intervalId = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [phase]);

  useEffect(() => {
    if (sliderState.mode !== "timelapse1") {
      setPhase("idle");
      setReachedStart(false);
      setTravelStartedAtMs(null);
      setIteration(0);
      setLegDirection("A->B");
      prevPositionRef.current = null;
      movementDirRef.current = null;
      return;
    }

    const tolerance = 0.5;

    if (phase === "ab") {
      const previous = prevPositionRef.current;
      prevPositionRef.current = sliderState.position;

      if (previous === null) {
        return;
      }

      const delta = sliderState.position - previous;
      if (Math.abs(delta) < 0.02) {
        return;
      }

      const direction = delta > 0 ? 1 : -1;
      if (movementDirRef.current === null) {
        movementDirRef.current = direction;
        return;
      }

      const directionChanged = direction !== movementDirRef.current;
      const nearStart = Math.abs(sliderState.position - startPercent) <= tolerance;
      const nearEnd = Math.abs(sliderState.position - endPercent) <= tolerance;

      if (pingPong && directionChanged && (nearStart || nearEnd)) {
        movementDirRef.current = direction;
        setIteration((value) => value + 1);
        setLegDirection((value) => (value === "A->B" ? "B->A" : "A->B"));
        setTravelStartedAtMs(Date.now());
        setTickMs(Date.now());
        return;
      }

      movementDirRef.current = direction;
      return;
    }

    if (phase === "idle") {
      setPhase("toA");
    }

    const nearStart = Math.abs(sliderState.position - startPercent) <= tolerance;
    if (!reachedStart && nearStart) {
      setReachedStart(true);
      return;
    }

    if (!reachedStart) {
      return;
    }

    const movingAwayFromStart =
      endPercent >= startPercent
        ? sliderState.position > startPercent + tolerance
        : sliderState.position < startPercent - tolerance;

    if (movingAwayFromStart) {
      setPhase("ab");
      setIteration(1);
      setLegDirection("A->B");
      setTravelStartedAtMs(Date.now());
      setTickMs(Date.now());
      prevPositionRef.current = sliderState.position;
      movementDirRef.current = endPercent >= startPercent ? 1 : -1;
    }
  }, [
    sliderState.mode,
    sliderState.position,
    startPercent,
    endPercent,
    pingPong,
    phase,
    reachedStart,
  ]);

  const elapsedMs = useMemo(() => {
    if (phase !== "ab" || travelStartedAtMs === null) {
      return 0;
    }
    return Math.min(totalTimeMs, Math.max(0, tickMs - travelStartedAtMs));
  }, [phase, totalTimeMs, tickMs, travelStartedAtMs]);

  const elapsedSeconds = Math.round(elapsedMs / 1000);
  const remainingSeconds = Math.max(0, Math.round((totalTimeMs - elapsedMs) / 1000));
  const progressPercent = Math.max(0, Math.min(100, Math.round((elapsedMs / totalTimeMs) * 100)));

  const handleStart = async () => {
    const safeSeconds = Math.max(1, Math.round(totalSeconds));
    const success = await startTimelapse1({
      startPercent,
      endPercent,
      totalTimeMs: safeSeconds * 1000,
      pingpong: pingPong,
      gimbalA: tl1GimbalUi.a,
      gimbalB: tl1GimbalUi.b,
    });

    if (success) {
      setPhase("toA");
      setReachedStart(false);
      setTravelStartedAtMs(null);
      setIteration(0);
      setLegDirection("A->B");
      setTickMs(Date.now());
      prevPositionRef.current = null;
      movementDirRef.current = null;
    }

    toast({
      title: success ? "Timelapse1 started" : "Timelapse1 failed",
      description: success
        ? `Running ${startPercent.toFixed(1)}% -> ${endPercent.toFixed(1)}% in ${safeSeconds}s${pingPong ? " (ping-pong)" : ""}`
        : "Command was rejected by device",
      variant: success ? "default" : "destructive",
    });
  };

  const handleStop = async () => {
    const success = await stop();
    if (success) {
      setPhase("idle");
      setReachedStart(false);
      setTravelStartedAtMs(null);
      setIteration(0);
      setLegDirection("A->B");
      prevPositionRef.current = null;
      movementDirRef.current = null;
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
            <Clock3 className="w-4 h-4 text-primary" />
            Timelapse 1
          </CardTitle>
          <p className="text-xs text-muted-foreground">Move A to B in a fixed total duration.</p>
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

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Total Time (seconds)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={Math.max(1, Math.round(totalSeconds))}
              onChange={(e) => setTotalSeconds(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="bg-secondary border-border font-mono"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Ping-Pong</Label>
              <p className="text-xs text-muted-foreground">Repeat by swapping A/B after each leg</p>
            </div>
            <Switch checked={pingPong} onCheckedChange={setPingPong} />
          </div>

          <div className="grid grid-cols-4 gap-2 rounded-md bg-secondary/40 px-3 py-2 text-xs">
            <div>
              <div className="text-muted-foreground">Elapsed</div>
              <div className="font-mono text-primary">{formatMmSs(elapsedSeconds)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Left</div>
              <div className="font-mono text-primary">{formatMmSs(remainingSeconds)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Progress</div>
              <div className="font-mono text-primary">{progressPercent}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Iteration</div>
              <div className="font-mono text-primary">{iteration > 0 ? `${iteration} (${legDirection})` : "-"}</div>
            </div>
          </div>

          {isRunning ? (
            <Button variant="destructive" onClick={handleStop} disabled={!isConnected} className="w-full gap-2">
              <Square className="w-4 h-4" />
              Stop
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={!isConnected || !isCalibrated || totalSeconds < 1} className="w-full gap-2">
              <Play className="w-4 h-4" />
              Start
            </Button>
          )}
        </CardContent>
      </Card>

      {isConnected && <GimbalControls showLiveControlSections={false} />}
      {isConnected && (
        <TimelapseGimbalEditor
          title="Timelapse Gimbal Endpoints"
          description="Set gimbal A/B poses, including focus, for interpolation during the TL1 move."
          poses={tl1GimbalUi}
          onChange={setTl1GimbalPose}
        />
      )}
    </div>
  );
}
