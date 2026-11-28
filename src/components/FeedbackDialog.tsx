import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "sugestao", label: "Sugestão" },
  { value: "bug", label: "Problema / Bug" },
  { value: "elogio", label: "Elogio" },
  { value: "outro", label: "Outro" },
] as const;

type FeedbackDialogProps = {
  iconOnly?: boolean;
};

export function FeedbackDialog({ iconOnly = false }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const clearDraft = () => {
    setCategory("");
    setMessage("");
  };

  const closeDialog = () => {
    if (sending) return;
    setOpen(false);
    clearDraft();
  };

  async function handleSend() {
    const trimmedMessage = message.trim();
    if (!category) {
      toast.error("Escolha uma categoria para o feedback.");
      return;
    }
    if (trimmedMessage.length < 10) {
      toast.error("Escreva pelo menos 10 caracteres para enviar o feedback.");
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Entre na sua conta para enviar uma sugestão.");
        return;
      }

      const { error } = await (supabase.from("user_feedback" as any) as any).insert({
        user_id: session.user.id,
        category,
        message: trimmedMessage,
      });
      if (error) throw error;

      toast.success("Obrigado! Seu feedback foi enviado para a equipe.");
      setOpen(false);
      clearDraft();
    } catch {
      // Keep the draft in place so the user can retry without losing the text.
      toast.error("Não foi possível enviar agora. Revise e tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size={iconOnly ? "icon" : "sm"}
        className={iconOnly ? "h-10 w-10 rounded-full border border-primary/20 bg-background/90 text-primary shadow-sm backdrop-blur-sm hover:bg-primary/10" : "text-xs font-bold gap-1.5"}
        onClick={() => setOpen(true)}
        aria-label="Enviar sugestão ou feedback"
        title="Enviar sugestão ou feedback"
      >
        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
        {!iconOnly && "Enviar sugestão"}
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : closeDialog()}>
        <DialogContent className="max-w-sm" aria-describedby="feedback-dialog-description">
          <DialogHeader>
            <DialogTitle>Enviar sugestão ou problema</DialogTitle>
            <DialogDescription id="feedback-dialog-description">
              Sugestões, elogios e problemas chegam à equipe do Améns. Este formulário não é uma denúncia de conteúdo ou de usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback-category">Categoria</Label>
              <Select value={category} onValueChange={setCategory} disabled={sending}>
                <SelectTrigger id="feedback-category" className="mt-1" aria-label="Categoria do feedback">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="feedback-message">Mensagem</Label>
              <Textarea
                id="feedback-message"
                className="mt-1 resize-none"
                rows={4}
                placeholder="Compartilhe sua ideia, problema ou elogio..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
                aria-describedby="feedback-message-help"
                disabled={sending}
              />
              <p id="feedback-message-help" className="text-xs text-muted-foreground text-right mt-1">{message.length}/2000 caracteres; mínimo de 10</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={sending}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending || !category || message.trim().length < 10}>
              {sending ? "Enviando..." : "Enviar feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
