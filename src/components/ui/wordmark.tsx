import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
}

export function Wordmark({ className }: WordmarkProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="font-serif italic text-[22px] leading-none text-ink">Améns</span>
      <span className="text-[9px] uppercase tracking-[0.32em] text-gold mt-1">Unidos pela fé</span>
    </div>
  );
}
