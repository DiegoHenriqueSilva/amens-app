import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFaithPoints() {
  const [totalFaithPoints, setTotalFaithPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchFaithPoints = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", session.user.id)
      .maybeSingle();

    setTotalFaithPoints(data?.total_xp ?? 0);
    setLoading(false);
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
    }
  };

  return { totalFaithPoints, loading, addFaithPoints, refetch: fetchFaithPoints };
}
