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
  onClick?: () => void;
  className?: string;
}

export function HeroCauseCard({ text, author, remaining, onClick, className }: HeroCauseCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "block w-full text-left bg-vellum border border-hairline rounded-xl overflow-hidden shadow-card",
        className,
      )}
    >
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-gold text-[10px]">✦</span>
          <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">
            Causa para interceder
          </span>
        </div>
        <p className="font-serif text-[22px] leading-[1.25] text-ink">"{text}"</p>
        <div className="flex items-center gap-2 mt-5">
          {author.avatarUrl ? (
            <img
              src={author.avatarUrl}
              alt={author.firstName}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-hairline flex items-center justify-center text-xs font-medium text-ink-soft">
              {author.firstName[0]}
            </div>
          )}
          <span className="text-sm text-ink-soft">
            {author.firstName}
            {author.age ? `, ${author.age}` : ""}
            {author.city ? ` · ${author.city}` : ""}
          </span>
        </div>
        {remaining !== undefined && (
          <p className="text-[11px] text-ink-soft mt-3">
            {remaining} de 3 restantes hoje
          </p>
        )}
      </div>
      <div className="px-6 py-4 bg-ink text-paper flex items-center justify-between">
        <span className="text-sm font-medium">Rezar com {author.firstName}</span>
        <ArrowRight size={18} />
      </div>
    </button>
  );
}
