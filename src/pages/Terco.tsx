import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mic, MicOff, Play, Pause, FastForward } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { PRAYERS, ROSARY_SEQUENCE, RosaryBead } from "@/data/rosary";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useXp } from "@/hooks/use-xp";

// Geometric Generation for the visual beads
const generateBeadCoordinates = () => {
  const coords = new Map<string, { cx: number; cy: number; type: string }>();

  // Tail - Irregular placement making it look dropped/crooked
  coords.set("haste_cruz", { cx: 45, cy: 96, type: "cross" });
  coords.set("haste_p1", { cx: 48, cy: 86, type: "large" });
  coords.set("haste_a1", { cx: 47, cy: 80, type: "small" });
  coords.set("haste_a2", { cx: 51, cy: 75, type: "small" });
  coords.set("haste_a3", { cx: 49, cy: 70, type: "small" });
  
  // The central medal at a slight angle
  coords.set("d1_p", { cx: 52, cy: 62, type: "medal" });
  coords.set("final_salve", { cx: 52, cy: 62, type: "medal" }); // Same position as medal

  // Spaces are visually located exactly at the bead they just finished
  const spacesTail = [
    { id: "haste_g1", ref: "haste_a3" } // Gloria
  ];

  for (const sp of spacesTail) {
    coords.set(sp.id, coords.get(sp.ref)!);
  }

  // Loop: 54 beads spread around an organic, messy shape.
  const cx = 50;
  const cy = 30; // Center offset

  const loopBeadsList: Omit<RosaryBead, "label" | "prayerId">[] = [];
  ROSARY_SEQUENCE.forEach(b => {
    if (b.id.startsWith("d") && b.id !== "d1_p" && !b.id.endsWith("_g") && !b.id.endsWith("_j")) {
      loopBeadsList.push(b);
    }
  });

  const totalLoopVisualBeads = zoomOutList(loopBeadsList);
  totalLoopVisualBeads.forEach((bead, index) => {
    const gap = 0.3; // Radians gap at the bottom for the medal and tail
    const startAngle = Math.PI / 2 + gap; 
    const endAngle = Math.PI / 2 + 2 * Math.PI - gap;
    
    // Add non-linear bunching to make it look dropped and slacked
    let t = index / (totalLoopVisualBeads.length - 1);
    const distortedT = t + Math.sin(t * Math.PI * 4) * 0.04; 
    
    const angle = startAngle + (endAngle - startAngle) * distortedT;
    
    // Distort radii organically (amorphous shape instead of an ellipse)
    let rX = 35 + Math.sin(angle * 2.5) * 8 + Math.cos(angle * 6) * 3;
    let rY = 28 + Math.cos(angle * 3) * 6 - Math.sin(angle * 4) * 4;
    
    coords.set(bead.id, {
      cx: cx + rX * Math.cos(angle),
      cy: cy + rY * Math.sin(angle),
      type: bead.type
    });
  });

  // Handle spaces inside decades
  ROSARY_SEQUENCE.forEach(b => {
    if (b.id.endsWith("_g") || b.id.endsWith("_j")) {
        // Find previous visual bead
        const parts = b.id.split("_");
        const base = `${parts[0]}_a10`; // the 10th ave maria
        coords.set(b.id, coords.get(base) || {cx: 50, cy: 50, type: "space"});
    }
  });

  return coords;
};

function zoomOutList<T>(list: T[]): T[] { return list;} // Utility to satisfy TS

