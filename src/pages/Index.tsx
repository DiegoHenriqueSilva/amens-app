// src/pages/Index.tsx — version 2 (adds web sections from the prototype)
//
// What's new vs the version Claude Code shipped:
//   1. Rituals wrapped in a vellum container (with internal header + dividers)
//   2. Big black "Corrente de oração das 19h" banner below the hero
//   3. Community feed section: 3 recent intentions + filter chips
//   4. Footer with wordmark + secondary links
//
// Mobile layout untouched in spirit — extra sections degrade gracefully:
//   - Live banner becomes compact on mobile
//   - Community feed stays 1-column on mobile
//   - Footer hidden on mobile (BottomNav handles wayfinding)

import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scheduleDailyPromiseNotification } from "@/lib/notifications";
import { CompleteProfileDialog } from "@/components/CompleteProfileDialog";
import { AngelicalNotificationOverlay } from "@/components/AngelicalNotificationOverlay";
import PageTransition from "@/components/PageTransition";
import { Wordmark } from "@/components/ui/wordmark";
import { HeroCauseCard } from "@/components/ui/hero-cause-card";
import { RitualCard } from "@/components/ui/ritual-card";
import { LivePulse } from "@/components/ui/live-pulse";
import { JourneyDots } from "@/components/ui/journey-dots";
import { HairlineDivider } from "@/components/ui/hairline-divider";
import { FeedCard } from "@/components/ui/feed-card";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { cn } from "@/lib/utils";

type Cause = { id: string; title: string; description?: string; user_id: string };
type CauseAuthor = { firstName: string; city?: string; avatarUrl?: string };
type RitualItem = {
  kind: "Evangelho" | "Terço" | "Novena" | "Promessa";
  title: string;
  sub: string;
  duration: string;
  route: string;
  badge?: "hoje";
};
type FeedItem = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  authorName?: string;
  authorCity?: string;
  authorAvatar?: string;
  tag: string;
  praying: number;
};

const RITUALS: RitualItem[] = [
  { kind: "Evangelho", title: "Evangelho do Dia", sub: "Leitura e reflexão", duration: "~5 min", route: "/daily-gospel", badge: "hoje" },
  { kind: "Terço", title: "Sagrado Terço", sub: "Mistérios com voz", duration: "~20 min", route: "/rosary-selection" },
  { kind: "Novena", title: "Novenas", sub: "Devoção continuada", duration: "~10 min", route: "/novenas" },
  { kind: "Promessa", title: "Divina Promessa", sub: "Uma palavra para hoje", duration: "~2 min", route: "/divine-promise" },
];

const HIDDEN_PATHS = ["/auth"];

const FILTERS = ["Todas", "Saúde", "Família", "Trabalho", "Gratidão"];

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};
const getDateLabel = (): string => {
  const d = new Date();
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
};
const timeAgo = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
};

