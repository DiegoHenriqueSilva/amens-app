import { useState, useEffect } from "react";
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
    // A cache is only a visual optimization; the database remains authoritative.
  }
};

export function useFaithPoints() {
  const [totalFaithPoints, setTotalFaithPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchFaithPoints = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const cached = readCachedPoints(session.user.id);
    if (cached !== null) setTotalFaithPoints(cached);
    // Render immediately from cache (or zero on the first visit), then refresh
    // silently from Supabase instead of blocking the entire profile card.
    setLoading(false);

    const { data } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const currentPoints = data?.total_xp ?? 0;
    setTotalFaithPoints(currentPoints);
    cachePoints(session.user.id, currentPoints);
  };

  useEffect(() => { fetchFaithPoints(); }, []);

  const addFaithPoints = async (action: "pray" | "submit" | "react", customAmount?: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const faithPointsMap = { pray: 10, submit: 20, react: 5 };
    const { data, error } = await supabase.rpc("add_xp", {
      p_user_id: session.user.id,
      p_xp_amount: customAmount ?? faithPointsMap[action],
      p_action: action,
    });

    if (!error && data != null) {
      setTotalFaithPoints(data);
      cachePoints(session.user.id, data);
    }
  };

  return { totalFaithPoints, loading, addFaithPoints, refetch: fetchFaithPoints };
}
