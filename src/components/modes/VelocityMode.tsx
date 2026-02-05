import { Gauge, Play, Square, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {useSliderStore, PlayMode, setVelocity, setEnabled} from '@/store/sliderStore';
import { PositionVisualization } from '@/components/PositionVisualization';
import { SliderStatus } from '@/components/SliderStatus';
import { useToast } from '@/hooks/use-toast';

export function VelocityMode() {
  const { toast } = useToast();
  // const {
  //   velocityMode,
  //   sliderState,
  //   settings,
  //   connection,
  //   updateVelocityMode,
  //   setVelocity,
  //   startVelocityMode,
  //   stopVelocityMode,
  //   enableDriver,
  //   disableDriver,
  //   setStandstillMode,
  // } = useSliderStore();
  const velocityMode = useSliderStore(s => s.velocityMode)
  const sliderState = useSliderStore(s => s.sliderState)

  const handleStart = async () => {
    // const success = await startVelocityMode();
    // if (success) {
    //   toast({ title: 'Started', description: 'Velocity mode activated' });
    // }
  };

  const handleStop = async () => {
    // const success = await stopVelocityMode();
    // if (success) {
    //   toast({ title: 'Stopped', description: 'Movement stopped' });
    // }
  };

  const handleSpeedChange = async (value: number) => {
    // updateVelocityMode({ speed: value });
    // if (velocityMode.isRunning && connection.isConnected) {
    await setEnabled(true);
      await setVelocity({velocity: value});
    // }
  };

  const handleDriverToggle = async (enabled: boolean) => {
    // if (enabled) {
    //   await enableDriver();
    // } else {
    //   await disableDriver();
    // }
  };

  const handleFreeMode = async () => {
    // await setStandstillMode('free');
    // toast({ title: 'Free Mode', description: 'Slider is now free to move manually' });
  };

  return (
    <div className="space-y-4">
      {/* Slider Status */}
      <SliderStatus />

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            Velocity Mode
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Control slider speed directly with stall detection behavior
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Position Visualization */}
          {/*<PositionVisualization*/}
          {/*  currentPosition={sliderState.position}*/}
          {/*  pointA={0}*/}
          {/*  pointB={100}*/}
          {/*  isRunning={velocityMode.isRunning}*/}
          {/*/>*/}

          {/* Current Velocity Display */}
          <div className="flex items-center justify-center p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-primary">
                {sliderState.velocity.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Current Velocity</div>
            </div>
          </div>

          {/* Speed Control */}
          <div className="space-y-3">
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
              />
            </div>

            {/*<div className="space-y-2">*/}
              {/*<div className="flex justify-between">*/}
              {/*  <Label className="text-xs text-muted-foreground">Acceleration</Label>*/}
              {/*  <span className="text-xs font-mono text-primary">{velocityMode.acceleration}%</span>*/}
              {/*</div>*/}
              {/*<Slider*/}
              {/*  value={[velocityMode.acceleration]}*/}
              {/*  onValueChange={([v]) => updateVelocityMode({ acceleration: v })}*/}
              {/*  min={1}*/}
              {/*  max={100}*/}
              {/*  step={1}*/}
              {/*  disabled={velocityMode.isRunning}*/}
              {/*/>*/}
            {/*</div>*/}

            {/*<div className="space-y-2">*/}
            {/*  <div className="flex justify-between">*/}
            {/*    <Label className="text-xs text-muted-foreground">Deceleration</Label>*/}
            {/*    <span className="text-xs font-mono text-primary">{velocityMode.deceleration}%</span>*/}
            {/*  </div>*/}
              {/*<Slider*/}
              {/*  value={[velocityMode.deceleration]}*/}
              {/*  onValueChange={([v]) => updateVelocityMode({ deceleration: v })}*/}
              {/*  min={1}*/}
              {/*  max={100}*/}
              {/*  step={1}*/}
              {/*  disabled={velocityMode.isRunning}*/}
              {/*/>*/}
            {/*</div>*/}
          </div>

          {/* Stall Behavior */}
          {/*<div className="space-y-2">*/}
          {/*  <Label className="text-xs text-muted-foreground">On Stall Detected</Label>*/}
          {/*  <Select*/}
          {/*    value={velocityMode.playMode}*/}
          {/*    onValueChange={(v) => updateVelocityMode({ playMode: v as PlayMode })}*/}
          {/*    disabled={velocityMode.isRunning}*/}
          {/*  >*/}
          {/*    <SelectTrigger className="bg-secondary border-border h-9">*/}
          {/*      <SelectValue />*/}
          {/*    </SelectTrigger>*/}
          {/*    <SelectContent>*/}
          {/*      <SelectItem value="ping-pong">Reverse (Ping-Pong)</SelectItem>*/}
          {/*      <SelectItem value="loop">Stop</SelectItem>*/}
          {/*    </SelectContent>*/}
          {/*  </Select>*/}
          {/*</div>*/}

          {/* Free Mode Button */}
          {/*<Button*/}
          {/*  variant="outline"*/}
          {/*  onClick={handleFreeMode}*/}
          {/*  disabled={!connection.isConnected || velocityMode.isRunning}*/}
          {/*  className="w-full gap-2"*/}
          {/*>*/}
          {/*  <Unlock className="w-4 h-4" />*/}
          {/*  Enable Free Mode*/}
          {/*</Button>*/}

          {/* Driver Enable */}
          {/*<div className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border">*/}
          {/*  <div>*/}
          {/*    <Label className="text-sm">Enable Driver</Label>*/}
          {/*    <p className="text-xs text-muted-foreground">Motor power control</p>*/}
          {/*  </div>*/}
          {/*  <Switch*/}
          {/*    checked={sliderState.driverEnabled}*/}
          {/*    onCheckedChange={handleDriverToggle}*/}
          {/*    disabled={!connection.isConnected}*/}
          {/*  />*/}
          {/*</div>*/}

          {/* Control Buttons */}
          <div className="flex gap-3">
            {/*{velocityMode.isRunning ? (*/}
            {/*  <Button*/}
            {/*    variant="destructive"*/}
            {/*    size="lg"*/}
            {/*    onClick={handleStop}*/}
            {/*    disabled={!isConnected}*/}
            {/*    className="flex-1 gap-2 h-12"*/}
            {/*  >*/}
            {/*    <Square className="w-5 h-5" />*/}
            {/*    Stop*/}
            {/*  </Button>*/}
            {/*) : (*/}
            {/*  <Button*/}
            {/*    size="lg"*/}
            {/*    onClick={handleStart}*/}
            {/*    disabled={!isConnected}*/}
            {/*    className="flex-1 gap-2 h-12 bg-primary hover:bg-primary/90 glow-primary"*/}
            {/*  >*/}
            {/*    <Play className="w-5 h-5" />*/}
            {/*    Start*/}
            {/*  </Button>*/}
            {/*)}*/}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
