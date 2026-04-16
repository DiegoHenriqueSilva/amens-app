import { useState, useEffect, useRef } from "react";

export const useRosaryVoice = (onNext: () => void, isActive: boolean, currentPrayer: string = "") => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onNextRef = useRef(onNext);
  const prayerRef = useRef(currentPrayer);
  const lastAdvanceTime = useRef(0);

  // Sync refs to avoid re-triggering the main effect
  useEffect(() => {
    onNextRef.current = onNext;
    prayerRef.current = currentPrayer;
  }, [onNext, currentPrayer]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true; 
        recognition.lang = "pt-BR";

        recognition.onresult = (event: any) => {
          const resultIndex = event.resultIndex;
          const transcript = event.results[resultIndex][0].transcript.toLowerCase();

          // Base keywords
          const keywords = ["amém", "nossa morte", "mundo sem fim", "amem", "ave maria", "pai nosso", "agora e na hora"];
          
          if (prayerRef.current) {
              const prayerClean = prayerRef.current.toLowerCase().replace(/[.,!?;:]/g, " ").trim();
              const words = prayerClean.split(/\s+/);
              if (words.length > 0) {
                  const lastWord = words[words.length - 1];
                  keywords.push(lastWord);
                  if (lastWord === "inteiro") keywords.push("inteira", "inteiros", "mundo inteiro");
                  if (words.length > 1) keywords.push(`${words[words.length - 2]} ${lastWord}`);
              }
          }

          const found = keywords.some(k => transcript.includes(k));
          
          const now = Date.now();
          // Balanced debounce: 1200ms to avoid double-triggering on long words like "Amém"
          if (found && (now - lastAdvanceTime.current > 1200)) {
            lastAdvanceTime.current = now;
            onNextRef.current();
            
            // Consuming the current audio buffer by stopping
            try {
                recognition.stop();
            } catch(e) {}
          }
        };

        recognition.onstart = () => setListening(true);
        recognition.onend = () => {
          setListening(false);
          if (isActive) {
            try { recognition.start(); } catch(e) {}
          }
        };
        recognitionRef.current = recognition;
    }

    return () => {
      // Cleanup happens only on unmount or manual toggle
    };
  }, []); // Only initialize once

  useEffect(() => {
    if (isActive && recognitionRef.current) {
      if (!listening) {
        try { recognitionRef.current.start(); } catch(e) {}
      }
    } else if (!isActive && recognitionRef.current) {
      if (listening) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    }
  }, [isActive, listening]);

  return { listening };
};
