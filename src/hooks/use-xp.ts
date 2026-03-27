import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useXp() {
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchXp = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", session.user.id)
      .maybeSingle();

    setTotalXp(data?.total_xp ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchXp(); }, []);

  const addXp = async (action: "pray" | "submit" | "react") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const xpMap = { pray: 10, submit: 20, react: 5 };
    const { data, error } = await supabase.rpc("add_xp", {
      p_user_id: session.user.id,
      p_xp_amount: xpMap[action],
      p_action: action,
    });

    if (!error && data != null) {
      setTotalXp(data);
    }
  };

  return { totalXp, loading, addXp, refetch: fetchXp };
}
