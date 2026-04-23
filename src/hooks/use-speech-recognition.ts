import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export function useSpeechRecognition({
  onResult,
  lang = "pt-BR",
  continuous = true,
  interimResults = true,
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      // Acumula TUDO da sessão atual
      for (let i = 0; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      if (onResult) {
        onResult(currentTranscript.toLowerCase());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        toast.error("Permissão de microfone negada.");
      }
      // Outros erros como no-speech não param necessariamente
    };

    recognition.onend = () => {
      // Se era pra ser contínuo e parou inesperadamente, tentamos reativar
      // Mas cuidado com loops infinitos
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [lang, continuous, interimResults]);

  // Usamos uma ref pro estado de isListening para acessá-lo no onEnd sem dar problema de fechamento de closure
  const isListeningRef = useRef(isListening);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (!supported) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition", err);
      }
    }
  }, [isListening, supported]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    // Se a API for parada e iniciada ela reseta os results
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
      // O evento onend vai religar se isListeningRef for true
    }
  }, []);

  return {
    isListening,
    transcript,
    toggleListening,
    clearTranscript,
    supported,
  };
}
