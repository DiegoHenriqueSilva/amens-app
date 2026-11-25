import { Clock3, Heart, Info, Sparkles } from 'lucide-react';
import type { PrayerDailyLimit } from '@/hooks/use-prayer-daily-limit';
import './daily-intercessions.css';

type Props = Partial<PrayerDailyLimit> & {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function DailyIntercessions({
  loading,
  error,
  remaining,
  limit,
  isAdmin,
  nextBonusLevel,
  resetsAt,
  onRetry,
}: Props) {
  const available = Math.max(0, remaining ?? 0);
  const resetLabel = resetsAt
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(resetsAt))
    : '00h';

  return (
    <section
      className="daily-intercessions"
      aria-label="Intercessões diárias"
      aria-live="polite"
      aria-busy={loading}
    >
      <div className="daily-intercessions__heading">
        <Heart aria-hidden="true" />
        <h2>Intercessões diárias</h2>
      </div>
      {loading ? (
        <div className="daily-intercessions__loading" role="status">
          <span className="daily-intercessions__skeleton" aria-hidden="true" />
          <span className="sr-only">Carregando intercessões diárias.</span>
        </div>
      ) : error || (!isAdmin && (remaining == null || limit == null)) ? (
        <div className="daily-intercessions__error" role="status">
          <p>Não conseguimos carregar suas intercessões diárias.</p>
          <button type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="daily-intercessions__summary">
            <div className="daily-intercessions__count">
              <strong>
                {isAdmin ? 'Sem limite diário' : `${available} de ${limit} disponíveis`}
              </strong>
              <span>
                {isAdmin
                  ? 'Para sua conta de administrador'
                  : available === 0
                    ? 'Retome suas causas no histórico'
                    : 'Para acolher novas causas hoje'}
              </span>
            </div>
          </div>
          {nextBonusLevel && !isAdmin && (
            <p className="daily-intercessions__bonus">
              <Sparkles aria-hidden="true" />
              <span>
                No nível <strong>{nextBonusLevel}</strong>, +1 intercessão por dia.
              </span>
            </p>
          )}
          <div className="daily-intercessions__footer">
            <details className="daily-intercessions__details">
              <summary className="daily-intercessions__help">
                <Info aria-hidden="true" />
                Como funciona
              </summary>
              <div className="daily-intercessions-help">
                <p>Receber ou assumir uma causa registra uma intercessão e usa uma das intercessões disponíveis no dia. Reler o histórico não registra outra.</p>
              </div>
            </details>
            {!isAdmin && (
              <time
                className="daily-intercessions__reset"
                dateTime={resetsAt}
                title={`Próxima renovação: ${resetLabel} (São Paulo)`}
              >
                <Clock3 aria-hidden="true" />
                <span>
                  Renova às <strong>00h</strong>
                  <small>São Paulo</small>
                </span>
              </time>
            )}
          </div>
        </>
      )}
    </section>
  );
}
