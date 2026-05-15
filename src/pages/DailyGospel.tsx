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
import { InviteGatePopup } from "@/components/InviteGatePopup";

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
      // (task is already counted on page mount)

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
      <div className="min-h-screen pb-28">

        <div className="px-5 md:px-12 max-w-2xl mx-auto">
          <header className="flex items-center gap-3 pt-safe pt-4 pb-6">
            <button onClick={() => navigate("/")} className="p-1 -ml-1 text-ink-soft hover:text-ink transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="font-serif text-[22px] text-ink">Evangelho do Dia</h1>
              {gospel?.liturgicalDay && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">{gospel.liturgicalDay}</p>
              )}
            </div>
          </header>

          {loadingGospel ? (
            <div className="rounded-xl border border-hairline bg-vellum p-8 text-center">
              <div className="w-5 h-5 rounded-full border-2 border-marian border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-[13px] text-ink-soft">Buscando as leituras de hoje…</p>
            </div>
          ) : gospel ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {gospel.imageUrl && (
                <div className="w-full rounded-xl overflow-hidden aspect-square">
                  <img
                    src={gospel.imageUrl}
                    alt="Ilustração do Evangelho"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <div className="rounded-xl border border-hairline bg-vellum p-6 space-y-5">
                <div className="text-left space-y-3">
                  <p className="text-[9px] uppercase tracking-[0.28em] text-ink-soft flex items-center gap-2">
                    <BookOpen size={12} strokeWidth={1.5} />
                    Leitura completa · {gospel.reference}
                  </p>
                  <p className="font-serif text-[20px] leading-[1.55] text-ink">
                    {gospel.fullText}
                  </p>
                </div>

                {gospel.curiosity && (
                  <div className="pt-4 border-t border-hairline text-left">
                    <p className="text-[9px] uppercase tracking-[0.28em] text-gold mb-2">✦ Contexto histórico</p>
                    <p className="text-[13px] text-ink-soft leading-relaxed italic">
                      {gospel.curiosity}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleShare('full')}
                  disabled={generating}
                  className="w-full h-12 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Share2 size={16} strokeWidth={1.5} />
                  Compartilhar Evangelho
                </button>

                {user && (
                  <p className="text-[11px] text-ink-soft text-center">
                    Compartilhar rende pontos de fé.
                  </p>
                )}
              </div>

              {/* Video section */}
              <div className="rounded-xl border border-hairline bg-vellum p-5">
                <p className="text-[9px] uppercase tracking-[0.28em] text-ink-soft mb-4">Reflexão em vídeo</p>

                {loadingVideo ? (
                  <div className="aspect-video bg-hairline rounded-lg flex items-center justify-center animate-pulse">
                    <div className="w-4 h-4 rounded-full border-2 border-marian border-t-transparent animate-spin" />
                  </div>
                ) : videoId ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-ink">
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
                  <div className="p-6 text-center border border-dashed border-hairline rounded-lg">
                    <p className="text-[13px] text-ink-soft mb-4">Disponível após as 6h da manhã.</p>
                    <button
                      onClick={() => fetchLatestReflectionVideo(-1)}
                      className="text-sm text-marian hover:underline underline-offset-4"
                    >
                      Ver vídeo de ontem
                    </button>
                  </div>
                ) : (
                  <div className="p-5 text-center border border-dashed border-hairline rounded-lg">
                    <p className="text-[12px] text-ink-soft italic">Vídeo indisponível no momento.</p>
                  </div>
                )}

                <p className="text-[10px] text-ink-soft text-center mt-3">Pe. Reginaldo Manzotti · Oficial</p>
              </div>

            </motion.div>
          ) : null}
        </div>
        <InviteGatePopup isAuthenticated={!!user} />
      </div>
    </PageTransition>
  );
};

export default DailyGospel;
