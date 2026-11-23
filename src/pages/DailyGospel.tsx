import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft,
  Share2,
  Loader2,
  BookOpen,
  Sparkles,
  Music,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { useFaithPoints } from "@/hooks/use-faith-points";
import { getLevel, CELESTIAL_LEVELS } from "@/lib/faith-points";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { InviteGatePopup } from "@/components/InviteGatePopup";
import { recordAltarEvent } from "@/features/altar/events";
import { format, isToday as isDateToday, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LiturgyReading {
  referencia?: string;
  titulo?: string;
  texto?: string;
}

interface LiturgySalmo {
  referencia?: string;
  refrao?: string;
  texto?: string;
}

interface LiturgyData {
  verse: string;
  fullText: string;
  reference: string;
  liturgicalDay?: string;
  color?: string;
  title?: string;
  curiosity?: string;
  imageUrl?: string;
  firstReading?: LiturgyReading | null;
  salmo?: LiturgySalmo | null;
  secondReading?: LiturgyReading | null;
  isOfficial: boolean;
  dateKey: string; // dd_MM_yyyy
}

export const DailyGospel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { totalFaithPoints } = useFaithPoints();
  const [generating, setGenerating] = useState(false);
  const [loadingGospel, setLoadingGospel] = useState(true);
  const [liturgy, setLiturgy] = useState<LiturgyData | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("evangelho");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Video reflection states
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [viewingYesterdayVideo, setViewingYesterdayVideo] = useState(false);

  const { completeTask } = useDailyTasks();
  const activeRequestRef = useRef<number>(0);

  const now = new Date();
  const hour = now.getHours();
  const isBeforeSix = hour < 6;

  // Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Fetch liturgy whenever selectedDate changes
  useEffect(() => {
    void fetchDailyLiturgy(selectedDate);
  }, [selectedDate]);

  // Video reflection logic for today
  useEffect(() => {
    if (isDateToday(selectedDate) && !isBeforeSix) {
      void fetchLatestReflectionVideo(0);
    } else {
      setVideoId(null);
    }
  }, [selectedDate, isBeforeSix]);

  const fetchLatestReflectionVideo = async (dateOffset: number = 0) => {
    const API_KEY = "AIzaSyAvWJ3SdQa6yaEFe5CPTzX7CWJ-65_tiXg";
    const CHANNEL_ID = "UCjWxeXfmtOnv1MndaSEWFew";
    setLoadingVideo(true);

    try {
      const targetDate = addDays(new Date(), dateOffset);
      const dateStr = targetDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const query = encodeURIComponent(`"Evangelho do dia" ${dateStr}`);

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=1&order=relevance&q=${query}&type=video&key=${API_KEY}`
      );

      if (!response.ok) throw new Error("YouTube API Error");

      const data = await response.json();
      const resultVideoId = data.items?.[0]?.id?.videoId;

      if (resultVideoId) {
        setVideoId(resultVideoId);
        if (dateOffset === -1) setViewingYesterdayVideo(true);
      } else {
        setVideoId(null);
      }
    } catch (err) {
      console.warn("Could not fetch YouTube reflection", err);
      setVideoId(null);
    } finally {
      setLoadingVideo(false);
    }
  };

  const cleanVerses = (rawText: string) => {
    return rawText
      .replace(/\[\d+\]|\d+\.|\d+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const fetchDailyLiturgy = async (targetDate: Date) => {
    const requestId = ++activeRequestRef.current;
    setLoadingGospel(true);
    setErrorMessage(null);

    const day = String(targetDate.getDate()).padStart(2, "0");
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const year = targetDate.getFullYear();
    const dateKey = `${day}_${month}_${year}`;
    const CACHE_KEY = `daily_liturgy_cache_v13_${dateKey}`;

    // 1. Check local cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.data && parsed.dateKey === dateKey && parsed.data.isOfficial) {
          if (activeRequestRef.current === requestId) {
            setLiturgy(parsed.data);
            setIsFallback(false);
            setLoadingGospel(false);
            // Record altar read for today if it is official
            if (isDateToday(targetDate)) {
              void recordAltarEvent("gospel_read");
              completeTask("read_gospel");
            }
          }
          return;
        }
      }
    } catch {
      // cache parse error, continue to fetch
    }

    try {
      const isToday = isDateToday(targetDate);
      const endpoint = isToday
        ? "https://liturgia.up.railway.app/"
        : `https://liturgia.up.railway.app/${day}/${month}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const liturgiaData = await response.json();

      // Check if response is obsolete due to quick date switches
      if (activeRequestRef.current !== requestId) return;

      if (!liturgiaData || typeof liturgiaData !== "object" || !liturgiaData.evangelho) {
        throw new Error("Invalid liturgy payload format");
      }

      const evangelhoReferencia = liturgiaData.evangelho?.referencia || "Evangelho do Dia";
      const evangelhoTextoBruto = liturgiaData.evangelho?.texto || "Texto indisponível.";
      const evangelhoTextoCompleto = cleanVerses(evangelhoTextoBruto);

      // Extract readings
      const firstReading: LiturgyReading | null = liturgiaData.primeiraLeitura?.texto
        ? {
            referencia: liturgiaData.primeiraLeitura.referencia || "1ª Leitura",
            titulo: liturgiaData.primeiraLeitura.titulo || "",
            texto: cleanVerses(liturgiaData.primeiraLeitura.texto),
          }
        : null;

      const salmo: LiturgySalmo | null = (liturgiaData.salmo?.texto || liturgiaData.salmo?.refrao)
        ? {
            referencia: liturgiaData.salmo.referencia || "Salmo Responsorial",
            refrao: liturgiaData.salmo.refrao ? liturgiaData.salmo.refrao.trim() : "",
            texto: liturgiaData.salmo.texto ? cleanVerses(liturgiaData.salmo.texto) : "",
          }
        : null;

      const secondReading: LiturgyReading | null = (liturgiaData.segundaLeitura && liturgiaData.segundaLeitura.texto)
        ? {
            referencia: liturgiaData.segundaLeitura.referencia || "2ª Leitura",
            titulo: liturgiaData.segundaLeitura.titulo || "",
            texto: cleanVerses(liturgiaData.segundaLeitura.texto),
          }
        : null;

      // Gemini AI summary / curiosity
      let verseResumo = evangelhoTextoCompleto;
      let curiosidade = "";
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

      if (GEMINI_API_KEY && evangelhoTextoCompleto.length > 50) {
        const promptDaily = `Abaixo está o texto do Evangelho Católico do dia (${evangelhoReferencia}).
Texto Oficial: "${evangelhoTextoCompleto}"

Sua tarefa é extrair 2 informações:
1. RESUMO: Um resumo poético de no máximo 2 frases que capture a essência da mensagem.
2. CURIOSIDADE: Um fato HISTÓRICO, ARQUEOLÓGICO ou CULTURAL único e específico sobre a época de Jesus que ajude a dar contexto a este texto exato. Comece com 'Você sabia que...'.

Responda APENAS com um objeto JSON válido no formato:
{
  "resumo": "texto aqui",
  "curiosidade": "texto aqui"
}`;

        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: promptDaily }] }] }),
            }
          );

          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const textResponse = gData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            const jsonClean = textResponse.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(jsonClean);
            if (parsed.resumo) verseResumo = parsed.resumo;
            if (parsed.curiosidade) curiosidade = parsed.curiosidade;
          }
        } catch (aiErr) {
          console.warn("AI summary generation skipped/failed:", aiErr);
        }
      }

      if (!curiosidade) {
        const fallbacks = [
          "Você sabia que, nos tempos de Jesus, os manuscritos eram raros e preciosos, guardados em sinagogas em rolos de pergaminho ou papiro.",
          "Curiosidade: Na época do Evangelho, a maioria dos pescadores falava Aramaico, mas as escrituras eram lidas em Hebraico nas sinagogas.",
          "Fato Histórico: As casas na Palestina do primeiro século eram feitas de pedra ou tijolos de barro, com telhados planos usados para oração e descanso.",
          "Você sabia que o Rio Jordão, citado em muitos batismos, era o limite geográfico e espiritual para o povo de Israel ao entrar na Terra Prometida.",
          "Contexto: O Mar da Galileia, onde Jesus tanto caminhou, é na verdade um lago de água doce a cerca de 200 metros abaixo do nível do mar.",
        ];
        curiosidade = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      const finalLiturgy: LiturgyData = {
        verse: verseResumo,
        fullText: evangelhoTextoCompleto,
        reference: evangelhoReferencia,
        liturgicalDay: liturgiaData.liturgia || liturgiaData.dia || "Liturgia Diária",
        color: liturgiaData.cor || "Verde",
        title: liturgiaData.evangelho?.titulo || "Palavra de Salvação",
        curiosity: curiosidade,
        imageUrl: "/daily-gospel/today-gospel.webp",
        firstReading,
        salmo,
        secondReading,
        isOfficial: true,
        dateKey,
      };

      if (activeRequestRef.current === requestId) {
        setLiturgy(finalLiturgy);
        setIsFallback(false);
        setErrorMessage(null);

        // Cache successful official liturgy
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: finalLiturgy, dateKey }));
        } catch {
          // ignore localStorage quota errors
        }

        // Only register altar read on valid official liturgy for today
        if (isDateToday(targetDate)) {
          void recordAltarEvent("gospel_read");
          completeTask("read_gospel");
        }
      }
    } catch (err: unknown) {
      if (activeRequestRef.current !== requestId) return;
      console.error("Failed to load liturgy:", err);

      setIsFallback(true);
      setErrorMessage("Não foi possível carregar a liturgia oficial desta data. Exibindo leitura de apoio espiritual.");

      // Honest fallback: devotional reflection clearly identified as support/contingency, NOT official liturgy
      const fallbackLiturgy: LiturgyData = {
        verse: "Deus nos amou tanto que entregou Seu Filho para que tivéssemos a vida eterna.",
        fullText: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna. Pois Deus enviou o seu Filho ao mundo, não para condenar o mundo, mas para que o mundo fosse salvo por ele.",
        reference: "João 3:16-17",
        liturgicalDay: "Leitura Devocional de Apoio",
        color: "Dourado",
        title: "O Amor Redentor de Deus",
        curiosity: "João 3:16 é frequentemente chamado de 'O Evangelho em Miniatura' porque sintetiza a mensagem central da salvação cristã.",
        imageUrl: "/daily-gospel/today-gospel.webp",
        firstReading: null,
        salmo: null,
        secondReading: null,
        isOfficial: false,
        dateKey,
      };

      setLiturgy(fallbackLiturgy);
      // NOTE: We deliberately DO NOT call recordAltarEvent('gospel_read') here!
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoadingGospel(false);
      }
    }
  };

  // Available readings tabs
  const availableTabs = useMemo(() => {
    const tabs: { id: string; label: string; icon: typeof BookOpen }[] = [];
    if (liturgy?.firstReading?.texto) {
      tabs.push({ id: "firstReading", label: "1ª Leitura", icon: BookOpen });
    }
    if (liturgy?.salmo?.texto || liturgy?.salmo?.refrao) {
      tabs.push({ id: "salmo", label: "Salmo", icon: Music });
    }
    if (liturgy?.secondReading?.texto) {
      tabs.push({ id: "secondReading", label: "2ª Leitura", icon: BookOpen });
    }
    // Gospel tab is always present
    tabs.push({ id: "evangelho", label: "Evangelho", icon: Sparkles });
    return tabs;
  }, [liturgy]);

  // If active tab doesn't exist on date change, fallback to 'evangelho'
  useEffect(() => {
    if (!availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab("evangelho");
    }
  }, [availableTabs, activeTab]);

  const level = getLevel(totalFaithPoints);
  const APP_URL = "https://www.amens.com.br";
  const referralLink = user ? `${APP_URL}/auth?ref=${user.id}` : APP_URL;

  // Handle sharing with robust error handling and altar recording
  const handleShare = async () => {
    if (!liturgy) return;
    setGenerating(true);

    try {
      const formattedDate = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

      let shareHeading = `✦ Evangelho de ${formattedDate} ✦`;
      let textContent = liturgy.fullText;
      let refContent = liturgy.reference;

      if (activeTab === "firstReading" && liturgy.firstReading?.texto) {
        shareHeading = `✦ 1ª Leitura (${formattedDate}) ✦`;
        textContent = liturgy.firstReading.texto;
        refContent = liturgy.firstReading.referencia || "1ª Leitura";
      } else if (activeTab === "salmo" && liturgy.salmo) {
        shareHeading = `✦ Salmo Responsorial (${formattedDate}) ✦`;
        textContent = liturgy.salmo.refrao
          ? `Refrão: "${liturgy.salmo.refrao}"\n\n${liturgy.salmo.texto || ""}`
          : (liturgy.salmo.texto || "");
        refContent = liturgy.salmo.referencia || "Salmo";
      } else if (activeTab === "secondReading" && liturgy.secondReading?.texto) {
        shareHeading = `✦ 2ª Leitura (${formattedDate}) ✦`;
        textContent = liturgy.secondReading.texto;
        refContent = liturgy.secondReading.referencia || "2ª Leitura";
      }

      const shareText = `${shareHeading}\n${liturgy.liturgicalDay ? `Celebrando: ${liturgy.liturgicalDay}\n\n` : "\n"}"${textContent}"\n— ${refContent}\n\n🙏 ${liturgy.curiosity || ""}\n\nJunte-se à corrente de prece comigo:\n${referralLink}`;

      const shareData = {
        title: `${refContent} — Améns`,
        text: shareText,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          toast.success("Liturgia compartilhada com sucesso! ✨");
          if (liturgy.isOfficial && isDateToday(selectedDate)) {
            completeTask("share_word");
            void recordAltarEvent("gospel_share");
          }
          return;
        } catch (shareErr: unknown) {
          const err = shareErr as { name?: string };
          if (err?.name === "AbortError") {
            // User cancelled the share dialog - do not count event or toast success
            return;
          }
          // Fallback to clipboard if share threw another error
        }
      }

      await navigator.clipboard.writeText(shareText);
      toast.success("Mensagem copiada para a área de transferência! 📋");
      if (liturgy.isOfficial && isDateToday(selectedDate)) {
        completeTask("share_word");
        void recordAltarEvent("gospel_share");
      }
    } catch {
      toast.error("Não foi possível realizar o compartilhamento.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrevDay = () => {
    setSelectedDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => addDays(prev, 1));
  };

  const handleResetToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = isDateToday(selectedDate);
  const formattedDisplayDate = format(selectedDate, "dd 'de' MMMM", { locale: ptBR });
  const formattedFullYear = format(selectedDate, "yyyy");

  return (
    <PageTransition>
      <div className="min-h-screen bg-transparent relative overflow-hidden pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="absolute top-[-8rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-6rem] left-[-6rem] w-[24rem] h-[24rem] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 py-6 relative z-10 max-w-lg">
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              aria-label="Voltar para a página inicial"
              className="rounded-full hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Button>

            {!isToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToday}
                className="rounded-full text-xs font-semibold gap-1.5 border-primary/20 text-primary bg-background/80 hover:bg-primary/10"
                aria-label="Voltar para a liturgia de hoje"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ir para Hoje
              </Button>
            )}
          </div>

          {/* Title and Subtitle */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-1 text-glow font-bold">✦ Liturgia Diária ✦</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-glow text-soft-outline">
              Palavra de Deus
            </h1>
            <div className="divider-gold max-w-[5rem] mx-auto my-2.5" />
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Leituras Oficiais da Igreja Católica
            </p>
          </motion.div>

          {/* Date Navigation & Calendar Picker */}
          <div className="flex items-center justify-between gap-1.5 mb-6 p-1.5 bg-card/70 border border-primary/15 rounded-2xl backdrop-blur-md shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevDay}
              aria-label="Dia anterior"
              className="h-9 w-9 rounded-xl hover:bg-primary/10 text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex-1 h-9 px-2 text-xs sm:text-sm font-bold gap-2 rounded-xl text-foreground hover:bg-primary/10"
                  aria-label="Selecionar data no calendário"
                >
                  <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                  <span className="capitalize truncate">
                    {formattedDisplayDate} de {formattedFullYear}
                  </span>
                  {isToday && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 shrink-0">
                      Hoje
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-primary/20 bg-background/95 backdrop-blur-lg shadow-xl" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextDay}
              aria-label="Próximo dia"
              className="h-9 w-9 rounded-xl hover:bg-primary/10 text-foreground"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Loading State */}
          {loadingGospel ? (
            <Card className="p-8 soft-shadow border-primary/15 text-center bg-card/80 backdrop-blur-md">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground">Buscando as leituras sagradas...</p>
              <p className="text-xs text-muted-foreground mt-1">Preparando o pão diário da sua fé</p>
            </Card>
          ) : liturgy ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              {/* Fallback & Unavailability Banner */}
              {isFallback && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-left shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      Liturgia Oficial Indisponível
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void fetchDailyLiturgy(selectedDate)}
                      className="h-7 text-xs font-semibold gap-1 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 rounded-lg px-2"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Tentar Novamente
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/90">
                    {errorMessage || "Não foi possível carregar a liturgia oficial desta data. Exibindo leitura de apoio espiritual."}
                  </p>
                </div>
              )}

              {/* Main Reading Card */}
              <Card className="p-6 sm:p-8 soft-shadow border-primary/15 bg-card/85 backdrop-blur-md rounded-3xl relative overflow-hidden">
                {/* Liturgical Day & Color */}
                <div className="text-center space-y-2 mb-6">
                  {liturgy.liturgicalDay && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                      {liturgy.color && (
                        <span
                          className="w-2 h-2 rounded-full bg-primary inline-block shrink-0"
                          title={`Cor litúrgica: ${liturgy.color}`}
                        />
                      )}
                      <span>{liturgy.liturgicalDay}</span>
                    </div>
                  )}

                  {!liturgy.isOfficial && (
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                      ✦ Texto de Apoio Espiritual (Contingência) ✦
                    </p>
                  )}
                </div>

                {/* Tabs for Liturgy Readings */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList
                    className="grid w-full mb-6 p-1 bg-muted/60 rounded-2xl border border-primary/10"
                    style={{ gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))` }}
                  >
                    {availableTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {/* 1st Reading Content */}
                  {liturgy.firstReading && (
                    <TabsContent value="firstReading" className="mt-0 focus-visible:outline-none">
                      <div className="text-left space-y-3">
                        <div className="border-b border-primary/10 pb-2">
                          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                            Primeira Leitura
                          </h2>
                          <p className="text-sm font-bold text-primary mt-0.5">
                            {liturgy.firstReading.referencia}
                          </p>
                          {liturgy.firstReading.titulo && (
                            <p className="text-xs text-foreground/80 italic mt-1">
                              {liturgy.firstReading.titulo}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-foreground/85 leading-relaxed font-serif bg-card/40 p-4 rounded-2xl border border-primary/5 whitespace-pre-line">
                          {liturgy.firstReading.texto}
                        </p>
                      </div>
                    </TabsContent>
                  )}

                  {/* Responsorial Psalm Content */}
                  {liturgy.salmo && (
                    <TabsContent value="salmo" className="mt-0 focus-visible:outline-none">
                      <div className="text-left space-y-3">
                        <div className="border-b border-primary/10 pb-2">
                          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-primary" />
                            Salmo Responsorial
                          </h2>
                          <p className="text-sm font-bold text-primary mt-0.5">
                            {liturgy.salmo.referencia}
                          </p>
                        </div>

                        {liturgy.salmo.refrao && (
                          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                            <p className="text-xs font-bold uppercase tracking-wider mb-1">Refrão:</p>
                            <p className="text-sm font-semibold italic">
                              "{liturgy.salmo.refrao}"
                            </p>
                          </div>
                        )}

                        {liturgy.salmo.texto && (
                          <p className="text-sm text-foreground/85 leading-relaxed font-serif bg-card/40 p-4 rounded-2xl border border-primary/5 whitespace-pre-line">
                            {liturgy.salmo.texto}
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  )}

                  {/* 2nd Reading Content */}
                  {liturgy.secondReading && (
                    <TabsContent value="secondReading" className="mt-0 focus-visible:outline-none">
                      <div className="text-left space-y-3">
                        <div className="border-b border-primary/10 pb-2">
                          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                            Segunda Leitura
                          </h2>
                          <p className="text-sm font-bold text-primary mt-0.5">
                            {liturgy.secondReading.referencia}
                          </p>
                          {liturgy.secondReading.titulo && (
                            <p className="text-xs text-foreground/80 italic mt-1">
                              {liturgy.secondReading.titulo}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-foreground/85 leading-relaxed font-serif bg-card/40 p-4 rounded-2xl border border-primary/5 whitespace-pre-line">
                          {liturgy.secondReading.texto}
                        </p>
                      </div>
                    </TabsContent>
                  )}

                  {/* Gospel Content */}
                  <TabsContent value="evangelho" className="mt-0 focus-visible:outline-none">
                    <div className="text-left space-y-3">
                      <div className="border-b border-primary/10 pb-2">
                        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          Evangelho do Dia
                        </h2>
                        <p className="text-sm font-bold text-primary mt-0.5">
                          {liturgy.reference}
                        </p>
                        {liturgy.title && (
                          <p className="text-xs text-foreground/80 italic mt-1">
                            {liturgy.title}
                          </p>
                        )}
                      </div>

                      {liturgy.imageUrl && (
                        <div className="w-full relative rounded-2xl overflow-hidden aspect-video border border-primary/20 shadow-sm my-3">
                          <img
                            src={liturgy.imageUrl}
                            alt="Ilustração do Evangelho"
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        </div>
                      )}

                      <p className="text-sm text-foreground/85 leading-relaxed font-serif bg-card/40 p-4 rounded-2xl border border-primary/5 whitespace-pre-line">
                        {liturgy.fullText}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Curiosity Box */}
                {liturgy.curiosity && (
                  <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-accent/10 border border-accent/20 text-left relative overflow-hidden shadow-inner">
                    <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
                      <Sparkles className="w-24 h-24 text-primary" />
                    </div>
                    <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2 flex items-center gap-1.5 relative z-10">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      Curiosidade da Época
                    </p>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed relative z-10">
                      {liturgy.curiosity}
                    </p>
                  </div>
                )}

                <div className="divider-gold mx-auto my-6" />

                {/* Share Button */}
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={handleShare}
                    disabled={generating}
                    className="gradient-divine w-full rounded-full py-6 text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Compartilhar Liturgia do Dia
                  </Button>
                </div>

                {/* Level / Faith Points info */}
                {user && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground text-center">
                      {CELESTIAL_LEVELS.indexOf(level) + 1 <= 20 ? (
                        <img
                          src={`/level-icons/${CELESTIAL_LEVELS.indexOf(level) + 1}.png`}
                          alt={level.name}
                          className="h-5 object-contain inline-block mr-1 align-middle"
                        />
                      ) : (
                        level.emoji
                      )}
                      Enviando como <span className="font-semibold text-primary">Nível {CELESTIAL_LEVELS.indexOf(level) + 1}</span>. Compartilhe e ganhe pontos de fé!
                    </p>
                  </div>
                )}
              </Card>

              {/* Video Reflection Block */}
              <Card className="p-6 soft-shadow border-primary/10 bg-card/80 backdrop-blur-md rounded-3xl overflow-hidden">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Reflexão em Vídeo
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Pe. Reginaldo Manzotti • Oficial
                    </p>
                  </div>
                </div>

                {loadingVideo ? (
                  <div className="aspect-video bg-muted/50 rounded-2xl flex flex-col items-center justify-center animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                    <p className="text-[11px] text-muted-foreground uppercase font-bold">Buscando reflexão...</p>
                  </div>
                ) : videoId ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-inner bg-black">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="Padre Reginaldo Manzotti - Evangelho do Dia"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : isToday && isBeforeSix && !viewingYesterdayVideo ? (
                  <div className="p-6 text-center border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5 space-y-3">
                    <p className="text-xs sm:text-sm text-foreground font-medium">
                      O vídeo do evangelho de hoje estará disponível a partir das 6h da manhã.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void fetchLatestReflectionVideo(-1)}
                      className="rounded-full border-primary/20 text-primary hover:bg-primary/10 font-bold text-xs"
                    >
                      Assista ao vídeo do evangelho de ontem
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 text-center border-2 border-dashed border-primary/15 rounded-2xl bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Vídeo de reflexão indisponível no momento.
                    </p>
                    <p className="text-[10px] uppercase font-bold text-primary/60 mt-1">
                      A liturgia textual acima permanece completa.
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          ) : null}
        </div>

        {/* Invite Gate is only shown for external shared referral links */}
        {typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ref") && (
          <InviteGatePopup isAuthenticated={!!user} />
        )}
      </div>
    </PageTransition>
  );
};

export default DailyGospel;
