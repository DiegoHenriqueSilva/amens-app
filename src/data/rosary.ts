export type PrayerType = 
  | "sinal_cruz"
  | "credo"
  | "pai_nosso"
  | "ave_maria"
  | "gloria"
  | "jaculatoria"
  | "salve_rainha";

export interface PrayerDefinition {
  id: PrayerType;
  title: string;
  text: string;
  keywords: string[];
}

export const PRAYERS: Record<PrayerType, PrayerDefinition> = {
  sinal_cruz: {
    id: "sinal_cruz",
    title: "Sinal da Cruz",
    text: "Pelo sinal da Santa Cruz, livrai-nos Deus nosso Senhor, dos nossos inimigos. Em nome do Pai, do Filho e do Espírito Santo. Amém.",
    keywords: ["sinal", "santa", "cruz", "livrai-nos", "inimigos", "nome", "pai", "filho", "espírito", "amém"]
  },
  credo: {
    id: "credo",
    title: "Creio",
    text: "Creio em Deus Pai Todo-Poderoso, criador do céu e da terra. E em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria; padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado. Desceu à mansão dos mortos; ressuscitou ao terceiro dia, subiu aos céus; está sentado à direita de Deus Pai Todo-Poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo, na Santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.",
    keywords: ["creio", "deus", "pai", "jesus", "cristo", "espírito", "santo", "virgem", "maria", "crucificado", "ressuscitou", "igreja", "católica", "pecados", "vida", "eterna", "amém"]
  },
  pai_nosso: {
    id: "pai_nosso",
    title: "Pai Nosso",
    text: "Pai nosso que estais nos céus, santificado seja o vosso Nome, venha a nós o vosso Reino, seja feita a vossa vontade assim na terra como no céu. O pão nosso de cada dia nos dai hoje, perdoai-nos as nossas ofensas assim como nós perdoamos a quem nos tem ofendido, e não nos deixeis cair em tentação, mas livrai-nos do Mal. Amém.",
    keywords: ["pai", "nosso", "céus", "santificado", "reino", "vontade", "terra", "céu", "pão", "diário", "ofensas", "perdoamos", "tentação", "livrai-nos", "mal", "amém"]
  },
  ave_maria: {
    id: "ave_maria",
    title: "Ave Maria",
    text: "Ave Maria, cheia de graça, o Senhor é convosco, bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós pecadores, agora e na hora da nossa morte. Amém.",
    keywords: ["ave", "maria", "graça", "senhor", "bendita", "mulheres", "ventre", "jesus", "santa", "mãe", "deus", "pecadores", "agora", "morte", "amém"]
  },
  gloria: {
    id: "gloria",
    title: "Glória ao Pai",
    text: "Glória ao Pai, e ao Filho e ao Espírito Santo. Como era no princípio, agora e sempre. Amém.",
    keywords: ["glória", "pai", "filho", "espírito", "santo", "princípio", "agora", "sempre", "amém"]
  },
  jaculatoria: {
    id: "jaculatoria",
    title: "Ó Meu Jesus",
    text: "Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem.",
    keywords: ["meu", "jesus", "perdoai", "livrai-nos", "fogo", "inferno", "almas", "céu", "precisarem"]
  },
  salve_rainha: {
    id: "salve_rainha",
    title: "Salve Rainha",
    text: "Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva; a vós suspiramos, gemendo e chorando neste vale de lágrimas. Eias, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei; e depois deste desterro nos mostrai Jesus, bendito fruto do vosso ventre, ó clemente, ó piedosa, ó doce sempre Virgem Maria. Rogai por nós, santa Mãe de Deus. Para que sejamos dignos das promessas de Cristo. Amém.",
    keywords: ["salve", "rainha", "misericórdia", "esperança", "eva", "lágrimas", "advogada", "olhos", "jesus", "fruto", "virgem", "maria", "rogai", "mãe", "promessas", "cristo", "amém"]
  }
};

export interface RosaryBead {
  id: string; // Ex: cruz, conta_1, dezena_1_3
  type: "cross" | "large" | "small" | "medal" | "space";
  prayerId: PrayerType;
  label: string; // Ex: "Credo", "1º Mistério"
}

export const ROSARY_SEQUENCE: RosaryBead[] = [
  // Haste inicial
  { id: "haste_cruz", type: "cross", prayerId: "credo", label: "A Cruz (Credo)" },
  { id: "haste_p1", type: "large", prayerId: "pai_nosso", label: "Pai Nosso" },
  { id: "haste_a1", type: "small", prayerId: "ave_maria", label: "Fé" },
  { id: "haste_a2", type: "small", prayerId: "ave_maria", label: "Esperança" },
  { id: "haste_a3", type: "small", prayerId: "ave_maria", label: "Caridade" },
  { id: "haste_g1", type: "space", prayerId: "gloria", label: "Glória" },

  // Laço: Array espalhado pelas 5 dezenas
  ...Array.from({ length: 5 }).flatMap((_, decadeIndex): RosaryBead[] => {
    const mist = decadeIndex + 1;
    const isFirst = decadeIndex === 0;

    return [
      // Medalha central (se for o primeiro) ou conta grande separadora
      { 
        id: `d${mist}_p`, 
        type: isFirst ? "medal" : "large", 
        prayerId: "pai_nosso", 
        label: `${mist}º Mistério - Pai Nosso` 
      },
      
      // 10 Ave Marias
      ...Array.from({ length: 10 }).map((_, aveIndex): RosaryBead => ({
        id: `d${mist}_a${aveIndex + 1}`,
        type: "small",
        prayerId: "ave_maria",
        label: `Ave Maria ${aveIndex + 1}/10`
      })),

      // 1 Glória e 1 Jaculatória ao final da dezena
      { id: `d${mist}_g`, type: "space", prayerId: "gloria", label: "Glória" },
      { id: `d${mist}_j`, type: "space", prayerId: "jaculatoria", label: "Ó meu Jesus" }
    ];
  }),

  // Finalização na mesma medalha inicial ou final
  { id: "final_salve", type: "medal", prayerId: "salve_rainha", label: "Salve Rainha" }
];
