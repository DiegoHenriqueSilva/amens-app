import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, MicOff, ChevronRight, ChevronLeft, Sparkles, Heart } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { PRAYERS, getMysteriesByDay, MISTERIOS, COROS_ANJOS, ROSARY_TYPES } from "@/data/rosary-data";
import { useRosaryVoice } from "@/hooks/use-rosary-voice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Bead {
  id: number;
  type: "small" | "large" | "medal" | "cross";
  prayer: string;
  mysteryTitle?: string;
  x: number;
  y: number;
}

const RosaryPrayer = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSwayEnabled, setIsSwayEnabled] = useState(true);

  const mysteries = useMemo(() => {
    if (type === "misterios") return getMysteriesByDay();
    return [];
  }, [type]);

  const beads = useMemo(() => {
    const sequence: Partial<Bead>[] = [];
    
    // --- Define the sequence based on type ---
    if (type === 'misterios') {
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
        sequence.push({ type: "medal", prayer: PRAYERS.SALVE_RAINHA });

        for (let i = 0; i < 5; i++) {
            const mystery = mysteries[i];
            sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO, mysteryTitle: mystery?.title });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
            sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
            sequence.push({ type: "large", prayer: PRAYERS.OH_MEU_JESUS });
        }
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
    } 
    else if (type === 'misericordia') {
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        for (let i = 0; i < 5; i++) {
            sequence.push({ type: "large", prayer: PRAYERS.MISERICORDIA_PAI });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.MISERICORDIA_DEZENA });
        }
        for (let i = 0; i < 3; i++) sequence.push({ type: "large", prayer: PRAYERS.MISERICORDIA_FIM });
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
    }
    else if (type === 'libertacao') {
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        sequence.push({ type: "medal", prayer: PRAYERS.SALVE_RAINHA });
        for (let i = 0; i < 5; i++) {
            sequence.push({ type: "large", prayer: PRAYERS.LIBERTACAO_GRANDE });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.LIBERTACAO_PEQUENA });
        }
        sequence.push({ type: "large", prayer: PRAYERS.SALVE_RAINHA });
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
    }
    else if (type === 'miguel') {
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_INICIO });
        sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
        sequence.push({ type: "medal", prayer: PRAYERS.MIGUEL_CONCLUSAO });
        const coros = ["Serafins", "Querubins", "Tronos", "Dominações", "Potestades", "Virtudes", "Principados", "Arcanjos", "Anjos"];
        for (let i = 0; i < 9; i++) {
            sequence.push({ type: "large", prayer: COROS_ANJOS[i], mysteryTitle: `Saudação aos ${coros[i]}` });
            sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
            for (let j = 0; j < 3; j++) sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        }
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_HONRA_MIGUEL });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_HONRA_GABRIEL });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_HONRA_RAFAEL });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_HONRA_ANJO });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_CONCLUSAO });
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
    }

    // --- Frame Layout Calculation ---
    const stemCount = type === 'miguel' ? 4 : (type === 'libertacao' ? 3 : 7);
    const loopCount = sequence.length - stemCount;

    return sequence.map((b, i) => {
      let x = 50, y = 50;
      
      if (i < stemCount) {
        // Vertical stem at the bottom center
        x = 50;
        y = 94 - (i * 4.5);
      } else {
        // Distribute around the screen frame
        // Width: 10% to 90%, Height: 12% to 80%
        const loopIdx = i - stemCount;
        const totalInLoop = loopCount;
        
        // We calculate points along a rounded terminal rectangle
        // Total perimeter 
        const w = 84; // 92 - 8
        const h = 65; // 78 - 13
        const perimeter = 2 * (w + h);
        const distance = (loopIdx / totalInLoop) * perimeter;
        
        // Starting from bottom center (50, 80) and moving counter-clockwise or clockwise
        // Let's start from bottom right and go around
        const startX = 50, startY = 78;
        
        if (distance <= w/2) {
          x = 50 + distance;
          y = 78;
        } else if (distance <= w/2 + h) {
          x = 92;
          y = 78 - (distance - w/2);
        } else if (distance <= w/2 + h + w) {
          x = 92 - (distance - (w/2 + h));
          y = 13;
        } else if (distance <= w/2 + h + w + h) {
          x = 8;
          y = 13 + (distance - (w/2 + h + w));
        } else {
          x = 8 + (distance - (w/2 + h + w + h));
          y = 78;
        }
      }
      return { ...b, id: i, x, y } as Bead;
    });
  }, [type, mysteries]);

  const handleNext = () => {
    if (currentIndex < beads.length - 1) {
      if (navigator.vibrate) navigator.vibrate(40);
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success("Terço finalizado. Que a paz esteja com você! 🙏");
      navigate("/");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
        if (navigator.vibrate) navigator.vibrate(20);
        setCurrentIndex(prev => prev - 1);
    }
  };

  const { listening } = useRosaryVoice(handleNext, isVoiceActive, beads[currentIndex]?.prayer);

  // --- Ornate Cross Component (Refined to avoid star-look) ---
  const OrnateCross = ({ isActive }: { isActive: boolean }) => (
    <div className={cn("relative w-14 h-20 flex items-center justify-center transition-all duration-700", isActive && "scale-110")}>
        <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-2xl">
            {/* Soft Glow */}
            <path d="M50 10 C55 35 65 40 95 50 C65 60 55 65 50 130 C45 65 35 60 5 50 C35 40 45 35 50 10" 
                  fill={isActive ? "rgba(251, 191, 36, 0.4)" : "transparent"} 
                  className={cn(isActive && "gold-glow")} />
            
            {/* Main Body - More Robust and Rounded Ends */}
            <g className="gold-gradient" stroke="#8b7355" strokeWidth="1.5">
                {/* Vertical Bar with rounded ends */}
                <rect x="42" y="10" width="16" height="120" rx="8" />
                {/* Horizontal Bar with rounded ends */}
                <rect x="10" y="42" width="80" height="16" rx="8" />
                {/* Decorative Center */}
                <circle cx="50" cy="50" r="10" fill="url(#gold-line)" />
                <circle cx="50" cy="50" r="5" fill="white" opacity="0.3" />
            </g>

            {/* Shimmer Overlay */}
            {isActive && (
                <g className="shimmer-effect" style={{mixBlendMode: 'overlay'}}>
                    <rect x="42" y="10" width="16" height="120" rx="8" />
                    <rect x="10" y="42" width="80" height="16" rx="8" />
                </g>
            )}
        </svg>
    </div>
  );

  return (
    <PageTransition>
      <div className="h-screen w-full bg-white flex flex-col relative overflow-hidden">
        {/* Divine Ripples Background */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] sacred-ripple rounded-full border border-primary/5" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] sacred-ripple rounded-full border border-primary/5 [animation-delay:-2.s]" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] sacred-ripple rounded-full border border-primary/5 [animation-delay:-4s]" />
        </div>
        
        {/* Header */}
        <div className="pt-8 px-8 flex justify-between items-center z-50">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rosary-selection")} className="rounded-full bg-white/40 hover:bg-white/80 backdrop-blur-sm border border-primary/5">
            <ArrowLeft className="w-5 h-5 text-stone-400" />
          </Button>
          <div className="text-center">
             <h2 className="text-[11px] font-bold uppercase tracking-[0.5em] text-primary/60">Sagrado Terço</h2>
             <p className="font-serif italic text-stone-400 text-[10px]">{ROSARY_TYPES.find(t => t.id === type)?.name}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={cn("rounded-full border transition-all", isVoiceActive ? "bg-amber-100 border-amber-300 text-amber-600" : "bg-white/40 border-primary/5 text-stone-300")}
          >
            {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>

        {/* Central Space for Prayers */}
        <div className="flex-1 relative flex items-center justify-center p-14 lg:p-28 z-10">
           <AnimatePresence mode="wait">
                <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-md w-full text-center space-y-6"
                >
                    {beads[currentIndex].mysteryTitle && (
                        <div className="mb-4">
                            <span className="text-[8px] font-black uppercase tracking-[0.6em] text-amber-500/60 block mb-2">Mistério</span>
                            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-[0.2em] leading-relaxed px-4">{beads[currentIndex].mysteryTitle}</h3>
                            <div className="divider-gold w-12 mx-auto mt-4 opacity-50" />
                        </div>
                    )}
                    
                    <p className="font-serif italic text-2xl md:text-3xl text-stone-900 leading-tight px-2 font-medium">
                        "{beads[currentIndex].prayer}"
                    </p>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Rosary Visualization Layer */}
        <div className="absolute inset-0 pointer-events-none z-20">
            {/* Realistic Chain Layer */}
            <svg className="w-full h-full absolute inset-0">
                <defs>
                    <linearGradient id="gold-line" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b7355" />
                        <stop offset="50%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#8b7355" />
                    </linearGradient>
                </defs>
                {beads.map((bead, i) => {
                    if (i === 0) return null;
                    const prev = beads[i-1];
                    const dx = (bead.x - prev.x);
                    const dy = (bead.y - prev.y);
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const steps = Math.floor(dist * 1.8);
                    
                    const links = [];
                    for(let s=1; s<steps; s++) {
                        const px = prev.x + (dx * s/steps);
                        const py = prev.y + (dy * s/steps);
                        links.push(
                            <ellipse 
                                key={`link-${i}-${s}`}
                                cx={`${px}%`} cy={`${py}%`}
                                rx="0.8" ry="0.4"
                                fill="none"
                                stroke="#d4af37"
                                strokeWidth="0.3"
                                opacity="0.6"
                                transform={`rotate(${Math.atan2(dy, dx) * 180 / Math.PI}, ${px}, ${py})`}
                            />
                        );
                    }
                    return <g key={`group-${i}`}>{links}</g>;
                })}
            </svg>

            {/* Inactive & Active Beads */}
            <div className={cn("w-full h-full relative", isSwayEnabled && "sway")}>
                {beads.map((bead, i) => {
                    const isActive = currentIndex === i;
                    const isPassed = currentIndex > i;
                    
                    return (
                        <motion.div
                            key={`bead-${bead.id}`}
                            className="absolute pointer-events-auto cursor-pointer"
                            style={{ left: `${bead.x}%`, top: `${bead.y}%` }}
                            onClick={() => setCurrentIndex(i)}
                            initial={false}
                            animate={{
                                scale: isActive ? 1.4 : 1,
                                opacity: 1
                            }}
                        >
                            <div className="relative -translate-x-1/2 -translate-y-1/2">
                                {bead.type === "cross" ? (
                                    <OrnateCross isActive={isActive} />
                                ) : bead.type === "medal" ? (
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center gold-border transition-all", isActive ? "gold-gradient gold-glow scale-125" : "bg-white/60 shadow-inner")}>
                                        <Heart className={cn("w-4 h-4", isActive ? "text-white fill-current" : "text-amber-600/20")} />
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "transition-all duration-500 rounded-full shadow-md",
                                        bead.type === "large" ? "w-5 h-5" : "w-3.5 h-3.5",
                                        isActive ? "gold-gradient gold-glow scale-125" : 
                                        (isPassed ? "gold-gradient opacity-70" : "gold-border bg-white/60")
                                    )}>
                                        {isActive && <div className="absolute inset-0 rounded-full shimmer-effect" style={{mixBlendMode: 'overlay'}} />}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>

        {/* Global Controls */}
        <div className="pb-16 px-12 flex flex-col items-center gap-8 z-50">
            <div className="flex items-center gap-10">
                <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={currentIndex === 0} className="w-12 h-12 rounded-full hover:bg-stone-50 disabled:opacity-20">
                    <ChevronLeft className="w-6 h-6 text-stone-400" />
                </Button>
                
                <div className="group relative" onClick={() => setIsSwayEnabled(!isSwayEnabled)}>
                    <div className="w-14 h-14 bg-white rounded-full shadow-xl border border-primary/10 flex items-center justify-center transition-transform group-active:scale-95 cursor-pointer">
                        <span className="text-sm font-black text-amber-700">{currentIndex + 1}</span>
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="28" cy="28" r="24" stroke="#f8f8f8" strokeWidth="2" fill="transparent" />
                            <circle cx="28" cy="28" r="24" stroke="#d4af37" strokeWidth="3" fill="transparent"
                                strokeDasharray={151} strokeDashoffset={151 - (currentIndex / (beads.length - 1)) * 151} strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                <Button variant="ghost" size="icon" onClick={handleNext} className="w-12 h-12 rounded-full bg-amber-500/5 hover:bg-amber-500/10 group">
                    <ChevronRight className="w-7 h-7 text-amber-600 transition-transform group-hover:scale-110" />
                </Button>
            </div>
            
            {listening && isVoiceActive && (
                <div className="flex items-center gap-3 px-6 py-2 bg-white/90 backdrop-blur-md rounded-full border border-amber-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-[0.25em]">Ouvindo prece...</span>
                </div>
            )}
        </div>
      </div>
    </PageTransition>
  );
};

export default RosaryPrayer;
