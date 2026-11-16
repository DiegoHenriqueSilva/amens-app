import { supabase } from "@/integrations/supabase/client";

/**
 * Chama um comando administrativo (RPC SECURITY DEFINER) e lança Error com a
 * mensagem do servidor, que já vem em português (ex.: "Você não pode alterar o
 * seu próprio papel"). Os tipos gerados (types.ts) ainda não conhecem essas
 * RPCs — ver backlog B06.
 */
export async function adminRpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const call = supabase.rpc as unknown as (
    name: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: T | null; error: { message: string } | null }>;
  const { data, error } = await call(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
