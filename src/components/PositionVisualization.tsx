import { cn } from '@/lib/utils';
import { useRef, type PointerEvent } from 'react';

interface PositionVisualizationProps {
  currentPosition: number;
  pointA: number;
  pointB: number;
  stepMarkers?: number[]; // For timelapse2 mode
  isRunning?: boolean;
  targetPercent?: number | null;
  interactive?: boolean;
  onSeek?: (percent: number) => void;
  onSeekPreview?: (percent: number) => void;
  className?: string;
}

export function PositionVisualization({
  currentPosition,
  pointA,
  pointB,
  stepMarkers = [],
  isRunning = false,
  targetPercent = null,
  interactive = false,
  onSeek,
  onSeekPreview,
  className,
}: PositionVisualizationProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  // Calculate positions as percentages (0-100 range assumed)
  const minPoint = Math.min(pointA, pointB);
  const maxPoint = Math.max(pointA, pointB);
  const range = maxPoint - minPoint;
  
  const getPercentage = (value: number) => {
    if (range === 0) return 50;
    return ((value - minPoint) / range) * 100;
  };

  const currentPercent = Math.max(0, Math.min(100, getPercentage(currentPosition)));
  const pointAPercent = getPercentage(pointA);
  const pointBPercent = getPercentage(pointB);

  const getPercentFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) {
      return 0;
    }
    const relativeX = clientX - rect.left;
    return Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    const percent = getPercentFromClientX(event.clientX);
    onSeekPreview?.(percent);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !isDraggingRef.current) return;
    const percent = getPercentFromClientX(event.clientX);
    onSeekPreview?.(percent);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !isDraggingRef.current) return;
    isDraggingRef.current = false;
    const percent = getPercentFromClientX(event.clientX);
    onSeekPreview?.(percent);
    onSeek?.(percent);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Labels */}
      <div className="flex justify-between mb-2 text-xs text-muted-foreground">
        <span>Position: {currentPosition.toFixed(1)}</span>
        <span>A: {pointA} | B: {pointB}</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className={cn(
          "relative h-8 bg-secondary rounded-md overflow-hidden",
          interactive && "cursor-crosshair touch-none"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Active range indicator */}
        <div
          className="absolute h-full bg-primary/20"
          style={{
            left: `${Math.min(pointAPercent, pointBPercent)}%`,
            width: `${Math.abs(pointBPercent - pointAPercent)}%`,
          }}
        />

        {/* Step markers for timelapse2 */}
        {stepMarkers.map((step, index) => (
          <div
            key={index}
            className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/30"
            style={{ left: `${getPercentage(step)}%` }}
          />
        ))}

        {/* Point A marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-point-a z-10"
          style={{ left: `${pointAPercent}%`, transform: 'translateX(-50%)' }}
        >
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-point-a">
            A
          </span>
        </div>

        {/* Point B marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-point-b z-10"
          style={{ left: `${pointBPercent}%`, transform: 'translateX(-50%)' }}
        >
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-point-b">
            B
          </span>
        </div>

        {/* Current position indicator */}
        <div
          className={cn(
            "absolute top-1 bottom-1 w-4 rounded-sm bg-accent z-20 transition-all duration-100",
            isRunning && "glow-accent"
          )}
          style={{ left: `${currentPercent}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      <div className="relative mt-2 h-2 rounded-full bg-secondary/70">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/20"
          style={{ width: `${currentPercent}%` }}
        />
        {targetPercent !== null && (
          <>
            <div
              className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-primary"
              style={{ left: `${targetPercent}%` }}
            />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-primary"
              style={{ left: `${targetPercent}%` }}
            />
          </>
        )}
      </div>

      {/* Scale */}
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>{minPoint}</span>
        <span>{maxPoint}</span>
      </div>
    </div>
  );
}
