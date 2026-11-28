import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, RefreshCw, Sparkles, Sun, Wind } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { Player } from "@remotion/player";
import PrayerTree from "@/remotion/PrayerTree/PrayerTree";

interface RecentPrayer {
  name: string;
  timestamp: string;
}

interface PrayerRow {
  created_at: string;
  user_id: string | null;
  is_anonymous: boolean;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  display_name: string | null;
  show_real_name: boolean;
}

const ANONYMOUS_LABEL = "Intercessor";

const Tree = () => {
  const navigate = useNavigate();
  const [communityFaithPoints, setCommunityFaithPoints] = useState<number | null>(null);
  const [recentPrayers, setRecentPrayers] = useState<RecentPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const [xpResult, prayersResult] = await Promise.all([
      supabase.from("user_xp").select("total_xp"),
      supabase
        .from("prayer_requests")
        .select("created_at, user_id, is_anonymous")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const errors: string[] = [];

    if (xpResult.error) {
      errors.push("Não foi possível carregar os Pontos de Fé Coletivos.");
      setCommunityFaithPoints(null);
    } else {
      const total = (xpResult.data || []).reduce((sum, row) => sum + (row.total_xp || 0), 0);
      setCommunityFaithPoints(total);
    }

    if (prayersResult.error) {
      errors.push("Não foi possível carregar as orações recentes.");
      setRecentPrayers([]);
    } else {
      const prayers = (prayersResult.data || []) as PrayerRow[];
      const userIds = prayers.map((prayer) => prayer.user_id).filter((id): id is string => Boolean(id));
      const profileMap = new Map<string, ProfileRow>();

      if (userIds.length > 0) {
        const profilesResult = await supabase
          .from("profiles")
          .select("id, full_name, display_name, show_real_name")
          .in("id", userIds);

        if (profilesResult.error) {
          errors.push("Os nomes dos participantes estão temporariamente indisponíveis.");
        } else {
          for (const profile of (profilesResult.data || []) as ProfileRow[]) {
            profileMap.set(profile.id, profile);
          }
        }
      }

      setRecentPrayers(
        prayers.map((prayer) => {
          const profile = prayer.user_id ? profileMap.get(prayer.user_id) : undefined;
          const canShowName = !prayer.is_anonymous && profile?.show_real_name;
          const name = canShowName
            ? profile?.display_name?.trim() || profile?.full_name?.trim().split(" ")[0] || ANONYMOUS_LABEL
            : ANONYMOUS_LABEL;

          return { name, timestamp: prayer.created_at };
        }),
      );
    }

    setErrorMessage(errors.length > 0 ? errors.join(" ") : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNetwork();
  }, [loadNetwork]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  const points = communityFaithPoints ?? 0;
  const growthLevel = Math.min(Math.floor(points / 1000), 5);

  const getFlowStage = () => {
    if (growthLevel === 0) return { label: "Sussurro de Fé", description: "O solo está sendo preparado no seu coração...", icon: <Wind className="h-16 w-16 text-primary/40" aria-hidden="true" /> };
    if (growthLevel === 1) return { label: "Brisa de Esperança", description: "As primeiras preces sopram com suavidade.", icon: null };
    if (growthLevel === 2) return { label: "Corrente de Luz", description: "Nossa comunidade flui com determinação divina.", icon: null };
    if (growthLevel === 3) return { label: "Rio da Vida", description: "Um caudal de graças que banha todos os irmãos.", icon: null };
    if (growthLevel === 4) return { label: "Oceano de Graça", description: "A imensidão do amor de Deus em cada prece.", icon: null };
    return { label: "Fluxo Infinito", description: "A conexão ininterrupta com o Reino dos Céus.", icon: null };
  };

  const stage = getFlowStage();
  const hasNetworkActivity = points > 0 || recentPrayers.length > 0;
  const isDataUnavailable = Boolean(errorMessage);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background/70 backdrop-blur-sm relative overflow-hidden flex flex-col items-center pb-28">
        <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-primary/5 to-background pointer-events-none" aria-hidden="true" />
        <div className="absolute top-[10%] left-[10%] opacity-20" aria-hidden="true"><Sun className="h-12 w-12 text-yellow-500" /></div>
        <div className="absolute top-[20%] right-[15%] opacity-15" aria-hidden="true"><Wind className="h-8 w-8 text-primary/40" /></div>

        <main className="container mx-auto px-6 py-8 relative z-10 max-w-lg w-full" aria-labelledby="tree-title">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-4 hover:bg-primary/5 rounded-full" aria-label="Voltar para o início">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>

          <header className="text-center mb-6">
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2" aria-hidden="true">✦</p>
            <h1 id="tree-title" className="text-4xl font-extrabold text-foreground mb-1 tracking-tight text-glow">Fluxo de Orações</h1>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto rounded-full" aria-hidden="true" />
            <p className="text-[10px] mt-2 uppercase tracking-[0.3em] font-bold text-primary/60">Intercessão e Comunhão Eterna</p>
          </header>

          <section aria-labelledby="network-explanation" className="mb-5 rounded-2xl border border-primary/10 bg-white/60 px-4 py-3 text-center shadow-sm">
            <h2 id="network-explanation" className="text-sm font-bold text-foreground">Uma rede formada por oração</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Cada ponto representa a fé compartilhada pela comunidade. Os nomes abaixo mostram somente a forma de identificação escolhida por cada pessoa.
            </p>
          </section>

          <section aria-label="Visualização da rede de orações" className="relative h-[382px] flex flex-col items-center justify-center mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={growthLevel}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: prefersReducedMotion ? 0 : 1 }}
                className="relative z-10 w-full h-full flex items-center justify-center"
              >
                <Player
                  component={PrayerTree as any}
                  durationInFrames={600}
                  compositionWidth={400}
                  compositionHeight={450}
                  fps={30}
                  style={{ width: "100%", height: "100%", background: "transparent" }}
                  inputProps={{ prayers: recentPrayers, level: growthLevel }}
                  autoPlay={!prefersReducedMotion}
                  loop={!prefersReducedMotion}
                />
                <AnimatePresence>
                  {!loading && !hasNetworkActivity && !isDataUnavailable && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    >
                      <div className="bg-background/70 backdrop-blur-sm p-8 rounded-full">{stage.icon}</div>
                      <p className="text-xs text-muted-foreground font-medium italic mt-4">A rede está começando a florescer.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </section>

          <section aria-live="polite" className="mb-5">
            {loading && <p role="status" className="text-center text-sm text-muted-foreground">Carregando a rede de orações…</p>}
            {errorMessage && (
              <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-foreground">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="font-semibold">A rede não pôde ser atualizada</p>
                    <p className="mt-1 text-xs text-muted-foreground">{errorMessage}</p>
                    <Button variant="outline" size="sm" onClick={() => void loadNetwork()} className="mt-3 rounded-full">
                      <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> Tentar novamente
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <Card className="p-8 soft-shadow border-primary/10 bg-white/40 backdrop-blur-md rounded-[2.5rem] text-center">
            <div className="inline-block px-4 py-1 bg-primary/10 rounded-full text-primary text-[10px] uppercase font-black tracking-widest mb-4">
              Nível {growthLevel}
            </div>
            <h2 className="text-2xl font-bold mb-2 text-foreground tracking-tight">{stage.label}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed italic opacity-80 mb-6 px-4">“{stage.description}”</p>

            {isDataUnavailable ? (
              <p className="rounded-xl bg-muted/50 px-3 py-3 text-xs text-muted-foreground">Os pontos coletivos ficarão disponíveis quando a conexão for restabelecida.</p>
            ) : (
              <>
                <div className="space-y-4" aria-label={`${points.toLocaleString()} Pontos de Fé Coletivos`}>
                  <div className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden" aria-hidden="true">
                    <motion.div
                      className="h-full bg-primary shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(points % 1000) / 10}%` }}
                      transition={{ duration: prefersReducedMotion ? 0 : 1 }}
                    />
                  </div>
                  <div className="flex justify-between items-center px-1 gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{points.toLocaleString()} Pontos de Fé Coletivos</span>
                    <span className="text-[10px] font-bold text-primary uppercase whitespace-nowrap">Próxima Fase</span>
                  </div>
                </div>

                <div className="mt-5 text-left" aria-label="Orações recentes">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Orações recentes</p>
                  {recentPrayers.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-foreground/80">
                      {recentPrayers.slice(0, 5).map((prayer, index) => <li key={`${prayer.timestamp}-${index}`}>✦ {prayer.name}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Ainda não há orações recentes para exibir.</p>
                  )}
                </div>
              </>
            )}

            <Button
              onClick={() => navigate("/pray")}
              className="mt-8 w-full rounded-2xl py-6 text-sm font-bold shadow-xl active:scale-95 transition-transform bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 border-0"
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Orar por uma causa
            </Button>
          </Card>
        </main>
      </div>
    </PageTransition>
  );
};

export default Tree;
