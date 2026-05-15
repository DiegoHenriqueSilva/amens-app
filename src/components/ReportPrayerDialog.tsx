import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REPORT_CATEGORIES = [
  { value: "inappropriate", label: "Conteúdo ofensivo ou inapropriado" },
  { value: "fake", label: "Pedido falso ou enganoso" },
  { value: "spam", label: "Spam ou pedido repetido" },
  { value: "off_topic", label: "Conteúdo fora do contexto religioso" },
  { value: "other", label: "Outro motivo" },
];

interface Props {
  open: boolean;
  prayerRequestId: string | null;
  onClose: () => void;
  onConfirmed: () => void;
}

export const ReportPrayerDialog = ({
  open,
  prayerRequestId,
  onClose,
  onConfirmed,
}: Props) => {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category) {
      toast.error("Selecione uma categoria para o reporte.");
      return;
    }
    if (!prayerRequestId) return;

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para reportar.");
        return;
      }

      const { error } = await supabase.from("prayer_reports" as any).insert({
        prayer_request_id: prayerRequestId,
        reporter_user_id: session.user.id,
        category,
        description: description.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success(
        "Reporte enviado com sucesso. Nossa equipe irá analisar. 🙏"
      );
      setCategory("");
      setDescription("");
      onConfirmed();
    } catch (e) {
      console.error("Report error:", e);
      toast.error("Erro ao enviar o reporte. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[100] max-w-md mx-auto"
          >
            <div className="bg-paper rounded-xl border border-hairline shadow-nav p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                    <Flag className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Reportar Causa
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Nossa equipe irá analisar seu reporte
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Categoria */}
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Motivo do reporte *
                </p>
                <div className="space-y-2">
                  {REPORT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        category === cat.value
                          ? "border-red-400 bg-red-50 text-red-700 font-medium"
                          : "border-primary/10 hover:bg-primary/5 text-foreground/80"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Descrição adicional (opcional)
                </p>
                <Textarea
                  placeholder="Descreva o motivo com mais detalhes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] rounded-xl border-primary/15 text-sm resize-none"
                  maxLength={500}
                />
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 rounded-xl border-primary/15"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!category || isSubmitting}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  {isSubmitting ? "Enviando..." : "Reportar"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
