import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Share2, Loader2, BookOpen, Sparkles, Calendar, ChevronLeft, ChevronRight, Video, ExternalLink, MessageCircle } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { useXp } from "@/hooks/use-xp";
import { getLevel } from "@/lib/xp";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface ReadingSection {
  reference: string;
  text: string;
}

interface GospelData {
  verse: string;
  fullText: string;
  reference: string;
  liturgicalDay?: string;
  title?: string;
  curiosity?: string;
  imageUrl?: string;
  firstReading?: ReadingSection | null;
  psalm?: ReadingSection | null;
  secondReading?: ReadingSection | null;
  dateStr?: string;
}

const DailyGospel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { totalXp } = useXp();
  const [generating, setGenerating] = useState(false);
  const [loadingGospel, setLoadingGospel] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [gospel, setGospel] = useState<GospelData | null>(null);
  const [activeTab, setActiveTab] = useState("gospel");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    fetchDailyGospel(selectedDate);
  }, [selectedDate]);

  const fetchDailyGospel = async (targetDate: Date) => {
    setLoadingGospel(true);
    try {
      const day = String(targetDate.getDate()).padStart(2, '0');
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dateParam = `${day}-${month}`;
      const cacheKey = `gospel_cache_${targetDate.toISOString().slice(0, 10)}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.reference) {
            setGospel(parsed);
            setLoadingGospel(false);
            return;
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      // Fetch from liturgia API for the selected date
      const liturgiaRes = await fetch(`https://liturgia.up.railway.app/${dateParam}`);
      if (!liturgiaRes.ok) throw new Error("Falha ao carregar liturgia");
      const liturgiaData = await liturgiaRes.json();

      const evangelhoReferencia = liturgiaData.evangelho?.referencia || "Evangelho Universal";
      const evangelhoTextoBruto = liturgiaData.evangelho?.texto || "Texto indisponível.";
      const evangelhoTextoCompleto = evangelhoTextoBruto.replace(/\[\d+\]|\d+\.|\d+/g, '').replace(/\s+/g, ' ').trim();

      const primeiraLeituraRef = liturgiaData.primeiraLeitura?.referencia || "";
      const primeiraLeituraTexto = (liturgiaData.primeiraLeitura?.texto || "").replace(/\[\d+\]|\d+\.|\d+/g, '').replace(/\s+/g, ' ').trim();

      const salmoRef = liturgiaData.salmo?.referencia || "";
      const salmoTexto = (liturgiaData.salmo?.texto || "").replace(/\[\d+\]|\d+\.|\d+/g, '').replace(/\s+/g, ' ').trim();

      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      let verseResumo = evangelhoTextoCompleto.slice(0, 200) + "...";
      let curiosidade = "";

      if (GEMINI_API_KEY && evangelhoTextoCompleto.length > 50) {
        const promptDaily = `Abaixo está o texto do Evangelho Católico (${evangelhoReferencia}).
Texto Oficial: "${evangelhoTextoCompleto}"

Sua tarefa é extrair:
1. RESUMO: Um resumo poético de no máximo 2 frases que capture a essência da mensagem.
2. CURIOSIDADE: Um fato HISTÓRICO, ARQUEOLÓGICO ou CULTURAL único sobre a época de Jesus sobre este texto. Comece com 'Você sabia que...'.

Responda APENAS JSON válido:
{
  "resumo": "texto aqui",
  "curiosidade": "texto aqui"
}`;
        try {
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
          console.error("Falha IA curiosidade", e);
        }
      }

      if (!curiosidade) {
        const fallbacks = [
          "Você sabia que, nos tempos de Jesus, os manuscritos eram raros e preciosos, guardados em sinagogas em rolos de pergaminho.",
          "Curiosidade: Na época do Evangelho, a maioria das pessoas falava Aramaico, mas as escrituras eram lidas em Hebraico.",
          "Fato Histórico: As casas na Palestina do primeiro século tinham telhados planos usados para oração e descanso ao entardecer."
        ];
        curiosidade = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      const finalGospel: GospelData = {
        verse: verseResumo,
        fullText: evangelhoTextoCompleto,
        reference: evangelhoReferencia,
        liturgicalDay: liturgiaData.liturgia || "Liturgia Diária",
        title: "Palavra de Salvação",
        curiosity: curiosidade,
        imageUrl: "/daily-gospel/today-gospel.webp",
        firstReading: primeiraLeituraTexto ? { reference: primeiraLeituraRef, text: primeiraLeituraTexto } : null,
        psalm: salmoTexto ? { reference: salmoRef, text: salmoTexto } : null,
        dateStr: format(targetDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      };

      setGospel(finalGospel);
      localStorage.setItem(cacheKey, JSON.stringify(finalGospel));
    } catch (err) {
      console.error("Failed to fetch daily gospel:", err);
      setGospel({
        verse: "Deus nos amou tanto que entregou Seu Filho para que tivéssemos a vida eterna.",
        fullText: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.",
        reference: "João 3:16",
        liturgicalDay: "Evangelho Perene",
        title: "O Amor de Deus",
        curiosity: "João 3:16 é frequentemente chamado de 'O Evangelho em Miniatura' porque resume brilhantemente toda a mensagem da salvação.",
        imageUrl: "/daily-gospel/today-gospel.webp",
        dateStr: format(targetDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      });
    } finally {
      setLoadingGospel(false);
    }
  };

  const level = getLevel(totalXp);
  const APP_URL = "https://amens-app.vercel.app";
  const referralLink = user ? `${APP_URL}/auth?ref=${user.id}` : APP_URL;

  const handleShare = async (includeCuriosity: boolean) => {
    if (!gospel) return;
    setGenerating(true);
    try {
      let shareText = `✦ Evangelho - ${gospel.dateStr} (${gospel.reference}) ✦\n\n"${gospel.fullText}"\n`;
      if (includeCuriosity && gospel.curiosity) {
        shareText += `\n💡 ${gospel.curiosity}\n`;
      }
      shareText += `\n🙏 Acompanhe no Amens App:\n${referralLink}`;

      if (navigator.share) {
        await navigator.share({ title: 'Evangelho do Dia', text: shareText });
        toast.success("Evangelho compartilhado com sucesso!");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      toast.success("Mensagem copiada para a área de transferência! 📋");
    } catch {
      toast.error("Não foi possível compartilhar.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-16">
        <div className="absolute top-[-8rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-6rem] w-[24rem] h-[24rem] rounded-full bg-accent/5 blur-3xl" />

        <div className="container mx-auto px-4 py-6 relative z-10 max-w-xl">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-1 font-bold">✦</p>
            <h1 className="text-4xl font-bold text-foreground mb-1">Evangelho do Dia</h1>
            <div className="divider-gold max-w-[6rem] mx-auto my-2" />
            <p className="text-xs text-muted-foreground font-medium">Liturgia Católica & Palavra de Deus</p>
          </motion.div>

          {/* Liturgical Date Picker Bar */}
          <div className="flex items-center justify-between bg-card/90 border border-primary/15 rounded-2xl p-2 mb-6 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => setSelectedDate(prev => subDays(prev, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
              {format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && (
                <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Hoje</span>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => setSelectedDate(prev => addDays(prev, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {loadingGospel ? (
            <Card className="p-8 soft-shadow border-primary/15 text-center rounded-[2rem]">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Carregando a liturgia para a data selecionada...</p>
            </Card>
          ) : gospel ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <Card className="p-6 md:p-8 soft-shadow border-primary/15 space-y-6 bg-card/80 backdrop-blur-md rounded-[2rem]">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto gradient-divine rounded-full flex items-center justify-center mb-3">
                    <BookOpen className="w-6 h-6 text-primary-foreground" />
                  </div>

                  {gospel.liturgicalDay && (
                    <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">
                      {gospel.liturgicalDay}
                    </p>
                  )}
                </div>

                {/* Liturgy Navigation Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 w-full rounded-xl bg-primary/5 p-1">
                    <TabsTrigger value="gospel" className="text-xs font-bold rounded-lg">Evangelho</TabsTrigger>
                    <TabsTrigger value="firstReading" disabled={!gospel.firstReading} className="text-xs font-bold rounded-lg">1ª Leitura</TabsTrigger>
                    <TabsTrigger value="psalm" disabled={!gospel.psalm} className="text-xs font-bold rounded-lg">Salmo</TabsTrigger>
                  </TabsList>

                  <TabsContent value="gospel" className="space-y-4 pt-4">
                    <div className="text-left space-y-2">
                      <h3 className="text-xs uppercase tracking-widest text-primary font-bold flex items-center">
                        <BookOpen className="w-3.5 h-3.5 mr-2" />
                        Evangelho ({gospel.reference})
                      </h3>
                      <p className="text-sm text-foreground/80 leading-relaxed font-serif bg-muted/30 p-4 rounded-2xl border border-primary/10">
                        {gospel.fullText}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="firstReading" className="space-y-4 pt-4">
                    {gospel.firstReading && (
                      <div className="text-left space-y-2">
                        <h3 className="text-xs uppercase tracking-widest text-primary font-bold flex items-center">
                          <BookOpen className="w-3.5 h-3.5 mr-2" />
                          1ª Leitura ({gospel.firstReading.reference})
                        </h3>
                        <p className="text-sm text-foreground/80 leading-relaxed font-serif bg-muted/30 p-4 rounded-2xl border border-primary/10">
                          {gospel.firstReading.text}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="psalm" className="space-y-4 pt-4">
                    {gospel.psalm && (
                      <div className="text-left space-y-2">
                        <h3 className="text-xs uppercase tracking-widest text-primary font-bold flex items-center">
                          <BookOpen className="w-3.5 h-3.5 mr-2" />
                          Salmo Responsorial ({gospel.psalm.reference})
                        </h3>
                        <p className="text-sm text-foreground/80 leading-relaxed font-serif bg-muted/30 p-4 rounded-2xl border border-primary/10 italic">
                          {gospel.psalm.text}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {gospel.curiosity && (
                  <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 text-left relative overflow-hidden">
                    <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-2" />
                      Curiosidade da Época
                    </p>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {gospel.curiosity}
                    </p>
                  </div>
                )}

                {/* Video Reflection Link */}
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 dark:text-red-400">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Reflexão em Vídeo</p>
                      <p className="text-[11px] text-muted-foreground">Assista à homilia e explicação do dia</p>
                    </div>
                  </div>
                  <a
                    href="https://www.youtube.com/results?search_query=evangelho+do+dia+homilia+padre"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                  >
                    Assistir <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                </div>

                <div className="divider-gold mx-auto my-4" />

                {/* Sharing Options */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold text-center mb-2">Compartilhar com a comunidade:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleShare(true)}
                      disabled={generating}
                      className="rounded-full bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] font-bold text-xs py-5 border-0 hover:opacity-90 shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Com Curiosidade
                    </Button>
                    <Button
                      onClick={() => handleShare(false)}
                      disabled={generating}
                      variant="outline"
                      className="rounded-full border-primary/20 text-primary text-xs py-5 hover:bg-primary/5"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Apenas Evangelho
                    </Button>
                  </div>
                </div>

                {user && (
                  <p className="text-xs text-muted-foreground text-center">
                    {level.emoji} Conectado como <span className="font-semibold text-primary">{level.name}</span>
                  </p>
                )}
              </Card>
            </motion.div>
          ) : null}
        </div>
      </div>
    </PageTransition>
  );
};

export default DailyGospel;

