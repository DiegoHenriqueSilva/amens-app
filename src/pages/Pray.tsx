import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { HairlineDivider } from "@/components/ui/hairline-divider";
import { cn } from "@/lib/utils";
import { ArrowLeft, Users, Share2, Flag, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useXp } from "@/hooks/use-xp";
import { XP_REWARDS } from "@/lib/xp";
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

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
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
  const { addXp } = useXp();
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
  const [prayTime, setPrayTime] = useState(0);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);

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
          prayer_content: p.status === 'banned' ? "[Causa removida por infringir as diretrizes do Améns]" : (p.content || "Pedido removido"),
          prayer_location: p.location || null,
          prayer_feedback: p.feedback || null,
          author_name: authorNameFinal,
          avatar_url: finalAvatar,
          is_friend: userFriends.includes(p.user_id),
          is_anonymous: p.is_anonymous,
          user_reaction: reactionsMap[i.prayer_request_id] || null,
          status: p.status,
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
        if (data.status === 'banned') {
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
        .is('feedback', null)
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
        toast.info("Todas as causas foram atendidas. Interceda por esta intenção especial.");
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
        
        // XP logic
        if (!currentReaction) {
          const today = new Date().toISOString().split("T")[0];
          const reactKey = `amens_react_xp_${currentUser.id}_${today}`;
          if (!localStorage.getItem(reactKey)) {
            await addXp("react");
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
    setPrayerRequest(null);
    toast.info("Você pode sortear uma nova causa agora.");
  };

  // Prayer timer
  useEffect(() => {
    if (!prayerRequest) { setPrayTime(0); return; }
    setPrayTime(0);
    const interval = setInterval(() => setPrayTime(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [prayerRequest?.id]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <PageTransition>
      <div className="min-h-screen pb-28">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-black/5">
            <ArrowLeft size={18} />
          </button>
          <div className="font-serif text-[17px] tracking-tight text-ink">Orar por uma Causa</div>
          {prayerRequest && !prayerRequest.is_default && !isSharedCause ? (
            <button onClick={() => setReportDialogOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-black/5">
              <MoreVertical size={18} className="text-ink-soft" />
            </button>
          ) : <div className="w-9" />}
        </div>

        <div className="px-5 max-w-xl mx-auto">
          <InviteGatePopup isAuthenticated={!!currentUser} />

          <AnimatePresence mode="wait">
            {/* Initial — no cause yet */}
            {!hasRequestedCause && (
              <motion.div key="initial" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="pt-8 space-y-6">
                <div className="bg-vellum border border-hairline rounded-xl p-8 text-center">
                  <p className="font-serif text-[22px] leading-snug text-ink mb-6">
                    "Interceder é levar o peso<br />do outro diante de Deus."
                  </p>
                  <button
                    onClick={fetchRandomPrayerRequest}
                    disabled={isLoading || isLimitReached || !currentUser}
                    className="w-full h-12 rounded-full bg-ink text-paper text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Buscando…" : "Receber uma causa"}
                  </button>
                  {currentUser && (
                    <p className="text-[11px] text-ink-soft mt-3">
                      {isLimitReached
                        ? `Limite atingido. Próximo sorteio ${nextResetLabel}.`
                        : `${drawsLeft} de ${PRAY_SETTINGS.dailyDrawLimit} sorteios disponíveis hoje`}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Loading */}
            {hasRequestedCause && (isLoading || !prayerRequest) && (
              <motion.div key="loading" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="flex justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-marian border-t-transparent rounded-full" />
              </motion.div>
            )}

            {/* Cause */}
            {hasRequestedCause && !isLoading && prayerRequest && (
              <motion.div key="prayer" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="pt-4 space-y-6">

                {isSharedCause && (
                  <div className="bg-marian/8 border border-marian/20 rounded-xl p-4 text-center">
                    <p className="text-sm text-ink mb-3">Você acessou uma causa compartilhada.</p>
                    <button
                      onClick={handleAcceptSharedCause}
                      disabled={isLimitReached}
                      className="h-9 px-5 rounded-full bg-ink text-paper text-xs font-medium disabled:opacity-35"
                    >
                      Aceitar interceder
                    </button>
                    {isLimitReached && <p className="text-[11px] text-red-500 mt-2">Sorteios esgotados hoje.</p>}
                  </div>
                )}

                {/* Cause card */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gold text-[10px]">✦</span>
                    <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">
                      Causa de {prayerRequest.display_name}
                    </span>
                    {prayerRequest.is_friend && !prayerRequest.is_anonymous && (
                      <span className="text-[9px] bg-marian/10 text-marian px-1.5 py-0.5 rounded-sm">amigo</span>
                    )}
                  </div>
                  {prayerRequest.created_at && (
                    <p className="text-[11px] text-ink-soft mb-4">{formatTimeAgo(prayerRequest.created_at)}{prayerRequest.location ? ` · ${prayerRequest.location}` : ""}</p>
                  )}
                  <p className="font-serif text-[26px] leading-[1.25] text-ink">
                    "{prayerRequest.content || prayerRequest.title}"
                  </p>
                </div>

                <HairlineDivider />

                {/* Stats */}
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-ink-soft mb-0.5">Em oração</p>
                    <p className="font-serif text-[22px] font-mono text-ink leading-none">{formatTime(prayTime)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-ink-soft mb-0.5">Acompanhando</p>
                    <p className="font-serif text-[22px] text-ink leading-none">{prayerRequest.prayer_count ?? 0} <span className="text-[14px] text-ink-soft">irmãos</span></p>
                  </div>
                </div>

                {/* Reactions — chips */}
                {!prayerRequest.feedback && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-ink-soft mb-2">Envie um sinal</p>
                    <div className="flex flex-wrap gap-2">
                      {REACTIONS.map((reaction) => {
                        const isActive = activeReaction === reaction.type;
                        return (
                          <button
                            key={reaction.type}
                            onClick={() => toggleReaction(reaction.type, prayerRequest.id, activeReaction, false)}
                            className={cn(
                              "px-3.5 py-2 rounded-full text-xs border transition-all",
                              isActive ? "bg-ink text-paper border-ink" : "bg-transparent text-ink border-hairline hover:bg-vellum",
                            )}
                          >
                            {reaction.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {prayerRequest.feedback && (
                  <p className="text-[12px] text-marian italic">Esta causa já recebeu um testemunho de graça.</p>
                )}

                {/* AI suggestion — collapsible */}
                <div>
                  <button
                    onClick={() => {
                      if (!showAiSuggestion && !suggestedPrayer) generatePrayer();
                      setShowAiSuggestion(v => !v);
                    }}
                    className="flex items-center gap-2 text-[12px] text-ink-soft hover:text-ink transition-colors"
                  >
                    Sugestão de oração {showAiSuggestion ? "▴" : "▾"}
                  </button>
                  <AnimatePresence>
                    {showAiSuggestion && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mt-3 bg-vellum border border-hairline rounded-xl p-4">
                          {isGenerating ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin w-4 h-4 border-2 border-marian border-t-transparent rounded-full" />
                            </div>
                          ) : (
                            <p className="font-serif text-[15px] leading-relaxed text-ink italic">{suggestedPrayer}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Primary actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      toast.success("Sua oração foi registrada.");
                      navigate("/");
                    }}
                    className="w-full h-12 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity"
                  >
                    Concluí esta oração
                  </button>

                  {!prayerRequest.feedback && !isSharedCause && (
                    <button
                      onClick={fetchRandomPrayerRequest}
                      disabled={isLoading || isLimitReached}
                      className="w-full h-11 rounded-full bg-transparent text-ink border border-hairline text-[12.5px] hover:bg-vellum transition-colors disabled:opacity-35"
                    >
                      Receber outra
                    </button>
                  )}
                </div>

                {/* Share + history */}
                <div className="flex items-center gap-4 justify-center">
                  <button onClick={() => setFriendSelectorOpen(true)} className="flex items-center gap-1.5 text-[12px] text-marian hover:underline underline-offset-4">
                    <Users size={13} /> Enviar a um amigo
                  </button>
                  <span className="text-hairline">|</span>
                  <button onClick={handleShareCompartilhar} className="flex items-center gap-1.5 text-[12px] text-marian hover:underline underline-offset-4">
                    <Share2 size={13} /> Compartilhar
                  </button>
                </div>

                {/* Report */}
                {!prayerRequest.feedback && !prayerRequest.is_default && !isSharedCause && (
                  <div className="text-center pb-2">
                    <button onClick={() => setReportDialogOpen(true)} className="flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink-soft/60 mx-auto">
                      <Flag size={10} /> Reportar conteúdo
                    </button>
                  </div>
                )}

                <FriendSelector
                  open={friendSelectorOpen}
                  onOpenChange={setFriendSelectorOpen}
                  onSelect={handleInviteFriends}
                  prayerRequestId={prayerRequest?.id}
                  alreadySharedFriendIds={sharedFriendsMap[prayerRequest?.id] || []}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          {currentUser && (
            <div className="mt-10">
              <button
                onClick={() => { if (!showHistory) fetchIntercessions(); setShowHistory(v => !v); }}
                className="w-full flex items-center justify-between py-3 border-t border-hairline text-[11px] uppercase tracking-[0.24em] text-ink-soft"
              >
                Minhas intercessões anteriores
                <span>{showHistory ? "▴" : "▾"}</span>
              </button>
              <AnimatePresence>
                {showHistory && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    {isIntercessionsLoading ? (
                      <div className="py-6 text-center"><div className="animate-spin w-4 h-4 border-2 border-marian border-t-transparent rounded-full mx-auto" /></div>
                    ) : intercessions.length === 0 ? (
                      <p className="py-4 text-[12px] text-ink-soft text-center">Você ainda não orou por nenhuma causa.</p>
                    ) : (
                      <div className="space-y-3 pt-2 pb-4">
                        {intercessions.map((item) => (
                          <div key={item.id} className="bg-vellum border border-hairline rounded-xl p-4">
                            <p className="font-serif text-[14px] text-ink leading-snug mb-1 line-clamp-2">{item.prayer_title || item.prayer_content}</p>
                            <p className="text-[11px] text-ink-soft mb-3">{item.author_name} · {formatTimeAgo(item.created_at)}</p>
                            <div className="flex items-center gap-3 pt-2 border-t border-dashed border-hairline">
                              {item.prayer_feedback ? (
                                <span className="text-[11px] text-marian">Graça alcançada</span>
                              ) : (
                                <>
                                  <div className="flex gap-1.5">
                                    {REACTIONS.map(r => (
                                      <button key={r.type} onClick={() => toggleReaction(r.type, item.prayer_request_id, item.user_reaction, true)}
                                        className={cn("px-2.5 py-1 rounded-full text-[10px] border transition-all", item.user_reaction === r.type ? "bg-ink text-paper border-ink" : "border-hairline text-ink-soft hover:bg-hairline/50")}>
                                        {r.label}
                                      </button>
                                    ))}
                                  </div>
                                  <button onClick={() => forceDrawFromHistory(item.id, item.prayer_request_id)} className="ml-auto text-[11px] text-marian hover:underline underline-offset-4">
                                    Orar novamente
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
