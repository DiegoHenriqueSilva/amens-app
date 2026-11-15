import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PrayerDailyLimit {
  used: number;
  limit: number | null;
  remaining: number | null;
  level: number;
  nextBonusLevel: number | null;
  isAdmin: boolean;
}

const INITIAL_STATUS: PrayerDailyLimit = {
  used: 0,
  limit: 2,
  remaining: 2,
  level: 1,
  nextBonusLevel: 5,
  isAdmin: false,
};

export function usePrayerDailyLimit(userId: string | null) {
  const [status, setStatus] = useState<PrayerDailyLimit>(INITIAL_STATUS);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setStatus(INITIAL_STATUS);
      setLoading(false);
      return INITIAL_STATUS;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("prayer_daily_status" as never);
    setLoading(false);
    if (error) throw error;
    const next = { ...INITIAL_STATUS, ...(data as unknown as PrayerDailyLimit) };
    setStatus(next);
    return next;
  }, [userId]);

  useEffect(() => {
    void refresh().catch(error => console.warn("Could not load daily prayer allowance.", error));
  }, [refresh]);

  return {
    ...status,
    loading,
    isLimitReached: !status.isAdmin && status.remaining === 0,
    refresh,
  };
}
