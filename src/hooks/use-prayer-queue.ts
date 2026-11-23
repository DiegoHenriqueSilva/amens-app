import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Contributor {
  id?: string;
  timestamp: number;
  user_id?: string;
  name: string;
  city: string;
}


export const usePrayerQueue = (currentPrayerId: string | undefined, currentPhraseIndex: number, globalTime: number) => {
  const [contributions, setContributions] = useState<Record<string, Omit<Contributor, "timestamp">>>({});
  const [isLoading, setIsLoading] = useState(true);

  const clock = useRef(globalTime);
  clock.current = globalTime;

  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    const fetchContributions = async () => {
      try {
        const { data, error } = await supabase
          .from('prayer_contributions')
          .select('id, user_id, target_timestamp, author_name, author_city')
          .gte('target_timestamp', clock.current - 20000)
          .lte('target_timestamp', clock.current + 180000); // 3 min window
        
        if (error) {
          setIsLoading(false);
          console.warn("[Queue] Feed error:", error);
          return;
        }

        if (data) {
          const records = data as Array<{ id: string; user_id?: string; target_timestamp: number | string; author_name: string; author_city: string }>;
          const mapped = records.reduce<Record<string, Omit<Contributor, "timestamp">>>((acc, curr) => ({
            ...acc,
            [String(curr.target_timestamp)]: {
              id: curr.id,
              user_id: curr.user_id,
              name: curr.author_name,
              city: curr.author_city
            }
          }), {});
          // Merging ensures we don't lose updates from Realtime
          setContributions(prev => Object.fromEntries(Object.entries({ ...prev, ...mapped }).filter(([ts]) => Number(ts) >= clock.current - 180000 && Number(ts) <= clock.current + 180000)) as Record<string, Omit<Contributor, "timestamp">>);
        }
        setIsLoading(false);
      } catch (e) {
        setIsLoading(false);
        console.error("[Queue] Fetch error:", e);
      }
    };

    fetchContributions();
    refreshTimer = setInterval(fetchContributions, 45000);

    const channel = supabase
      .channel('prayer_contributions_live')
      .on('postgres_changes', { 
        event: '*', // Listen to INSERT and DELETE
        schema: 'public', 
        table: 'prayer_contributions' 
      }, payload => {
        if (payload.eventType === 'INSERT') {
          const newContrib = payload.new;
          setContributions(prev => ({
            ...prev,
            [String(newContrib.target_timestamp)]: {
              user_id: newContrib.user_id,
              id: newContrib.id,
              name: newContrib.author_name,
              city: newContrib.author_city
            }
          }));
        } else if (payload.eventType === 'DELETE') {
          // In case of any cleanup/cancelation
          const oldTimestamp = String(payload.old.target_timestamp);
          setContributions(prev => {
            const next = { ...prev };
            delete next[oldTimestamp];
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshTimer);
    };
  }, []);

  const recentContributors = useMemo(() => {
    const all = Object.entries(contributions)
      .map(([ts, c]) => ({ ...c, timestamp: Number(ts) }))
      .filter(c => c.timestamp <= globalTime && c.timestamp >= globalTime - 7000)
      .sort((a, b) => b.timestamp - a.timestamp); // most recent updates first

    const unique: Contributor[] = [];
    const seen = new Set();
    for (const c of all) {
      const key = c.user_id || c.name;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
      if (unique.length >= 3) break;
    }
    
    return unique;
  }, [contributions, globalTime]);

  return { recentContributors, isLoading };
};
