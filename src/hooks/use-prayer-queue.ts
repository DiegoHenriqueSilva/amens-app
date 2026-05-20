import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRAYERS, PHRASE_DURATION, PRAYER_GAP, COMMON_NAMES, BR_CITIES_200K, TOTAL_CYCLE_TIME } from "@/data/prayer-data";

export interface Contributor {
  id?: string;
  user_id?: string;
  name: string;
  city: string;
}

const EPOCH = new Date("2024-01-01T00:00:00Z").getTime();

export const usePrayerQueue = (currentPrayerId: string | undefined, currentPhraseIndex: number, globalTime: number) => {
  const [contributions, setContributions] = useState<Record<string, Contributor>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    const fetchContributions = async () => {
      try {
        const { data, error } = await supabase
          .from('prayer_contributions')
          .select('id, user_id, target_timestamp, author_name, author_city')
          .is('deleted_at', null)
          .gte('target_timestamp', globalTime - 20000)
          .lte('target_timestamp', globalTime + 180000); // 3 min window

        if (error) {
          console.warn("[Queue] Feed error:", error);
          return;
        }

        if (data) {
          const mapped = data.reduce((acc, curr) => ({
            ...acc,
            [String(curr.target_timestamp)]: {
              id: curr.id,
              user_id: curr.user_id,
              name: curr.author_name,
              city: curr.author_city
            }
          }), {});
          // Merging ensures we don't lose updates from Realtime
          setContributions(prev => ({ ...prev, ...mapped }));
        }
        setIsLoading(false);
      } catch (e) {
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
              id: newContrib.id,
              user_id: newContrib.user_id,
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

  // Calculate the timestamp of the CURRENT phrase to find the author
  const currentPhraseTimestamp = useMemo(() => {
    if (!currentPrayerId || currentPhraseIndex === -1) return null;
    
    const elapsed = globalTime - EPOCH;
    const cycleStart = Math.floor(elapsed / TOTAL_CYCLE_TIME) * TOTAL_CYCLE_TIME;
    
    let accumulatedTime = 0;
    for (const prayer of PRAYERS) {
      const prayerPeriod = (prayer.phrases.length * PHRASE_DURATION) + PRAYER_GAP;
      if (prayer.id === currentPrayerId) {
        const ts = EPOCH + cycleStart + accumulatedTime + (currentPhraseIndex * PHRASE_DURATION);
        return String(ts);
      }
      accumulatedTime += prayerPeriod;
    }
    return null;
  }, [currentPrayerId, currentPhraseIndex, globalTime]);

  useEffect(() => {
    const genFake = () => {
      const name = COMMON_NAMES[Math.floor(Math.random() * COMMON_NAMES.length)];
      const city = BR_CITIES_200K[Math.floor(Math.random() * BR_CITIES_200K.length)];
      setContributions(prev => ({
        ...prev,
        [String(Date.now() + Math.random())]: { name, city } // Unique pseudo-timestamp
      }));
    };

    // Preenchendo a tela inicialmente com alguns fakes
    setTimeout(genFake, 500);
    setTimeout(genFake, 1500);
    setTimeout(genFake, 2500);
    setTimeout(genFake, 3500);

    // 2 fakes a cada 3 minutos = 1 a cada 90s em média
    const interval = setInterval(() => {
      genFake();
    }, 90000);

    return () => clearInterval(interval);
  }, []);

  const recentContributors = useMemo(() => {
    const all = Object.entries(contributions)
      .map(([ts, c]) => ({ ...c, timestamp: parseInt(ts) }))
      .sort((a, b) => b.timestamp - a.timestamp); // most recent updates first

    const unique: Contributor[] = [];
    const seen = new Set();
    for (const c of all) {
      const key = c.user_id || c.name;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
      if (unique.length >= 10) break; // Mostra até 10 pessoas recentes
    }
    
    return unique;
  }, [contributions]);

  return { recentContributors, isLoading };
};
