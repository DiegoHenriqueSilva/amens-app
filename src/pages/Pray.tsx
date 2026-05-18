import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Heart, ArrowLeft, Users, Share2, Clock, Loader2, Flag, Eye, MessageCircle, Check, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFaithPoints } from "@/hooks/use-faith-points";
import { FAITH_POINTS_REWARDS } from "@/lib/faith-points";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { FriendSelector } from "@/components/FriendSelector";
import { formatTimeAgo, formatFullDatetime, getDisplayName } from "@/lib/utils";
import { usePushPrompt } from "@/contexts/PushPromptContext";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { InviteGatePopup } from "@/components/InviteGatePopup";
import { useDrawLimit } from "@/hooks/use-draw-limit";
import { ReportPrayerDialog } from "@/components/ReportPrayerDialog";
import { PRAY_SETTINGS } from "@/config/pray-settings";
import { DEFAULT_PRAYERS, DefaultPrayer } from "@/data/default-prayers";

const FEEDBACK_OPTIONS: Record<string, { label: string; emoji: string }> = {
  success: { label: "Deu certo, obrigado pelas orações!", emoji: "🎉" },
  not_this_time: { label: "Não foi desta vez, mas obrigado pelas preces!", emoji: "🙏" },
  keep_trying: { label: "Não deu certo mas vou continuar tentando", emoji: "💪" },
  god_knows: { label: "Não deu certo mas Deus sabe o que faz, obrigado pelas orações", emoji: "✝️" },
  grace_received: { label: "Consegui a graça solicitada, obrigado!", emoji: "⭐" },
};

const REACTIONS = [
  { type: "love", emoji: "❤️", label: "Compaixão" },
  { type: "pray", emoji: "🙏", label: "Graça" },
  { type: "patience", emoji: "⏳", label: "Paciência" },
  { type: "strength", emoji: "💪", label: "Força" },
  { type: "empathy", emoji: "🥺", label: "Empatia" },
];

const isRestrictedPrayer = (status?: string | null) =>
  status === "pending_review" || status === "policy_violation" || status === "banned";

