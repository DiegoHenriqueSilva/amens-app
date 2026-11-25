import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const PRAYER_REACTIONS = [
  { type: "love", emoji: "❤️", label: "Compaixão" },
  { type: "pray", emoji: "🙏", label: "Graça" },
  { type: "patience", emoji: "⏳", label: "Paciência" },
  { type: "strength", emoji: "💪", label: "Força" },
  { type: "empathy", emoji: "🥺", label: "Empatia" },
];

type Engagement = { intercessor_count: number; reactions: Record<string, number>; unavailable?: boolean };
type Intercessor = {
  intercessor_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  interceded_at: string;
};

export function usePrayerEngagement(ids: string[], revision = 0) {
  const [counts, setCounts] = useState<Record<string, Engagement>>({});
  const key = [...new Set(ids)].filter(id => /^[0-9a-f-]{36}$/i.test(id)).sort().join(",");
  useEffect(() => {
    setCounts({});
    if (!key) return;
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      const { data, error } = await supabase.rpc("get_prayer_engagement_counts", { prayer_ids: key.split(",") });
      if (!active) return;
      const next: Record<string, Engagement> = {};
      for (const id of key.split(',')) next[id] = { intercessor_count: 0, reactions: {}, unavailable: true };
      if (error) { setCounts(next); return; }
      (data as unknown as (Engagement & { prayer_request_id: string })[] | null)?.forEach(row => { next[row.prayer_request_id] = row; });
      setCounts(next);
    };
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [key, revision]);
  return counts;
}

export function PrayerEngagement({ counts, prayerId, canViewIntercessors = false }: {
  counts?: Engagement;
  prayerId?: string;
  canViewIntercessors?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [intercessors, setIntercessors] = useState<Intercessor[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setIsOpen(false);
    setIntercessors(null);
    setLoadError(false);
  }, [prayerId]);

  const toggleIntercessors = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    if (!prayerId || intercessors !== null || isLoading) return;
    setIsLoading(true);
    setLoadError(false);
    const { data, error } = await supabase.rpc("get_prayer_intercessors", { p_prayer_id: prayerId });
    if (error) {
      setLoadError(true);
    } else {
      setIntercessors((data || []) as Intercessor[]);
    }
    setIsLoading(false);
  };

  const confirmed = counts && !counts.unavailable ? counts : undefined;
  const showListButton = Boolean(canViewIntercessors && prayerId && confirmed && confirmed.intercessor_count > 0);

  return (
    <div className="my-3 space-y-2" aria-label="Intercessões e reações recebidas" aria-live="polite">
      <div className="prayer-engagement__summary">
        <p className="text-xs font-medium text-muted-foreground">
          🙏 {counts?.unavailable ? "Contagens indisponíveis no momento." : confirmed ? `${confirmed.intercessor_count} ${Number(confirmed.intercessor_count) === 1 ? "pessoa intercedeu" : "pessoas intercederam"}` : "Carregando intercessões…"}
        </p>
        {showListButton && <button
          type="button"
          className="prayer-engagement__list-button"
          aria-expanded={isOpen}
          aria-controls={`intercessors-${prayerId}`}
          onClick={toggleIntercessors}
        >
          Ver lista {isOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>}
      </div>
      {showListButton && isOpen && <div id={`intercessors-${prayerId}`} className="prayer-engagement__people">
        {isLoading && <p className="prayer-engagement__status"><Loader2 className="animate-spin" aria-hidden="true" /> Carregando lista…</p>}
        {loadError && <p className="prayer-engagement__status prayer-engagement__status--error">Não foi possível carregar a lista. Feche e tente novamente.</p>}
        {!isLoading && !loadError && intercessors?.length === 0 && <p className="prayer-engagement__status">Nenhum perfil disponível.</p>}
        {!isLoading && !loadError && intercessors && intercessors.length > 0 && <ul>
          {intercessors.map(person => {
            const location = [person.city, person.state].filter(Boolean).join(" - ");
            return <li key={person.intercessor_id}>
              <Link to={`/profile/${person.intercessor_id}`} aria-label={`Abrir perfil de ${person.display_name}`}>
                <span className="prayer-engagement__avatar">
                  {person.avatar_url ? <img src={person.avatar_url} alt="" /> : <UserRound aria-hidden="true" />}
                </span>
                <span className="prayer-engagement__person-copy">
                  <strong>{person.display_name}</strong>
                  {location && <small>{location}</small>}
                </span>
                <span className="prayer-engagement__profile-label">Ver perfil</span>
              </Link>
            </li>;
          })}
        </ul>}
      </div>}
      <div className="flex flex-wrap gap-1.5">
        {PRAYER_REACTIONS.map(r => (
          <span key={r.type} title={r.label} aria-label={`${r.label}: ${confirmed?.reactions[r.type] ?? "carregando"}`} className="inline-flex items-center gap-1 rounded-lg bg-primary/5 px-2 py-1 text-xs">
            <span aria-hidden="true">{r.emoji}</span><span>{confirmed ? confirmed.reactions[r.type] || 0 : "–"}</span>
            <span className="sr-only">{r.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
