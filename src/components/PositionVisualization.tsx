import { cn } from '@/lib/utils';

interface PositionVisualizationProps {
  currentPosition: number;
  pointA: number;
  pointB: number;
  stepMarkers?: number[]; // For timelapse2 mode
  isRunning?: boolean;
  className?: string;
}

export function PositionVisualization({
  currentPosition,
  pointA,
  pointB,
  stepMarkers = [],
  isRunning = false,
  className,
}: PositionVisualizationProps) {
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

  return (
    <div className={cn("relative", className)}>
      {/* Labels */}
      <div className="flex justify-between mb-2 text-xs text-muted-foreground">
        <span>Position: {currentPosition.toFixed(1)}</span>
        <span>A: {pointA} | B: {pointB}</span>
      </div>

      {/* Track */}
      <div className="relative h-8 bg-secondary rounded-md overflow-hidden">
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

      {/* Scale */}
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>{minPoint}</span>
        <span>{maxPoint}</span>
      </div>
    </div>
  );
}
