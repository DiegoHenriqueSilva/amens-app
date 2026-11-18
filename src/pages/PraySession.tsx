import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Clock, Heart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PrayerCauseCard } from '@/components/prayer/PrayerCauseCard';
import { DailyIntercessions } from '@/components/prayer/DailyIntercessions';
import { PRAYER_REACTIONS, usePrayerEngagement } from '@/components/PrayerEngagement';
import { FriendSelector } from '@/components/FriendSelector';
import { ReportPrayerDialog } from '@/components/ReportPrayerDialog';
import { InviteGatePopup } from '@/components/InviteGatePopup';
import PageTransition from '@/components/PageTransition';
import { usePrayerDailyLimit } from '@/hooks/use-prayer-daily-limit';
import { useDailyTasks } from '@/hooks/use-daily-tasks';
import { useFaithPoints } from '@/hooks/use-faith-points';
import { usePushPrompt } from '@/contexts/PushPromptContext';
import { refreshAltar } from '@/features/altar/events';
import { DEFAULT_PRAYERS } from '@/data/default-prayers';
import { formatFullDatetime } from '@/lib/utils';
import { isPrayerConcluded } from '@/lib/prayer-status';
import {
  isGeneralIntentionId,
  isPrayerId,
  prayerFailureMessage,
  prayerOperation,
  sharePrayer,
  type PrayerCause,
} from '@/lib/prayer-flow';

interface HistoryItem {
  id: string;
  prayer_request_id: string;
  created_at: string;
  cause: PrayerCause | null;
}
const FEEDBACK: Record<string, { label: string; emoji: string }> = {
  success: { label: 'Deu certo, obrigado pelas orações!', emoji: '🎉' },
  grace_received: { label: 'Consegui a graça solicitada, obrigado!', emoji: '⭐' },
  not_this_time: { label: 'Não foi desta vez, mas obrigado pelas preces!', emoji: '🙏' },
  god_knows: { label: 'Não deu certo, mas agradeço pelas orações.', emoji: '✝️' },
  keep_trying: { label: 'Vou continuar tentando. Obrigado pelas orações.', emoji: '🙏' },
};
const defaultCause = (id: string): PrayerCause | null => {
  const intention = DEFAULT_PRAYERS.find((item) => item.id === id);
  return intention
    ? {
        ...intention,
        display_name: intention.author_display_name,
        is_friend: false,
        is_owner: false,
        has_interceded: false,
        user_reaction: null,
      }
    : null;
};

