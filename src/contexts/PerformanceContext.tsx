import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { MotionConfig } from "framer-motion";

interface PerformanceContextData {
  isPerformanceMode: boolean;
  togglePerformanceMode: () => void;
  setPerformanceMode: (enabled: boolean) => void;
}

const PerformanceContext = createContext<PerformanceContextData>({
  isPerformanceMode: false,
  togglePerformanceMode: () => {},
  setPerformanceMode: () => {},
});

export const usePerformance = () => useContext(PerformanceContext);

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPerformanceMode, setIsPerformanceMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("reduce_motion");
    if (saved !== null) {
      return saved === "true";
    }
    // Auto-detect system preference if user hasn't explicitly set it
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });

  useEffect(() => {
    if (isPerformanceMode) {
      document.documentElement.classList.add("reduce-motion");
      localStorage.setItem("reduce_motion", "true");
    } else {
      document.documentElement.classList.remove("reduce-motion");
      localStorage.setItem("reduce_motion", "false");
    }
  }, [isPerformanceMode]);

  const togglePerformanceMode = () => {
    setIsPerformanceMode(prev => {
      const nextState = !prev;
      if (nextState) {
        toast.info("Modo Desempenho ativado ⚡ (Visual simplificado para maior velocidade)");
      } else {
        toast.info("Modo Visual Completo ativado ✨");
      }
      return nextState;
    });
  };

  const setPerformanceMode = (enabled: boolean) => {
    setIsPerformanceMode(enabled);
  };

  return (
    <PerformanceContext.Provider
      value={{
        isPerformanceMode,
        togglePerformanceMode,
        setPerformanceMode,
      }}
    >
      <MotionConfig reducedMotion={isPerformanceMode ? "always" : "never"}>
        {children}
      </MotionConfig>
    </PerformanceContext.Provider>
  );
};