const Index = () => {
  const [firstName, setFirstName] = useState<string>("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cause, setCause] = useState<Cause | null>(null);
  const [causeAuthor, setCauseAuthor] = useState<CauseAuthor | null>(null);
  const [causeRemaining, setCauseRemaining] = useState<number | undefined>(undefined);
  const [daysJoined, setDaysJoined] = useState(0);
  const [causeSuggestion, setCauseSuggestion] = useState<string>("");
  const [activeIntercessionNotifId, setActiveIntercessionNotifId] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<string>("Todas");
  const navigate = useNavigate();
  const location = useLocation();
  const { completedTasks } = useDailyTasks();

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes("YOUR_")) return;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setUserId(session.user.id);
        scheduleDailyPromiseNotification();

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, avatar_url, created_at")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.first_name) setFirstName(profile.first_name);
        if (profile?.created_at) {
          const days = Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000));
          setDaysJoined(days);
        }

        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("is_read", false);
        if (count !== null) setUnreadCount(count);

        // Cause for hero
        const { data: causes } = await supabase
          .from("prayer_requests")
          .select("id, title, description, user_id")
          .eq("status", "active")
          .is("feedback", null)
          .neq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (causes && causes.length > 0) {
          const picked = causes[Math.floor(Math.random() * causes.length)];
          setCause(picked);
          setCauseRemaining(causes.length > 3 ? 2 : causes.length - 1);

          const { data: authorProfile } = await supabase
            .from("profiles")
            .select("first_name, avatar_url")
            .eq("id", picked.user_id)
            .maybeSingle();

          setCauseAuthor({
            firstName: authorProfile?.first_name || "Irmão",
            avatarUrl: authorProfile?.avatar_url ?? undefined,
          });

          setCauseSuggestion(
            "Senhor, conforta o coração de quem envia esta intenção. Que tua presença atravesse este momento e que a paz se manifeste na medida da fé. Amém.",
          );

          const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
          if (GEMINI_KEY) {
            fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Escreva uma sugestão de oração curta (máximo 3 frases, tom contemplativo e acolhedor) para esta intenção: "${picked.title}". Comece com "Senhor" ou "Pai". Retorne apenas o texto da oração, sem aspas ou introdução.` }] }],
              }),
            })
              .then((r) => r.json())
              .then((d) => {
                const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) setCauseSuggestion(text.trim());
              })
              .catch(() => {});
          }
        }

        // Community feed — latest 6 active intentions (used by filter)
        const { data: feedRows } = await supabase
          .from("prayer_requests")
          .select("id, title, user_id, created_at")
          .eq("status", "active")
          .neq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(6);

        if (feedRows && feedRows.length > 0) {
          const userIds = Array.from(new Set(feedRows.map((r) => r.user_id)));
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, city, avatar_url")
            .in("id", userIds);

          const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));

          // best-effort intercession count
          const { data: counts } = await supabase
            .from("prayer_intercessions")
            .select("prayer_request_id")
            .in("prayer_request_id", feedRows.map((r) => r.id));

          const countMap = new Map<string, number>();
          (counts || []).forEach((c: any) => {
            countMap.set(c.prayer_request_id, (countMap.get(c.prayer_request_id) || 0) + 1);
          });

          // Heuristic tagging — replace once tags exist on prayer_requests
          const tagFor = (title: string): string => {
            const t = title.toLowerCase();
            if (/(saúde|cirurgia|cura|hospital|doença|câncer|covid)/.test(t)) return "Saúde";
            if (/(família|filho|mãe|pai|esposo|esposa|irmão|irmã|avó|avô)/.test(t)) return "Família";
            if (/(trabalho|emprego|carreira|negócio|demissão|profissão)/.test(t)) return "Trabalho";
            if (/(graças|obrigad|gratid|recebi)/.test(t)) return "Gratidão";
            return "Paz";
          };

          setFeed(
            feedRows.map((r: any) => {
              const p: any = profMap.get(r.user_id);
              return {
                id: r.id,
                title: r.title,
                user_id: r.user_id,
                created_at: r.created_at,
                authorName: p?.first_name || "Irmão",
                authorCity: p?.city || undefined,
                authorAvatar: p?.avatar_url || undefined,
                tag: tagFor(r.title),
                praying: countMap.get(r.id) || 0,
              };
            }),
          );
        }
      } catch (e) {
        console.error("Index init error:", e);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        const storedRef = localStorage.getItem("fe_referrer");
        if (storedRef && storedRef !== session.user.id) {
          supabase.functions
            .invoke("process-referral", { body: { referrer_user_id: storedRef, referred_user_id: session.user.id } })
            .catch((e) => console.error("Referral process error:", e));
          localStorage.removeItem("fe_referrer");
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("online-users", { config: { presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        try { setOnlineCount(Object.keys(channel.presenceState()).length); } catch {}
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try { await channel.track({ online_at: new Date().toISOString() }); } catch {}
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notifId = params.get("intercession_id");
    if (notifId) {
      setActiveIntercessionNotifId(notifId);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location]);

  const filteredFeed = useMemo(() => {
    if (filter === "Todas") return feed.slice(0, 3);
    return feed.filter((f) => f.tag === filter).slice(0, 3);
  }, [feed, filter]);

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  return (
    <PageTransition>
      <CompleteProfileDialog />
      <AngelicalNotificationOverlay
        notificationId={activeIntercessionNotifId}
        onClose={() => setActiveIntercessionNotifId(null)}
      />

      <div className="min-h-screen pb-28 md:pb-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 pt-safe pt-4 pb-2">
          <Wordmark />
          <Link to="/profile" className="relative">
            <Bell size={20} strokeWidth={1.5} className="text-ink-soft" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-marian text-paper text-[8px] rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </header>

        <main className="px-5 md:px-12 max-w-7xl mx-auto">

          {/* ────────────────── HERO ROW (2 col on desktop) ────────────────── */}
          <div className="md:grid md:grid-cols-[1.55fr_1fr] md:gap-10 md:pt-8">

            {/* LEFT column */}
            <div>
              <div className="pt-5 pb-6 md:pt-0">
                <p className="text-[12px] text-ink-soft mb-3">
                  {getDateLabel()} · {getGreeting()}{firstName ? `, ${firstName}` : ""}.
                </p>
                <h1 className="font-serif text-[30px] md:text-[40px] leading-[1.1] text-ink">
                  Há uma intenção esperando<br />por você hoje.
                </h1>
              </div>

              {cause && causeAuthor ? (
                <HeroCauseCard
                  text={cause.title}
                  author={causeAuthor}
                  remaining={causeRemaining}
                  suggestion={causeSuggestion || undefined}
                  onClick={() => navigate(`/pray?id=${cause.id}`)}
                  className="mb-7"
                />
              ) : userId ? (
                <div className="bg-vellum border border-hairline rounded-xl shadow-card overflow-hidden mb-7">
                  <div className="md:grid md:grid-cols-2 md:divide-x md:divide-hairline">
                    <div className="px-6 pt-6 pb-5 md:py-8">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-gold text-[10px]">✦</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">Comunidade em silêncio</span>
                      </div>
                      <p className="font-serif text-[22px] md:text-[26px] leading-[1.25] text-ink">
                        "A oração em silêncio também é uma forma de comunhão."
                      </p>
                      <p className="text-[13px] text-ink-soft mt-5 leading-relaxed max-w-md">
                        Não há novas intenções neste momento. Que tal compartilhar a sua e
                        permitir que outros rezem com você?
                      </p>
                    </div>
                    <div className="hidden md:block px-6 py-8">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-gold text-[10px]">✦</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">Enquanto aguardamos</span>
                      </div>
                      <p className="font-serif italic text-[17px] leading-[1.55] text-ink-soft">
                        "Onde dois ou três estiverem reunidos em meu nome, ali estarei no meio deles." — Mt 18, 20
                      </p>
                      <p className="text-[11.5px] text-ink-soft/70 mt-4">Sua presença na rede já é oração.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/submit")}
                    className="w-full px-6 py-4 bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors flex items-center justify-between"
                  >
                    <span>Compartilhar uma intenção</span>
                    <span className="text-paper/60">→</span>
                  </button>
                </div>
              ) : null}

              {/* ────────────────── LIVE PRAYER BANNER ────────────────── */}
              <div className="bg-ink text-paper rounded-xl px-6 py-6 mb-8 flex items-center gap-5">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "#E89F4C", opacity: 0.2 }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#E89F4C" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#E89F4C" }}>Ao vivo</span>
                    {onlineCount > 0 && (
                      <span className="text-[10px] text-paper/45">· {onlineCount} {onlineCount === 1 ? "pessoa" : "pessoas"}</span>
                    )}
                  </div>
                  <p className="font-serif text-[20px] md:text-[22px] leading-tight">Corrente de oração ao vivo</p>
                  <p className="text-[12px] text-paper/65 mt-1">
                    {onlineCount > 0
                      ? `${onlineCount} ${onlineCount === 1 ? "irmão está rezando agora" : "irmãos estão rezando agora"}`
                      : "Junte-se à comunidade rezando agora"}
                  </p>
                </div>
                <Link
                  to="/prayer-chain"
                  className="shrink-0 px-5 py-2.5 rounded-full text-[13px] font-medium bg-paper text-ink hover:opacity-90 transition-opacity"
                >
                  Entrar
                </Link>
              </div>
            </div>

            {/* RIGHT column — Rituals (wrapped in vellum container) */}
            <div>
              {/* Mobile carousel — kept outside the container, full-bleed */}
              <div className="md:hidden">
                <div className="flex items-end justify-between pt-2 pb-3 border-b border-hairline">
                  <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">Rituais de hoje</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 hide-scrollbar mt-3">
                  {RITUALS.map((r) => (
                    <Link key={r.kind} to={r.route} className="shrink-0">
                      <RitualCard kind={r.kind} title={r.title} sub={r.sub} duration={r.duration} badge={r.badge} />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Desktop — vellum container with internal list */}
              <div className="hidden md:flex md:flex-col bg-vellum border border-hairline rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gold text-[10px]">✦</span>
                    <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">Rituais de hoje</span>
                  </div>
                  {userId && daysJoined > 0 && (
                    <span className="text-[11px] text-ink-soft">{daysJoined} dias na caminhada</span>
                  )}
                </div>
                <div className="px-6">
                  {RITUALS.map((r, i) => (
                    <Link key={r.kind} to={r.route} className={cn(
                      "flex items-center justify-between gap-4 py-4 group",
                      i > 0 && "border-t border-hairline",
                    )}>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase tracking-[0.24em] text-gold">{r.kind}</span>
                        <p className="font-serif text-[16px] leading-tight text-ink mt-0.5">{r.title}</p>
                        <p className="text-[11.5px] mt-0.5 text-ink-soft">{r.sub}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {r.badge && (
                          <span className="text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm bg-ink text-paper">{r.badge}</span>
                        )}
                        <span className="text-[11.5px] text-ink-soft whitespace-nowrap">{r.duration}</span>
                        <span className="text-ink-soft group-hover:text-ink transition-colors">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ────────────────── JOURNEY DOTS ────────────────── */}
          {userId && (
            <div className="mt-8">
              <HairlineDivider className="mb-5" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">Sua caminhada</span>
                <span className="text-[11px] text-ink-soft font-mono">{completedTasks.length} / 9 hoje</span>
              </div>
              <JourneyDots daysCompleted={completedTasks.length} total={9} />
            </div>
          )}

          {/* ────────────────── COMMUNITY FEED ────────────────── */}
          {feed.length > 0 && (
            <section className="mt-14 md:mt-16">
              <HairlineDivider className="mb-10 md:mb-12" />

              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Da comunidade</p>
                  <h2 className="font-serif text-[26px] md:text-[28px] text-ink leading-tight">Intenções recentes</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-ink-soft mr-1 hidden md:inline">Filtrar:</span>
                  {FILTERS.map((f) => {
                    const active = filter === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                          "text-[12px] px-3 py-1.5 rounded-full transition-colors border",
                          active
                            ? "bg-ink text-paper border-ink"
                            : "bg-transparent text-ink border-hairline hover:border-ink/40",
                        )}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                {filteredFeed.length > 0 ? (
                  filteredFeed.map((f) => (
                    <FeedCard
                      key={f.id}
                      name={f.authorName}
                      city={f.authorCity}
                      time={timeAgo(f.created_at)}
                      tag={f.tag}
                      text={f.title}
                      praying={f.praying}
                      gratitude={f.tag === "Gratidão"}
                      avatarUrl={f.authorAvatar}
                      onPray={() => navigate(`/pray?id=${f.id}`)}
                    />
                  ))
                ) : (
                  <div className="md:col-span-3 text-center py-12 text-[13px] text-ink-soft">
                    Nenhuma intenção em "{filter}" no momento.
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-center">
                <Link to="/community" className="text-[13px] text-marian hover:underline underline-offset-4 font-medium">
                  Ver todas as intenções →
                </Link>
              </div>
            </section>
          )}

          {!userId && (
            <div className="text-center mt-12">
              <button
                onClick={() => navigate("/auth")}
                className="h-12 px-8 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Entrar na comunidade
              </button>
            </div>
          )}

          {/* ────────────────── FOOTER (desktop) ────────────────── */}
          <footer className="hidden md:flex items-center justify-between mt-20 pt-8 pb-10 border-t border-hairline">
            <div className="flex items-center gap-4">
              <Wordmark />
              <span className="text-[11px] text-ink-soft hidden lg:inline">· feito com cuidado no Brasil</span>
            </div>
            <nav className="flex items-center gap-7 text-[12px] text-ink-soft">
              <Link to="/community" className="hover:text-ink transition-colors">Comunidade</Link>
              <Link to="/profile" className="hover:text-ink transition-colors">Diretrizes</Link>
              <a href="mailto:contato@amens.com.br" className="hover:text-ink transition-colors">Suporte</a>
              <a href="/privacy" className="hover:text-ink transition-colors">Privacidade</a>
            </nav>
          </footer>
        </main>
      </div>
    </PageTransition>
  );
};

export default Index;
