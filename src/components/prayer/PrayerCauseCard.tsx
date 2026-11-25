import { useState, type ComponentProps } from "react";
import { Check, ChevronRight, Clock, Flag, Heart, MapPin, Share2, Sparkles, Users } from "lucide-react";
import { PrayerEngagement, PRAYER_REACTIONS } from "@/components/PrayerEngagement";
import { formatFullDatetime } from "@/lib/utils";
import { isPrayerConcluded } from "@/lib/prayer-status";
import "./prayer-cause.css";

interface Cause {
  id?: string;
  status?: string;
  title?: string | null;
  content: string;
  display_name?: string;
  avatar_url?: string | null;
  is_friend?: boolean;
  is_anonymous?: boolean;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  location?: string | null;
  feedback?: string | null;
}

interface Props {
  cause: Cause;
  counts?: ComponentProps<typeof PrayerEngagement>["counts"];
  activeReaction: string | null;
  isGenerating: boolean;
  isBusy?: boolean;
  nextDisabled?: boolean;
  feedback?: { emoji: string; label: string };
  onReaction: (type: string) => void;
  onSuggestion: () => void;
  onNext?: () => void;
  onFriendShare: () => void;
  onExternalShare: () => void;
  onReport?: () => void;
  canViewIntercessors?: boolean;
}

/** Presentation only. The page retains all authentication, queries and mutations.
 * Native elements deliberately avoid the global .amens-card/.amens-button skin.
 */
export function PrayerCauseCard({ cause, counts, activeReaction, isGenerating, isBusy, nextDisabled, feedback, onReaction, onSuggestion, onNext, onFriendShare, onExternalShare, onReport, canViewIntercessors }: Props) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  return (
    <article className="devotional-cause" aria-labelledby="cause-request-title" aria-busy={isBusy}>
      <header className="devotional-cause__ribbon">
        <h1>Orar por uma Causa</h1>
        <p>Seja um instrumento da graça divina</p>
        <div className="devotional-cause__ornament" aria-hidden="true">
          <span />
          <svg viewBox="0 0 40 40" fill="none">
            <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 27V7c0-2.5-3-2.8-3.5-.5L13 19l-3 5-4 4 7 6 5-5c.6-.6 1-1.2 1-2Z" />
              <path d="m16 14-1.5 10-3 4M6 28l-2 3 7 6 2-3M21 27V7c0-2.5 3-2.8 3.5-.5L27 19l3 5 4 4-7 6-5-5c-.6-.6-1-1.2-1-2Z" />
              <path d="m24 14 1.5 10 3 4M34 28l2 3-7 6-2-3" />
            </g>
          </svg>
          <span />
        </div>
      </header>

      <div className="devotional-cause__body">
        <div className="devotional-cause__author">
          {cause.avatar_url && !cause.is_anonymous && cause.avatar_url !== failedAvatar ? (
            <img className="devotional-cause__avatar" src={cause.avatar_url} onError={() => setFailedAvatar(cause.avatar_url ?? null)} alt={`Foto de ${cause.display_name || "quem solicitou a oração"}`} />
          ) : (
            <span className="devotional-cause__avatar devotional-cause__avatar--placeholder" aria-hidden="true">
              <Heart />
            </span>
          )}
          <div>
            <h2 id="cause-request-title">{cause.title || "Pedido de oração"}</h2>
            <div className="devotional-cause__byline">
              <p>Oração solicitada por {cause.display_name || "Um fiel"}</p>
              {cause.is_friend && !cause.is_anonymous && <span className="devotional-cause__friend">Amigo <Heart aria-hidden="true" /></span>}
            </div>
          </div>
        </div>

        <p className="devotional-cause__writing">{cause.content}</p>

        <div className="devotional-cause__metadata">
          <div className="devotional-cause__dates">
            {cause.created_at && <p title={formatFullDatetime(cause.created_at)}><Clock aria-hidden="true" /><span>Solicitado em:</span> <time dateTime={cause.created_at}>{new Date(cause.created_at).toLocaleDateString("pt-BR")}</time></p>}
            {cause.feedback && cause.updated_at && <p className="devotional-cause__returned" title={formatFullDatetime(cause.updated_at)}><Check aria-hidden="true" /><span>Retorno em:</span> <time dateTime={cause.updated_at}>{new Date(cause.updated_at).toLocaleDateString("pt-BR")}</time></p>}
          </div>
          {cause.location && <p className="devotional-cause__location"><MapPin aria-hidden="true" />{cause.location}</p>}
        </div>

        <div className="devotional-cause__engagement"><PrayerEngagement counts={counts} prayerId={cause.id} canViewIntercessors={canViewIntercessors} /></div>

        <section className="devotional-cause__solidarity" aria-label="Envie Energia e Solidariedade">
          <h3>Envie Energia e Solidariedade</h3>
          {isPrayerConcluded(cause) ? (
            <div className="devotional-cause__feedback" role="status">
              <span aria-hidden="true">{feedback?.emoji || "🙏"}</span>
              <p>{feedback?.label || "Esta causa já foi encerrada. Obrigado pelas orações!"}</p>
              <small>Interações desativadas</small>
            </div>
          ) : (
            <div className="devotional-cause__reactions">
              {PRAYER_REACTIONS.map(reaction => (
                <button type="button" key={reaction.type} disabled={isBusy} className="devotional-cause__reaction" aria-pressed={activeReaction === reaction.type} onClick={() => onReaction(reaction.type)}>
                  <span aria-hidden="true">{reaction.emoji}</span>
                  <span>{reaction.label}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="devotional-cause__actions" aria-label="Ações para esta causa">
          <div className={`devotional-cause__primary-actions${onNext ? "" : " devotional-cause__primary-actions--single"}`}>
          <button type="button" className="devotional-cause__action devotional-cause__action--suggestion" disabled={isGenerating || isBusy} onClick={onSuggestion}>
            <Sparkles aria-hidden="true" /><span>{isGenerating ? "Gerando..." : "Sugestão de Oração"}</span>
          </button>
          {onNext && <button type="button" disabled={isBusy || nextDisabled} className="devotional-cause__action devotional-cause__action--next" onClick={onNext}>
            <ChevronRight aria-hidden="true" /><span>Próxima Causa</span>
          </button>}
          </div>
          <div className="devotional-cause__sharing-actions">
          <button type="button" disabled={isBusy} className="devotional-cause__action devotional-cause__action--friend" onClick={onFriendShare}>
            <Users aria-hidden="true" /><span>Enviar a um amigo do Améns</span>
          </button>
          <button type="button" disabled={isBusy} className="devotional-cause__action devotional-cause__action--share" onClick={onExternalShare}>
            <Share2 aria-hidden="true" /><span>Compartilhar fora do Améns</span>
          </button>
          </div>
        </div>

        {onReport && <button type="button" disabled={isBusy} className="devotional-cause__report" onClick={onReport}><Flag aria-hidden="true" /><span>Reportar essa causa a um administrador</span></button>}
      </div>
    </article>
  );
}
