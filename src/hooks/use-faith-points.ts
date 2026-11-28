import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FAITH_POINTS_CACHE_KEY = "amens_faith_points_cache";

const readCachedPoints = (userId: string) => {
  try {
    const cache = JSON.parse(localStorage.getItem(FAITH_POINTS_CACHE_KEY) || "{}") as Record<string, number>;
    return Number.isFinite(cache[userId]) ? cache[userId] : null;
  } catch {
    return null;
  }
};

const cachePoints = (userId: string, points: number) => {
  try {
    const cache = JSON.parse(localStorage.getItem(FAITH_POINTS_CACHE_KEY) || "{}") as Record<string, number>;
    localStorage.setItem(FAITH_POINTS_CACHE_KEY, JSON.stringify({ ...cache, [userId]: points }));
  } catch {
    // Cache is only a visual optimization; the database remains authoritative.
  }
};

export function useFaithPoints() {
  const [totalFaithPoints, setTotalFaithPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchFaithPoints = useCallback(async (userId: string | null) => {
    if (!userId) {
      setTotalFaithPoints(0);
      setLoading(false);
      return;
    }

    const cached = readCachedPoints(userId);
    if (cached !== null) setTotalFaithPoints(cached);
    setLoading(false);

    const { data, error } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return;
    const currentPoints = data?.total_xp ?? 0;
    setTotalFaithPoints(currentPoints);
    cachePoints(userId, currentPoints);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) void fetchFaithPoints(session?.user.id || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void fetchFaithPoints(session?.user.id || null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchFaithPoints]);

  const addFaithPoints = useCallback(async (action: "pray" | "submit" | "react") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const faithPointsMap = { pray: 10, submit: 20, react: 5 } as const;
    const { data, error } = await supabase.rpc("add_xp", {
      p_user_id: session.user.id,
      p_xp_amount: faithPointsMap[action],
      p_action: action,
    });

    if (error) throw error;
    if (data != null) {
      setTotalFaithPoints(data);
      cachePoints(session.user.id, data);
    }
    return data;
  }, []);

  return { totalFaithPoints, loading, addFaithPoints, refetch: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetchFaithPoints(session?.user.id || null);
  } };
}
