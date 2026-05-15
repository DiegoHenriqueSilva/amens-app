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
  /** When true, renders as a full-width vertical list item instead of carousel card */
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-vellum border border-hairline rounded-lg p-4 text-left flex flex-col justify-between",
        listMode ? "w-full min-h-[auto] border-t border-x-0 border-b-0 rounded-none px-0 py-4" : "min-h-[160px] w-[180px] shrink-0",
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
