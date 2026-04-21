export interface NovenaDay {
  day: number;
  title: string;
  reading: string;
  content: string;
}

export interface Novena {
  id: string;
  name: string;
  focus: string;
  image: string;
  colors: {
    from: string;
    to: string;
  };
  prayers: {
    initial: string;
    final: string;
  };
  days: NovenaDay[];
}

export const NOVENAS: Novena[] = [
  {
    id: "ns-desatadora",
    name: "Desatadora dos Nós",
    focus: "Problemas difíceis e paz familiar",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/15/Mary%2C_Untier_of_Knots_by_Schmidtner.png",
    colors: { from: "#2563eb", to: "#60a5fa" },
    prayers: {
      initial: "Sinal da Cruz. Fazer o Ato de Contrição.\n\n\"Santa Maria, cheia da presença de Deus, durante os dias de tua vida aceitaste com toda a humildade a vontade do Pai, e o maligno nunca foi capaz de envolver-te com suas confusões...\"",
      final: "\"Virgem Maria, Mãe do belo amor, Mãe que jamais deixa de vir em socorro de um filho aflito... Maria, Desatadora dos Nós, rogai por nós! Amém.\""
    },
    days: [
      { day: 1, title: "O nó da desobediência", reading: "Gênesis 3, 15", content: "Mãe amada, ajuda-me a desatar o nó dos meus pecados que me afastam de Deus." },
      { day: 2, title: "O nó das mágoas", reading: "Mateus 6, 14-15", content: "Maria, desata o nó das mágoas acumuladas. Ajuda-me a perdoar de coração." },
      { day: 3, title: "A falta de paz", reading: "Colossenses 3, 13-15", content: "Mãe querida, desata os nós da incompreensão e da discórdia em meu lar." },
      { day: 4, title: "Problemas financeiros", reading: "Filipenses 4, 19", content: "Mãe da Providência, desata o nó das dívidas e do medo do futuro." },
      { day: 5, title: "Doenças", reading: "Tiago 5, 14-15", content: "Saúde dos enfermos, desata o nó da enfermidade que aflige meu corpo ou alma." },
      { day: 6, title: "Depressão e medo", reading: "Salmo 34, 17-18", content: "Consoladora dos aflitos, desata o nó da tristeza profunda e da ansiedade." },
      { day: 7, title: "Vícius", reading: "Romanos 6, 12-14", content: "Refúgio dos pecadores, desata o nó das dependências que escravizam a vontade." },
      { day: 8, title: "Solidão", reading: "Isaías 41, 10", content: "Mãe de todos nós, desata o nó da solidão. Faz-me sentir que nunca estou sozinho." },
      { day: 9, title: "Ação de graças", reading: "Lucas 1, 46-55", content: "Agradeço por todos os nós desatados em minha vida, visíveis e invisíveis." }
    ]
  },
  {
    id: "sao-judas",
    name: "São Judas Tadeu",
    focus: "Causas impossíveis e desesperadas",
    image: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Saint_Judas_Thaddeus.jpg",
    colors: { from: "#15803d", to: "#22c55e" },
    prayers: {
      initial: "\"São Judas, glorioso Apóstolo, fiel servo e amigo de Jesus, o padroeiro dos casos desesperados...\"",
      final: "\"Eu vos prometo, ó bendito São Judas, lembrar-me sempre deste grande favor. Amém.\""
    },
    days: [
      { day: 1, title: "Vocação", reading: "Mateus 4, 18-22", content: "Ajuda-me a ter coragem para responder à vontade de Deus em minha vida." },
      { day: 2, title: "Força da fé", reading: "Marcos 11, 22-24", content: "Ensina-me a confiar no poder de Deus mesmo quando as circunstâncias parecem contrárias." },
      { day: 3, title: "Amor ao próximo", reading: "João 15, 12-17", content: "Ajuda-me a ver o rosto do Cristo em meus irmãos, especialmente nos que sofrem." },
      { day: 4, title: "Paciência", reading: "Romanos 5, 3-5", content: "Dá-me a paciência necessária para suportar as provas da vida com dignidade." },
      { day: 5, title: "Esperança", reading: "Romanos 8, 24-25", content: "Que a esperança seja minha luz. Intercede para que eu nunca desista de lutar pelo bem." },
      { day: 6, title: "Humildade", reading: "Filipenses 2, 3-8", content: "Livra-me do orgulho e da vaidade. Ensina-me que a verdadeira grandeza está em servir." },
      { day: 7, title: "Misericórdia", reading: "Hebreus 4, 14-16", content: "Aproxima-me do trono da graça. Que eu nunca duvide do perdão de Deus." },
      { day: 8, title: "Oração", reading: "Lucas 18, 1-8", content: "Ajuda-me a orar sem cessar e com confiança filial, sabendo que o Pai me escuta." },
      { day: 9, title: "Glória celestial", reading: "Apocalipse 21, 1-4", content: "Que minha jornada terrena seja santa e que eu possa um dia cantar as maravilhas do Senhor." }
    ]
  },
  {
    id: "divina-misericordia",
    name: "Divina Misericórdia",
    focus: "Salvação das almas e confiança",
    image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Kazimirowski_Eugeniusz%2C_Divine_Mercy_1934.jpg",
    colors: { from: "#dc2626", to: "#f87171" },
    prayers: {
      initial: "\"Deus, Pai Misericordioso, confiamos-Te hoje o destino do mundo e de cada homem...\"",
      final: "\"Jesus, eu confio em Vós!\""
    },
    days: [
      { day: 1, title: "Toda a humanidade", reading: "Mateus 25, 40", content: "Mergulha a humanidade inteira no oceano da Minha misericórdia." },
      { day: 2, title: "Sacerdotes", reading: "João 17, 17-19", content: "Traz-me as almas dos sacerdotes e religiosos e mergulha-as na Minha misericórdia." },
      { day: 3, title: "Almas fiéis", reading: "João 15, 9-11", content: "Traz-me todas as almas piedosas e fiéis e mergulha-as no oceano da Minha misericórdia." },
      { day: 4, title: "Pagãos", reading: "Marcos 16, 15", content: "Traz-me os pagãos e aqueles que ainda não Me conhecem." },
      { day: 5, title: "Afastados", reading: "João 10, 16", content: "Traz-me as almas dos que se afastaram da Minha Igreja." },
      { day: 6, title: "Almas mansas", reading: "Mateus 11, 29", content: "Traz-me as almas mansas e humildes e as almas das criancinhas." },
      { day: 7, title: "Veneradores", reading: "Efésios 2, 4-7", content: "Traz-me as almas que veneram e glorificam de maneira especial a Minha misericórdia." },
      { day: 8, title: "Almas do purgatório", reading: "2 Macabeus 12, 46", content: "Traz-me as almas que se encontram na prisão do purgatório." },
      { day: 9, title: "Almas tíbias", reading: "Apocalipse 3, 15-16", content: "Traz-me as almas tíbias e mergulha-as no abismo da Minha misericórdia." }
    ]
  },
  {
    id: "santa-rita",
    name: "Santa Rita",
    focus: "Causas impossíveis e pacificação",
    image: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Santa_Rita_Cascia.jpg",
    colors: { from: "#7e22ce", to: "#a855f7" },
    prayers: {
      initial: "\"Ó poderosa Santa Rita, advogada dos casos desesperados, recorro a vós no caso difícil...\"",
      final: "\"Santa Rita, rogai por nós! Amém.\""
    },
    days: [
      { day: 1, title: "Perdão", reading: "Mateus 5, 43-48", content: "Dá-me a força para perdoar os que me ofenderam, assim como tu perdoaste." },
      { day: 2, title: "Família", reading: "Efésios 5, 21-33", content: "Que haja diálogo, respect amor verdadeiro entre os esposos." },
      { day: 3, title: "Consolo", reading: "Mateus 5, 4", content: "Consola os que hoje choram a ausência de seus entes queridos." },
      { day: 4, title: "Persistência", reading: "Salmo 27, 4", content: "Ensina-me a ser persistente em meus bons propósitos e a buscar a vontade do Pai." },
      { day: 5, title: "Humildade", reading: "1 Pedro 5, 5-7", content: "Ajuda-me a ser humilde de coração, reconhecendo que tudo vem da bondade divina." },
      { day: 6, title: "Aceitação", reading: "Colossenses 1, 24", content: "Dá-me a graça de não reclamar dos meus sofrimentos, mas de oferecê-los a Jesus." },
      { day: 7, title: "Eucaristia", reading: "João 6, 51-58", content: "Intercede para que eu tenha um amor ardente pelo Pão do Céu." },
      { day: 8, title: "Enfermos", reading: "Marcos 6, 53-56", content: "Olha para os que hoje sofrem no corpo e no espírito. Que a saúde lhes seja restaurada." },
      { day: 9, title: "Fidelidade", reading: "2 Timóteo 4, 7-8", content: "Ajuda-me a ser fiel até o fim, para que possa cantar as glórias de Deus contigo." }
    ]
  },
  {
    id: "sao-bento",
    name: "São Bento",
    focus: "Proteção contra o mal e paz",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Benedict_of_Nursia.jpg",
    colors: { from: "#3d2b1f", to: "#8b6508" },
    prayers: {
      initial: "\"Ó glorioso Patriarca São Bento, afastai de nós todas as ciladas do inimigo...\"",
      final: "\"A Cruz Sagrada seja a minha luz... São Bento, rogai por nós! Amém.\""
    },
    days: [
      { day: 1, title: "Escutar", reading: "Provérbios 1, 33", content: "Ajuda-me a silenciar as vozes do mundo para escutar o que o Senhor deseja dizer." },
      { day: 2, title: "Renúncia", reading: "Efésios 6, 10-12", content: "Protege-me de todo mal. Que eu tenha coragem de renunciar ao que me afasta da luz." },
      { day: 3, title: "Trabalho", reading: "1 Tessalonicenses 5, 16-18", content: "Ensina-me a equilibrar minha vida entre a oração e o trabalho." },
      { day: 4, title: "Acolhimento", reading: "Hebreus 13, 1-2", content: "Abre meu coração para acolher o próximo com bondade, vendo em cada um a face do Mestre." },
      { day: 5, title: "Pequenez", reading: "Lucas 14, 11", content: "Livra-me do desejo de ser exaltado. Que eu me alegre em ser pequeno aos olhos dos homens." },
      { day: 6, title: "Silêncio", reading: "Lamentações 3, 26-28", content: "Ajuda-me a cultivar momentos de silêncio interior, onde Deus possa habitar." },
      { day: 7, title: "Docilidade", reading: "João 14, 21", content: "Intercede para que eu tenha um coração dócil às inspirações do Espírito Santo." },
      { day: 8, title: "Paz profunda", reading: "João 14, 27", content: "Ajuda-me a encontrar a paz profunda que vem da amizade com Deus." },
      { day: 9, title: "Sinal de salvação", reading: "Gálatas 6, 14", content: "Que o sinal da nossa redenção me proteja sempre e me guie para a pátria celestial." }
    ]
  },
  {
    id: "sao-miguel",
    name: "São Miguel",
    focus: "Combate espiritual e proteção",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/df/Saint_Michael_the_Archangel_by_Cesare_Dandini.jpg",
    colors: { from: "#1e3a8a", to: "#3b82f6" },
    prayers: {
      initial: "\"São Miguel Arcanjo, defendei-nos no combate, sede o nosso refúgio contra o demônio...\"",
      final: "\"São Miguel, com vossa luz, iluminai-nos. Com vossas asas, protegei-nos. Amém.\""
    },
    days: [
      { day: 1, title: "Caridade", reading: "Isaías 6, 1-3", content: "Que o amor de Deus consuma todas as nossas impurezas." },
      { day: 2, title: "Sabedoria", reading: "Salmo 80, 1-2", content: "Que o Senhor nos conceda a graça de abandonar o caminho do pecado." },
      { day: 3, title: "Humildade", reading: "Colossenses 1, 15-16", content: "Que o Senhor derrame em nossos corações o espírito de verdadeira humildade." },
      { day: 4, title: "Temperança", reading: "Efésios 1, 20-21", content: "Que o Senhor nos conceda a graça de dominar nossos sentidos." },
      { day: 5, title: "Proteção", reading: "1 Pedro 3, 22", content: "Protegei nossas almas contra as ciladas e as tentações do demônio." },
      { day: 6, title: "Obediência", reading: "Salmo 103, 20-21", content: "Que o Senhor nos dê força para obedecer seus mandamentos." },
      { day: 7, title: "Honra", reading: "Efésios 3, 9-10", content: "Encha nossas almas do espírito de verdadeira obediência e serviço." },
      { day: 8, title: "Perseverança", reading: "Judas 1, 9", content: "Conceda-nos o dom da perseverança na fé e nas boas obras." },
      { day: 9, title: "Glória", reading: "Salmo 91, 11-12", content: "Que sejamos conduzidos pelos anjos à glória eterna de Deus. Amém." }
    ]
  }
];
