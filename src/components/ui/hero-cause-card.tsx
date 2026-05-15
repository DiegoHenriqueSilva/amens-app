import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroCauseCardUser {
  firstName: string;
  city?: string;
  age?: number;
  avatarUrl?: string;
}

interface HeroCauseCardProps {
  text: string;
  author: HeroCauseCardUser;
  remaining?: number;
  /** AI-generated prayer suggestion shown on the right panel (desktop only) */
  suggestion?: string;
  onClick?: () => void;
  className?: string;
}

export function HeroCauseCard({ text, author, remaining, suggestion, onClick, className }: HeroCauseCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "block w-full text-left bg-vellum border border-hairline rounded-xl overflow-hidden shadow-card group",
        className,
      )}
    >
      {/* Body — single column on mobile, two columns on desktop when suggestion available */}
      <div className={cn(
        suggestion ? "md:grid md:grid-cols-2 md:divide-x md:divide-hairline" : "",
      )}>
        {/* Left panel — always visible */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gold text-[10px]">✦</span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">
              Causa para interceder
            </span>
          </div>
          <p className="font-serif text-[22px] md:text-[24px] leading-[1.25] text-ink">
            "{text}"
          </p>
          <div className="flex items-center gap-2 mt-5">
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.firstName}
                className="w-7 h-7 rounded-full object-cover border border-hairline"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-hairline flex items-center justify-center text-xs font-medium text-ink-soft">
                {author.firstName[0]}
              </div>
            )}
            <span className="text-[13px] text-ink-soft">
              {author.firstName}
              {author.age ? `, ${author.age}` : ""}
              {author.city ? ` · ${author.city}` : ""}
            </span>
          </div>
          {remaining !== undefined && remaining > 0 && (
            <p className="text-[11px] text-ink-soft mt-3">
              +{remaining} mais à espera hoje
            </p>
          )}
        </div>

        {/* Right panel — suggestion, desktop only */}
        {suggestion && (
          <div className="hidden md:block px-6 pt-6 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gold text-[10px]">✦</span>
              <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">
                Sugestão de oração
              </span>
            </div>
            <p className="font-serif italic text-[17px] leading-[1.55] text-ink-soft">
              {suggestion}
            </p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-6 py-4 bg-ink text-paper flex items-center justify-between group-hover:bg-ink/90 transition-colors">
        <span className="text-sm font-medium">Rezar com {author.firstName}</span>
        <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}
