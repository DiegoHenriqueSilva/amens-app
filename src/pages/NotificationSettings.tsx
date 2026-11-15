import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BellRing, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";
import { getPushRegistrationStatus, requestAndRegisterPush, type NotificationPermissionStatus } from "@/lib/push";
import { scheduleDailyPromiseNotification, syncActiveNovenaReminders } from "@/lib/notifications";
import { toast } from "sonner";

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<NotificationPermissionStatus>("prompt");
  const [busy, setBusy] = useState(false);

  const refreshStatus = () => getPushRegistrationStatus().then(setStatus).catch(() => setStatus("prompt"));
  useEffect(() => { refreshStatus(); }, []);

  const activate = async () => {
    setBusy(true);
    try {
      const result = await requestAndRegisterPush();
      setStatus(result);
      if (result === "granted") {
        await scheduleDailyPromiseNotification();
        await syncActiveNovenaReminders();
        toast.success("Notificações ativadas. Você receberá lembretes e avisos importantes.");
      } else if (result === "denied") {
        toast.error("As notificações foram bloqueadas. Ative-as nas configurações do navegador ou aparelho.");
      } else {
        toast("As notificações ainda não estão disponíveis nesta versão.");
      }
    } catch {
      toast.error("Não foi possível concluir a ativação. Confira sua conexão e tente novamente.");
    } finally { setBusy(false); }
  };

  const active = status === "granted";
  return <PageTransition><main className="min-h-screen pb-28 container mx-auto max-w-lg px-6 py-8">
    <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}><ArrowLeft className="w-5 h-5" /></Button>
    <div className="text-center mt-6 mb-8">
      <BellRing className="w-12 h-12 text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold">Notificações</h1>
      <p className="text-muted-foreground mt-2">Acompanhe graças, orações e lembretes sem perder nada.</p>
    </div>
    <Card className="p-6 space-y-5 soft-shadow border-primary/10">
      <div className="flex items-center gap-3">
        <CheckCircle2 className={active ? "text-emerald-600" : "text-muted-foreground"} />
        <div><p className="font-bold">Avisos do Améns</p><p className="text-sm text-muted-foreground">{active ? "Ativados neste dispositivo" : "Ainda não ativados"}</p></div>
      </div>
      <Button className="w-full gradient-divine text-black font-bold" onClick={activate} disabled={busy || active || status === "unsupported" || status === "unavailable"}>
        {busy ? "Ativando..." : active ? "Notificações ativadas" : "Ativar notificações"}
      </Button>
      {status === "denied" && <p className="text-xs text-center text-muted-foreground">A permissão foi bloqueada. Abra os ajustes do seu navegador ou aparelho, procure por Améns e permita notificações.</p>}
      {status === "unsupported" && <p className="text-xs text-center text-muted-foreground">As notificações ainda não estão disponíveis neste dispositivo.</p>}
      {status === "unavailable" && <p className="text-xs text-center text-muted-foreground">As notificações ainda não estão disponíveis nesta versão. Você continuará encontrando os avisos dentro do Amens.</p>}
    </Card>
  </main></PageTransition>;
};

export default NotificationSettings;
