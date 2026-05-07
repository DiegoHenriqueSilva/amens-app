export const FAITH_POINTS_REWARDS = {
  pray: 10,
  submit: 20,
  react: 5,
} as const;

export interface CelestialLevel {
  name: string;
  emoji: string;
  minFaithPoints: number;
}

export const CELESTIAL_LEVELS: CelestialLevel[] = [
  { name: "Semente", emoji: "🌱", minFaithPoints: 0 },
  { name: "Mostarda", emoji: "🌿", minFaithPoints: 20 },
  { name: "Bom Solo", emoji: "🪴", minFaithPoints: 50 },
  { name: "Raiz Firme", emoji: "🌳", minFaithPoints: 100 },
  { name: "Videira", emoji: "🍇", minFaithPoints: 160 },
  { name: "Sal da Terra", emoji: "🧂", minFaithPoints: 240 },
  { name: "Água Viva", emoji: "💧", minFaithPoints: 340 },
  { name: "Pão da Vida", emoji: "🍞", minFaithPoints: 460 },
  { name: "Ovelha Fiel", emoji: "🐑", minFaithPoints: 600 },
  { name: "Rocha", emoji: "🪨", minFaithPoints: 760 },
  { name: "Candeia", emoji: "🕯️", minFaithPoints: 940 },
  { name: "Chama Viva", emoji: "🔥", minFaithPoints: 1140 },
  { name: "Sarça Ardente", emoji: "🌿", minFaithPoints: 1360 },
  { name: "Luz do Mundo", emoji: "🌟", minFaithPoints: 1600 },
  { name: "Farol", emoji: "🏮", minFaithPoints: 1860 },
  { name: "Escudo da Fé", emoji: "🛡️", minFaithPoints: 2140 },
  { name: "Oliveira", emoji: "🫒", minFaithPoints: 2440 },
  { name: "Cedro", emoji: "🌲", minFaithPoints: 2760 },
  { name: "Estrela da Manhã", emoji: "✨", minFaithPoints: 3100 },
  { name: "Elo da Vida", emoji: "🔗", minFaithPoints: 3460 },
];

export function getLevel(totalFaithPoints: number): CelestialLevel {
  let current = CELESTIAL_LEVELS[0];
  for (const level of CELESTIAL_LEVELS) {
    if (totalFaithPoints >= level.minFaithPoints) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(totalFaithPoints: number): CelestialLevel | null {
  for (const level of CELESTIAL_LEVELS) {
    if (totalFaithPoints < level.minFaithPoints) return level;
  }
  return null;
}

export function getLevelProgress(totalFaithPoints: number): number {
  const current = getLevel(totalFaithPoints);
  const next = getNextLevel(totalFaithPoints);
  if (!next) return 100;
  const range = next.minFaithPoints - current.minFaithPoints;
  const progress = totalFaithPoints - current.minFaithPoints;
  return Math.round((progress / range) * 100);
}
