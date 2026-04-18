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
    // --- Sequence Definition with clear separation ---
    if (type === 'misterios') {
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
        sequence.push({ type: "medal", prayer: PRAYERS.SALVE_RAINHA }); // The Junction

        for (let i = 0; i < 5; i++) {
            const mystery = mysteries[i];
            sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO, mysteryTitle: mystery?.title });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
            sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
            sequence.push({ type: "large", prayer: PRAYERS.OH_MEU_JESUS });
        }
        // Removed the extra cross at the end to avoid confusion/overlap
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
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_CONCLUSAO });
    }

    const stemCount = (type === 'misterios') ? 8 : (type === 'misericordia' ? 4 : (type === 'libertacao' ? 3 : (type === 'miguel' ? 4 : 4)));
    const loopCount = sequence.length - stemCount;

    return sequence.map((b, i) => {
      let x = 50, y = 50;
      
      const width = 84;  
      const height = 54; 
      const cornerRadius = 18;
      const centerY = 36;
      const bottomY = centerY + (height/2);
      const topY = centerY - (height/2);
      const leftX = 50 - (width/2);
      const rightX = 50 + (width/2);

      if (i < stemCount) {
        const stemIdxFromMedal = (stemCount - 1) - i;
        x = 50;
        y = bottomY + (stemIdxFromMedal * 5);
      } else {
        const loopIdx = i - stemCount;
        const straightW = width - 2 * cornerRadius;
        const straightH = height - 2 * cornerRadius;
        const arcLength = (Math.PI * 2 * cornerRadius) / 4;
        const totalPerimeter = 2 * (straightW + straightH) + 4 * arcLength;
        const step = totalPerimeter / (loopCount + 1);
        let dist = (loopIdx + 1) * step;
        
        if (dist <= straightW / 2) {
            x = 50 - dist; y = bottomY;
        } else if (dist <= straightW / 2 + arcLength) {
            const angle = (dist - straightW / 2) / arcLength * (Math.PI / 2);
            x = leftX + cornerRadius - Math.sin(angle) * cornerRadius;
            y = bottomY - cornerRadius + Math.cos(angle) * cornerRadius;
        } else if (dist <= straightW / 2 + arcLength + straightH) {
            x = leftX; y = bottomY - cornerRadius - (dist - (straightW / 2 + arcLength));
        } else if (dist <= straightW / 2 + 2 * arcLength + straightH) {
            const angle = (dist - (straightW / 2 + arcLength + straightH)) / arcLength * (Math.PI / 2);
            x = leftX + cornerRadius - Math.cos(angle) * cornerRadius;
            y = topY + cornerRadius - Math.sin(angle) * cornerRadius;
        } else if (dist <= straightW / 2 + 2 * arcLength + straightH + straightW) {
            x = leftX + cornerRadius + (dist - (straightW / 2 + 2 * arcLength + straightH));
            y = topY;
        } else if (dist <= straightW / 2 + 3 * arcLength + straightH + straightW) {
            const angle = (dist - (straightW / 2 + 2 * arcLength + straightH + straightW)) / arcLength * (Math.PI / 2);
            x = rightX - cornerRadius + Math.sin(angle) * cornerRadius;
            y = topY + cornerRadius - Math.cos(angle) * cornerRadius;
        } else if (dist <= straightW / 2 + 3 * arcLength + 2 * straightH + straightW) {
            x = rightX; y = topY + cornerRadius + (dist - (straightW / 2 + 3 * arcLength + straightH + straightW));
        } else if (dist <= straightW / 2 + 4 * arcLength + 2 * straightH + straightW) {
            const angle = (dist - (straightW / 2 + 3 * arcLength + 2 * straightH + straightW)) / arcLength * (Math.PI / 2);
            x = rightX - cornerRadius + Math.cos(angle) * cornerRadius;
            y = bottomY - cornerRadius + Math.sin(angle) * cornerRadius;
        } else {
            x = rightX - cornerRadius - (dist - (straightW / 2 + 4 * arcLength + 2 * straightH + straightW));
            y = bottomY;
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

  // --- Ornate Cross Component ---
  const OrnateCross = ({ isActive }: { isActive: boolean }) => (
    <div className={cn("relative w-14 h-20 flex items-center justify-center transition-all duration-700", isActive && "scale-110")}>
        <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-2xl">
            {/* Soft Glow */}
            <path d="M50 10 C55 35 65 40 95 50 C65 60 55 65 50 130 C45 65 35 60 5 50 C35 40 45 35 50 10" 
                  fill={isActive ? "rgba(251, 191, 36, 0.4)" : "transparent"} 
                  className={cn(isActive && "gold-glow")} />
            
            <linearGradient id="cross-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff9e6" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <g stroke="#8b7355" strokeWidth="1.2">
                <rect x="42" y="10" width="16" height="120" rx="8" fill="url(#cross-gold)" />
                <rect x="10" y="42" width="80" height="16" rx="8" fill="url(#cross-gold)" />
                <circle cx="50" cy="50" r="10" fill="url(#cross-gold)" stroke="#8b7355" strokeWidth="1" />
                <circle cx="50" cy="50" r="6" fill="#fff" opacity="0.4" />
            </g>

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
      <div className="h-screen w-full bg-white flex flex-col relative overflow-hidden pb-32">
        {/* Divine Background */}
        <div className="absolute inset-0 pointer-events-none opacity-15">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] sacred-ripple rounded-full border border-primary/5" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] sacred-ripple rounded-full border border-primary/5 [animation-delay:-2s]" />
        </div>
        
        {/* Header */}
        <div className="pt-8 px-6 flex justify-between items-center z-50">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rosary-selection")} className="rounded-full bg-white/40 hover:bg-white shadow-sm border border-primary/5">
            <ArrowLeft className="w-5 h-5 text-stone-500" />
          </Button>
          <div className="text-center">
             <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/60">Sagrado Terço</h2>
             <p className="font-serif italic text-stone-400 text-[9px] truncate max-w-[150px]">{ROSARY_TYPES.find(t => t.id === type)?.name}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={cn("rounded-full border transition-all shadow-sm", isVoiceActive ? "bg-amber-100 border-amber-300 text-amber-600" : "bg-white/40 border-primary/5 text-stone-300")}
          >
            {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>

        {/* Central Space for Prayers */}
        <div className="flex-1 relative flex items-center justify-center p-12 lg:p-32 z-10">
           <AnimatePresence mode="wait">
                <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-md w-full text-center space-y-6"
                >
                    {beads[currentIndex].mysteryTitle && (
                        <div className="mb-4">
                            <span className="text-[8px] font-black uppercase tracking-[0.5em] text-amber-500/60 block mb-1">Mistério</span>
                            <h3 className="text-[11px] font-bold text-stone-700 uppercase tracking-[0.15em] leading-relaxed px-8">{beads[currentIndex].mysteryTitle}</h3>
                            <div className="divider-gold w-10 mx-auto mt-3 opacity-30" />
                        </div>
                    )}
                    
                    <p className="font-serif italic text-2xl md:text-4xl text-stone-900 leading-tight px-4 font-medium drop-shadow-sm">
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
                    const steps = Math.floor(dist * 1.4);
                    
                    const links = [];
                    for(let s=1; s<steps; s++) {
                        const px = prev.x + (dx * s/steps);
                        const py = prev.y + (dy * s/steps);
                        links.push(
                            <ellipse 
                                key={`link-${i}-${s}`}
                                cx={`${px}%`} cy={`${py}%`}
                                rx="1" ry="0.5"
                                fill="none"
                                stroke="#d4af37"
                                strokeWidth="0.4"
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
                                scale: isActive ? 1.3 : 1,
                                opacity: 1,
                                zIndex: isActive ? 40 : 20
                            }}
                        >
                            <div className="relative -translate-x-1/2 -translate-y-1/2">
                                {bead.type === "cross" ? (
                                    <OrnateCross isActive={isActive} />
                                ) : bead.type === "medal" ? (
                                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center gold-border transition-all shadow-md", isActive ? "gold-gradient gold-glow scale-125" : "bg-white/80")}>
                                        <Heart className={cn("w-4 h-4", isActive ? "text-white fill-current" : "text-amber-600/30")} />
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "transition-all duration-500 rounded-full shadow-md",
                                        bead.type === "large" ? "w-5 h-5" : "w-3 h-3",
                                        isActive ? "gold-gradient gold-glow scale-125" : 
                                        (isPassed ? "gold-gradient opacity-80" : "gold-border bg-white/90")
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

        {/* Global Controls - Improved Ergonomics */}
        <div className="pb-32 px-8 flex flex-col items-center z-50">
            {/* Listening HUD */}
            {listening && isVoiceActive && (
                <div className="mb-6 flex items-center gap-3 px-6 py-2 bg-white/90 backdrop-blur-md rounded-full border border-amber-200 shadow-lg">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-[0.2em]">Ouvindo...</span>
                </div>
            )}

            <div className="w-full flex items-center justify-between">
                {/* Secondary Controls (Left/Center-ish) */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={currentIndex === 0} className="w-12 h-12 rounded-full bg-white/40 shadow-sm border border-stone-100 disabled:opacity-20 transition-all">
                        <ChevronLeft className="w-6 h-6 text-stone-500" />
                    </Button>
                    
                    <div className="group relative" onClick={() => setIsSwayEnabled(!isSwayEnabled)}>
                        <div className="w-12 h-12 bg-white rounded-full shadow-lg border border-primary/10 flex items-center justify-center transition-transform group-active:scale-95 cursor-pointer">
                            <span className="text-xs font-black text-amber-700">{currentIndex + 1}</span>
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="#f8f8f8" strokeWidth="2" fill="transparent" />
                                <circle cx="24" cy="24" r="20" stroke="#d4af37" strokeWidth="3" fill="transparent"
                                    strokeDasharray={125} strokeDashoffset={125 - (currentIndex / (beads.length - 1)) * 125} strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Primary Action Button (Bottom Right for Thumb) */}
                <Button 
                    variant="default"
                    onClick={handleNext} 
                    className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/30 flex items-center justify-center group active:scale-95 transition-all text-white border-4 border-white/20"
                >
                    <ChevronRight className="w-10 h-10 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default RosaryPrayer;
