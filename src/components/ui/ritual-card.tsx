import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type RitualKind = "Evangelho" | "Terço" | "Novena" | "Promessa";

interface RitualCardProps {
  kind: RitualKind;
  title: string;
  sub: string;
  duration: string;
  badge?: "hoje";
  progress?: number; // 0–1
  onClick?: () => void;
  className?: string;
  /** When true, renders as a full-width horizontal list item */
  listMode?: boolean;
}

export function RitualCard({
  kind,
  title,
  sub,
  duration,
  badge,
  progress,
  onClick,
  className,
  listMode = false,
}: RitualCardProps) {
  if (listMode) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full py-4 border-b border-hairline text-left flex items-center justify-between gap-4 group",
          className,
        )}
      >
        <div className="min-w-0">
          <span className="text-[9px] uppercase tracking-[0.24em] text-gold">{kind}</span>
          <p className="font-serif text-[15px] leading-tight text-ink mt-0.5">{title}</p>
          <p className="text-[11px] mt-0.5 text-ink-soft truncate">{sub}</p>
          {typeof progress === "number" && (
            <div className="mt-2 h-1 w-20 rounded-full bg-hairline">
              <div
                className="h-1 rounded-full bg-marian transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className="text-[8px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm bg-ink text-paper">
              {badge}
            </span>
          )}
          <span className="text-[11px] text-ink-soft whitespace-nowrap">{duration}</span>
          <ChevronRight size={15} className="text-hairline group-hover:text-ink-soft transition-colors" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-vellum border border-hairline rounded-lg p-4 text-left flex flex-col justify-between min-h-[160px] w-[180px] shrink-0",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.24em] text-gold">{kind}</span>
        {badge && (
          <span className="text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm bg-ink text-paper">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="font-serif text-base leading-tight text-ink">{title}</p>
        <p className="text-xs mt-1 text-ink-soft">{sub}</p>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-3">
          <div className="h-1 rounded-full bg-hairline">
            <div
              className="h-1 rounded-full bg-marian transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-[10px] mt-1.5 text-ink-soft">{duration}</p>
        </div>
      ) : (
        <p className="text-[10px] mt-3 text-ink-soft">{duration}</p>
      )}
    </button>
  );
}
