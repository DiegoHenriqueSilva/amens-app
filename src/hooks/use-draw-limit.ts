import { useState, useEffect, useCallback } from "react";
import { PRAY_SETTINGS } from "@/config/pray-settings";

const getStorageKey = (userId: string, date: string) =>
  `amens_draw_${userId}_${date}`;

const getTodayDate = () => new Date().toISOString().split("T")[0];

interface DrawLimitState {
  drawsUsed: number;
  drawsLeft: number;
  isLimitReached: boolean;
  nextResetLabel: string;
  useOneDraw: () => boolean;
  returnOneDraw: () => void;
}

/**
 * Gerencia o limite diário de sorteios de causas.
 * O limite é resetado a cada dia calendário (meia-noite local).
 * Persiste em localStorage com chave por userId + data.
 */
export function useDrawLimit(userId: string | null): DrawLimitState {
  const [drawsUsed, setDrawsUsed] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const key = getStorageKey(userId, getTodayDate());
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) setDrawsUsed(parsed);
    } else {
      setDrawsUsed(0);
    }
  }, [userId]);

  const persist = useCallback(
    (newValue: number) => {
      if (!userId) return;
      const key = getStorageKey(userId, getTodayDate());
      localStorage.setItem(key, String(newValue));
      setDrawsUsed(newValue);
    },
    [userId]
  );

  /**
   * Consome 1 sorteio do limite.
   * Retorna true se o sorteio foi concedido, false se limite atingido.
   */
  const useOneDraw = useCallback((): boolean => {
    if (!userId) return false;
    const current = drawsUsed;
    if (current >= PRAY_SETTINGS.dailyDrawLimit) return false;
    persist(current + 1);
    return true;
  }, [userId, drawsUsed, persist]);

  /**
   * Devolve 1 sorteio (chamado ao reportar uma causa).
   */
  const returnOneDraw = useCallback(() => {
    if (!userId) return;
    const current = drawsUsed;
    if (current <= 0) return;
    persist(current - 1);
  }, [userId, drawsUsed, persist]);

  const drawsLeft = Math.max(0, PRAY_SETTINGS.dailyDrawLimit - drawsUsed);
  const isLimitReached = drawsLeft === 0;

  // Calcula o horário de reset (meia-noite do próximo dia)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const hoursUntilReset = Math.ceil(
    (tomorrow.getTime() - Date.now()) / (1000 * 60 * 60)
  );
  const nextResetLabel =
    hoursUntilReset <= 1
      ? "em menos de 1 hora"
      : `em ${hoursUntilReset} horas`;

  return {
    drawsUsed,
    drawsLeft,
    isLimitReached,
    nextResetLabel,
    useOneDraw,
    returnOneDraw,
  };
}
