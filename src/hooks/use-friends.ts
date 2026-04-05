import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useFriends = () => {
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myCode, setMyCode] = useState<string | null>(null);

  const fetchFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get friendships and join with profiles
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
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching friends:", error);
    } else {
      setFriends(data?.map(f => f.profiles) || []);
    }
  };

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
          avatar_url
        )
      `)
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching requests:", error);
    } else {
      setRequests(data || []);
    }
  };

  const fetchMyCode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("friend_code")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching my code:", error);
    } else {
      setMyCode(data?.friend_code || null);
    }
  };

  const sendRequestByCode = async (code: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuário não autenticado" };

    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === myCode) {
      return { error: "Você não pode adicionar a si mesmo." };
    }

    // Find user by code
    const { data: targetProfile, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("friend_code", cleanCode)
      .single();

    if (findError || !targetProfile) {
      return { error: "Código de amigo não encontrado." };
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

    fetchRequests();
    fetchFriends();
    return { success: true };
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchFriends(), fetchRequests(), fetchMyCode()]);
      } catch (e) {
        console.error("Error initializing friends data:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return {
    friends,
    requests,
    loading,
    myCode,
    sendRequestByCode,
    updateRequestStatus,
    refreshFriends: fetchFriends,
    refreshRequests: fetchRequests
  };
};
