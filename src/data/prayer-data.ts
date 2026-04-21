export interface Prayer {
  id: string;
  name: string;
  phrases: string[];
}

export const PHRASE_DURATION = 4500; // 4.5 seconds per phrase
export const PRAYER_GAP = 4500; // 4.5 seconds between prayers


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
  },
  {
    id: "creio",
    name: "Creio em Deus Pai",
    phrases: [
      "Creio em Deus Pai Todo-Poderoso, Criador do céu e da terra,",
      "e em Jesus Cristo, seu único Filho, nosso Senhor,",
      "que foi concebido pelo poder do Espírito Santo,",
      "nasceu da Virgem Maria, padeceu sob Pôncio Pilatos,",
      "foi crucificado, morto e sepultado,",
      "desceu à mansão dos mortos, ressuscitou ao terceiro dia,",
      "subiu aos céus, está sentado à direita de Deus Pai Todo-Poderoso,",
      "donde há de vir a julgar os vivos e os mortos.",
      "Creio no Espírito Santo, na Santa Igreja Católica,",
      "na comunhão dos Santos, na remissão dos pecados,",
      "na ressurreição da carne, na vida eterna. Amém."
    ]
  },
  {
    id: "sao-jose",
    name: "Oração de São José",
    phrases: [
      "Ó glorioso São José, a quem foi dado o poder de tornar possíveis as coisas impossíveis,",
      "vinde em nosso auxílio nas dificuldades em que nos achamos.",
      "Tomai sob a vossa proteção a causa importante que vos confiamos,",
      "para que tenha uma solução favorável. Ó Pai amado,",
      "toda a nossa confiança está colocada em vós. Que não se diga que vos invocamos em vão.",
      "Vós que tudo podeis junto a Jesus e Maria, mostrai-nos que a vossa bondade é igual ao vosso poder. Amém."
    ]
  }
];

export const TOTAL_CYCLE_TIME = PRAYERS.reduce((acc, p) => 
  acc + (p.phrases.length * PHRASE_DURATION) + PRAYER_GAP, 0
);

export const BR_CITIES_200K = [
  "São Paulo", "Rio de Janeiro", "Brasília", "Fortaleza", "Salvador", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Goiânia",
  "Belém", "Porto Alegre", "Guarulhos", "Campinas", "São Luís", "São Gonçalo", "Maceió", "Duque de Caxias", "Campo Grande", "Natal",
  "Teresina", "São Bernardo do Campo", "Nova Iguaçu", "João Pessoa", "São José dos Campos", "Santo André", "Ribeirão Preto",
  "Jaboatão dos Guararapes", "Osasco", "Uberlândia", "Sorocaba", "Contagem", "Aracaju", "Feira de Santana", "Cuiabá", "Joinville",
  "Aparecida de Goiânia", "Londrina", "Juiz de Fora", "Ananindeua", "Porto Velho", "Niterói", "Belford Roxo", "Serra", "Caxias do Sul",
  "Macapá", "Florianópolis", "Vila Velha", "Mauá", "São João de Meriti", "São José do Rio Preto", "Mogi das Cruzes", "Betim",
  "Santos", "Diadema", "Maringá", "Jundiaí", "Campina Grande", "Montes Claros", "Piracicaba", "Carapicuíba", "Olinda", "Cariacica",
  "Rio Branco", "Anápolis", "Bauru", "Vitória", "Caucaia", "Itaquaquecetuba", "São Vicente", "Pelotas", "Canoas", "Franca",
  "Ponta Grossa", "Blumenau", "Petrolina", "Paulista", "Ribeirão das Neves", "Uberaba", "Boa Vista", "Cascavel", "Guarujá"
];

export const COMMON_NAMES = [
  "Maria", "João", "Diego", "Matheus", "Fernando", 
  "Ana", "Paulo", "Ricardo", "Luiza", "Gabriel",
  "Beatriz", "Lucas", "Julia", "Rafael", "Mariana",
  "Pedro", "Tiago", "André", "Felipe", "Bartholomeu",
  "Tomé", "Mateus", "Simão", "Judas", "Matias",
  "Isabel", "Marta", "Verônica", "Inês", "Clara",
  "Tereza", "Rita", "Lúcia", "Cecília", "Mônica",
  "Benedito", "Expedito", "Jorge", "Sebastião", "Lázaro",
  "Francisco", "Antônio", "José", "Carlos", "Roberto"
];
