import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "agora mesmo";
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  
  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
}
