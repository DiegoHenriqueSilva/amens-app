import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Share2, Loader2, BookOpen, Sparkles } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { useXp } from "@/hooks/use-xp";
import { getLevel, CELESTIAL_LEVELS } from "@/lib/xp";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useDailyTasks } from "@/hooks/use-daily-tasks";

interface GospelData {
  verse: string; // O resumo poético principal
  fullText: string; // O texto original completo
  reference: string;
  liturgicalDay?: string;
  title?: string;
  curiosity?: string;
  imageUrl?: string;
}

const DailyGospel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { totalXp } = useXp();
  const [generating, setGenerating] = useState(false);
  const [loadingGospel, setLoadingGospel] = useState(true);
  const [gospel, setGospel] = useState<GospelData | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [viewingYesterday, setViewingYesterday] = useState(false);
  const { completeTask } = useDailyTasks();

  const now = new Date();
  const hour = now.getHours();
  const isBeforeSix = hour < 6;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    fetchDailyGospel();
    // Só busca vídeo hoje se já for mais de 6h da manhã
    if (!isBeforeSix) {
      fetchLatestReflectionVideo();
    }
  }, []);

  const fetchLatestReflectionVideo = async (dateOffset: number = 0) => {
    const API_KEY = "AIzaSyAvWJ3SdQa6yaEFe5CPTzX7CWJ-65_tiXg";
    const CHANNEL_ID = "UCjWxeXfmtOnv1MndaSEWFew";
    setLoadingVideo(true);
    
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dateOffset);
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
        if (dateOffset === -1) setViewingYesterday(true);
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

  const fetchDailyGospel = async () => {
    setLoadingGospel(true);
    try {
      const CACHE_KEY = "daily_gospel_cache_v11";
      const cached = localStorage.getItem(CACHE_KEY);
      const todayString = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      
      if (cached) {
        const parsed = JSON.parse(cached);
        const liturgicalDay = "Evangelho do Dia"; // Fallback se não carregar a liturgia
        if (parsed.date === todayString && parsed.data.curiosity) {
          console.log("Using cached gospel for today:", parsed.data.reference);
          setGospel(parsed.data);
          setLoadingGospel(false);
          return;
        }
      }

      // Baixa a leitura da Igreja Católica Brasileira
      const liturgiaRes = await fetch("https://liturgia.up.railway.app/");
      if (!liturgiaRes.ok) throw new Error("Falha na liturgia");
      const liturgiaData = await liturgiaRes.json();
      
      const evangelhoReferencia = liturgiaData.evangelho?.referencia || "Evangelho Universal";
      const evangelhoTextoBruto = liturgiaData.evangelho?.texto || "Texto indisponível.";
      
      // Limpa números de versículos (ex: [1], 1., 20, etc) para uma leitura mais fluida
      const evangelhoTextoCompleto = evangelhoTextoBruto.replace(/\[\d+\]|\d+\.|\d+/g, '').replace(/\s+/g, ' ').trim();
         const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      let verseResumo = evangelhoTextoCompleto;
      let curiosidade = "";
      
      // O sistema resume o pão diário e gera o extra!
      if (GEMINI_API_KEY && evangelhoTextoCompleto.length > 50) {
          const promptDaily = `Abaixo está o texto do Evangelho Católico do dia de hoje (${evangelhoReferencia}).
Texto Oficial: "${evangelhoTextoCompleto}"

Sua tarefa é extrair 2 informações:
1. RESUMO: Um resumo poético de no máximo 2 frases que capture a essência da mensagem.
2. CURIOSIDADE: Um fato HISTÓRICO, ARQUEOLÓGICO ou CULTURAL único e específico sobre a época de Jesus que ajude a dar contexto a este texto exato. Evite generalidades. Comece com 'Você sabia que...'.

Responda APENAS com um objeto JSON válido no formato:
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
              
              // Limpa Markdown se houver
              const jsonClean = textResponse.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(jsonClean);
              
              if (parsed.resumo) verseResumo = parsed.resumo;
              if (parsed.curiosidade) curiosidade = parsed.curiosidade;
            }
          } catch(e) { 
            console.error("Falha ao processar resumo", e);
          }
      }

      // Fallback dinâmico para curiosidade caso a IA falhe ou não tenha chave
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

      const finalGospel = {
        verse: verseResumo,
        fullText: evangelhoTextoCompleto,
        reference: evangelhoReferencia,
        liturgicalDay: liturgiaData.liturgia || "Evangelho do Dia",
        title: "Palavra de Salvação",
        curiosity: curiosidade,
        imageUrl: "/daily-gospel/today-gospel.webp"
      };

      // Salva no cache incluindo o dia litúrgico para evitar repetições se a data for a mesma mas o conteúdo mudar
      setGospel(finalGospel);
      const cacheData = { data: finalGospel, date: todayString, liturgy: liturgiaData.liturgia };
      localStorage.setItem("daily_gospel_cache_v11", JSON.stringify(cacheData));
      completeTask("read_gospel");

    } catch (err) {
      console.error("Failed to fetch daily gospel:", err);
      const fallbackText = "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...";
      setGospel({
        verse: "Deus nos amou tanto que entregou Seu Filho para que tivéssemos a vida eterna.",
        fullText: fallbackText,
        reference: "João 3:16",
        liturgicalDay: "Evangelho Perene",
        title: "O Amor de Deus",
        curiosity: "João 3:16 é frequentemente chamado de 'O Evangelho em Miniatura' porque resume brilhantemente toda a mensagem da salvação cristã.",
        imageUrl: "/daily-gospel/today-gospel.webp"
      });
    } finally {
      setLoadingGospel(false);
    }
  };

  const level = getLevel(totalXp);
  const APP_URL = "https://amens-app.vercel.app";
  const referralLink = user
    ? `${APP_URL}/auth?ref=${user.id}`
    : APP_URL;

  const handleShare = async (mode: 'full' | 'summary' = 'full') => {
    if (!gospel) return;
    
    setGenerating(true);
    try {
      const textToShare = mode === 'full' ? gospel.fullText : gospel.verse;
      const shareText = `✦ Evangelho de Hoje (${gospel.liturgicalDay}) ✦\n\n"${textToShare}"\n— ${gospel.reference}\n\n🙏 ${gospel.curiosity}\n\nJunte-se à corrente de prece comigo:\n${referralLink}`;
      
      const shareData: any = {
        title: mode === 'full' ? 'Evangelho Completo' : 'Resumo do Evangelho',
        text: shareText,
      };

      // Tenta compartilhar como arquivo para incluir a imagem diretamente
      if (navigator.share) {
        try {
          const response = await fetch(gospel.imageUrl);
          const blob = await response.blob();
          const file = new File([blob], 'evangelho.jpg', { type: 'image/jpeg' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              ...shareData,
              files: [file]
            });
            toast.success(mode === 'full' ? "Compartilhado completo! ✨" : "Resumo compartilhado! ✨");
            completeTask("share_word");
            return;
          } else {
            await navigator.share(shareData);
            toast.success("Evangelho compartilhado!");
            completeTask("share_word");
            return;
          }
        } catch (fileErr) {
          console.warn("Falha ao gerar arquivo de imagem, tentando texto apenas", fileErr);
          await navigator.share(shareData);
          toast.success("Evangelho compartilhado!");
          return;
        }
      }

      await navigator.clipboard.writeText(shareText);
      toast.success("Mensagem copiada para a área de transferência! 📋");
    } catch {
      toast.error("Não foi possível realizar o compartilhamento.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute top-[-8rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-6rem] w-[24rem] h-[24rem] rounded-full bg-accent/5 blur-3xl" />

        <div className="container mx-auto px-4 py-6 relative z-10 max-w-lg">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-2 text-glow font-bold">✦</p>
            <h1 className="text-4xl font-bold text-foreground mb-2 text-glow text-soft-outline">Evangelho do Dia</h1>
            <div className="divider-gold max-w-[6rem] mx-auto my-3" />
            <p className="text-sm text-muted-foreground text-glow font-medium">Catálogo e Liturgia Católica Diária</p>
          </motion.div>

          {loadingGospel ? (
            <Card className="p-8 soft-shadow border-primary/15 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Buscando as leituras de hoje e preparando seu pão diário...</p>
            </Card>
          ) : gospel ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="p-8 soft-shadow border-primary/15 text-center space-y-6 bg-card/80 backdrop-blur-md">


                {gospel.liturgicalDay && (
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium">
                    {gospel.liturgicalDay}
                  </p>
                )}



                {gospel.imageUrl && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="w-full relative rounded-2xl overflow-hidden aspect-square border-2 border-primary/20 shadow-lg my-6">
                    <img 
                      src={gospel.imageUrl} 
                      alt="Ilustração do Evangelho" 
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  </motion.div>
                )}


                <div className="text-left space-y-3 pt-4">
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center">
                    <BookOpen className="w-3.5 h-3.5 mr-2" /> 
                    Leitura Completa ({gospel.reference})
                  </h3>
                  <p className="text-sm text-foreground/70 leading-relaxed font-serif bg-white/30 p-4 rounded-xl">
                    {gospel.fullText}
                  </p>
                </div>
                
                {gospel.curiosity && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 p-5 rounded-xl bg-accent/10 border border-accent/20 text-left relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <Sparkles className="w-24 h-24 text-primary" />
                    </div>
                    <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3 flex items-center relative z-10">
                      <Sparkles className="w-3.5 h-3.5 mr-2" /> 
                      Curiosidade da Época
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed relative z-10">
                      {gospel.curiosity}
                    </p>
                  </motion.div>
                )}

                <div className="divider-gold mx-auto my-6" />

                <div className="grid grid-cols-1 gap-3">
                  
                  <Button
                    onClick={() => handleShare('full')}
                    disabled={generating}
                    variant="outline"
                    className="border-primary/20 text-primary hover:bg-primary/5 w-full rounded-full py-6 text-sm"
                  >
                    <Share2 className="w-4 h-4 mr-3" />
                    Compartilhar
                  </Button>
                </div>
                
                {user && (
                  <motion.div className="pt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <p className="text-xs text-muted-foreground">
                      {level.emoji} Enviando como <span className="font-semibold text-primary">Nível {CELESTIAL_LEVELS.indexOf(level)} "{level.name}"</span>. Você pode ganhar +30 pontos de fé hoje!
                    </p>
                  </motion.div>
                )}
              </Card>

              {/* Bloco Separado para Vídeo de Reflexão */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-6"
              >
                <Card className="p-6 soft-shadow border-primary/10 bg-card/80 backdrop-blur-md overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-red-600" />
                     </div>
                     <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                        Reflexão em Vídeo
                     </h3>
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
                  ) : isBeforeSix && !viewingYesterday ? (
                    <div className="p-8 text-center border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5">
                       <p className="text-sm text-foreground font-medium mb-4">
                         O evangelho do dia estará disponível após as 6h da manhã.
                       </p>
                       <Button 
                         variant="outline" 
                         onClick={() => fetchLatestReflectionVideo(-1)}
                         className="rounded-full border-primary/20 text-primary hover:bg-primary/10 font-bold"
                       >
                         Assista ao vídeo do evangelho de ontem
                       </Button>
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-primary/10 rounded-2xl">
                       <p className="text-sm text-muted-foreground">Vídeo indisponível no momento.</p>
                       <p className="text-[10px] uppercase font-bold text-primary/40 mt-1">Tente novamente mais tarde</p>
                    </div>
                  )}

                  <p className="text-[10px] text-center mt-4 text-muted-foreground uppercase tracking-widest font-medium">
                    Pe. Reginaldo Manzotti • Oficial
                  </p>
                </Card>
              </motion.div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </PageTransition>
  );
};

export default DailyGospel;
