import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, LogIn } from "lucide-react";
import { Sparkles, X, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Renderiza o popup de acesso exclusivo quando o sentinel div entra na tela.
 * O popup é PERMANENTE — não pode ser fechado enquanto o usuário não estiver autenticado.
 * Uso: coloque <InviteGatePopup /> no final das páginas com conteúdo compartilhado.
 */
interface Props {
  isAuthenticated: boolean;
}

export const InviteGatePopup = ({ isAuthenticated }: Props) => {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) return;

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
  }, [isAuthenticated]);

  const handleJoin = () => {
    window.location.href = `/auth`;
  };

  return (
    <>
      {/* Sentinel — quando entra na tela, o popup dispara */}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

      <AnimatePresence>
        {visible && !isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-[100] p-4 pb-8"
          >
            <div className="max-w-md mx-auto bg-paper rounded-xl border border-hairline shadow-nav p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 border border-hairline rounded-full flex items-center justify-center bg-vellum">
                  <Sparkles size={20} strokeWidth={1.5} className="text-gold" />
                </div>

                <div>
                  <h3 className="font-serif text-[20px] text-ink mb-1">Acesso Exclusivo</h3>
                  <p className="text-[13px] text-ink-soft leading-relaxed">
                    O Améns está em fase de expansão. Solicite um convite a um amigo ou familiar, ou envie uma mensagem para{" "}
                    <a href="mailto:dieguh@gmail.com" className="text-marian hover:underline">
                      dieguh@gmail.com
                    </a>.
                  </p>
                </div>

                <button
                  onClick={() => navigate("/auth")}
                  className="w-full h-11 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <LogIn size={16} strokeWidth={1.5} />
                  Fazer login
                </button>

                <div className="w-full flex items-center gap-3">
                  <div className="flex-1 h-px bg-hairline" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">ou</span>
                  <div className="flex-1 h-px bg-hairline" />
                </div>

                <button
                  onClick={handleJoin}
                  className="w-full h-11 rounded-full border border-hairline text-ink text-sm hover:bg-vellum transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} strokeWidth={1.5} />
                  Criar conta grátis
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