export default function PraySession({ currentUser }: { currentUser: User | null }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const linkId = params.get('id') || params.get('intention');
  const [cause, setCause] = useState<PrayerCause | null>(null);
  const [loading, setLoading] = useState(Boolean(linkId));
  const [busy, setBusy] = useState<string | null>(null);
  const actionLock = useRef(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [shared, setShared] = useState(Boolean(linkId));
  const [suggestion, setSuggestion] = useState('');
  const [generating, setGenerating] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const historyOpener = useRef<HTMLElement | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  const localLink = useRef<string | null>(null);
  const view = useRef(0);
  const allowance = usePrayerDailyLimit(currentUser?.id ?? null);
  const counts = usePrayerEngagement(cause && !cause.is_default ? [cause.id] : [], revision);
  const { completeTask } = useDailyTasks();
  const { addFaithPoints } = useFaithPoints();
  const { triggerPushPrompt } = usePushPrompt();
  const reducedMotion = useReducedMotion();
  const userId = currentUser?.id;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const login = () =>
    navigate(`/auth?redirect=${encodeURIComponent(`/pray${window.location.search}`)}`);
  const display = (next: PrayerCause | null) => {
    view.current++;
    setCause(next);
    setSuggestion('');
    setGenerating(false);
    setPageError(null);
  };
  const syncLink = (next: PrayerCause) => {
    const query = new URLSearchParams(params);
    query.delete('id');
    query.delete('intention');
    query.delete('from');
    query.set(next.is_default ? 'intention' : 'id', next.id);
    if (linkId !== next.id) localLink.current = next.id;
    setParams(query, { replace: true });
  };
  const refreshAllowance = () => {
    void allowance.refresh().catch(() => undefined);
  };

  useEffect(() => {
    if (linkId && localLink.current === linkId) {
      localLink.current = null;
      return;
    }
    const request = ++view.current;
    let active = true;
    setCause(null);
    setSuggestion('');
    setPageError(null);
    setShared(Boolean(linkId));
    setGenerating(false);
    if (!linkId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        let next: PrayerCause | null;
        if (isGeneralIntentionId(linkId)) {
          next = defaultCause(linkId);
          if (userId && next) {
            const result = await supabase.rpc('general_intention_reaction', {
              p_intention_id: linkId,
            });
            if (result.error) throw result.error;
            next.user_reaction = result.data;
          }
        } else {
          if (!isPrayerId(linkId)) throw new Error('prayer_unavailable');
          const result = await supabase.rpc('get_prayer_cause', { p_prayer_id: linkId });
          if (result.error) throw result.error;
          next = result.data as PrayerCause | null;
        }
        if (!next) throw new Error('prayer_unavailable');
        if (active && view.current === request) setCause(next);
      } catch {
        if (active && view.current === request)
          setPageError('Esta causa não está disponível. Nenhuma intercessão foi registrada.');
      } finally {
        if (active && view.current === request) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [linkId, userId]);

  async function receive(target?: string) {
    if (!currentUser) {
      login();
      return;
    }
    if (actionLock.current) return;
    const request = view.current;
    actionLock.current = true;
    setBusy('receive');
    setPageError(null);
    const operation = prayerOperation(
      sessionStorage,
      `amens:receive:${currentUser.id}:${target || 'random'}`,
    );
    try {
      const { data, error } = await supabase.rpc('receive_prayer_cause', {
        p_operation_id: operation.id,
        p_prayer_id: target ?? null,
      });
      if (error) throw error;
      if (!alive.current || view.current !== request) return;
      operation.acknowledge();
      if (data.unavailable) throw new Error('prayer_unavailable');
      let next = data.cause as PrayerCause | null;
      if (!next) {
        next = defaultCause(DEFAULT_PRAYERS[Math.floor(Math.random() * DEFAULT_PRAYERS.length)].id);
        const reaction = await supabase.rpc('general_intention_reaction', {
          p_intention_id: next!.id,
        });
        if (reaction.error) throw reaction.error;
        if (!alive.current || view.current !== request) return;
        next!.user_reaction = reaction.data;
        toast.info(
          'Por enquanto, acolha esta intenção geral. Ela não conta nas intercessões diárias.',
        );
      }
      if (next) syncLink(next);
      display(next);
      setShared(false);
      setRevision((value) => value + 1);
      refreshAllowance();
      refreshAltar();
      if (data.recorded) {
        void completeTask('pray_cause');
        triggerPushPrompt(
          'Deseja acompanhar os próximos retornos desta causa? Você pode ativar as notificações.',
        );
      }
    } catch (error) {
      if (alive.current && view.current === request) {
        setPageError(prayerFailureMessage(error));
        refreshAllowance();
      }
    } finally {
      if (alive.current) setBusy(null);
      actionLock.current = false;
    }
  }

  async function loadHistory(append = false) {
    if (!currentUser || historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const cursor = append ? history.at(-1) : undefined;
      const { data, error } = await supabase.rpc('get_my_prayer_history', {
        p_before: cursor?.created_at ?? null,
        p_before_id: cursor?.id ?? null,
      });
      if (error) throw error;
      if (!alive.current) return;
      const rows = data as HistoryItem[];
      setHistory((previous) => (append ? [...previous, ...rows.slice(0, 20)] : rows.slice(0, 20)));
      setHasMore(rows.length > 20);
    } catch {
      if (alive.current) setHistoryError(true);
    } finally {
      if (alive.current) setHistoryLoading(false);
    }
  }

  async function reopen(item: HistoryItem) {
    if (actionLock.current) return;
    const request = view.current;
    actionLock.current = true;
    setBusy('history');
    try {
      const result = await supabase.rpc('get_prayer_cause', {
        p_prayer_id: item.prayer_request_id,
      });
      if (result.error) throw result.error;
      if (!result.data) throw new Error('prayer_unavailable');
      if (alive.current && view.current === request) {
        syncLink(result.data as PrayerCause);
        display(result.data as PrayerCause);
        setShared(false);
        setHistoryOpen(false);
      }
    } catch (error) {
      if (alive.current) toast.error(prayerFailureMessage(error));
    } finally {
      actionLock.current = false;
      if (alive.current) setBusy(null);
    }
  }

  async function react(type: string, target = cause) {
    if (!target) return;
    if (!currentUser) {
      login();
      return;
    }
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy('reaction');
    const desired = target.user_reaction === type ? null : type;
    try {
      const result = target.is_default
        ? await supabase.rpc('general_intention_reaction', {
            p_intention_id: target.id,
            p_reaction: desired,
            p_write: true,
          })
        : await supabase.rpc('set_prayer_reaction', {
            p_prayer_id: target.id,
            p_reaction: desired,
          });
      if (result.error) throw result.error;
      if (!alive.current) return;
      setCause((previous) =>
        previous?.id === target.id ? { ...previous, user_reaction: result.data } : previous,
      );
      setHistory((previous) =>
        previous.map((item) =>
          item.cause?.id === target.id
            ? { ...item, cause: { ...item.cause, user_reaction: result.data } }
            : item,
        ),
      );
      setRevision((value) => value + 1);
      toast.success(desired ? 'Reação enviada.' : 'Reação removida.');
      if (desired) {
        const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
          new Date(),
        );
        const key = `amens_react_faith_points_${currentUser.id}_${day}`;
        if (!localStorage.getItem(key)) {
          void addFaithPoints('react');
          localStorage.setItem(key, '1');
        }
      }
    } catch (error) {
      if (alive.current) toast.error(prayerFailureMessage(error));
    } finally {
      actionLock.current = false;
      if (alive.current) setBusy(null);
    }
  }

  async function invite(ids: string[]) {
    if (!currentUser || !cause || actionLock.current) return false;
    actionLock.current = true;
    setBusy('invite');
    const recipients = [...new Set(ids)].sort();
    const operation = prayerOperation(
      sessionStorage,
      `amens:invite:${currentUser.id}:${cause.id}:${recipients.join(',')}`,
    );
    try {
      const { data, error } = await supabase.rpc('invite_prayer_friends', {
        p_prayer_id: cause.is_default ? null : cause.id,
        p_intention_id: cause.is_default ? cause.id : null,
        p_recipients: recipients,
        p_operation_id: operation.id,
      });
      if (error) throw error;
      operation.acknowledge();
      if (!alive.current) return false;
      toast.success(`Convite enviado para ${data} ${data === 1 ? 'amigo' : 'amigos'}.`);
      setFriendsOpen(false);
      void completeTask('share_cause');
      return true;
    } catch (error) {
      if (alive.current) toast.error(prayerFailureMessage(error));
      return false;
    } finally {
      actionLock.current = false;
      if (alive.current) setBusy(null);
    }
  }

  async function externalShare() {
    if (!cause || actionLock.current) return;
    actionLock.current = true;
    setBusy('share');
    try {
      // Only the public link leaves the app. Its server projection rechecks access on opening.
      if (!alive.current) return;
      const result = await sharePrayer(cause, {
        share: navigator.share?.bind(navigator),
        open: (url) => window.open(url, '_blank'),
      });
      if (!alive.current) return;
      if (result === 'shared') void completeTask('share_cause');
      if (result === 'opened') toast.info('WhatsApp aberto. Confirme o envio por lá.');
      if (result === 'blocked')
        toast.error(
          'O navegador bloqueou a janela de compartilhamento. Permita a abertura e tente novamente.',
        );
    } catch (error) {
      if (alive.current) toast.error(prayerFailureMessage(error));
    } finally {
      actionLock.current = false;
      if (alive.current) setBusy(null);
    }
  }

  async function generate() {
    if (!cause || generating) return;
    if (!currentUser) {
      login();
      return;
    }
    const request = view.current;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-prayer', {
        body: { kind: 'prayer', causeId: cause.id },
      });
      if (error || !data?.prayer) throw error || new Error('Empty suggestion');
      if (alive.current && view.current === request) setSuggestion(data.prayer);
    } catch {
      if (alive.current && view.current === request)
        toast.error(
          'A sugestão está indisponível agora. Você pode orar com suas próprias palavras e tentar novamente depois.',
        );
    } finally {
      if (alive.current && view.current === request) setGenerating(false);
    }
  }

  const dailyIntercessions = currentUser && (
    <DailyIntercessions {...allowance} onRetry={refreshAllowance} />
  );
  const canReceive = Boolean(
    currentUser && !busy && !allowance.loading && !allowance.error && !allowance.isLimitReached,
  );
  const animation = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };
  return (
    <PageTransition>
      <div className="cause-page min-h-full relative pb-8">
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-2xl mx-auto mb-6">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Voltar ao início"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            {pageError && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-card p-4 text-foreground"
              >
                <p>{pageError}</p>
                {linkId && !cause && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setParams({}, { replace: true })}
                  >
                    Voltar para receber causas
                  </Button>
                )}
                {cause && (
                  <Button variant="ghost" onClick={() => setPageError(null)}>
                    Fechar aviso
                  </Button>
                )}
              </div>
            )}
            {loading ? (
              <p role="status" className="py-12 text-center">
                Carregando causa…
              </p>
            ) : !cause ? (
              <motion.div {...animation}>
                <h1 className="text-4xl font-bold text-center mb-3">Orar por uma Causa</h1>
                <p className="text-center text-muted-foreground mb-6">
                  Seja um instrumento da graça divina
                </p>
                <Card className="p-6 sm:p-10 text-center soft-shadow border-primary/10 space-y-4">
                  <Sparkles className="w-12 h-12 text-primary mx-auto" />
                  {currentUser ? (
                    <Button
                      onClick={() => receive()}
                      disabled={!canReceive || Boolean(linkId)}
                      className="w-full min-h-16 h-auto whitespace-normal rounded-2xl bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] font-bold text-lg"
                    >
                      {busy === 'receive' ? 'Buscando…' : 'Receber uma Causa'}
                    </Button>
                  ) : (
                    <>
                      <p>
                        Entre na sua conta para receber uma causa e acompanhar suas intercessões.
                      </p>
                      <Button
                        onClick={login}
                        className="bg-[#e8c547] text-[#3d2800] hover:bg-[#f2d36b]"
                      >
                        Entrar ou criar conta
                      </Button>
                    </>
                  )}
                  {dailyIntercessions}
                </Card>
              </motion.div>
            ) : (
              <motion.div {...animation} className="space-y-6">
                {shared && (
                  <div className="rounded-2xl border border-primary/20 bg-card p-4 text-center space-y-3">
                    <p>Uma intenção compartilhada com você.</p>
                    {!cause.is_default && !isPrayerConcluded(cause) && !cause.is_owner && (
                      <Button
                        onClick={() => receive(cause.id)}
                        disabled={
                          Boolean(busy) ||
                          Boolean(
                            currentUser &&
                            (allowance.loading ||
                              allowance.error ||
                              (allowance.isLimitReached && !cause.has_interceded)),
                          )
                        }
                        className="h-auto min-h-11 whitespace-normal bg-[#e8c547] text-[#3d2800] hover:bg-[#f2d36b]"
                      >
                        {busy === 'receive'
                          ? 'Confirmando…'
                          : currentUser
                            ? cause.has_interceded
                              ? 'Retomar esta intercessão'
                              : 'Aceitar interceder'
                            : 'Entrar para interceder'}
                      </Button>
                    )}
                  </div>
                )}
                {cause.is_default && (
                  <div
                    role="status"
                    className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center text-sm"
                  >
                    Intenção geral · não conta nas intercessões diárias.
                  </div>
                )}
                <PrayerCauseCard
                  cause={cause}
                  counts={counts[cause.id]}
                  activeReaction={cause.user_reaction}
                  isGenerating={generating}
                  isBusy={Boolean(busy)}
                  canViewIntercessors={cause.is_owner}
                  feedback={FEEDBACK[cause.feedback ?? '']}
                  onReaction={react}
                  onSuggestion={generate}
                  onNext={!shared || cause.is_default ? () => receive() : undefined}
                  nextDisabled={!canReceive}
                  onFriendShare={() => (currentUser ? setFriendsOpen(true) : login())}
                  onExternalShare={externalShare}
                  onReport={
                    !cause.is_default
                      ? () => (currentUser ? setReportOpen(true) : login())
                      : undefined
                  }
                />
                {dailyIntercessions}
                {suggestion && (
                  <section className="devotional-cause-suggestion" aria-live="polite">
                    <h3>Sugestão de Oração</h3>
                    <p>{suggestion}</p>
                    <small>Texto de apoio gerado por IA. Adapte às suas palavras e à sua fé.</small>
                  </section>
                )}
              </motion.div>
            )}
            <Button
              variant="outline"
              className="w-full h-auto min-h-12 whitespace-normal"
              onClick={() => {
                if (!currentUser) {
                  login();
                  return;
                }
                setHistoryOpen(true);
                void loadHistory();
              }}
            >
              <Clock className="mr-2 w-4 h-4 shrink-0" />
              Ver minhas intercessões anteriores
            </Button>
          </div>
          <InviteGatePopup isAuthenticated={Boolean(currentUser)} />
          <FriendSelector
            open={friendsOpen}
            onOpenChange={setFriendsOpen}
            onSelect={invite}
            excludedIds={currentUser ? [currentUser.id] : []}
            maxSelected={20}
            isSubmitting={busy === 'invite'}
          />
          <ReportPrayerDialog
            open={reportOpen}
            prayerRequestId={cause?.is_default ? null : (cause?.id ?? null)}
            onClose={() => setReportOpen(false)}
            onConfirmed={() => {
              setReportOpen(false);
              display(null);
              setShared(false);
              setParams({}, { replace: true });
              toast.info('Denúncia enviada. Sua intercessão permanece no histórico.');
            }}
          />
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogContent
              className="max-w-2xl max-h-[85dvh] overflow-y-auto"
              onOpenAutoFocus={() => {
                historyOpener.current = document.activeElement as HTMLElement;
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                historyOpener.current?.focus();
              }}
            >
              <DialogHeader>
                <DialogTitle>Suas intercessões</DialogTitle>
                <DialogDescription>
                  Releia suas causas sem registrar outra intercessão.
                </DialogDescription>
              </DialogHeader>
              {historyError && (
                <div role="alert">
                  <p>Não foi possível carregar o histórico.</p>
                  <Button variant="outline" onClick={() => loadHistory(history.length > 0)}>
                    Tentar novamente
                  </Button>
                </div>
              )}
              {!historyLoading && !historyError && history.length === 0 && (
                <p>Você ainda não assumiu nenhuma causa.</p>
              )}
              {history.map((item) => (
                <details
                  key={item.id}
                  className="rounded-2xl border border-primary/15 p-4 min-w-0 break-words"
                >
                  <summary className="cursor-pointer min-h-11">
                    <strong>
                      {item.cause?.title ||
                        (item.cause ? 'Pedido de oração' : 'Causa indisponível')}
                    </strong>
                    <span className="block text-xs text-muted-foreground">
                      {item.cause?.display_name} · Assumida em {formatFullDatetime(item.created_at)}
                    </span>
                  </summary>
                  {item.cause ? (
                    <div className="mt-4 space-y-3">
                      <p className="whitespace-pre-wrap">{item.cause.content}</p>
                      {isPrayerConcluded(item.cause) ? (
                        <p>
                          {FEEDBACK[item.cause.feedback ?? '']?.label ||
                            'Esta causa foi encerrada.'}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {PRAYER_REACTIONS.map((reaction) => (
                            <button
                              type="button"
                              key={reaction.type}
                              aria-label={reaction.label}
                              aria-pressed={item.cause!.user_reaction === reaction.type}
                              disabled={Boolean(busy)}
                              onClick={() => react(reaction.type, item.cause)}
                              className="min-w-11 min-h-11 rounded-xl border p-2 focus-visible:outline focus-visible:outline-primary"
                            >
                              {reaction.emoji}
                              <span className="sr-only">{reaction.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        disabled={Boolean(busy)}
                        onClick={() => reopen(item)}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        {isPrayerConcluded(item.cause) ? 'Ver causa e retorno' : 'Orar novamente'}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Esta causa foi removida, restringida ou está em revisão.
                    </p>
                  )}
                </details>
              ))}
              {historyLoading && <p role="status">Carregando histórico…</p>}
              {hasMore && !historyLoading && (
                <Button variant="outline" onClick={() => loadHistory(true)}>
                  Carregar mais
                </Button>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PageTransition>
  );
}
