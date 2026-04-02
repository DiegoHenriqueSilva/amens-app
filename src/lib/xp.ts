export const XP_REWARDS = {
  pray: 10,
  submit: 20,
  react: 5,
} as const;

export interface CelestialLevel {
  name: string;
  emoji: string;
  minXp: number;
}

export const CELESTIAL_LEVELS: CelestialLevel[] = [
  { name: "Semente", emoji: "🌱", minXp: 0 },
  { name: "Broto", emoji: "🌿", minXp: 20 },
  { name: "Ramo", emoji: "🍃", minXp: 50 },
  { name: "Raiz", emoji: "🪴", minXp: 100 },
  { name: "Videira", emoji: "🍇", minXp: 160 },
  { name: "Orante", emoji: "🤲", minXp: 240 },
  { name: "Fiel", emoji: "🙇", minXp: 340 },
  { name: "Neófito", emoji: "🕯️", minXp: 460 },
  { name: "Catecúmeno", emoji: "📖", minXp: 600 },
  { name: "Acólito", emoji: "🪙", minXp: 760 },
  { name: "Leitor", emoji: "📜", minXp: 940 },
  { name: "Salmista", emoji: "🎵", minXp: 1140 },
  { name: "Orador", emoji: "🗣️", minXp: 1360 },
  { name: "Discípulo", emoji: "👥", minXp: 1600 },
  { name: "Guardião", emoji: "🛡️", minXp: 1860 },
  { name: "Sentinela", emoji: "👁️", minXp: 2140 },
  { name: "Peregrino", emoji: "🚶", minXp: 2440 },
  { name: "Missionário", emoji: "🌎", minXp: 2760 },
  { name: "Apóstolo", emoji: "🕊️", minXp: 3100 },
  { name: "Mestre", emoji: "👑", minXp: 3460 },
  { name: "Intercessor", emoji: "🤝", minXp: 3840 },
  { name: "Anjo", emoji: "👼", minXp: 4240 },
  { name: "Arcanjo", emoji: "⚡", minXp: 4660 },
  { name: "Serafim", emoji: "🔥", minXp: 5100 },
  { name: "Querubim", emoji: "✨", minXp: 5560 },
  { name: "Árvore da Vida", emoji: "🌳", minXp: 6040 },
];

export function getLevel(totalXp: number): CelestialLevel {
  let current = CELESTIAL_LEVELS[0];
  for (const level of CELESTIAL_LEVELS) {
    if (totalXp >= level.minXp) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(totalXp: number): CelestialLevel | null {
  for (const level of CELESTIAL_LEVELS) {
    if (totalXp < level.minXp) return level;
  }
  return null;
}

export function getLevelProgress(totalXp: number): number {
  const current = getLevel(totalXp);
  const next = getNextLevel(totalXp);
  if (!next) return 100;
  const range = next.minXp - current.minXp;
  const progress = totalXp - current.minXp;
  return Math.round((progress / range) * 100);
}
