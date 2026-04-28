import { PRAY_SETTINGS } from "@/config/pray-settings";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data como relativa ("há X dias") se dentro do threshold configurado,
 * ou como data absoluta (dd/mm/aaaa) se mais antiga.
 */
export function formatTimeAgo(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "agora mesmo";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;

  const days = Math.floor(hours / 24);

  // Se dentro do threshold relativo, continua como relativo
  if (days < PRAY_SETTINGS.relativeTimeThresholdDays) {
    return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  }

  // Além do threshold → exibe data absoluta
  return formatDateAbsolute(date);
}

/**
 * Retorna a data no formato dd/mm/aaaa
 */
export function formatDateAbsolute(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const aaaa = date.getFullYear();
  return `${dd}/${mm}/${aaaa}`;
}

/**
 * Retorna datetime completo no formato dd/mm/aaaa HH:MM
 * Usado em tooltips ao passar o mouse sobre datas.
 */
export function formatFullDatetime(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const aaaa = date.getFullYear();
  const HH = String(date.getHours()).padStart(2, "0");
  const MM = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${aaaa} às ${HH}:${MM}`;
}

/**
 * Resolve o nome de exibição de um autor de causa.
 * Regras (em ordem de precedência):
 * 1. Se is_anonymous === true → "Usuário Anônimo" (absoluto)
 * 2. Se author_name for null/vazio → "Usuário Anônimo"
 * 3. Se profile.display_name disponível → usa display_name
 * 4. Senão → usa author_name (primeiro nome já salvo na causa)
 */
export function getDisplayName(
  authorName: string | null | undefined,
  profile?: { display_name?: string | null; full_name?: string | null } | null,
  isAnonymous?: boolean | null
): string {
  if (isAnonymous) return "Usuário Anônimo";
  if (!authorName || authorName.trim() === "") return "Usuário Anônimo";
  if (profile?.display_name) return profile.display_name;
  return authorName;
}
