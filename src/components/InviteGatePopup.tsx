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
            className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-8"
          >
            <div className="max-w-md mx-auto bg-white/97 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-primary/20 p-6 relative">
              <div className="flex flex-col items-center text-center space-y-4">

                {/* Ícone */}
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>

                {/* Texto */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Acesso Exclusivo
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    O Améns está em fase de expansão divina. Solicite um convite
                    a um amigo ou familiar, ou envie uma mensagem para{" "}
                    <a
                      href="mailto:dieguh@gmail.com"
                      className="text-primary font-semibold hover:underline"
                    >
                      dieguh@gmail.com
                    </a>{" "}
                    para solicitar um convite. Obrigado!
                  </p>
                </div>

                {/* Botão de Login */}
                <Button
                  onClick={() => navigate("/auth")}
                  className="w-full h-12 bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 font-bold rounded-2xl border-0 shadow-md"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Fazer Login
                </Button>

                {/* Separador */}
                <div className="w-full flex items-center gap-3">
                  <div className="flex-1 h-px bg-primary/10" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    ou
                  </span>
                  <div className="flex-1 h-px bg-primary/10" />
                </div>

                {/* Campo de convite */}
                <div className="w-full space-y-2">
                  <Button 
                    className="w-full gradient-divine rounded-2xl h-12 font-bold text-primary-foreground shadow-lg"
                    onClick={handleJoin}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Conta Grátis
                  </Button>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
