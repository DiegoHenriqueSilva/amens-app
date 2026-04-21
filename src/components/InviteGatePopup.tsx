import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Renders an invite-gate popup when the sentinel div scrolls into view.
 * Usage: place <InviteGatePopup /> at the very bottom of shared-content pages.
 * The popup only shows when the user is NOT authenticated (pass isAuthenticated=false).
 */
interface Props {
  isAuthenticated: boolean;
}

export const InviteGatePopup = ({ isAuthenticated }: Props) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated || dismissed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isAuthenticated, dismissed]);

  const handleCodeInput = (val: string) => {
    if (val.length > 5) {
      window.location.href = `/auth?ref=${val.trim()}`;
    }
  };

  return (
    <>
      {/* Sentinel element — when this becomes visible, popup fires */}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

      <AnimatePresence>
        {visible && !isAuthenticated && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8"
          >
            <div className="max-w-md mx-auto bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-primary/20 p-6 relative">
              {/* Close button */}
              <button
                onClick={() => { setVisible(false); setDismissed(true); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <Lock className="w-7 h-7 text-primary" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Acesso Exclusivo</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    O Améns está em fase de expansão divina. Solicite um convite a um amigo ou familiar, ou envie uma mensagem para{" "}
                    <a href="mailto:dieguh@gmail.com" className="text-primary font-semibold hover:underline">
                      dieguh@gmail.com
                    </a>{" "}
                    para solicitar um convite. Obrigado!
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Já possui um convite?
                  </p>
                  <Input
                    placeholder="Cole seu código de convite..."
                    className="text-center rounded-2xl border-primary/20"
                    onChange={(e) => handleCodeInput(e.target.value)}
                  />
                </div>

                <Button
                  variant="ghost"
                  className="text-xs text-muted-foreground"
                  onClick={() => { setVisible(false); setDismissed(true); }}
                >
                  Continuar lendo
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
