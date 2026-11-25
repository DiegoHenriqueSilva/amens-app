import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

const REPORT_CATEGORIES = [
  { value: 'inappropriate', label: 'Conteúdo ofensivo ou inapropriado' },
  { value: 'fake', label: 'Pedido falso ou enganoso' },
  { value: 'spam', label: 'Spam ou pedido repetido' },
  { value: 'off_topic', label: 'Conteúdo fora do contexto religioso' },
  { value: 'other', label: 'Outro motivo' },
];

interface Props {
  open: boolean;
  prayerRequestId: string | null;
  onClose: () => void;
  onConfirmed: () => void;
}

export const ReportPrayerDialog = ({ open, prayerRequestId, onClose, onConfirmed }: Props) => {
  const opener = useRef<HTMLElement | null>(null);
  const submissionLock = useRef(false);
  const [category, setCategory] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const toast = { error: (message: string) => setErrorMessage(message), success: (_message: string) => setErrorMessage('') };

  const handleSubmit = async () => {
    if (submissionLock.current) return;
    if (!category) {
      toast.error('Selecione uma categoria para o reporte.');
      return;
    }
    if (category === 'other' && !customReason.trim()) {
      toast.error('Escreva o motivo do reporte.');
      return;
    }
    if (!prayerRequestId) return;

    submissionLock.current = true;
    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado para reportar.');
        return;
      }

      const { error } = await supabase.rpc('report_prayer_cause', {
        p_prayer_id: prayerRequestId,
        p_category: category,
        p_custom_reason: category === 'other' ? customReason.trim() : null,
        p_description: description.trim() || null,
      });

      if (error) throw error;

      toast.success('Reporte enviado com sucesso. Nossa equipe irá analisar. 🙏');
      setCategory('');
      setCustomReason('');
      setDescription('');
      onConfirmed();
    } catch (e) {
      console.error('Report error:', e);
      toast.error('Erro ao enviar o reporte. Tente novamente.');
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        className="max-w-md max-h-[85dvh] overflow-y-auto bg-white rounded-[2rem] p-6"
        onOpenAutoFocus={() => {
          opener.current = document.activeElement as HTMLElement;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
              <Flag className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Reportar Causa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Nossa equipe irá analisar seu reporte
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Categoria */}
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Motivo do reporte *
          </p>
          <div className="space-y-2">
            {REPORT_CATEGORIES.map((cat) => (
              <button
                type="button"
                aria-pressed={category === cat.value}
                disabled={isSubmitting}
                key={cat.value}
                onClick={() => {
                  setCategory(cat.value);
                  if (cat.value !== 'other') setCustomReason('');
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  category === cat.value
                    ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                    : 'border-primary/10 hover:bg-primary/5 text-foreground/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Descrição */}
        {category === 'other' && (
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Qual motivo deseja reportar? *
            </p>
            <Textarea
              disabled={isSubmitting}
              aria-label="Motivo do reporte"
              placeholder="Escreva o motivo do reporte..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="min-h-[72px] rounded-xl border-primary/15 text-sm resize-none"
              maxLength={300}
            />
          </div>
        )}

        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Descrição adicional (opcional)
          </p>
          <Textarea
            disabled={isSubmitting}
            aria-label="Descrição adicional"
            placeholder="Descreva o motivo com mais detalhes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px] rounded-xl border-primary/15 text-sm resize-none"
            maxLength={500}
          />
        </div>

        {errorMessage && <p role="alert" className="mb-4 text-sm text-destructive">{errorMessage}</p>}
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
            disabled={!category || (category === 'other' && !customReason.trim()) || isSubmitting}
            className="flex-1 rounded-xl bg-red-700 hover:bg-red-800 text-white border-0"
          >
            {isSubmitting ? 'Enviando...' : 'Reportar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