const getRestrictedPrayerMessage = (status?: string | null) => {
  if (status === "pending_review") {
    return "Este pedido está em revisão e ainda não está disponível para a comunidade.";
  }

  return "Este pedido não pode continuar público porque não está de acordo com as políticas do Améns.";
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const BuscandoText = () => {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <span>Buscando{dots}</span>;
};

const Pray = () => {
  const [prayerRequest, setPrayerRequest] = useState<any>(null);
  const [suggestedPrayer, setSuggestedPrayer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [friendSelectorOpen, setFriendSelectorOpen] = useState(false);
  const [intercessions, setIntercessions] = useState<any[]>([]);
  const [isIntercessionsLoading, setIsIntercessionsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const prayerIdParam = searchParams.get("id");
  const { addFaithPoints } = useFaithPoints();
  const [hasRequestedCause, setHasRequestedCause] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { triggerPushPrompt } = usePushPrompt();
  const { completeTask } = useDailyTasks();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userFriends, setUserFriends] = useState<string[]>([]);
  const [seenPrayerIds, setSeenPrayerIds] = useState<string[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isSharedCause, setIsSharedCause] = useState(false);
  const [editingReactionHistoryId, setEditingReactionHistoryId] = useState<string | null>(null);
  const [expandedHistoryItems, setExpandedHistoryItems] = useState<Record<string, boolean>>({});

  // Rastreia quais amigos já receberam convite para cada causa no dia de hoje.
  // Persiste no sessionStorage para sobreviver a HMR e reloads da página na mesma aba.
  const SHARED_FRIENDS_KEY = "amens_shared_friends_v1";

  const readSharedFriendsMap = (): Record<string, string[]> => {
    try {
      const raw = sessionStorage.getItem(SHARED_FRIENDS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      // Descarta dados de dias anteriores
      const today = new Date().toLocaleDateString("pt-BR");
      if (parsed.date !== today) return {};
      return parsed.map ?? {};
    } catch {
      return {};
    }
  };

  const writeSharedFriendsMap = (map: Record<string, string[]>) => {
    try {
      const today = new Date().toLocaleDateString("pt-BR");
      sessionStorage.setItem(SHARED_FRIENDS_KEY, JSON.stringify({ date: today, map }));
    } catch { /* sessionStorage indisponível */ }
  };

  const [sharedFriendsMap, setSharedFriendsMap] = useState<Record<string, string[]>>(readSharedFriendsMap);

  const toggleHistoryItemExpand = (id: string) => {
    setExpandedHistoryItems(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const { drawsUsed, drawsLeft, isLimitReached, nextResetLabel, useOneDraw, returnOneDraw } = useDrawLimit(currentUser?.id || null);

  const fetchUserFriends = async (userId: string) => {
    const { data } = await supabase.from("friendships").select("friend_id").eq("user_id", userId);
    if (data) {
      setUserFriends(data.map(f => f.friend_id));
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        fetchUserFriends(session.user.id);
      }
    });
  }, [navigate]);

  const getLocalMidnightISO = () => {
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    return localMidnight.toISOString();
  };

  const loadDailyCurrentCause = async (userId: string) => {
    const { data } = await supabase
      .from("prayer_intercessions")
      .select("prayer_request_id")
      .eq("user_id", userId)
      .gte("created_at", getLocalMidnightISO())
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      return data[0].prayer_request_id;
    }
    return null;
  };

  useEffect(() => {
    if (!currentUser) return;
    
    const init = async () => {
      if (prayerIdParam) {
        setIsSharedCause(true);
        setHasRequestedCause(true);
        fetchPrayerById(prayerIdParam, true);
        return;
      }

      const currentCauseId = await loadDailyCurrentCause(currentUser.id);
      if (currentCauseId) {
        setHasRequestedCause(true);
        fetchPrayerById(currentCauseId, false);
      }
    };
    init();
  }, [currentUser, prayerIdParam]);

  const fetchIntercessions = async () => {
    if (!currentUser) return;
    
    setIsIntercessionsLoading(true);
    try {
      const { data: intDataRaw, error } = await supabase
        .from("prayer_intercessions")
        .select("id, prayer_request_id, created_at")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (!intDataRaw || intDataRaw.length === 0) {
        setIntercessions([]);
        return;
      }

      const groupedIntData: Record<string, any[]> = {};
      intDataRaw.forEach(i => {
        if (!groupedIntData[i.prayer_request_id]) groupedIntData[i.prayer_request_id] = [];
        groupedIntData[i.prayer_request_id].push(i);
      });

      const intData = Object.keys(groupedIntData).map(prayerId => {
        const intercessionsList = groupedIntData[prayerId];
        return {
           id: intercessionsList[0].id,
           prayer_request_id: prayerId,
           created_at: intercessionsList[0].created_at,
           intercessionsCount: intercessionsList.length,
           allIntercessions: intercessionsList
        };
      });

      intData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const prayerIds = intData.map(i => i.prayer_request_id);
      const { data: prayerData } = await supabase
        .from("prayer_requests")
        .select("id, title, content, location, feedback, created_at, status, is_anonymous, user_id, author_name")
        .in("id", prayerIds);

      const prayerMap: Record<string, any> = {};
      const userIdsToFetch: string[] = [];
      prayerData?.forEach(p => { 
        prayerMap[p.id] = p; 
        if (p.user_id) userIdsToFetch.push(p.user_id);
      });

      let profilesMap: Record<string, any> = {};
      if (userIdsToFetch.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles" as any)
          .select("id, display_name, avatar_url")
          .in("id", userIdsToFetch);
        
        profilesData?.forEach((prof: any) => {
          profilesMap[prof.id] = prof;
        });
      }

      const { data: reactionsData } = await supabase
        .from("prayer_reactions")
        .select("prayer_request_id, reaction_type")
        .eq("reactor_user_id", currentUser.id)
        .in("prayer_request_id", prayerIds);
        
      const reactionsMap: Record<string, string> = {};
      reactionsData?.forEach(r => { reactionsMap[r.prayer_request_id] = r.reaction_type; });

      setIntercessions(intData.map(i => {
        const p = prayerMap[i.prayer_request_id] || {};
        const profile = p.user_id ? profilesMap[p.user_id] : {};
        const authorNameFinal = getDisplayName(p.author_name, profile, p.is_anonymous);
        const isActuallyAnonymous = p.is_anonymous || authorNameFinal === "Usuário Anônimo";
        let finalAvatar = isActuallyAnonymous ? null : profile.avatar_url;
        if (finalAvatar && finalAvatar.includes('dicebear.com')) finalAvatar = null;

        return {
          id: i.id,
          prayer_request_id: i.prayer_request_id,
          created_at: i.created_at, // when user interceded
          posted_at: p.created_at, // when cause was created
          prayer_title: p.title || null,
          prayer_content: isRestrictedPrayer(p.status) ? getRestrictedPrayerMessage(p.status) : (p.content || "Pedido removido"),
          prayer_location: p.location || null,
          prayer_feedback: p.feedback || null,
          author_name: authorNameFinal,
          avatar_url: finalAvatar,
          is_friend: userFriends.includes(p.user_id),
          is_anonymous: p.is_anonymous,
          user_reaction: reactionsMap[i.prayer_request_id] || null,
          status: p.status,
          is_restricted: isRestrictedPrayer(p.status),
          intercessionsCount: i.intercessionsCount,
          allIntercessions: i.allIntercessions
        };
      }));
    } catch (e) {
      console.error("Error loading intercessions history:", e);
    } finally {
      setIsIntercessionsLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchIntercessions();
    }
  }, [showHistory]);

  const recordIntercession = async (prayerId: string, isForceNew?: boolean) => {
    if (!currentUser) return;

    let shouldInsert = isForceNew;

    if (!shouldInsert) {
      // Check if we already have an intercession today for this cause (using local midnight)
      const { data: existing } = await supabase
        .from("prayer_intercessions")
        .select("id")
        .eq("prayer_request_id", prayerId)
        .eq("user_id", currentUser.id)
        .gte("created_at", getLocalMidnightISO());
      
      shouldInsert = !existing || existing.length === 0;
    }

    if (shouldInsert) {
      // If it's a default prayer, ensure it exists in the prayer_requests table first
      if (prayerId.startsWith('default-')) {
        const { data: dbPrayer } = await supabase.from('prayer_requests').select('id').eq('id', prayerId).maybeSingle();
        if (!dbPrayer) {
          const defaultPrayer = DEFAULT_PRAYERS.find(p => p.id === prayerId);
          if (defaultPrayer) {
            await supabase.from('prayer_requests').insert([{
              id: defaultPrayer.id,
              title: defaultPrayer.title,
              content: defaultPrayer.content,
              author_name: defaultPrayer.author_name,
              status: 'active',
              user_id: null,
              prayer_count: 0
            }]);
          }
        }
      }

      await supabase.from("prayer_intercessions").insert({
        prayer_request_id: prayerId,
        user_id: currentUser.id,
      });
      // Also increment prayer count
      await supabase.rpc('increment_prayer_count' as any, { row_id: prayerId });
    }
  };

  const removeCurrentIntercession = async (prayerId: string) => {
    if (!currentUser) return;
    
    const { data } = await supabase
      .from("prayer_intercessions")
      .select("id")
      .eq("prayer_request_id", prayerId)
      .eq("user_id", currentUser.id)
      .gte("created_at", getLocalMidnightISO())
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      await supabase
        .from("prayer_intercessions")
        .delete()
        .eq("id", data[0].id);
    }
  };
  const loadReaction = async (prayerId: string) => {
    if (!currentUser) return;
    const { data: existingReaction } = await supabase
      .from('prayer_reactions')
      .select('reaction_type')
      .eq('prayer_request_id', prayerId)
      .eq('reactor_user_id', currentUser.id)
      .maybeSingle();

    setActiveReaction(existingReaction?.reaction_type || null);
  };

  const fetchPrayerById = async (id: string, isShared: boolean, isForceNew?: boolean) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        if (isRestrictedPrayer(data.status)) {
          toast.error("Esta causa não está mais disponível.");
          fetchRandomPrayerRequest();
          return;
        }

        let profileData = null;
        if (data.user_id) {
          const { data: prof } = await supabase.from('profiles' as any).select('display_name, avatar_url').eq('id', data.user_id).maybeSingle();
          profileData = prof;
        }

        const formattedData = {
           ...data,
           display_name: getDisplayName(data.author_name, profileData, data.is_anonymous),
           avatar_url: data.is_anonymous ? null : profileData?.avatar_url,
           is_friend: userFriends.includes(data.user_id)
        };

        setPrayerRequest(formattedData);
        setSuggestedPrayer("");
        loadReaction(data.id);
        
        if (!isShared) {
          recordIntercession(data.id, isForceNew);
        }
      } else {
        toast.error("Causa não encontrada.");
        fetchRandomPrayerRequest();
      }
    } catch (error) {
      console.error('Error fetching prayer by id:', error);
      toast.error("Erro ao buscar pedido de oração");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSharedCause = async () => {
    if (!prayerRequest) return;
    if (isRestrictedPrayer(prayerRequest.status)) {
      toast.error("Esta causa não está disponível para novas interações.");
      return;
    }

    if (useOneDraw()) {
      setIsSharedCause(false);
      await recordIntercession(prayerRequest.id);
      completeTask("pray_cause");
      toast.success("Você aceitou interceder por esta causa!");
      searchParams.delete("id");
      setSearchParams(searchParams);
    } else {
      toast.error("Limite de sorteios diários atingido.");
    }
  };

  const fetchRandomPrayerRequest = async () => {
    if (!currentUser) {
      toast.error("Faça login para receber causas");
      return;
    }

    if (!useOneDraw()) {
      toast.error("Limite diário de sorteios atingido.");
      return;
    }

    setIsLoading(true);
    setHasRequestedCause(true);
    setIsSharedCause(false);
    searchParams.delete("id");
    setSearchParams(searchParams);

    // If there is a current prayer request, user clicked "Proxima causa" without praying, or report.
    if (prayerRequest && !prayerRequest.is_default) {
      await removeCurrentIntercession(prayerRequest.id);
      setSeenPrayerIds(prev => [...prev, prayerRequest.id]);
    }

    try {
      // Fetch 50 eligible
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('status', 'active')
        .neq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(PRAY_SETTINGS.maxCausesToFetch);

      if (error) throw error;
      // Filter seen
      const eligible = (data || []).filter(p => !seenPrayerIds.includes(p.id));

      if (eligible.length > 0) {
        const isFullyRandom = Math.random() < 0.20;
        let selected;

        if (isFullyRandom) {
          selected = eligible[Math.floor(Math.random() * eligible.length)];
        } else {
          // Calculate scores
          const scored = eligible.map(p => {
            let score = 0;
            if (p.prayer_count === 0) score += PRAY_SETTINGS.drawWeights.zeroPrayers;
            else if (p.prayer_count <= 3) score += PRAY_SETTINGS.drawWeights.fewPrayers;
            else if (p.prayer_count <= 9) score += PRAY_SETTINGS.drawWeights.somePrayers;

            if (userFriends.includes(p.user_id)) score += PRAY_SETTINGS.drawWeights.isFriend;

            const daysOld = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
            if (daysOld > PRAY_SETTINGS.oldCauseDaysThreshold) score += PRAY_SETTINGS.drawWeights.isOld;
            if (daysOld < PRAY_SETTINGS.newCauseDaysThreshold) score += PRAY_SETTINGS.drawWeights.isNew;

            score += Math.random() * PRAY_SETTINGS.drawWeights.randomVariance * 2 - PRAY_SETTINGS.drawWeights.randomVariance;
            return { ...p, score };
          });

          scored.sort((a, b) => b.score - a.score);
          const topPool = scored.slice(0, PRAY_SETTINGS.topCausesPool);
          selected = topPool[Math.floor(Math.random() * topPool.length)];
        }

        let profileData = null;
        if (selected.user_id) {
          const { data: prof } = await supabase.from('profiles' as any).select('display_name, avatar_url').eq('id', selected.user_id).maybeSingle();
          profileData = prof;
        }

        const authorNameFinal = getDisplayName(selected.author_name, profileData, selected.is_anonymous);
        const isActuallyAnonymous = selected.is_anonymous || authorNameFinal === "Usuário Anônimo";
        let finalAvatar = isActuallyAnonymous ? null : profileData?.avatar_url;
        if (finalAvatar && finalAvatar.includes('dicebear.com')) finalAvatar = null;

        const formattedData = {
           ...selected,
           display_name: authorNameFinal,
           avatar_url: finalAvatar,
           is_friend: userFriends.includes(selected.user_id)
        };

        setPrayerRequest(formattedData);
        setSuggestedPrayer("");
        loadReaction(selected.id);
        
        await recordIntercession(selected.id);
        completeTask("pray_cause");
        
        setTimeout(() => {
          triggerPushPrompt("Deseja saber quando esta pessoa atualizar o status do pedido? Autorize as notificações e acompanhe.");
        }, 1200);

      } else {
        // Show default prayer
        const randomDefault = DEFAULT_PRAYERS[Math.floor(Math.random() * DEFAULT_PRAYERS.length)];
        setPrayerRequest(randomDefault);
        setSuggestedPrayer("");
        setActiveReaction(null);
        
        // Record intercession for default prayer to show in history
        await recordIntercession(randomDefault.id);
        
        toast.info("Causas individuais atendidas. Una-se a nós nesta intenção comum.");
      }
    } catch (error) {
      console.error('Error fetching prayer request:', error);
      toast.error("Erro ao buscar pedido de oração");
      returnOneDraw(); // restore draw if failed
    } finally {
      setIsLoading(false);
    }
  };

  const forceDrawFromHistory = async (historyId: string, prayerId: string) => {
    const historyItem = intercessions.find(item => item.id === historyId);
    if (isRestrictedPrayer(historyItem?.status)) {
      toast.error("Esta causa não está disponível para novas interações.");
      return;
    }

    if (!useOneDraw()) {
      toast.error("Limite diário de sorteios atingido.");
      return;
    }

    setHasRequestedCause(true);
    fetchPrayerById(prayerId, false, true);
    toast.success("Você escolheu orar por esta causa novamente!");

    const now = new Date().toISOString();
    setIntercessions(prev => {
      const updated = prev.map(i =>
        i.prayer_request_id === prayerId
          ? {
              ...i,
              created_at: now,
              intercessionsCount: i.intercessionsCount + 1,
              allIntercessions: [
                { id: `pending-${historyId}-${now}`, prayer_request_id: prayerId, created_at: now },
                ...i.allIntercessions,
              ],
            }
          : i
      );
      return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
  };

  const handleInviteFriends = async (selectedIds: string[]) => {
    if (!prayerRequest || selectedIds.length === 0) return;

    try {
      const profile = currentUser.user_metadata;
      const inviterName = profile.display_name || profile.full_name?.split(" ")[0] || "Um amigo";

      const notifications = selectedIds.map(friendId => ({
        user_id: friendId,
        message: `🙏 ${inviterName} te convidou para interceder por uma causa!`,
        prayer_request_id: prayerRequest.id,
        is_read: false
      }));

      await supabase.from("notifications").insert(notifications);

      // Persiste o rastreamento no sessionStorage (sobrevive a HMR e reloads)
      const updatedMap = {
        ...sharedFriendsMap,
        [prayerRequest.id]: [...(sharedFriendsMap[prayerRequest.id] || []), ...selectedIds],
      };
      setSharedFriendsMap(updatedMap);
      writeSharedFriendsMap(updatedMap);

      toast.success(`Convite enviado para ${selectedIds.length} ${selectedIds.length === 1 ? 'amigo' : 'amigos'}! 🙏`);
      completeTask("share_cause");
      setFriendSelectorOpen(false);
    } catch (error) {
      console.error("Error sending invites:", error);
      toast.error("Erro ao enviar convites.");
    }
  };

  const handleShareCompartilhar = async () => {
    if (!prayerRequest) return;

    const shareUrl = `${window.location.origin}/pray?id=${prayerRequest.id}`;
    const authorName = prayerRequest.display_name || "Um fiel";
    const locationPart = prayerRequest.location ? ` (${prayerRequest.location})` : "";

    // Emojis gerados em runtime via String.fromCodePoint — seguros com navigator.share
    const pray = String.fromCodePoint(0x1F64F);     // 🙏
    const sparkle = String.fromCodePoint(0x2728);    // ✨
    const church = String.fromCodePoint(0x26EA);     // ⛪

    const shareText = [
      `${pray} *Pedido de Ora\u00e7\u00e3o* ${pray}`,
      ``,
      `${sparkle} De: *${authorName}*${locationPart}`,
      ``,
      `"${prayerRequest.content}"`,
      ``,
      `${church} Ore por esta causa no Am\u00e9ns:`,
      shareUrl,
    ].join("\n");

    // Web Share API: passa o texto ao SO nativamente (sem encoding manual)
    // Emoji e acentos chegam intactos pois nunca viram URL
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Pedido de Ora\u00e7\u00e3o \u2014 Am\u00e9ns",
          text: shareText,
        });
        completeTask("share_cause");
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return; // usu\u00e1rio cancelou
        // outro erro: cai no fallback abaixo
      }
    }

    // Fallback: WhatsApp URL (desktop ou browsers sem navigator.share)
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
    completeTask("share_cause");
  };

  const generatePrayer = async () => {
    if (!prayerRequest) return;
    setIsGenerating(true);
    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        toast.error("Chave da API do Gemini ausente! Verifique o .env.");
        setIsGenerating(false);
        return;
      }
      
      const systemPrompt = `Você é um gerador de orações empáticas e poderosas para a rede social "Améns".
REGRA DE OURO: A oração DEVE OBRIGATORIAMENTE começar com: "Que faça de minha oração uma ferramenta para a bencao dessa causa..." ou algo muito similar que use a palavra "ferramenta".
REGRAS ADICIONAIS:
1. Seja ACOLHEDOR, HUMILDE e CARINHOSO.
2. Use PRIMEIRA PESSOA (Eu).
3. Máximo de 150 palavras.
4. Foco total em interceder por esta causa: "${prayerRequest.content}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      if (!response.ok) throw new Error('Falha na resposta do Gemini');
      
      const data = await response.json();
      const prayerText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      setSuggestedPrayer(prayerText || "Desculpe, não conseguimos gerar a sugestão agora.");
    } catch (error) {
      console.error('Error generating prayer:', error);
      toast.error("Erro ao gerar sugestão de oração");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleReaction = async (reactionType: string, targetPrayerId: string, currentReaction: string | null, onHistoryItem?: boolean) => {
    if (!currentUser) return;

    const targetStatus = onHistoryItem
      ? intercessions.find(item => item.prayer_request_id === targetPrayerId)?.status
      : prayerRequest?.status;
    if (isRestrictedPrayer(targetStatus)) {
      toast.error("Esta causa está com interações bloqueadas.");
      return;
    }
    
    const isRemoving = currentReaction === reactionType;
    const newReaction = isRemoving ? null : reactionType;
    
    try {
      if (isRemoving) {
        await supabase
          .from("prayer_reactions")
          .delete()
          .eq("prayer_request_id", targetPrayerId)
          .eq("reactor_user_id", currentUser.id);
      } else {
        await supabase.from("prayer_reactions").upsert({
          prayer_request_id: targetPrayerId,
          reactor_user_id: currentUser.id,
          reaction_type: reactionType,
        }, { onConflict: "prayer_request_id,reactor_user_id" });
        
        // Notify
        const pReq = targetPrayerId === prayerRequest?.id ? prayerRequest : intercessions.find(i => i.prayer_request_id === targetPrayerId);
        if (pReq && pReq.user_id && !currentReaction) { // Only notify on first react
          const reactionDef = REACTIONS.find(r => r.type === reactionType);
          const senderFirstName = currentUser.user_metadata?.full_name?.split(" ")[0] || "Um irmão";
          await supabase.from("notifications").insert({
            user_id: pReq.user_id,
            prayer_request_id: targetPrayerId,
            message: `${reactionDef?.emoji} ${senderFirstName} reagiu com ${reactionDef?.label} ao seu pedido!`,
          });
        }
        
        // Faith Points logic
        if (currentUser) {
          const today = new Date().toISOString().split("T")[0];
          const reactKey = `amens_react_faith_points_${currentUser.id}_${today}`;
          if (!localStorage.getItem(reactKey)) {
            await addFaithPoints("react");
            localStorage.setItem(reactKey, "1");
          }
        }
      }
      
      // Update local state
      if (!onHistoryItem && targetPrayerId === prayerRequest?.id) {
        setActiveReaction(newReaction);
      } else {
        setIntercessions(prev => prev.map(i => i.prayer_request_id === targetPrayerId ? { ...i, user_reaction: newReaction } : i));
      }
      
      toast.success(isRemoving ? "Reação removida." : "Reação enviada!");
      if (onHistoryItem) setEditingReactionHistoryId(null);
    } catch {
      toast.error("Erro ao enviar reação");
    }
  };

  const handleReportConfirmed = () => {
    setReportDialogOpen(false);
    returnOneDraw();
    setSeenPrayerIds(prev => [...prev, prayerRequest.id]);
    setPrayerRequest(null); // Clear screen
    toast.info("Você pode sortear uma nova causa agora.");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background/70 backdrop-blur-sm relative overflow-hidden pb-28">

        <div className="absolute top-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[-4rem] w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-2xl mx-auto mb-6 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 hover:bg-primary/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Button>
          </div>
          
          <motion.div className="max-w-2xl mx-auto text-center mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">Orar por uma Causa</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Seja um instrumento da graça divina</p>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              {!hasRequestedCause ? (
                <motion.div key="initial" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  <Card className="p-10 text-center soft-shadow border-primary/10">
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
                       <Sparkles className="w-12 h-12 text-primary mx-auto mb-6 opacity-30" />
                    </motion.div>
                    <div className="flex flex-col gap-4">
                      <Button onClick={fetchRandomPrayerRequest} disabled={isLoading || isLimitReached} size="lg" className={`w-full h-16 bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity font-bold text-lg rounded-2xl shadow-lg border-0 ${!currentUser || isLimitReached ? 'opacity-60 pointer-events-none' : ''}`}>
                        {isLoading ? "Buscando..." : "Receber uma Causa"}
                      </Button>
                      
                      {/* Limit Indicator */}
                      {currentUser && (
                        <div className="text-sm mt-2">
                          {isLimitReached ? (
                            <span className="text-red-500 font-medium">Limite atingido. Próximo sorteio {nextResetLabel}.</span>
                          ) : (
                            <span className="text-muted-foreground">Você tem <strong className="text-primary">{drawsLeft}</strong> de {PRAY_SETTINGS.dailyDrawLimit} sorteios disponíveis hoje.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ) : isLoading ? (
                <motion.div key="loading" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-4" />
                  <p className="text-primary font-medium animate-pulse">Buscando causa...</p>
                </motion.div>
              ) : !prayerRequest ? (
                <motion.div key="empty" variants={fadeUp} initial="initial" animate="animate" exit="exit">
                  <Card className="group p-12 text-center soft-shadow border-primary/10 transition-colors">
                    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="w-20 h-20 mx-auto mb-8 bg-transparent flex items-center justify-center overflow-visible relative">
                      <img src="/estrela_3d.png" alt="Estrela brilhante" className="w-full h-full object-contain drop-shadow-md transition-all duration-500 group-active:drop-shadow-[0_0_30px_rgba(255,215,0,1)] group-active:brightness-125 group-active:scale-110" />
                    </motion.div>
                    <Button onClick={fetchRandomPrayerRequest} disabled={isLoading} size="lg" className="w-full max-w-[240px] h-16 gradient-divine text-white hover:opacity-90 font-black text-xl uppercase tracking-widest shadow-xl rounded-2xl">
                      {isLoading ? <BuscandoText /> : "Receber Causa"}
                    </Button>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="prayer" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                  
                  {isSharedCause && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                      <p className="text-blue-800 text-sm font-medium mb-3">Você acessou uma causa compartilhada.</p>
                      <Button onClick={handleAcceptSharedCause} disabled={isLimitReached} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm h-9">
                        Aceitar interceder
                      </Button>
                      {isLimitReached && <p className="text-xs text-red-500 mt-2">Você não tem sorteios disponíveis hoje.</p>}
                    </div>
                  )}

                  {prayerRequest.is_default && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-6 text-center shadow-sm"
                    >
                      <p className="text-primary font-medium leading-relaxed text-sm">
                        Sua intenção de oração é o que move nossa corrente santa. No momento não há novas causas disponíveis. No entanto que tal se unir a outras <span className="font-black underline decoration-primary/30 decoration-2">{Math.floor(Math.random() * 450) + 120}</span> pessoas e orarmos por:
                      </p>
                    </motion.div>
                  )}

                  <Card className={`p-8 soft-shadow border-primary/10 ${!currentUser ? 'opacity-60 pointer-events-none' : ''}`}>
                    <div className="flex items-start gap-4 mb-6">
                      <div className="flex-shrink-0 relative">
                        {prayerRequest.avatar_url ? (
                          <img src={prayerRequest.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                            <Heart className="w-5 h-5 text-primary/50" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        {prayerRequest.title && <h3 className="text-xl font-semibold mb-1 text-foreground">{prayerRequest.title}</h3>}
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-xs text-primary font-bold uppercase tracking-widest opacity-80">
                            Enviado por {prayerRequest.display_name}
                          </p>
                          {prayerRequest.is_friend && !prayerRequest.is_anonymous && prayerRequest.display_name !== 'Usuário Anônimo' && (
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-bold uppercase">Amigo 🤝</span>
                          )}
                        </div>
                        <p className="text-foreground/80 leading-relaxed">{prayerRequest.content}</p>
                        
                        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-primary/5">
                          <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                            {prayerRequest.created_at && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground" title={formatFullDatetime(prayerRequest.created_at)}>
                                <Clock className="w-3 h-3 opacity-60" />
                                <span className="font-medium uppercase tracking-tight">Solicitado em:</span>
                                <span>{new Date(prayerRequest.created_at).toLocaleDateString()}</span>
                              </div>
                            )}
                            {prayerRequest.feedback && prayerRequest.updated_at && (
                              <div className="flex items-center gap-1.5 text-[10px] text-primary/70 font-bold" title={formatFullDatetime(prayerRequest.updated_at)}>
                                <Check className="w-3 h-3" />
                                <span className="uppercase tracking-tight">Retorno em:</span>
                                <span>{new Date(prayerRequest.updated_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          {prayerRequest.location && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><span>📍</span> {prayerRequest.location}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Integrated Reactions Section */}
                    <div className="bg-primary/5 rounded-2xl p-5 mb-6 border border-primary/10">
                      <h4 className="text-sm font-semibold text-center text-primary mb-3">Envie Energia e Solidariedade</h4>
                      {isRestrictedPrayer(prayerRequest.status) ? (
                         <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <ShieldAlert className="w-5 h-5 mx-auto mb-2 text-amber-700" />
                            <p className="text-xs font-medium text-amber-800">{getRestrictedPrayerMessage(prayerRequest.status)}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Interações desativadas</p>
                         </div>
                      ) : prayerRequest.feedback ? (
                         <div className="text-center p-3 bg-white/50 rounded-xl">
                            <span className="text-2xl mb-1 block">{FEEDBACK_OPTIONS[prayerRequest.feedback]?.emoji}</span>
                            <p className="text-xs font-medium text-green-700">Esta causa já recebeu um testemunho de graça!</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Interações desativadas</p>
                         </div>
                      ) : (
                         <div className="flex flex-wrap gap-2 justify-center">
                           {REACTIONS.map((reaction, i) => {
                             const isActive = activeReaction === reaction.type;
                             const isOtherActive = activeReaction !== null && !isActive;
                             return (
                               <motion.button
                                 key={reaction.type}
                                 whileHover={{ scale: 1.1 }}
                                 whileTap={{ scale: 0.95 }}
                                 className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
                                   isActive
                                     ? "bg-white shadow-sm ring-1 ring-primary/30"
                                     : isOtherActive
                                     ? "opacity-50 hover:opacity-100 hover:bg-white/50"
                                     : "hover:bg-white/50"
                                 }`}
                                 onClick={() => toggleReaction(reaction.type, prayerRequest.id, activeReaction, false)}
                               >
                                 <span className="text-2xl">{reaction.emoji}</span>
                                 <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{reaction.label}</span>
                               </motion.button>
                             );
                           })}
                         </div>
                      )}
                    </div>

                    <div className="divider-gold mb-5" />
                    
                    <div className="flex gap-3 flex-wrap">
                      <Button onClick={generatePrayer} disabled={isGenerating} className="bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 font-semibold border-0 flex-1">
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isGenerating ? "Gerando..." : "Sugestão de Oração"}
                      </Button>
                      
                      {!isRestrictedPrayer(prayerRequest.status) && !prayerRequest.feedback && !isSharedCause && (
                        <Button onClick={fetchRandomPrayerRequest} variant="outline" className="border-[#1D4ED8]/20 text-[#1D4ED8] hover:text-[#1D4ED8] hover:bg-[#1D4ED8]/5 shadow-sm">
                          Próxima Causa
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2 w-full mt-3">
                       <Button 
                         variant="outline" 
                         onClick={() => setFriendSelectorOpen(true)}
                         className="flex-1 rounded-xl border-[#1D4ED8]/20 text-[#1D4ED8] hover:text-[#1D4ED8] hover:bg-[#1D4ED8]/10 shadow-sm transition-colors text-xs h-9"
                       >
                         <Users className="w-3.5 h-3.5 mr-2" />
                         Enviar a um amigo do Améns
                       </Button>
                       
                       <Button 
                         variant="outline" 
                         onClick={handleShareCompartilhar}
                         className="flex-1 rounded-xl border-green-600/20 text-green-700 hover:text-green-700 hover:bg-green-50 shadow-sm transition-colors text-xs h-9"
                       >
                         <Share2 className="w-3.5 h-3.5 mr-2" />
                         Compartilhar fora do Améns
                       </Button>
                    </div>

                    {!isRestrictedPrayer(prayerRequest.status) && !prayerRequest.feedback && !prayerRequest.is_default && !isSharedCause && (
                      <div className="mt-4 flex flex-col gap-3 items-center text-center">
                        <button onClick={() => setReportDialogOpen(true)} className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors uppercase font-medium flex items-center justify-center gap-1 mx-auto">
                          <Flag className="w-3 h-3" /> Reportar essa causa a um administrador
                        </button>
                      </div>
                    )}
                  </Card>

                  <FriendSelector 
                    open={friendSelectorOpen}
                    onOpenChange={setFriendSelectorOpen}
                    onSelect={handleInviteFriends}
                    prayerRequestId={prayerRequest?.id}
                    alreadySharedFriendIds={sharedFriendsMap[prayerRequest?.id] || []}
                  />

                  <AnimatePresence>
                    {suggestedPrayer && (
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
                        <Card className="p-8 soft-shadow border-primary/15">
                          <h3 className="text-xl font-semibold mb-4 text-primary">Sugestão de Oração</h3>
                          <p className="text-foreground/85 leading-relaxed italic whitespace-pre-wrap">{suggestedPrayer}</p>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <InviteGatePopup isAuthenticated={!!currentUser} />
          {/* History Section */}
          <div className="max-w-2xl mx-auto mt-16 pb-20 px-2">
             {!showHistory ? (
                <div className="text-center">
                   <Button 
                     variant="ghost" 
                     onClick={() => {
                        if (!currentUser) {
                           navigate("/auth");
                           return;
                        }
                        setShowHistory(true);
                     }}
                     className="text-black hover:text-primary text-[11px] uppercase tracking-widest font-black py-8 bg-primary/5 rounded-[2rem] border border-dashed border-primary/20 w-full hover:bg-primary/10 transition-all font-serif italic"
                   >
                     <Clock className="w-4 h-4 mr-2" />
                     Ver minhas intercessões anteriores
                   </Button>
                </div>
             ) : (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="space-y-6"
                >
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <Clock className="w-5 h-5 text-primary opacity-60" />
                         <h2 className="text-xl font-bold text-foreground opacity-80 uppercase tracking-widest text-[14px]">Causas que você intercedeu</h2>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="text-[10px] uppercase font-bold text-muted-foreground">Fechar</Button>
                   </div>

                   {isIntercessionsLoading ? (
                     <div className="text-center py-6 opacity-40">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-xs">Carregando histórico...</p>
                     </div>
                   ) : intercessions.length === 0 ? (
                     <p className="text-center text-sm text-muted-foreground py-8 border border-dashed border-primary/10 rounded-3xl">
                       Você ainda não orou por nenhuma causa.
                     </p>
                   ) : (
                     <div className="space-y-4">
                        {intercessions.map((item, i) => (
                          <motion.div 
                            key={item.id} 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            transition={{ delay: i * 0.1 }}
                          >
                            <Card className={`p-5 soft-shadow rounded-3xl ${item.is_restricted ? 'bg-amber-50/80 border-amber-200' : item.prayer_feedback ? 'bg-green-50/80 border-green-200' : 'border-primary/5'}`}>
                              <div className="flex gap-4">
                                <div className="flex-shrink-0 mt-1">
                                  {item.avatar_url ? (
                                    <img src={item.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-primary/20" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                      <Heart className="w-4 h-4 text-primary/50" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">{item.author_name}</span>
                                    {item.is_friend && !item.is_anonymous && item.author_name !== 'Usuário Anônimo' && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-bold uppercase">Amigo 🤝</span>}
                                    {item.is_anonymous && <span className="text-[8px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-sm font-bold uppercase">Anônimo</span>}
                                  </div>
                                  
                                  {item.prayer_title && <h4 className="text-sm font-bold mb-1 line-clamp-1">{item.prayer_title}</h4>}
                                  {item.is_restricted ? (
                                    <div className="text-xs text-amber-800 bg-white/70 border border-amber-200 rounded-xl p-3 mb-3">
                                      <p className="font-bold mb-1">Conteúdo indisponível</p>
                                      <p>{item.prayer_content}</p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{item.prayer_content}</p>
                                  )}
                                  
                                  <div className="flex flex-col w-full gap-2 mt-3 text-[10px] text-muted-foreground">
                                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                      <div className="flex items-center gap-1" title={formatFullDatetime(item.created_at)}>
                                        <Clock className="w-3 h-3 text-primary/40" />
                                        <span>🙏 Rezei por essa causa {formatTimeAgo(item.created_at)}</span>
                                      </div>
                                      {item.posted_at && (
                                        <>
                                          <span className="text-primary/20">•</span>
                                          <div className="flex items-center gap-1" title={formatFullDatetime(item.posted_at)}>
                                            <span>Postado {formatTimeAgo(item.posted_at)}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    
                                    {item.intercessionsCount > 1 && (
                                      <div>
                                        <button 
                                          onClick={() => toggleHistoryItemExpand(item.id)}
                                          className="text-primary hover:underline font-medium"
                                        >
                                          Ver todas as datas em que rezei por essa causa ({item.intercessionsCount})
                                        </button>
                                        {expandedHistoryItems[item.id] && (
                                          <div className="mt-2 pl-4 border-l border-primary/20 space-y-1">
                                            {item.allIntercessions.map((hist: any, idx: number) => (
                                              <div key={idx} className="text-muted-foreground flex items-center gap-1.5 py-0.5">
                                                <Clock className="w-2.5 h-2.5 opacity-40" />
                                                <span className="text-[9px]">Intercedi em {formatFullDatetime(hist.created_at)} ({formatTimeAgo(hist.created_at)})</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* History Reactions */}
                                  <div className="mt-4 pt-3 border-t border-primary/5 flex items-center justify-between">
                                    {item.is_restricted ? (
                                      <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-200">
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase">Interações bloqueadas</span>
                                      </div>
                                    ) : item.prayer_feedback ? (
                                      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl border border-green-100">
                                        <span className="text-lg">{FEEDBACK_OPTIONS[item.prayer_feedback]?.emoji}</span>
                                        <span className="text-[10px] font-bold uppercase">Graça alcançada!</span>
                                      </div>
                                    ) : (
                                      <div className="flex-1">
                                        {editingReactionHistoryId === item.id ? (
                                          <div className="flex gap-2">
                                            {REACTIONS.map(reaction => (
                                              <button
                                                key={reaction.type}
                                                onClick={() => toggleReaction(reaction.type, item.prayer_request_id, item.user_reaction, true)}
                                                className={`p-1.5 rounded-lg text-lg transition-colors ${item.user_reaction === reaction.type ? 'bg-primary/20' : 'hover:bg-primary/5'}`}
                                              >
                                                {reaction.emoji}
                                              </button>
                                            ))}
                                            <button onClick={() => setEditingReactionHistoryId(null)} className="ml-auto text-[10px] text-muted-foreground px-2">Fechar</button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3">
                                            {item.user_reaction ? (
                                              <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-lg">
                                                <span className="text-sm">{REACTIONS.find(r => r.type === item.user_reaction)?.emoji}</span>
                                                <span className="text-[9px] text-primary font-medium">{REACTIONS.find(r => r.type === item.user_reaction)?.label}</span>
                                              </div>
                                            ) : (
                                              <span className="text-[10px] text-muted-foreground/50 italic">Sem reação enviada</span>
                                            )}
                                            <button onClick={() => setEditingReactionHistoryId(item.id)} className="text-[10px] text-primary hover:underline">Alterar reação</button>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {!item.is_restricted && !item.prayer_feedback && (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => forceDrawFromHistory(item.id, item.prayer_request_id)}
                                        className="h-7 text-[10px] border-primary/20 text-primary hover:bg-primary/10 ml-2 font-bold uppercase tracking-wider"
                                      >
                                        <Heart className="w-3 h-3 mr-1" />
                                        Orar novamente
                                      </Button>
                                    )}
                                  </div>

                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                     </div>
                   )}
                </motion.div>
             )}
          </div>
        </div>
        
        <ReportPrayerDialog 
          open={reportDialogOpen} 
          prayerRequestId={prayerRequest?.id || null} 
          onClose={() => setReportDialogOpen(false)}
          onConfirmed={handleReportConfirmed}
        />
      </div>
    </PageTransition>
  );

};

export default Pray;
