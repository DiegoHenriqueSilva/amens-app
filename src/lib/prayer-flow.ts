export interface PrayerCause {
  id: string;
  title: string | null;
  content: string;
  display_name: string;
  avatar_url: string | null;
  location: string | null;
  created_at?: string;
  updated_at?: string;
  status: string;
  feedback: string | null;
  is_anonymous: boolean;
  is_friend: boolean;
  is_owner: boolean;
  is_default: boolean;
  has_interceded: boolean;
  user_reaction: string | null;
}

export const isPrayerId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function prayerFailureMessage(error: unknown): string {
  const value = error as { message?: string; hint?: string; code?: string };
  const detail = `${value?.message ?? ''} ${value?.hint ?? ''}`;
  if (detail.includes('daily_prayer_limit_reached'))
    return 'Suas intercessões diárias recomeçam à meia-noite, no horário de São Paulo. Você pode retomar suas causas pelo histórico.';
  if (detail.includes('prayer_unavailable'))
    return 'Esta causa não está disponível para esta ação. Atualize a página para conferir.';
  if (detail.includes('prayer_account_unavailable'))
    return 'Não foi possível autorizar esta ação. Confira sua sessão e a situação da sua conta.';
  if (detail.includes('prayer_invite_invalid'))
    return 'Confira os amigos selecionados. Envie para até 20 amigos por vez.';
  return 'Não foi possível confirmar a ação. Tente novamente.';
}

export function prayerShare(cause: PrayerCause) {
  const url = new URL('/pray', 'https://www.amens.com.br');
  url.searchParams.set('id', cause.id);
  return {
    title: 'Pedido de oração no Améns',
    text: 'Conheça esta intenção e una-se a nós em oração.',
    url: url.toString(),
  };
}

export async function sharePrayer(
  cause: PrayerCause,
  platform: {
    share?: (data: ShareData) => Promise<void>;
    open: (url: string) => Window | null;
  },
): Promise<'shared' | 'opened' | 'cancelled' | 'blocked'> {
  const payload = prayerShare(cause);
  if (platform.share) {
    try {
      await platform.share(payload);
      return 'shared';
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  const popup = platform.open(
    `https://wa.me/?text=${encodeURIComponent(`${payload.text}\n${payload.url}`)}`,
  );
  if (!popup) return 'blocked';
  popup.opener = null;
  return 'opened';
}

/** Retain unacknowledged commands across reloads, without storing cause content. */
const memoryOperations = new Map<string, string>();
export function prayerOperation(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  key: string,
) {
  let id = memoryOperations.get(key);
  try {
    const stored = storage.getItem(key);
    id = stored && isPrayerId(stored) ? stored : id || crypto.randomUUID();
    storage.setItem(key, id);
  } catch {
    id ||= crypto.randomUUID();
  }
  memoryOperations.set(key, id);
  return {
    id,
    acknowledge: () => {
      memoryOperations.delete(key);
      try {
        storage.removeItem(key);
      } catch {
        /* Optional recovery storage. */
      }
    },
  };
}
