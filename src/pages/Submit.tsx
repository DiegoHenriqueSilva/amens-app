import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useXp } from "@/hooks/use-xp";
import { XP_REWARDS } from "@/lib/xp";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";

const Submit = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addXp } = useXp();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  const [formData, setFormData] = useState({ title: "", content: "", location: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast.error("Por favor, descreva seu pedido de oração");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('prayer_requests').insert([{
        title: formData.title.trim() || null,
        content: formData.content.trim(),
        location: formData.location.trim() || null,
        prayer_count: 0,
        user_id: session?.user?.id,
      }]);
      if (error) throw error;
      await addXp("submit");
      toast.success(`Pedido enviado! +${XP_REWARDS.submit} XP`);
      setFormData({ title: "", content: "", location: "" });
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error('Error submitting prayer request:', error);
      toast.error("Erro ao enviar pedido de oração");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4 z-20">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="absolute top-[-6rem] right-[-4rem] w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div className="max-w-2xl mx-auto text-center mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 text-foreground">Enviar Pedido de Oração</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Compartilhe sua necessidade com a comunidade</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }}>
            <Card className="max-w-2xl mx-auto p-8 soft-shadow border-primary/10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-base">Título (Opcional)</Label>
                  <Input id="title" placeholder="Ex: Cura para meu filho Miguel" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-2" maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="content" className="text-base">Seu Pedido de Oração *</Label>
                  <Textarea id="content" placeholder="Descreva seu pedido de oração com detalhes..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="mt-2 min-h-[180px]" required maxLength={1000} />
                  <p className="text-sm text-muted-foreground mt-1">{formData.content.length}/1000 caracteres</p>
                </div>
                <div>
                  <Label htmlFor="location" className="text-base">Localização (Opcional)</Label>
                  <Input id="location" placeholder="Ex: São Paulo, SP" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="mt-2" maxLength={100} />
                </div>
                <Button type="submit" disabled={isSubmitting} size="lg" className="w-full gradient-divine text-primary-foreground hover:opacity-90">
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Enviando..." : "Enviar Pedido"}
                </Button>
              </form>
            </Card>
          </motion.div>

          <motion.div className="max-w-2xl mx-auto mt-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <p className="text-sm text-muted-foreground">
              Seus pedidos serão compartilhados com a comunidade de oração.
            </p>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Submit;
