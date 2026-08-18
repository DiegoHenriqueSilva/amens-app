import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, ArrowLeft, Info, ShieldAlert, CheckCircle2, HeartHandshake, ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useXp } from "@/hooks/use-xp";
import { XP_REWARDS } from "@/lib/xp";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const Submit = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [preferredName, setPreferredName] = useState<string>("");
  const [submittedData, setSubmittedData] = useState<{ title: string; content: string } | null>(null);
  const { addXp } = useXp();

  const [formData, setFormData] = useState({ title: "", content: "", location: "" });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        const city = session.user.user_metadata?.city;
        const state = session.user.user_metadata?.state;
        if (city && state) {
          setFormData(prev => ({ ...prev, location: `${city}, ${state}` }));
        } else if (city) {
          setFormData(prev => ({ ...prev, location: city }));
        }

        // Fetch profile preferred name
        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("display_name, full_name")
          .eq("id", session.user.id)
          .maybeSingle();

        const name = (profile as any)?.display_name || session.user.user_metadata?.full_name?.split(" ")[0] || "Irmão(ã)";
        setPreferredName(name);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast.error("Por favor, descreva seu pedido de oração");
      return;
    }

    // PII Basic check warning
    const phoneRegex = /(\(?\d{2}\)?\s?)?(\d{4,5}[-\s]?\d{4})/;
    const cpfRegex = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/;
    if (cpfRegex.test(formData.content) || phoneRegex.test(formData.content)) {
      toast.warning("Atenção: Por segurança, evite incluir dados sensíveis como número de telefone ou CPF.");
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authorName = isAnonymous ? "Anônimo" : (preferredName || "Anônimo");
      
      const { error } = await supabase.from('prayer_requests').insert([{
        title: formData.title.trim() || `Pedido de ${authorName}`,
        content: formData.content.trim(),
        location: formData.location.trim() || null,
        prayer_count: 0,
        user_id: session?.user?.id,
        author_name: authorName,
      }]);

      if (error) throw error;

      await addXp("submit");
      toast.success(`Pedido enviado! +${XP_REWARDS.submit} XP`);
      
      setSubmittedData({
        title: formData.title.trim() || `Pedido de ${authorName}`,
        content: formData.content.trim()
      });
      setFormData({ title: "", content: "", location: "" });
    } catch (error: any) {
      console.error('Error submitting prayer request:', error);
      toast.error(`Erro técnico: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-20">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4 z-20">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="absolute top-[-6rem] right-[-4rem] w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div className="max-w-2xl mx-auto text-center mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">Enviar Pedido de Oração</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Compartilhe sua necessidade com a comunidade de fé</p>
          </motion.div>

          {/* Toggle Example & Guidance Box */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 text-sm text-foreground/80 space-y-2">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowExample(!showExample)}>
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Info className="w-4 h-4" />
                  <span>Dicas e Exemplo de Pedido</span>
                </div>
                <span className="text-xs text-primary font-bold">{showExample ? "Ocultar ▲" : "Ver Exemplo ▼"}</span>
              </div>

              <AnimatePresence>
                {showExample && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 border-t border-primary/10 space-y-2 text-xs text-muted-foreground"
                  >
                    <p className="font-medium text-foreground">💡 Exemplo recomendado:</p>
                    <p className="italic bg-background/60 p-3 rounded-lg border border-primary/10">
                      "Peço orações pela saúde da minha família e por paz em nosso lar. Que a graça divina nos fortaleça neste momento."
                    </p>
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>Segurança: Evite compartilhar dados sensíveis como número de documentos ou endereço completo.</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }}>
            <Card className="max-w-2xl mx-auto p-6 md:p-8 soft-shadow border-primary/10 rounded-[2rem]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="title" className="text-base font-semibold">Título do Pedido</Label>
                    <span className="text-xs text-muted-foreground">(Opcional)</span>
                  </div>
                  <Input id="title" placeholder="Ex: Cura e saúde para meu familiar" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} maxLength={100} className="rounded-xl" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="content" className="text-base font-semibold">
                      Seu Pedido de Oração <span className="text-amber-500 font-bold">*</span>
                    </Label>
                  </div>
                  <Textarea
                    id="content"
                    placeholder="Descreva seu pedido de oração com sinceridade e fé..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="mt-1 min-h-[160px] rounded-xl custom-scrollbar resize-none p-4"
                    required
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>* Indica campo de preenchimento obrigatório</span>
                    <span>{formData.content.length}/1000 caracteres</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="location" className="text-base font-semibold">Sua Cidade / UF</Label>
                  <Input id="location" placeholder="Ex: São Paulo, SP" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="mt-2 rounded-xl" maxLength={100} />
                </div>

                {/* Anonymization Checkbox */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox id="anonymous" checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(!!checked)} />
                    <Label htmlFor="anonymous" className="font-semibold cursor-pointer text-sm">
                      Desejo enviar este pedido de forma Anônima
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">
                    {isAnonymous
                      ? "Seu pedido será assinado como \"Anônimo\" na comunidade."
                      : `Seu pedido será exibido com seu Nome Preferido: "${preferredName || "Sua conta"}".`}
                  </p>
                </div>

                <Button type="submit" disabled={isSubmitting} size="lg" className="w-full rounded-full text-base py-6 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0">
                  <Send className="w-5 h-5 mr-2" />
                  {isSubmitting ? "Enviando..." : "Enviar Pedido de Oração"}
                </Button>
              </form>
            </Card>
          </motion.div>

          <motion.div className="max-w-2xl mx-auto mt-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <p className="text-xs text-muted-foreground">
              Seus pedidos serão compartilhados com os intercessores da comunidade Amens.
            </p>
          </motion.div>
        </div>

        {/* Post-Submission Success Dialog */}
        <Dialog open={!!submittedData} onOpenChange={(open) => { if (!open) setSubmittedData(null); }}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-6 text-center">
            <DialogHeader>
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-bold text-center">Pedido Enviado! ✦</DialogTitle>
              <DialogDescription className="text-center pt-2">
                Seu pedido de oração já foi disponibilizado para a comunidade interceder por você.
              </DialogDescription>
            </DialogHeader>

            {submittedData && (
              <div className="my-4 p-4 rounded-xl bg-primary/5 border border-primary/10 text-left text-sm space-y-1">
                <p className="font-bold text-foreground">{submittedData.title}</p>
                <p className="text-muted-foreground line-clamp-3 italic text-xs">"{submittedData.content}"</p>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="w-full rounded-full border-primary/20 hover:bg-primary/5"
                onClick={() => {
                  setSubmittedData(null);
                  navigate("/my-prayers");
                }}
              >
                <ListOrdered className="w-4 h-4 mr-2" />
                Ver Minhas Preces
              </Button>
              <Button
                className="w-full rounded-full bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 font-bold border-0"
                onClick={() => setSubmittedData(null)}
              >
                <HeartHandshake className="w-4 h-4 mr-2" />
                Enviar Outro Pedido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default Submit;

