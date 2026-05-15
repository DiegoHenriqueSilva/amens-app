import { cn } from "@/lib/utils";

interface LivePulseProps {
  className?: string;
}

export function LivePulse({ className }: LivePulseProps) {
  return (
    <div className={cn("relative w-10 h-10 flex items-center justify-center", className)}>
      <div className="absolute inset-0 rounded-full animate-ping bg-marian opacity-10" />
      <div className="w-2.5 h-2.5 rounded-full bg-marian" />
    </div>
  );
}
