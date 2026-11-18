import { useEffect, useId, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

export interface AdminTarget {
  id: string;
  name: string;
  email?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  target: AdminTarget | null;
  description?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Campos extras (duração, papel...). */
  children?: React.ReactNode;
  /** Falso quando os campos extras são inválidos. */
  canConfirm?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
}

/**
 * Confirmação de ação administrativa: mostra sempre a identidade do alvo,
 * exige motivo (mín. 3 caracteres, também validado no servidor) e exibe o erro
 * do servidor sem fechar o diálogo — nunca há "sucesso" sem confirmação real.
 */
export function AdminActionDialog({
  open, onOpenChange, title, target, description, confirmLabel, destructive, children, canConfirm = true, onConfirm,
}: Props) {
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setReason(""); setTouched(false); setServerError(null); setPending(false); }
  }, [open, target?.id]);

  const reasonValid = reason.trim().length >= 3;

  async function submit() {
    setTouched(true);
    if (!reasonValid || !canConfirm || pending) return;
    setPending(true);
    setServerError(null);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription asChild><div>{description}</div></DialogDescription>}
        </DialogHeader>

        {target && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="font-medium break-words">{target.name}</p>
            {target.email && <p className="text-muted-foreground text-xs break-all">{target.email}</p>}
            <p className="text-muted-foreground text-[11px] font-mono">ID {target.id.slice(0, 8)}…</p>
          </div>
        )}

        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          {children}
          <div className="space-y-1.5">
            <Label htmlFor={reasonId}>Motivo (obrigatório)</Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Ex.: conteúdo inapropriado reincidente"
              rows={2}
              maxLength={500}
              aria-invalid={touched && !reasonValid}
              aria-describedby={`${reasonId}-help`}
            />
            <p id={`${reasonId}-help`} className={`text-xs ${touched && !reasonValid ? "text-destructive" : "text-muted-foreground"}`}>
              {touched && !reasonValid ? "Informe o motivo com pelo menos 3 caracteres." : "Fica registrado no log de moderação."}
            </p>
          </div>

          {serverError && (
            <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending || !canConfirm}>
              {pending ? "Salvando…" : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
