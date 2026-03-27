import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, Clock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";

const FEEDBACK_OPTIONS: Record<string, { label: string; emoji: string }> = {
  success: { label: "Deu certo, obrigado pelas orações!", emoji: "🎉" },
  not_this_time: { label: "Não foi desta vez, mas obrigado pelas preces!", emoji: "🙏" },
  keep_trying: { label: "Não deu certo mas vou continuar tentando", emoji: "💪" },
  god_knows: { label: "Não deu certo mas Deus sabe o que faz, obrigado pelas orações", emoji: "✝️" },
  grace_received: { label: "Consegui a graça solicitada, obrigado!", emoji: "⭐" },
};

type Intercession = {
  id: string;
  prayer_request_id: string;
  created_at: string;
  prayer_title: string | null;
  prayer_content: string;
  prayer_location: string | null;
  prayer_feedback: string | null;
};

const MyIntercessions = () => {
  const navigate = useNavigate();
  const [intercessions, setIntercessions] = useState<Intercession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      try {
        // Get intercessions
        const { data: intData, error } = await supabase
          .from("prayer_intercessions")
          .select("id, prayer_request_id, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!intData || intData.length === 0) { setIntercessions([]); setIsLoading(false); return; }

        // Get associated prayer requests
        const prayerIds = intData.map(i => i.prayer_request_id);
        const { data: prayerData } = await supabase
          .from("prayer_requests")
          .select("id, title, content, location, feedback")
          .in("id", prayerIds);

        const prayerMap: Record<string, any> = {};
        prayerData?.forEach(p => { prayerMap[p.id] = p; });

        setIntercessions(intData.map(i => {
          const p = prayerMap[i.prayer_request_id] || {};
          return {
            id: i.id,
            prayer_request_id: i.prayer_request_id,
            created_at: i.created_at,
            prayer_title: p.title || null,
            prayer_content: p.content || "Pedido removido",
            prayer_location: p.location || null,
            prayer_feedback: p.feedback || null,
          };
        }));
      } catch (error) {
        console.error("Error loading intercessions:", error);
        toast.error("Erro ao carregar suas intercessões");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4 z-20">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="absolute top-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div className="max-w-2xl mx-auto text-center mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 text-foreground">Minhas Intercessões</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Causas pelas quais você orou e o retorno dos solicitantes</p>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-5">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : intercessions.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <Card className="p-12 text-center soft-shadow border-primary/10">
                  <Heart className="w-14 h-14 mx-auto mb-5 text-muted-foreground/30" />
                  <h2 className="text-2xl font-semibold mb-2 text-foreground">Nenhuma intercessão ainda</h2>
                  <p className="text-muted-foreground mb-5">Ore por uma causa e ela aparecerá aqui</p>
                  <Button onClick={() => navigate("/pray")} className="gradient-divine text-primary-foreground hover:opacity-90">
                    Orar por uma Causa
                  </Button>
                </Card>
              </motion.div>
            ) : (
              intercessions.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="p-6 soft-shadow border-primary/10">
                    <div className="mb-3">
                      {item.prayer_title && <h3 className="text-lg font-semibold mb-1 text-foreground">{item.prayer_title}</h3>}
                      <p className="text-foreground/80 leading-relaxed line-clamp-3">{item.prayer_content}</p>
                    </div>
                    {item.prayer_location && <p className="text-sm text-muted-foreground mb-3">📍 {item.prayer_location}</p>}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Orei em {format(new Date(item.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>

                    {/* Feedback from requester */}
                    <div className="pt-3 border-t border-border">
                      {item.prayer_feedback ? (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Retorno do solicitante:</p>
                            <p className="text-sm font-medium text-foreground">
                              {FEEDBACK_OPTIONS[item.prayer_feedback]?.emoji}{" "}
                              {FEEDBACK_OPTIONS[item.prayer_feedback]?.label || item.prayer_feedback}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Aguardando retorno do solicitante...
                        </p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default MyIntercessions;
