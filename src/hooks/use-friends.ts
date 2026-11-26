import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export const useFriends = () => {
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

  const fetchFriends = useCallback(async (userId?: string) => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) return;
      const targetId = userId || currentUser?.id;
      if (!targetId) return;

      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend_id,
          profiles!friendships_friend_id_fkey (
            id,
            full_name,
            display_name,
            show_real_name,
            city,
            state,
            avatar_url
          )
        `)
        .eq("user_id", targetId);

      if (error) throw error;
      setFriends(data?.map(f => f.profiles).filter(Boolean) || []);
    } catch (e) {
      console.warn("useFriends: fetchFriends failed:", e);
    }
  }, [currentUser?.id]);

  const fetchRequests = useCallback(async (userId?: string) => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) return;
      const targetId = userId || currentUser?.id;
      if (!targetId) return;

      const { data, error } = await supabase
        .from("friend_requests")
        .select(`
          id,
          sender_id,
          status,
          created_at,
          profiles!friend_requests_sender_id_fkey (
            id,
            full_name,
            display_name,
            show_real_name,
            city,
            state,
            avatar_url
          )
        `)
        .eq("receiver_id", targetId)
        .eq("status", "pending");

      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      console.warn("useFriends: fetchRequests failed:", e);
    }
  }, [currentUser?.id]);

  const fetchMyCode = useCallback(async (userId?: string) => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) return;
      const targetId = userId || currentUser?.id;
      if (!targetId) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("friend_code")
        .eq("id", targetId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching friend code:", error);
        return;
      }

      if (data?.friend_code) {
        setMyCode(data.friend_code);
      } else {
        // Generate a new code if missing
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const generate = () => {
          let code = 'AMEN-';
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return code;
        };

        const newCode = generate();
        console.log("Generating new friend code for user:", targetId);

        const { error: updateError } = await supabase
          .from("profiles")
          .upsert({
            id: targetId,
            friend_code: newCode,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (!updateError) {
          setMyCode(newCode);
        } else {
          console.error("Failed to generate and save friend code:", updateError);
          const { error: retryError } = await supabase
            .from("profiles")
            .update({ friend_code: newCode })
            .eq("id", targetId);

          if (!retryError) {
            setMyCode(newCode);
          } else {
            console.error("Retry update also failed:", retryError);
          }
        }
      }
    } catch (e) {
      console.warn("useFriends: fetchMyCode failed:", e);
    }
  }, [currentUser?.id]);

  const sendRequestByCode = async (code: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuário não autenticado" };

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { error: "Por favor, informe o código do amigo." };
    }

    if (cleanCode === myCode) {
      return { error: "Você não pode adicionar a si mesmo." };
    }

    // Find user by code
    const { data: targetProfile, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("friend_code", cleanCode)
      .maybeSingle();

    if (findError || !targetProfile) {
      return { error: "Código de amigo não encontrado." };
    }

    if (targetProfile.id === user.id) {
      return { error: "Você não pode adicionar a si mesmo." };
    }

    // Check if already friends
    const isAlreadyFriend = friends.some(f => f.id === targetProfile.id);
    if (isAlreadyFriend) {
      return { error: "Esta pessoa já está na sua lista de amigos." };
    }

    // Send request
    const { error: sendError } = await supabase
      .from("friend_requests")
      .insert({
        sender_id: user.id,
        receiver_id: targetProfile.id,
        status: "pending"
      });

    if (sendError) {
      if (sendError.code === "23505") { // Unique constraint
        return { error: "Você já enviou uma solicitação para este amigo." };
      }
      return { error: "Erro ao enviar solicitação." };
    }

    toast.success("Solicitação enviada com sucesso! 🙏");
    return { success: true };
  };

  const updateRequestStatus = async (requestId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao processar solicitação.");
      return { error };
    }

    if (status === "accepted") {
      toast.success("Agora vocês são Amigos da Fé! 🙏");
    } else {
      toast.info("Solicitação recusada.");
    }

    // Immediately reload friends and requests
    await Promise.all([fetchRequests(), fetchFriends()]);
    return { success: true };
  };

  useEffect(() => {
    let isMounted = true;

    const loadDataForUser = async (user: SupabaseUser | null) => {
      if (!isMounted) return;
      setCurrentUser(user);

      if (!user) {
        setFriends([]);
        setRequests([]);
        setMyCode(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await Promise.all([
          fetchFriends(user.id),
          fetchRequests(user.id)
        ]);
        if (isMounted) {
          setLoading(false);
          void fetchMyCode(user.id);
        }
      } catch (e) {
        console.error("Error loading friends data:", e);
        if (isMounted) setLoading(false);
      }
    };

    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) loadDataForUser(user);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        loadDataForUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchFriends, fetchRequests, fetchMyCode]);

  return {
    friends,
    requests,
    loading,
    myCode,
    currentUser,
    isAuthenticated: !!currentUser,
    sendRequestByCode,
    updateRequestStatus,
    refreshFriends: fetchFriends,
    refreshRequests: fetchRequests
  };
};
