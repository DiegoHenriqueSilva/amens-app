export interface Prayer {
  id: string;
  name: string;
  phrases: string[];
}

export const PHRASE_DURATION = 4000; // 4 seconds per phrase
export const PRAYER_GAP = 4000; // 4 seconds between prayers

export const TOTAL_CYCLE_TIME = PRAYERS.reduce((acc, p) => 
  acc + (p.phrases.length * PHRASE_DURATION) + PRAYER_GAP, 0
);

export const PRAYERS: Prayer[] = [
  {
    id: "pai-nosso",
    name: "Pai Nosso",
    phrases: [
      "Pai Nosso, que estais no céu,",
      "santificado seja o Vosso nome.",
      "Venha a nós o Vosso reino,",
      "seja feita a Vossa vontade,",
      "assim na terra como no céu.",
      "O pão nosso de cada dia nos dai hoje,",
      "perdoai-nos as nossas ofensas,",
      "assim como nós perdoamos a quem nos tem ofendido.",
      "E não nos deixeis cair em tentação,",
      "mas livrai-nos do mal. Amém."
    ]
  },
  {
    id: "ave-maria",
    name: "Ave Maria",
    phrases: [
      "Ave Maria, cheia de graça,",
      "o Senhor é convosco.",
      "Bendita sois vós entre as mulheres,",
      "e bendito é o fruto do vosso ventre, Jesus.",
      "Santa Maria, Mãe de Deus,",
      "rogai por nós pecadores,",
      "agora e na hora da nossa morte. Amém."
    ]
  },
  {
    id: "santo-anjo",
    name: "Santo Anjo",
    phrases: [
      "Santo Anjo do Senhor,",
      "meu zeloso guardador,",
      "se ti a mim confiou a piedade divina,",
      "sempre me rege, me guarde, me governe e me ilumine. Amém."
    ]
  },
  {
    id: "sao-francisco",
    name: "Oração de São Francisco",
    phrases: [
      "Senhor, fazei-me instrumento de vossa paz.",
      "Onde houver ódio, que eu leve o amor.",
      "Onde houver ofensa, que eu leve o perdão.",
      "Onde houver discórdia, que eu leve a união.",
      "Onde houver dúvida, que eu leve a fé.",
      "Onde houver erro, que eu leve a verdade.",
      "Onde houver desespero, que eu leve a esperança.",
      "Onde houver tristeza, que eu leve a alegria.",
      "Onde houver trevas, que eu leve a luz.",
      "Ó Mestre, fazei que eu procure mais consolar que ser consolado;",
      "compreender, que ser compreendido; amar, que ser amado.",
      "Pois é dando que se recebe, é perdoando que se é perdoado,",
      "e é morrendo que se vive para a vida eterna. Amém."
    ]
  },
  {
    id: "salve-rainha",
    name: "Salve Rainha",
    phrases: [
      "Salve Rainha, Mãe de misericórdia,",
      "vida, doçura e esperança nossa, salve!",
      "A vós bradamos os degredados filhos de Eva.",
      "A vós suspiramos, gemendo e chorando neste vale de lágrimas.",
      "Eia pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei.",
      "E depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre.",
      "Ó clemente, ó piedosa, ó doce sempre Virgem Maria.",
      "Rogai por nós Santa Mãe de Deus. Para que sejamos dignos das promessas de Cristo. Amém."
    ]
  }
];

export const PR_CITIES_100K = [
  "Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", 
  "São José dos Pinhais", "Foz do Iguaçu", "Colombo", "Guarapuava", 
  "Paranaguá", "Araucária", "Toledo", "Apucarana", "Pinhais", "Campo Largo"
];

export const COMMON_NAMES = [
  "Maria", "João", "Diego", "Matheus", "Fernando", 
  "Ana", "Paulo", "Ricardo", "Luiza", "Gabriel",
  "Beatriz", "Lucas", "Julia", "Rafael", "Mariana"
];
