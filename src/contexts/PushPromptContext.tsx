import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import { getNotificationPermission, initializePush, requestAndRegisterPush } from "@/lib/push";
import { scheduleDailyPromiseNotification, syncActiveNovenaReminders } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";

interface PushPromptContextData {
  triggerPushPrompt: (message: string) => void;
}

const PushPromptContext = createContext<PushPromptContextData>({} as PushPromptContextData);

export const usePushPrompt = () => useContext(PushPromptContext);

export const PushPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");
  const launchPromptShown = useRef(false);
  const launchPromptTimer = useRef<number>();

  useEffect(() => {
    let disposed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      window.setTimeout(() => {
        if (!disposed) void initializePush().catch(() => console.warn("Push registration is not ready."));
      }, 0);

      // Exibe o convite uma vez a cada nova abertura do aplicativo enquanto
      // a permissão continuar desativada. O atraso respeita a tela de abertura.
      if (!launchPromptShown.current && !launchPromptTimer.current) {
        launchPromptTimer.current = window.setTimeout(async () => {
          launchPromptTimer.current = undefined;
          if (disposed || launchPromptShown.current) return;
          try {
            const permission = await getNotificationPermission();
            if (permission !== "prompt" && permission !== "denied") return;
            launchPromptShown.current = true;
            setPromptMessage(
              "Ative as notificações para receber pedidos de oração, mensagens, lembretes das suas novenas e o Evangelho do Dia. Assim, você não perde nenhum momento importante da sua caminhada de fé."
            );
            setIsOpen(true);
          } catch {
            console.warn("Could not check notification permission at launch.");
          }
        }, 7400);
      }
    });
    return () => {
      disposed = true;
      if (launchPromptTimer.current) window.clearTimeout(launchPromptTimer.current);
      subscription.unsubscribe();
    };
  }, []);

  const triggerPushPrompt = async (message: string) => {
    try {
      const permission = await getNotificationPermission();
      if (permission === "granted" || permission === "unsupported" || permission === "unavailable") {
         return; // Já concedido
      }
      
      // Cooldown de rejeição de 2 dias. Se ele rejeitou o soft prompt recém
      const lastDeniedStr = localStorage.getItem("amens_push_denied_date");
      if (lastDeniedStr) {
         const lastDenied = new Date(lastDeniedStr);
         const now = new Date();
         const diffTime = Math.abs(now.getTime() - lastDenied.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         if (diffDays <= 2) {
             console.log("Push prompt no cooldown de 2 dias");
             return; // Ignora o gatilho sem incomodar o usuário
         }
      }

      setPromptMessage(message);
      setIsOpen(true);
    } catch(e) {
      console.warn("LocalNotifications plugin error:", e);
    }
  };

  const handleDecline = () => {
     setIsOpen(false);
     localStorage.setItem("amens_push_denied_date", new Date().toISOString());
  };

  const handleAccept = async () => {
    setIsOpen(false);
    try {
      const result = await requestAndRegisterPush();
      if (result === "granted") {
         await scheduleDailyPromiseNotification();
         await syncActiveNovenaReminders();
         toast.success("Notificações ativadas! Você será avisado de suas graças.", { 
            icon: <BellRing className="w-4 h-4" /> 
         });
         localStorage.removeItem("amens_push_denied_date");
      } else if (result === "denied") {
         toast("O Android bloqueou as notificações. Você pode permiti-las nos ajustes do Amens.", {
           icon: <BellOff className="w-4 h-4 text-red-500" />
         });
         localStorage.setItem("amens_push_denied_date", new Date().toISOString());
      } else {
         toast("As notificações ainda não estão disponíveis nesta versão. Tente novamente após atualizar o Amens.");
      }
    } catch(e) {
       toast.error("Não foi possível concluir a ativação. Confira sua conexão e tente novamente.");
    }
  };

  return (
    <PushPromptContext.Provider value={{ triggerPushPrompt }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(val) => { if (!val) handleDecline(); }}>
        <DialogContent className="max-w-xs md:max-w-sm bg-card/95 backdrop-blur-md border border-primary/20 soft-shadow rounded-[2rem]">
          <DialogHeader className="text-center pt-2">
             <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-30" />
                <BellRing className="w-8 h-8 text-primary" />
             </div>
             <DialogTitle className="text-xl font-bold">Fique Conectado ✨</DialogTitle>
             <DialogDescription className="text-sm pt-2 text-center text-foreground font-medium leading-relaxed">
               {promptMessage}
             </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-3 mt-4 sm:justify-center">
            <Button 
              className="w-full gradient-divine rounded-2xl h-12 text-primary-foreground font-bold shadow-md hover:scale-105 transition-transform"
              onClick={handleAccept}
            >
              Sim, Autorizar
            </Button>
            <Button 
               variant="ghost" 
               className="w-full rounded-2xl h-10 text-muted-foreground hover:bg-secondary/50 text-xs" 
               onClick={handleDecline}
            >
              Agora Não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PushPromptContext.Provider>
  );
};
