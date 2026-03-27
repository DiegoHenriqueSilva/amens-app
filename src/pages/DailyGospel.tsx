import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Share2, Loader2, BookOpen, Sparkles } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { useXp } from "@/hooks/use-xp";
import { getLevel } from "@/lib/xp";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface GospelData {
  verse: string;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    fetchDailyGospel();
  }, []);

  const fetchDailyGospel = async () => {
    setLoadingGospel(true);
    try {
      const cached = localStorage.getItem("daily_gospel_cache_v6");
      const todayString = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === todayString && parsed.data.curiosity) {
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
      let imageUrl = "";
      
      // Inteligência Artificial resume o pão diário e gera o extra!
      if (GEMINI_API_KEY && evangelhoTextoCompleto.length > 50) {
          const promptDaily = `Abaixo está o texto do Evangelho Católico do dia de hoje (${evangelhoReferencia}).
Texto Oficial: "${evangelhoTextoCompleto}"

Sua tarefa é extrair 3 informações do texto oficial acima:
1. RESUMO: Um resumo poético de no máximo 2 frases.
2. CURIOSIDADE: Um fato HISTÓRICO, ARQUEOLÓGICO ou CULTURAL impactante sobre a época de Jesus especificamente relacionado a este texto. Comece com 'Você sabia que...'.
3. KEYWORDS: 3 palavras-chave em inglês separadas por vírgula para busca de imagem.

Responda exatamente no formato abaixo:
RESUMO: [texto]
CURIOSIDADE: [texto]
KEYWORDS: [texto]`;
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptDaily }] }] })
          });
          
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const textResponse = gData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            try {
              const resLines = textResponse.split('\n');
              resLines.forEach(line => {
                if (line.startsWith('RESUMO:')) verseResumo = line.replace('RESUMO:', '').trim();
                if (line.startsWith('CURIOSIDADE:')) curiosidade = line.replace('CURIOSIDADE:', '').trim();
                if (line.startsWith('KEYWORDS:')) {
                  const keys = line.replace('KEYWORDS:', '').trim();
                  imageUrl = `https://loremflickr.com/1024/1024/${encodeURIComponent(keys.replace(/\s/g, ''))}/all`;
                }
              });
            } catch(e) { console.error("Falha ao processar texto", e); }
          }
      }

      const finalGospel = {
        verse: verseResumo,
        reference: evangelhoReferencia,
        liturgicalDay: liturgiaData.liturgia || "Evangelho do Dia",
        title: "Palavra de Salvação",
        curiosity: curiosidade,
        imageUrl: imageUrl
      };

      setGospel(finalGospel);
      localStorage.setItem("daily_gospel_cache_v6", JSON.stringify({ data: finalGospel, date: todayString }));

    } catch (err) {
      console.error("Failed to fetch daily gospel:", err);
      // Generate a fallback image URL for John 3:16
      setGospel({
        verse: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...",
        reference: "João 3:16",
        liturgicalDay: "Evangelho Perene",
        title: "O Amor de Deus",
        curiosity: "João 3:16 é frequentemente chamado de 'O Evangelho em Miniatura' porque resume brilhantemente toda a mensagem da salvação cristã num único sopro de esperança.",
        imageUrl: "https://loremflickr.com/1024/1024/jesus,faith/all"
      });
    } finally {
      setLoadingGospel(false);
    }
  };

  const level = getLevel(totalXp);
  const referralLink = user
    ? `${window.location.origin}/auth?ref=${user.id}`
    : window.location.origin;

  const handleShare = async () => {
    if (!gospel) return;
    const shareText = `✦ Evangelho de Hoje (${gospel.liturgicalDay}) ✦\n\n"${gospel.verse}"\n— ${gospel.reference}\n\n🙏 ${gospel.curiosity || ""}\n\nJunte-se à corrente de preces comigo:\n${referralLink}`;
    
    setGenerating(true);
    try {
      if (navigator.share) {
        try {
          // Passamos a URL da imagem diretamente para que o app alvo (WhatsApp, etc) busque e mostre o preview
          await navigator.share({
            title: 'Evangelho Divino',
            text: shareText,
            url: gospel.imageUrl || undefined
          });
          toast.success("Evangelho compartilhado com sucesso!");
          return;
        } catch (shareErr) {
          console.warn("Share cancelado ou falhou", shareErr);
        }
      }

      await navigator.clipboard.writeText(shareText + (gospel.imageUrl ? `\n\nVeja a imagem de hoje: ${gospel.imageUrl}` : ''));
      toast.success("Texto belíssimo copiado! Hora de abençoar as mensagens de outras pessoas. 📋");
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
            <p className="text-sm text-muted-foreground text-glow font-medium">Catálogo e Liturgia Católica com IA</p>
          </motion.div>

          {loadingGospel ? (
            <Card className="p-8 soft-shadow border-primary/15 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Sua inteligência está lendo os ritos de hoje e compilando o resumo perfeito...</p>
            </Card>
          ) : gospel ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="p-8 soft-shadow border-primary/15 text-center space-y-6 bg-card/80 backdrop-blur-md">
                <div className="w-14 h-14 mx-auto gradient-divine rounded-full flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-primary-foreground" />
                </div>

                {gospel.liturgicalDay && (
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium">
                    {gospel.liturgicalDay}
                  </p>
                )}

                {gospel.title && (
                  <h2 className="text-lg font-semibold text-foreground">{gospel.title}</h2>
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

                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 relative">
                  <motion.blockquote
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="text-base leading-relaxed text-foreground italic font-serif"
                  >
                    "{gospel.verse}"
                  </motion.blockquote>
                  <p className="text-sm font-semibold text-primary mt-4 flex justify-center items-center gap-2">
                    <span className="h-px w-6 bg-primary/30 inline-block"></span> 
                    {gospel.reference} 
                    <span className="h-px w-6 bg-primary/30 inline-block"></span>
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

                <Button
                  onClick={handleShare}
                  disabled={generating}
                  className="gradient-divine text-primary-foreground hover:opacity-90 w-full rounded-full py-6 text-base shadow-md"
                >
                  <Share2 className="w-5 h-5 mr-3" />
                  Compartilhar Mensagem
                </Button>
                
                {user && (
                  <motion.div className="pt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <p className="text-xs text-muted-foreground">
                      {level.emoji} Enviando como <span className="font-semibold text-primary">{level.name}</span>. Você pode ganhar +30 XP hoje!
                    </p>
                  </motion.div>
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
