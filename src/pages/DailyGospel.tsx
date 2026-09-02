import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  ArrowLeft, 
  Share2, 
  Loader2, 
  BookOpen, 
  Sparkles, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  ExternalLink 
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { useFaithPoints } from "@/hooks/use-faith-points";
import { getLevel, CELESTIAL_LEVELS } from "@/lib/faith-points";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { InviteGatePopup } from "@/components/InviteGatePopup";
import { format, isSameDay, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ReadingData {
  referencia: string;
  titulo?: string;
  texto: string;
  refrao?: string;
}

interface LiturgyData {
  data: string;
  liturgia: string;
  cor?: string;
  dia?: string;
  evangelho: {
    verse: string;
    fullText: string;
    reference: string;
    curiosity?: string;
    imageUrl?: string;
  };
  primeiraLeitura?: ReadingData;
  salmo?: ReadingData;
  segundaLeitura?: ReadingData | null;
}

const DailyGospel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { totalFaithPoints } = useFaithPoints();
  const [generating, setGenerating] = useState(false);
  const [loadingLiturgy, setLoadingLiturgy] = useState(true);
  const [liturgy, setLiturgy] = useState<LiturgyData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("evangelho");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [viewingYesterday, setViewingYesterday] = useState(false);
  const { completeTask } = useDailyTasks();

  const now = new Date();
  const hour = now.getHours();
  const isBeforeSix = hour < 6;

  // Mark read_gospel task as done when user enters this page
  useEffect(() => {
    completeTask("read_gospel");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    fetchLiturgyForDate(selectedDate);
    // Para a reflexão de vídeo: se for hoje e antes das 6h, não busca automaticamente de hoje
    const isTargetToday = isSameDay(selectedDate, new Date());
    if (!isTargetToday || !isBeforeSix) {
      fetchLatestReflectionVideo(selectedDate);
    } else {
      setVideoId(null);
    }
  }, [selectedDate]);

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const resetToToday = () => {
    setSelectedDate(new Date());
  };

  const fetchLatestReflectionVideo = async (targetDate: Date, isYesterdayFallback: boolean = false) => {
    const API_KEY = "AIzaSyAvWJ3SdQa6yaEFe5CPTzX7CWJ-65_tiXg";
    const CHANNEL_ID = "UCjWxeXfmtOnv1MndaSEWFew";
    setLoadingVideo(true);
    
    try {
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
        setViewingYesterday(isYesterdayFallback);
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

  const fetchLiturgyForDate = async (targetDate: Date) => {
    setLoadingLiturgy(true);
    const isTargetToday = isSameDay(targetDate, new Date());
    const dateFormatted = format(targetDate, "dd/MM/yyyy");
    const dateParam = `${String(targetDate.getDate()).padStart(2, '0')}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const cacheKey = `daily_liturgy_cache_${format(targetDate, "yyyy-MM-dd")}_v2`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setLiturgy(parsed);
        setLoadingLiturgy(false);
        return;
      }

      // Endpoint da liturgia
      const url = isTargetToday 
        ? "https://liturgia.up.railway.app/" 
        : `https://liturgia.up.railway.app/${dateParam}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao carregar liturgia");
      const data = await res.json();

      // Evangelho
      const evangelhoReferencia = data.evangelho?.referencia || "Evangelho Universal";
      const evangelhoTextoBruto = data.evangelho?.texto || "Texto indisponível.";
      const evangelhoTextoCompleto = evangelhoTextoBruto.replace(/\[\d+\]|\d+\.|\d+/g, '').replace(/\s+/g, ' ').trim();

      // Primeira Leitura
      const primeiraLeitura: ReadingData | undefined = data.primeiraLeitura ? {
        referencia: data.primeiraLeitura.referencia || "1ª Leitura",
        titulo: data.primeiraLeitura.titulo || "",
        texto: (data.primeiraLeitura.texto || "").replace(/\[\d+\]|\d+\.|\d+/g, '').replace(/\s+/g, ' ').trim()
      } : undefined;

      // Salmo Responsorial
      const salmo: ReadingData | undefined = data.salmo ? {
        referencia: data.salmo.referencia || "Salmo Responsorial",
        refrao: data.salmo.refrao || "",
        texto: data.salmo.texto || ""
      } : undefined;

      // Segunda Leitura (opcional)
      const segundaLeitura: ReadingData | null = (data.segundaLeitura && typeof data.segundaLeitura === 'object' && data.segundaLeitura.texto) ? {
        referencia: data.segundaLeitura.referencia || "2ª Leitura",
        titulo: data.segundaLeitura.titulo || "",
        texto: (data.segundaLeitura.texto || "").replace(/\[\d+\]|\d+\.|\d+/g, '').replace(/\s+/g, ' ').trim()
      } : null;

      // IA Summary / Curiosity
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      let verseResumo = evangelhoTextoCompleto;
      let curiosidade = "";

      if (GEMINI_API_KEY && evangelhoTextoCompleto.length > 50) {
        try {
          const promptDaily = `Abaixo está o texto do Evangelho Católico (${evangelhoReferencia}).
Texto Oficial: "${evangelhoTextoCompleto}"

Sua tarefa é extrair 2 informações:
1. RESUMO: Um resumo poético de no máximo 2 frases que capture a essência da mensagem.
2. CURIOSIDADE: Um fato HISTÓRICO, ARQUEOLÓGICO ou CULTURAL único e específico sobre a época de Jesus que ajude a dar contexto a este texto exato. Evite generalidades. Comece com 'Você sabia que...'.

Responda APENAS com um objeto JSON válido no formato:
{
  "resumo": "texto aqui",
  "curiosidade": "texto aqui"
}`;
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptDaily }] }] })
          });

          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const textResponse = gData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            const jsonClean = textResponse.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(jsonClean);
            if (parsed.resumo) verseResumo = parsed.resumo;
            if (parsed.curiosidade) curiosidade = parsed.curiosidade;
          }
        } catch (e) {
          console.error("Falha ao processar resumo do evangelho", e);
        }
      }

      if (!curiosidade) {
        const fallbacks = [
          "Você sabia que, nos tempos de Jesus, os manuscritos eram raros e preciosos, guardados em sinagogas em rolos de pergaminho ou papiro.",
          "Curiosidade: Na época do Evangelho, a maioria dos pescadores falava Aramaico, mas as escrituras eram lidas em Hebraico nas sinagogas.",
          "Fato Histórico: As casas na Palestina do primeiro século eram feitas de pedra ou tijolos de barro, com telhados planos usados para oração e descanso.",
          "Você sabia que o Rio Jordão, citado em muitos batismos, era o limite geográfico e espiritual para o povo de Israel ao entrar na Terra Prometida.",
          "Contexto: O Mar da Galileia, onde Jesus tanto caminhou, é na verdade um lago de água doce a cerca de 200 metros abaixo do nível do mar."
        ];
        curiosidade = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      const liturgyResult: LiturgyData = {
        data: data.data || dateFormatted,
        liturgia: data.liturgia || "Liturgia Diária",
        cor: data.cor,
        dia: data.dia,
        evangelho: {
          verse: verseResumo,
          fullText: evangelhoTextoCompleto,
          reference: evangelhoReferencia,
          curiosity: curiosidade,
          imageUrl: "/daily-gospel/today-gospel.webp"
        },
        primeiraLeitura,
        salmo,
        segundaLeitura
      };

      setLiturgy(liturgyResult);
      localStorage.setItem(cacheKey, JSON.stringify(liturgyResult));
    } catch (err) {
      console.error("Failed to fetch liturgy:", err);
      const fallbackLiturgy: LiturgyData = {
        data: dateFormatted,
        liturgia: "Liturgia Diária",
        cor: "Verde",
        evangelho: {
          verse: "Deus nos amou tanto que entregou Seu Filho para que tivéssemos a vida eterna.",
          fullText: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.",
          reference: "João 3:16",
          curiosity: "João 3:16 é frequentemente chamado de 'O Evangelho em Miniatura' porque resume brilhantemente toda a mensagem da salvação cristã.",
          imageUrl: "/daily-gospel/today-gospel.webp"
        },
        primeiraLeitura: {
          referencia: "1Jo 4,7-10",
          titulo: "Primeira Carta de São João",
          texto: "Caríssimos, amemo-nos uns aos outros, porque o amor vem de Deus e todo aquele que ama nasceu de Deus e conhece a Deus."
        },
        salmo: {
          referencia: "Sl 22(23)",
          refrao: "O Senhor é meu pastor, nada me faltará.",
          texto: "– O Senhor é o pastor que me conduz; não me falta coisa alguma.\n– Pelos prados de relva mais fresca ele me faz repousar.\n– Conduz-me junto às águas refrescantes, restaura as minhas forças."
        }
      };
      setLiturgy(fallbackLiturgy);
    } finally {
      setLoadingLiturgy(false);
    }
  };

  const level = getLevel(totalFaithPoints);
  const APP_URL = "https://amens-app.vercel.app";
  const referralLink = user
    ? `${APP_URL}/auth?ref=${user.id}`
    : APP_URL;

  const handleShare = async (includeCuriosity: boolean) => {
    if (!liturgy) return;
    
    setGenerating(true);
    try {
      const g = liturgy.evangelho;
      let shareText = `✦ Liturgia Diária (${liturgy.liturgia}) ✦\n\n📖 Evangelho (${g.reference})\n"${g.fullText}"`;
      
      if (includeCuriosity && g.curiosity) {
        shareText += `\n\n✨ ${g.curiosity}`;
      }
      
      shareText += `\n\nJunte-se à corrente de oração comigo:\n${referralLink}`;
      
      const shareData: any = {
        title: `Evangelho - ${g.reference}`,
        text: shareText,
      };

      if (navigator.share) {
        try {
          if (g.imageUrl) {
            const response = await fetch(g.imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'evangelho.jpg', { type: 'image/jpeg' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                ...shareData,
                files: [file]
              });
              toast.success("Evangelho compartilhado! ✨");
              completeTask("share_word");
              return;
            }
          }
          await navigator.share(shareData);
          toast.success("Evangelho compartilhado! ✨");
          completeTask("share_word");
          return;
        } catch (fileErr) {
          console.warn("Falha ao gerar arquivo de imagem, tentando texto apenas", fileErr);
          await navigator.share(shareData);
          toast.success("Evangelho compartilhado! ✨");
          completeTask("share_word");
          return;
        }
      }

      await navigator.clipboard.writeText(shareText);
      toast.success("Mensagem copiada para a área de transferência! 📋");
      completeTask("share_word");
    } catch {
      toast.error("Não foi possível realizar o compartilhamento.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-28">
        <div className="absolute top-[-8rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-6rem] w-[24rem] h-[24rem] rounded-full bg-accent/5 blur-3xl" />

        <div className="container mx-auto px-4 py-6 relative z-10 max-w-lg">
          {/* Top Bar with Back Button and Reset-to-today if date != today */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {!isSameDay(selectedDate, new Date()) && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToToday}
                className="rounded-full border-primary/20 text-xs font-bold text-primary flex items-center gap-1.5 h-8 px-3"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Voltar para Hoje
              </Button>
            )}
          </div>

          <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-2 text-glow font-bold">✦</p>
            <h1 className="text-3xl font-bold text-foreground mb-1 text-glow text-soft-outline font-serif">Liturgia Diária</h1>
            <p className="text-xs text-muted-foreground font-medium">Evangelho, 1ª Leitura e Salmo</p>
            <div className="divider-gold max-w-[5rem] mx-auto my-3" />
          </motion.div>

          {/* Seletor de Datas & Calendário */}
          <div className="flex items-center justify-between gap-2 mb-6 bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-primary/10 soft-shadow">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousDay}
              className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex-1 h-9 px-2 text-xs font-bold flex items-center justify-center gap-2 rounded-xl hover:bg-primary/10"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  <span className="capitalize">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                  {isSameDay(selectedDate, new Date()) && (
                    <span className="text-[10px] uppercase font-black tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded-md ml-1">
                      Hoje
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) {
                      setSelectedDate(d);
                      setCalendarOpen(false);
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
              onClick={goToNextDay}
              className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {loadingLiturgy ? (
            <Card className="p-8 soft-shadow border-primary/15 text-center bg-card/80 backdrop-blur-md rounded-3xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Buscando as leituras e preparando seu pão diário...</p>
            </Card>
          ) : liturgy ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              {/* Liturgical Day & Color Header */}
              <div className="mb-4 text-center">
                <p className="text-xs uppercase tracking-wider text-primary font-bold">
                  {liturgy.liturgia}
                </p>
                {liturgy.cor && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cor litúrgica: <span className="font-semibold text-foreground">{liturgy.cor}</span>
                  </p>
                )}
              </div>

              {/* Tabs for Readings */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={cn(
                  "grid w-full mb-6 bg-white/70 backdrop-blur-md rounded-full p-1 border border-primary/10 h-12",
                  liturgy.segundaLeitura ? "grid-cols-4" : "grid-cols-3"
                )}>
                  <TabsTrigger value="evangelho" className="rounded-full text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Evangelho
                  </TabsTrigger>
                  <TabsTrigger value="primeira" className="rounded-full text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    1ª Leitura
                  </TabsTrigger>
                  <TabsTrigger value="salmo" className="rounded-full text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Salmo
                  </TabsTrigger>
                  {liturgy.segundaLeitura && (
                    <TabsTrigger value="segunda" className="rounded-full text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      2ª Leitura
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* TAB: EVANGELHO */}
                <TabsContent value="evangelho" className="outline-none space-y-6">
                  <Card className="p-6 soft-shadow border-primary/15 text-center space-y-6 bg-card/80 backdrop-blur-md rounded-[2.5rem]">
                    {liturgy.evangelho.imageUrl && (
                      <div className="w-full relative rounded-2xl overflow-hidden aspect-square border border-primary/20 shadow-lg">
                        <img 
                          src={liturgy.evangelho.imageUrl} 
                          alt="Ilustração do Evangelho" 
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      </div>
                    )}

                    {/* Resumo Poético */}
                    {liturgy.evangelho.verse && (
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-primary/80 font-bold mb-1">Palavra de Salvação</p>
                        <p className="text-sm font-medium italic text-foreground/90 font-serif leading-relaxed">
                          "{liturgy.evangelho.verse}"
                        </p>
                      </div>
                    )}

                    {/* Leitura Completa */}
                    <div className="text-left space-y-3 pt-2">
                      <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center">
                        <BookOpen className="w-3.5 h-3.5 mr-2 text-primary" /> 
                        Evangelho ({liturgy.evangelho.reference})
                      </h3>
                      <p className="text-sm text-foreground/80 leading-relaxed font-serif bg-white/40 p-4 rounded-2xl border border-primary/5 whitespace-pre-line">
                        {liturgy.evangelho.fullText}
                      </p>
                    </div>

                    {/* Curiosidade da Época */}
                    {liturgy.evangelho.curiosity && (
                      <div className="p-5 rounded-2xl bg-accent/10 border border-accent/20 text-left relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-10">
                          <Sparkles className="w-24 h-24 text-primary" />
                        </div>
                        <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2 flex items-center relative z-10">
                          <Sparkles className="w-3.5 h-3.5 mr-2" /> 
                          Curiosidade da Época
                        </p>
                        <p className="text-sm text-foreground/85 leading-relaxed relative z-10">
                          {liturgy.evangelho.curiosity}
                        </p>
                      </div>
                    )}

                    <div className="divider-gold mx-auto my-4" />

                    {/* Opções de Compartilhamento */}
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleShare(true)}
                        disabled={generating}
                        className="gradient-divine w-full rounded-full py-5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-95"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar com Curiosidade
                      </Button>
                      <Button
                        onClick={() => handleShare(false)}
                        disabled={generating}
                        variant="outline"
                        className="w-full rounded-full py-5 text-xs font-bold border-primary/20 text-foreground hover:bg-primary/5"
                      >
                        <Share2 className="w-4 h-4 mr-2 text-primary" />
                        Compartilhar Apenas Evangelho
                      </Button>
                    </div>

                    {user && (
                      <div className="pt-2 text-center">
                        <p className="text-xs text-muted-foreground">
                          {CELESTIAL_LEVELS.indexOf(level) + 1 <= 20 ? (
                            <img src={`/level-icons/${CELESTIAL_LEVELS.indexOf(level) + 1}.png`} alt={level.name} className="h-5 object-contain inline-block mr-1" />
                          ) : (
                            level.emoji
                          )}
                          Compartilhe para fortalecer a comunidade e ganhar +30 pontos de fé!
                        </p>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* TAB: 1ª LEITURA */}
                <TabsContent value="primeira" className="outline-none">
                  <Card className="p-6 soft-shadow border-primary/15 space-y-4 bg-card/80 backdrop-blur-md rounded-[2.5rem]">
                    <div>
                      <div className="inline-block bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full mb-2">
                        {liturgy.primeiraLeitura?.referencia || "1ª Leitura"}
                      </div>
                      {liturgy.primeiraLeitura?.titulo && (
                        <h2 className="text-base font-bold text-foreground font-serif leading-snug">
                          {liturgy.primeiraLeitura.titulo}
                        </h2>
                      )}
                    </div>
                    <div className="divider-gold" />
                    <p className="text-sm text-foreground/80 leading-relaxed font-serif bg-white/40 p-5 rounded-2xl border border-primary/5 whitespace-pre-line">
                      {liturgy.primeiraLeitura?.texto || "Texto da 1ª Leitura não disponível para esta data."}
                    </p>
                    <p className="text-xs text-right italic text-muted-foreground font-serif">— Palavra do Senhor.</p>
                  </Card>
                </TabsContent>

                {/* TAB: SALMO */}
                <TabsContent value="salmo" className="outline-none">
                  <Card className="p-6 soft-shadow border-primary/15 space-y-4 bg-card/80 backdrop-blur-md rounded-[2.5rem]">
                    <div className="inline-block bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full">
                      {liturgy.salmo?.referencia || "Salmo Responsorial"}
                    </div>

                    {liturgy.salmo?.refrao && (
                      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1">Refrão</p>
                        <p className="text-sm font-bold text-foreground font-serif">
                          — {liturgy.salmo.refrao}
                        </p>
                      </div>
                    )}

                    <div className="divider-gold" />

                    <div className="text-sm text-foreground/80 leading-relaxed font-serif bg-white/40 p-5 rounded-2xl border border-primary/5 whitespace-pre-line">
                      {liturgy.salmo?.texto || "Salmo não disponível para esta data."}
                    </div>
                  </Card>
                </TabsContent>

                {/* TAB: 2ª LEITURA (quando houver) */}
                {liturgy.segundaLeitura && (
                  <TabsContent value="segunda" className="outline-none">
                    <Card className="p-6 soft-shadow border-primary/15 space-y-4 bg-card/80 backdrop-blur-md rounded-[2.5rem]">
                      <div>
                        <div className="inline-block bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full mb-2">
                          {liturgy.segundaLeitura.referencia}
                        </div>
                        {liturgy.segundaLeitura.titulo && (
                          <h2 className="text-base font-bold text-foreground font-serif leading-snug">
                            {liturgy.segundaLeitura.titulo}
                          </h2>
                        )}
                      </div>
                      <div className="divider-gold" />
                      <p className="text-sm text-foreground/80 leading-relaxed font-serif bg-white/40 p-5 rounded-2xl border border-primary/5 whitespace-pre-line">
                        {liturgy.segundaLeitura.texto}
                      </p>
                      <p className="text-xs text-right italic text-muted-foreground font-serif">— Palavra do Senhor.</p>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>

              {/* Bloco de Vídeo de Reflexão com link oficial */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-6">
                <Card className="p-6 soft-shadow border-primary/10 bg-card/80 backdrop-blur-md overflow-hidden rounded-[2.5rem]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Reflexão em Vídeo</h3>
                        <p className="text-[10px] text-muted-foreground">Evangelho do dia comentado</p>
                      </div>
                    </div>
                    <a
                      href="https://www.youtube.com/@PadreReginaldoManzotti"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <span>Canal Oficial</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {loadingVideo ? (
                    <div className="aspect-video bg-muted/50 rounded-2xl flex flex-col items-center justify-center animate-pulse">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Buscando vídeo...</p>
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
                  ) : isSameDay(selectedDate, new Date()) && isBeforeSix && !viewingYesterday ? (
                    <div className="p-6 text-center border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5">
                      <p className="text-xs text-foreground font-medium mb-3">
                        O vídeo de reflexão de hoje costuma ser publicado após as 6h da manhã.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fetchLatestReflectionVideo(subDays(new Date(), 1), true)}
                        className="rounded-full border-primary/20 text-primary hover:bg-primary/10 font-bold text-xs"
                      >
                        Assistir ao vídeo de ontem
                      </Button>
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-primary/10 rounded-2xl">
                      <p className="text-xs text-muted-foreground">Vídeo indisponível para esta data no canal oficial.</p>
                      <a 
                        href="https://www.youtube.com/@PadreReginaldoManzotti/videos" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-bold text-primary hover:underline mt-2 inline-block"
                      >
                        Ver vídeos recentes no canal →
                      </a>
                    </div>
                  )}

                  <p className="text-[10px] text-center mt-4 text-muted-foreground uppercase tracking-widest font-medium">
                    Pe. Reginaldo Manzotti • Evangelho do Dia
                  </p>
                </Card>
              </motion.div>
            </motion.div>
          ) : null}
        </div>
        <InviteGatePopup isAuthenticated={!!user} />
      </div>
    </PageTransition>
  );
};

export default DailyGospel;
