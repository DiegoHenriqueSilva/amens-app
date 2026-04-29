/**
 * Configurações centralizadas da página Pray.
 * Edite aqui para ajustar comportamento sem tocar na lógica.
 */
export const PRAY_SETTINGS = {
  /** Número máximo de sorteios por dia calendário */
  dailyDrawLimit: 3,

  /** Dias para exibir data como relativa ("há X dias") vs absoluta (dd/mm/aaaa) */
  relativeTimeThresholdDays: 7,

  /** Pesos do algoritmo de sorteio ponderado */
  drawWeights: {
    /** Causa sem nenhuma oração ainda */
    zeroPrayers: 40,
    /** Causa com 1–3 orações */
    fewPrayers: 20,
    /** Causa com 4–9 orações */
    somePrayers: 10,
    /** Causa pertencente a um amigo do usuário */
    isFriend: 30,
    /** Causa postada há mais de 30 dias (prioriza causas antigas) */
    isOld: 25,
    /** Causa postada há menos de 3 dias (incentiva causas novas) */
    isNew: 15,
    /** Ruído aleatório máximo ± (mantém surpresa) */
    randomVariance: 15,
  },

  /** Entre os N melhores scores, um é escolhido aleatoriamente */
  topCausesPool: 5,

  /** Quantas causas buscar no banco antes de rankear */
  maxCausesToFetch: 50,

  /** Dias sem oração para considerar causa "antiga" */
  oldCauseDaysThreshold: 30,

  /** Dias recentes para bônus de causa nova */
  newCauseDaysThreshold: 3,
} as const;
