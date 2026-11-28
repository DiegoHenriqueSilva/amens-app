import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/PageTransition";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-background/70 backdrop-blur-sm relative overflow-hidden flex items-center justify-center px-6 pb-28" aria-labelledby="not-found-title">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />

        <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-primary/10 bg-white/80 p-8 text-center shadow-xl backdrop-blur-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <SearchX className="h-8 w-8" />
          </div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-primary/70">Caminho não encontrado</p>
          <h1 id="not-found-title" className="mb-3 text-4xl font-bold text-foreground">Página indisponível</h1>
          <p className="mb-7 text-sm leading-relaxed text-muted-foreground">
            Esse endereço pode estar incorreto ou o conteúdo pode ter sido removido. Você pode voltar para onde estava ou começar novamente pelo início.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" variant="outline" onClick={handleBack} className="rounded-full border-primary/30 text-primary hover:bg-primary/10">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Voltar
            </Button>
            <Button type="button" onClick={() => navigate("/")} className="rounded-full border-0 bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] shadow-md hover:opacity-90">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Ir para o início
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
};

export default NotFound;
