import { useState, useEffect, useCallback } from "react";
import { PRAY_SETTINGS } from "@/config/pray-settings";
import { supabase } from "@/integrations/supabase/client";

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

async function fetchEffectiveLimit(userId: string): Promise<number> {
  const [overrideResult, settingResult] = await Promise.all([
    (supabase.from("user_draw_overrides" as any) as any)
      .select("daily_limit")
      .eq("user_id", userId)
      .maybeSingle(),
    (supabase.from("app_settings" as any) as any)
      .select("value")
      .eq("key", "draw_daily_limit")
      .maybeSingle(),
  ]);

  if (overrideResult.data?.daily_limit != null) {
    return overrideResult.data.daily_limit;
  }
  if (settingResult.data?.value != null) {
    const parsed = parseInt(settingResult.data.value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return PRAY_SETTINGS.dailyDrawLimit;
}

export function useDrawLimit(userId: string | null): DrawLimitState {
  const [drawsUsed, setDrawsUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(PRAY_SETTINGS.dailyDrawLimit);

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

    fetchEffectiveLimit(userId).then(setDailyLimit).catch(() => {});
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

  const useOneDraw = useCallback((): boolean => {
    if (!userId) return false;
    const current = drawsUsed;
    if (current >= dailyLimit) return false;
    persist(current + 1);
    return true;
  }, [userId, drawsUsed, dailyLimit, persist]);

  const returnOneDraw = useCallback(() => {
    if (!userId) return;
    const current = drawsUsed;
    if (current <= 0) return;
    persist(current - 1);
  }, [userId, drawsUsed, persist]);

  const drawsLeft = Math.max(0, dailyLimit - drawsUsed);
  const isLimitReached = drawsLeft === 0;

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
