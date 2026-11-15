import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
];

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!category || message.trim().length < 10) {
      toast.error("Preencha a categoria e escreva pelo menos 10 caracteres.");
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await (supabase.from("user_feedback" as any) as any).insert({
        user_id: session?.user?.id ?? null,
        category,
        message: message.trim(),
      });
      if (error) throw error;
      toast.success("Obrigado! Seu feedback foi enviado.");
      setOpen(false);
      setCategory("");
      setMessage("");
    } catch (e: any) {
      toast.error("Erro ao enviar: " + e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs font-bold gap-1.5"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Enviar sugestão
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar sugestão ou feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={4}
                placeholder="Compartilhe sua ideia, problema ou elogio..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{message.length}/2000</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
