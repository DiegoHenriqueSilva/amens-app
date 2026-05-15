import { useEffect, useState } from "react";
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
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { cn } from "@/lib/utils";

type Cause = {
  id: string;
  title: string;
  description?: string;
  user_id: string;
};

type CauseAuthor = {
  firstName: string;
  city?: string;
  avatarUrl?: string;
};

type RitualItem = {
  kind: "Evangelho" | "Terço" | "Novena" | "Promessa";
  title: string;
  sub: string;
  duration: string;
  route: string;
  badge?: "hoje";
};

const RITUALS: RitualItem[] = [
  { kind: "Evangelho", title: "Evangelho do Dia", sub: "Leitura e reflexão", duration: "~5 min", route: "/daily-gospel", badge: "hoje" },
  { kind: "Terço", title: "Sagrado Terço", sub: "Mistérios com voz", duration: "~20 min", route: "/rosary-selection" },
  { kind: "Novena", title: "Novenas", sub: "Devoção continuada", duration: "~10 min", route: "/novenas" },
  { kind: "Promessa", title: "Divina Promessa", sub: "Uma palavra para hoje", duration: "~2 min", route: "/divine-promise" },
];

const HIDDEN_PATHS = ["/auth"];

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

const Index = () => {
  const [firstName, setFirstName] = useState<string>("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cause, setCause] = useState<Cause | null>(null);
  const [causeAuthor, setCauseAuthor] = useState<CauseAuthor | null>(null);
  const [causeRemaining, setCauseRemaining] = useState<number | undefined>(undefined);
  const [daysJoined, setDaysJoined] = useState(0);
  const [activeIntercessionNotifId, setActiveIntercessionNotifId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { completedTasks } = useDailyTasks();

  // Fetch session + profile
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

        // Fetch one random active cause (not own)
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
        }
      } catch (e) {
        console.error("Index init error:", e);
      }
    };

    init();

    // Referral handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        const storedRef = localStorage.getItem("fe_referrer");
        if (storedRef && storedRef !== session.user.id) {
          supabase.functions
            .invoke("process-referral", {
              body: { referrer_user_id: storedRef, referred_user_id: session.user.id },
            })
            .catch((e) => console.error("Referral process error:", e));
          localStorage.removeItem("fe_referrer");
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Realtime presence
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        try {
          const count = Object.keys(channel.presenceState()).length;
          setOnlineCount(count);
        } catch (e) {}
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.track({ online_at: new Date().toISOString() });
          } catch (e) {}
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Intercession notification from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notifId = params.get("intercession_id");
    if (notifId) {
      setActiveIntercessionNotifId(notifId);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location]);

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  return (
    <PageTransition>
      <CompleteProfileDialog />
      <AngelicalNotificationOverlay
        notificationId={activeIntercessionNotifId}
        onClose={() => setActiveIntercessionNotifId(null)}
      />

      <div className="min-h-screen pb-28 md:pb-12">

        {/* Mobile header — hidden on desktop (TopBar handles it) */}
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

        {/* Main content */}
        <main className="px-5 md:px-12 max-w-6xl mx-auto">

          {/* Desktop: 2-column layout */}
          <div className="md:grid md:grid-cols-[1.55fr_1fr] md:gap-10 md:pt-8">

            {/* LEFT column (mobile: full) */}
            <div>
              {/* Greeting */}
              <div className="pt-5 pb-6 md:pt-0">
                <p className="text-[12px] text-ink-soft mb-3">
                  {getDateLabel()} · {getGreeting()}{firstName ? `, ${firstName}` : ""}.
                </p>
                <h1 className="font-serif text-[30px] leading-[1.1] text-ink">
                  Há uma intenção esperando<br />por você hoje.
                </h1>
              </div>

              {/* Hero cause card */}
              {cause && causeAuthor && (
                <HeroCauseCard
                  text={cause.title}
                  author={causeAuthor}
                  remaining={causeRemaining}
                  onClick={() => navigate(`/pray?id=${cause.id}`)}
                  className="mb-3"
                />
              )}

              {/* Community pulse */}
              <div className="flex items-center gap-3 mb-8 mt-6">
                <LivePulse className="w-6 h-6 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] text-ink">
                    <span className="font-medium">{onlineCount || "—"} pessoas</span> rezando agora
                  </p>
                  <p className="text-[11px] text-ink-soft">Corrente ao vivo · vários países</p>
                </div>
                <Link
                  to="/prayer-chain"
                  className="text-xs font-medium text-marian hover:underline underline-offset-4 shrink-0"
                >
                  Entrar
                </Link>
              </div>
            </div>

            {/* RIGHT column — Rituals */}
            <div>
              {/* Section header: Rituals label + Caminhada counter (desktop) */}
              <div className="flex items-end justify-between md:pt-0 pt-2 pb-3 border-b border-hairline">
                <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">Rituais de hoje</span>
                {userId && daysJoined > 0 && (
                  <div className="hidden md:block text-right">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-ink-soft">Sua caminhada</p>
                    <p className="font-serif text-[22px] text-ink leading-none mt-0.5">{daysJoined} dias</p>
                  </div>
                )}
              </div>

              {/* Mobile: horizontal scroll carousel */}
              <div className="md:hidden flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 hide-scrollbar">
                {RITUALS.map((r) => (
                  <Link key={r.kind} to={r.route} className="shrink-0">
                    <RitualCard
                      kind={r.kind}
                      title={r.title}
                      sub={r.sub}
                      duration={r.duration}
                      badge={r.badge}
                    />
                  </Link>
                ))}
              </div>

              {/* Desktop: vertical list */}
              <div className="hidden md:flex md:flex-col">
                {RITUALS.map((r) => (
                  <Link key={r.kind} to={r.route}>
                    <RitualCard
                      kind={r.kind}
                      title={r.title}
                      sub={r.sub}
                      duration={r.duration}
                      badge={r.badge}
                      listMode
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Journey dots — full width, below 2-col */}
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

          {/* Guest CTA */}
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
        </main>
      </div>
    </PageTransition>
  );
};

export default Index;
