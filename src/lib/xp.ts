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
  { name: "Mostarda", emoji: "🌿", minXp: 20 },
  { name: "Bom Solo", emoji: "🪴", minXp: 50 },
  { name: "Raiz Firme", emoji: "🌳", minXp: 100 },
  { name: "Videira", emoji: "🍇", minXp: 160 },
  { name: "Sal da Terra", emoji: "🧂", minXp: 240 },
  { name: "Água Viva", emoji: "💧", minXp: 340 },
  { name: "Pão da Vida", emoji: "🍞", minXp: 460 },
  { name: "Ovelha Fiel", emoji: "🐑", minXp: 600 },
  { name: "Rocha", emoji: "🪨", minXp: 760 },
  { name: "Candeia", emoji: "🕯️", minXp: 940 },
  { name: "Chama Viva", emoji: "🔥", minXp: 1140 },
  { name: "Sarça Ardente", emoji: "🌿", minXp: 1360 },
  { name: "Luz do Mundo", emoji: "🌟", minXp: 1600 },
  { name: "Farol", emoji: "🏮", minXp: 1860 },
  { name: "Escudo da Fé", emoji: "🛡️", minXp: 2140 },
  { name: "Oliveira", emoji: "🫒", minXp: 2440 },
  { name: "Cedro", emoji: "🌲", minXp: 2760 },
  { name: "Estrela da Manhã", emoji: "✨", minXp: 3100 },
  { name: "Elo da Vida", emoji: "🔗", minXp: 3460 },
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
