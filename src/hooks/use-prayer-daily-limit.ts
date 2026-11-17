import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PrayerDailyLimit {
  used: number;
  limit: number | null;
  remaining: number | null;
  level: number;
  nextBonusLevel: number | null;
  isAdmin: boolean;
  resetsAt: string;
  timeZone: 'America/Sao_Paulo';
}

export function usePrayerDailyLimit(userId: string | null) {
  const [status, setStatus] = useState<PrayerDailyLimit | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(false);
  const revision = useRef(0);
  const invalidate = useCallback(() => {
    revision.current++;
  }, []);

  const refresh = useCallback(async () => {
    const request = ++revision.current;
    if (!userId) {
      setStatus(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const { data, error: failure } = await supabase.rpc('prayer_daily_status');
      if (failure || !data) throw failure || new Error('Missing allowance');
      if (request === revision.current) {
        setStatus(data as PrayerDailyLimit);
        setError(false);
      }
      return data as PrayerDailyLimit;
    } catch (failure) {
      if (request === revision.current) {
        setError(true);
        setStatus(null);
      }
      throw failure;
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setStatus(null);
    void refresh().catch(() => undefined);
    const onFocus = () => {
      void refresh().catch(() => undefined);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      invalidate();
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh, invalidate]);
  useEffect(() => {
    if (!status?.resetsAt) return;
    const timer = window.setTimeout(
      () => {
        void refresh().catch(() => undefined);
      },
      Math.min(Math.max(1000, Date.parse(status.resetsAt) - Date.now() + 1000), 86401000),
    );
    return () => clearTimeout(timer);
  }, [status?.resetsAt, refresh]);

  return {
    ...status,
    loading,
    error,
    isLimitReached: status?.remaining === 0,
    refresh,
  };
}
