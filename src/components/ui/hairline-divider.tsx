import { cn } from "@/lib/utils";

interface HairlineDividerProps {
  className?: string;
}

export function HairlineDivider({ className }: HairlineDividerProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-px bg-hairline" />
      <span className="text-gold text-[10px]">✦</span>
      <div className="flex-1 h-px bg-hairline" />
    </div>
  );
}