const Terco = () => {
  const navigate = useNavigate();
  const { addXp } = useXp();
  
  const [currentBeadIndex, setCurrentBeadIndex] = useState(0);
  const [completedBeads, setCompletedBeads] = useState<Set<number>>(new Set());
  const [debugMode, setDebugMode] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const currentBead = ROSARY_SEQUENCE[currentBeadIndex];
  const currentPrayer = PRAYERS[currentBead.prayerId];

  // Ref to a dynamic div to scroll to if needed
  const beadCoordinates = useMemo(() => generateBeadCoordinates(), []);

  // Extract polyline points based on the current randomized coords
  const threadPointsString = useMemo(() => {
    const pts: string[] = [];
    
    // Add tail path
    const tailBeads = ["haste_cruz", "haste_p1", "haste_a1", "haste_a2", "haste_a3", "d1_p"];
    tailBeads.forEach(id => {
       const c = beadCoordinates.get(id);
       if(c) pts.push(`${c.cx},${c.cy}`);
    });
    
    // Add loop path
    ROSARY_SEQUENCE.forEach(b => {
       if (b.id.startsWith("d") && b.id !== "d1_p" && !b.id.endsWith("_g") && !b.id.endsWith("_j")) {
          const c = beadCoordinates.get(b.id);
          if(c) pts.push(`${c.cx},${c.cy}`);
       }
    });
    
    // Conclude back to medal to close loop
    const medal = beadCoordinates.get("d1_p");
    if(medal) pts.push(`${medal.cx},${medal.cy}`);
    
    return pts.join(" ");
  }, [beadCoordinates]);

  // Validation function
  const validateTranscript = useCallback((speechText: string) => {
    if (!currentPrayer) return;

    // Remove punctuation, lower case
    const text = speechText.toLowerCase().replace(/[.,!?;:()]/g, '');
    const words = text.split(/\s+/);

    const requiredKeywords = currentPrayer.keywords;
    let matchCount = 0;

    requiredKeywords.forEach(kw => {
      // Allow partial string matching for things like "espírito" vs "espirito"
      const normalizedKW = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
      const found = words.some(w => {
        const normW = w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normW.includes(normalizedKW) || normalizedKW.includes(normW);
      });

      if (found) matchCount++;
    });

    // We want the user to say at least 30% of the important words to ensure they are actually praying
    const matchThreshold = Math.max(1, Math.floor(requiredKeywords.length * 0.3));
    
    // AND we prioritize the FINAL TRIGGER WORD (palavra gatilho)
    const lastKeyword = requiredKeywords[requiredKeywords.length - 1];
    const normalizedLastKW = lastKeyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const hasCompletedEnding = words.some(w => {
        const normW = w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normW === normalizedLastKW || normW.includes(normalizedLastKW) || normalizedLastKW.includes(normW);
    });
    
    // If they spoke the final trigger word, and we got at least some context of the prayer, we advance!
    // Or if they somehow spoke a large portion of it but missed the exact word due to transcription error 
    if ((hasCompletedEnding && matchCount >= matchThreshold) || matchCount >= requiredKeywords.length * 0.8) {
      handleCompleteCurrentBead();
    }
  }, [currentPrayer, currentBeadIndex]);

  const { isListening, transcript, toggleListening, clearTranscript, supported } = useSpeechRecognition({
    onResult: validateTranscript,
    continuous: true,
  });

  const handleCompleteCurrentBead = () => {
    toast.success(`${currentBead.label} concluído!`);
    setCompletedBeads(prev => new Set(prev).add(currentBeadIndex));
    clearTranscript();
    
    if (currentBeadIndex < ROSARY_SEQUENCE.length - 1) {
      setCurrentBeadIndex(prev => prev + 1);
    } else {
      // Finished!
      handleFinishRosary();
    }
  };

  const handleFinishRosary = async () => {
    toggleListening();
    setSessionActive(false);
    await addXp("pray");
    toast.success("O Terço foi concluído com sucesso. Uma chuva de bênçãos sobre você!");
    // Trigger some confetti or celebration effect here
  };

  const handleSkip = () => {
    handleCompleteCurrentBead();
  };

  const startSession = () => {
    if (!supported) {
      toast.error("O navegador não suporta reconhecimento de fala. Você pode usar o botão 'Avançar'.");
    }
    setSessionActive(true);
    setCurrentBeadIndex(0);
    setCompletedBeads(new Set());
    if (!isListening) {
      toggleListening();
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-paper relative overflow-hidden flex flex-col pb-28">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 relative z-20">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-primary/10">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <h1 className="text-xl font-bold font-serif text-foreground">Terço Guiado</h1>
          <Button variant="ghost" size="icon" onDoubleClick={() => setDebugMode(!debugMode)}>
            <div className="w-5 h-5" />
          </Button>
        </div>

        <div className="absolute top-[-6rem] left-[-4rem] w-80 h-80 bg-primary/10 rounded-full blur-3xl z-0" />
        <div className="absolute bottom-[-6rem] right-[-4rem] w-80 h-80 bg-accent/10 rounded-full blur-3xl z-0" />

        <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-4 gap-6 z-10 relative">
          
          {/* Visual SVG Rosary */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
            <div className="relative w-full max-w-[350px] aspect-[1/1.4] bg-vellum rounded-xl border border-hairline overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 100 130" className="w-full h-full drop-shadow-lg">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#efc66b" />
                    <stop offset="100%" stopColor="#d4af37" />
                  </linearGradient>
                  
                  <radialGradient id="dimBead" cx="30%" cy="30%" Math-r="70%">
                     <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                     <stop offset="100%" stopColor="#999999" stopOpacity="0.5" />
                  </radialGradient>

                  <radialGradient id="activeBead" cx="30%" cy="30%" r="70%">
                     <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                     <stop offset="30%" stopColor="#fff5d1" stopOpacity="1" />
                     <stop offset="100%" stopColor="#d4af37" stopOpacity="1" />
                  </radialGradient>
                  
                  <radialGradient id="completedBead" cx="30%" cy="30%" r="70%">
                     <stop offset="0%" stopColor="#fff5d1" stopOpacity="0.9" />
                     <stop offset="100%" stopColor="#a37f17" stopOpacity="0.9" />
                  </radialGradient>
                </defs>

                {/* Draw connections using actual bead coords instead of a fixed shape! */}
                <polyline points={threadPointsString} fill="none" stroke="#d4af37" strokeOpacity="0.35" strokeWidth="1" strokeLinejoin="round" />

                {ROSARY_SEQUENCE.map((bead, index) => {
                  const coord = beadCoordinates.get(bead.id);
                  if (!coord) return null;
                  
                  const isCompleted = completedBeads.has(index);
                  const isCurrent = index === currentBeadIndex;
                  const isCross = coord.type === "cross";
                  const isMedal = coord.type === "medal";
                  
                  // Make sizes depending on type
                  let radius = 1.2;
                  if (coord.type === "large") radius = 2.2;
                  if (isMedal) radius = 3.5;

                  let fillUrl = "url(#dimBead)";
                  let strokeCol = "rgba(100,100,100,0.3)";
                  
                  if (isCompleted) {
                     fillUrl = "url(#completedBead)";
                     strokeCol = "rgba(212,175,55,0.6)";
                  }
                  if (isCurrent) {
                     fillUrl = "url(#activeBead)";
                     strokeCol = "rgba(255,255,255,0.8)";
                  }

                  if (isCross) {
                    return (
                       <g key={bead.id} className="transition-all duration-500 origin-center" style={{ transform: isCurrent ? 'scale(1.2)' : 'scale(1)', transformOrigin: `${coord.cx}px ${coord.cy}px`}}>
                          <path d={`M ${coord.cx},${coord.cy - 4} L ${coord.cx},${coord.cy + 4} M ${coord.cx - 2.5},${coord.cy - 1} L ${coord.cx + 2.5},${coord.cy - 1}`} 
                                stroke="url(#gold)" strokeWidth="1.5" strokeLinecap="round" 
                                filter={isCurrent || isCompleted ? "url(#glow)" : ""} />
                       </g>
                    );
                  }

                  if (isMedal) {
                     return (
                        <circle key={bead.id} cx={coord.cx} cy={coord.cy} r={radius} 
                           fill={fillUrl} stroke={strokeCol} strokeWidth="0.5"
                           className="transition-all duration-500"
                           filter={isCurrent || isCompleted ? "url(#glow)" : ""} />
                     );
                  }

                  // Not a cross nor medal
                  if (coord.type !== "space") {
                    return (
                        <circle key={bead.id} cx={coord.cx} cy={coord.cy} r={radius} 
                                fill={fillUrl} stroke={strokeCol} strokeWidth="0.3"
                                className="transition-all duration-500"
                                filter={isCurrent || isCompleted ? "url(#glow)" : ""} />
                    );
                  }
                  
                  return null;
                })}
              </svg>

              {!sessionActive && currentBeadIndex === 0 && (
                <div className="absolute inset-0 bg-background/40 flex items-center justify-center backdrop-blur-[2px]">
                   <Button onClick={startSession} size="lg" className="bg-ink text-paper uppercase tracking-widest px-8 rounded-full h-12 transition-all hover:scale-105">
                     <Play className="w-5 h-5 mr-3 fill-current" />
                     Iniciar Prece
                   </Button>
                </div>
              )}
            </div>
          </div>

          {/* Texts & Controls */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-6">
            <AnimatePresence mode="wait">
               {sessionActive && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col space-y-4">
                    
                    <div className="text-primary text-sm font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-sm flex items-center gap-2">
                       {currentBead.label}
                       {currentBead.type === "space" && <span className="opacity-70 text-[10px]">(Reflexão)</span>}
                    </div>
                    
                    <Card className="p-6 md:p-8 bg-vellum border border-hairline rounded-xl relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-px bg-gold" />
                       <h2 className="text-3xl font-serif text-foreground mb-4 decoration-primary/30 underline-offset-4 decoration-wavy underline">{currentPrayer.title}</h2>
                       <p className="text-lg md:text-xl leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium">
                          {currentPrayer.text}
                       </p>
                    </Card>

                    <div className="flex gap-4 items-center justify-between mt-4">
                       <div className="flex items-center gap-3">
                          <Button 
                             onClick={toggleListening} 
                             variant={isListening ? "default" : "outline"}
                             size="icon"
                             className={`rounded-full shadow-md w-14 h-14 transition-all duration-300 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white border-transparent' : 'border-primary/30 text-primary hover:bg-primary/10'}`}
                          >
                             {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                          </Button>
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                             {isListening ? "Ouvindo você..." : "Microfone Mudo"}
                          </span>
                       </div>

                       <Button onClick={handleSkip} variant="ghost" className="text-primary hover:bg-primary/10 rounded-full gap-2">
                          Avançar <FastForward className="w-4 h-4 ml-1" />
                       </Button>
                    </div>

                    {/* Subtitle Transcrição Ao vivo */}
                    {isListening && transcript && (
                       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 rounded-2xl bg-foreground/5 backdrop-blur border border-foreground/10 text-foreground/80 italic text-sm relative">
                          <div className="absolute -top-3 left-4 bg-background px-2 text-[10px] font-bold uppercase tracking-widest text-primary">Transcrição</div>
                          "{transcript}..."
                       </motion.div>
                    )}

                    {debugMode && (
                      <div className="mt-8 p-4 bg-black/80 text-green-400 text-xs font-mono rounded">
                        <p>Index: {currentBeadIndex}</p>
                        <p>ID: {currentBead.id}</p>
                        <p>Keywords: {currentPrayer.keywords.join(', ')}</p>
                      </div>
                    )}
                  </motion.div>
               )}
            </AnimatePresence>
            
            {/* Se o terço acabou */}
            {!sessionActive && currentBeadIndex > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center space-y-6 h-full text-center">
                    <div className="w-32 h-32 relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                        <div className="absolute inset-0 bg-primary/40 rounded-full blur-xl" />
                        <img src="/estrela_3d.png" alt="Concluído" className="w-full h-full object-contain drop-shadow-2xl z-10 relative" />
                    </div>
                    <h2 className="text-4xl font-serif text-foreground">Amém!</h2>
                    <p className="text-muted-foreground text-lg max-w-md">Você concluiu o seu terço. Que as graças alcancem o seu coração.</p>
                    <Button onClick={() => navigate("/")} size="lg" className="bg-ink text-paper rounded-full h-12 mt-4">
                        Voltar ao Início
                    </Button>
                </motion.div>
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  );
};

export default Terco;
