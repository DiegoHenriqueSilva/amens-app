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
  { name: "Peregrino", emoji: "🚶", minXp: 50 },
  { name: "Discípulo", emoji: "📖", minXp: 150 },
  { name: "Guardião", emoji: "🛡️", minXp: 300 },
  { name: "Anjo da Guarda", emoji: "👼", minXp: 500 },
  { name: "Serafim", emoji: "✨", minXp: 800 },
  { name: "Arcanjo", emoji: "⚡", minXp: 1200 },
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
