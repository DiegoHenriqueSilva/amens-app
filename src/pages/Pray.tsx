import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import PraySession from './PraySession';

export default function Pray() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      if (active) setUser(session?.user ?? null);
    });
    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (active && !receivedEvent) setUser(session?.user ?? null);
      })
      .catch(() => {
        if (active && !receivedEvent) setUser(null);
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  if (user === undefined)
    return (
      <p role="status" className="py-16 text-center">
        Carregando...
      </p>
    );
  return <PraySession key={user?.id ?? 'guest'} currentUser={user} />;
}
