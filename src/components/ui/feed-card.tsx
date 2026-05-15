import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface FeedCardProps {
  name?: string;
  city?: string;
  time: string;
  tag: string;
  text: string;
  praying: number;
  anonymous?: boolean;
  gratitude?: boolean;
  avatarUrl?: string;
  onPray?: () => void;
  className?: string;
}

export function FeedCard({
  name,
  city,
  time,
  tag,
  text,
  praying,
  anonymous = false,
  gratitude = false,
  avatarUrl,
  onPray,
  className,
}: FeedCardProps) {
  const displayName = anonymous ? "Anônimo" : (name ?? "Anônimo");

  return (
    <div className={cn("bg-vellum border border-hairline rounded-xl overflow-hidden", className)}>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            {!anonymous && avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-hairline flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-ink-soft/40" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-ink leading-none">{displayName}</p>
              <p className="text-[11px] text-ink-soft mt-0.5">
                {city ? `${city} · ` : ""}{time}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm shrink-0",
              gratitude ? "text-gold border border-gold/40 bg-gold/5" : "text-marian border border-marian/30 bg-marian/5",
            )}
          >
            {tag}
          </span>
        </div>
        <p className="font-serif text-[15.5px] leading-[1.45] text-ink italic">"{text}"</p>
      </div>
      <div className="border-t border-dashed border-hairline px-5 py-3 flex items-center justify-between">
        <span className="text-[11px] text-ink-soft">
          {praying} {praying === 1 ? "pessoa rezou" : "pessoas rezaram"}
        </span>
        <button
          onClick={onPray}
          className="flex items-center gap-1 text-sm font-medium text-marian hover:underline underline-offset-4"
        >
          {gratitude ? "Celebrar" : "Rezar comigo"} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
