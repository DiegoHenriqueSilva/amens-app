import { cn } from "@/lib/utils";

interface JourneyDotsProps {
  daysCompleted: number;
  total?: number;
  className?: string;
}

export function JourneyDots({ daysCompleted, total = 14, className }: JourneyDotsProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-2 rounded-full"
          style={{
            background: i < daysCompleted ? "hsl(var(--marian))" : "hsl(var(--hairline))",
            opacity: i < daysCompleted ? 0.35 + (i / total) * 0.65 : 1,
          }}
        />
      ))}
    </div>
  );
}
