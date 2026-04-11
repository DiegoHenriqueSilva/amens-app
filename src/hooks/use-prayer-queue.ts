import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRAYERS, PHRASE_DURATION, PRAYER_GAP, COMMON_NAMES, PR_CITIES_100K, TOTAL_CYCLE_TIME } from "@/data/prayer-data";

export interface Contributor {
  user_id?: string;
  name: string;
  city: string;
}

const EPOCH = new Date("2024-01-01T00:00:00Z").getTime();

export const usePrayerQueue = (currentPrayerId: string | undefined, currentPhraseIndex: number, globalTime: number) => {
  const [contributions, setContributions] = useState<Record<string, Contributor>>({});

  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    // Fetch recent contributions to populate the queue
    const fetchContributions = async () => {
      try {
        const { data, error } = await supabase
          .from('prayer_contributions')
          .select('*')
          .gte('target_timestamp', globalTime - 10000)
          .lte('target_timestamp', globalTime + 120000); // 2 min window
        
        if (error) {
          console.warn("Table prayer_contributions issue:", error);
          return;
        }

        if (data) {
          const mapped = data.reduce((acc, curr) => ({
            ...acc,
            [String(curr.target_timestamp)]: {
              user_id: curr.user_id,
              name: curr.author_name,
              city: curr.author_city
            }
          }), {});
          setContributions(prev => ({ ...prev, ...mapped }));
        }
      } catch (e) {
        console.error("Contribution fetch error:", e);
      }
    };

    fetchContributions();
    
    // Refresh window every 30s to keep future slots loaded
    refreshTimer = setInterval(fetchContributions, 30000);

    // Subscribe to new contributions
    const channel = supabase
      .channel('prayer_contributions_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'prayer_contributions' 
      }, payload => {
        const newContrib = payload.new;
        setContributions(prev => ({
          ...prev,
          [String(newContrib.target_timestamp)]: {
            user_id: newContrib.user_id,
            name: newContrib.author_name,
            city: newContrib.author_city
          }
        }));
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
      if (prayer.id === currentPrayerId) {
        const ts = EPOCH + cycleStart + accumulatedTime + (currentPhraseIndex * PHRASE_DURATION);
        return String(ts);
      }
      accumulatedTime += (prayer.phrases.length * PHRASE_DURATION) + PRAYER_GAP;
    }
    return null;
  }, [currentPrayerId, currentPhraseIndex, globalTime]);

  const author = useMemo(() => {
    if (currentPhraseIndex === 0) return null; // Rule 1: First phrase has no author
    if (!currentPhraseTimestamp) return null;

    const contrib = contributions[currentPhraseTimestamp];
    
    if (contrib) {
      console.log(`[Queue Match] Found contribution for ${currentPhraseTimestamp}:`, contrib.name);
      return contrib;
    }

    // Default to random fake name if no real contribution
    const seed = parseInt(currentPhraseTimestamp);
    const name = COMMON_NAMES[seed % COMMON_NAMES.length];
    const city = PR_CITIES_100K[seed % PR_CITIES_100K.length];
    
    return { name, city };
  }, [currentPhraseTimestamp, currentPhraseIndex, contributions]);

  return { author };
};
