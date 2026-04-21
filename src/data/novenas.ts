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
    petition?: string;
  };
  days: NovenaDay[];
  type?: "standard" | "mercy" | "michael";
}

export const UNIVERSAL_PRAYERS = {
  opening: "Pelo sinal da Santa Cruz, livrai-nos, Deus, nosso Senhor, dos nossos inimigos. Em nome do Pai, do Filho e do Espírito Santo. Amém.",
  contrition: "Meu Deus, eu me arrependo de todo o coração de vos ter ofendido, porque sois infinitamente bom. Prometo, com o auxílio da vossa graça, esforçar-me para não mais pecar. Amém.",
  common: `Pai Nosso: "Pai nosso que estais nos céus, santificado seja o vosso nome, venha a nós o vosso reino, seja feita a vossa vontade assim na terra como no céu. O pão nosso de cada dia nos dai hoje, perdoai-nos as nossas ofensas assim como nós perdoamos a quem nos tem ofendido, e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém."\n\nAve Maria (Rezar 3 vezes): "Ave Maria, cheia de graça, o Senhor é convosco, bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós pecadores, agora e na hora da nossa morte. Amém."\n\nGlória ao Pai: "Glória ao Pai, ao Filho e ao Espírito Santo. Como era no princípio, agora e sempre. Amém."`,
  blessing: "O Senhor nos abençoe, nos livre de todo o mal e nos conduza à vida eterna. Amém. Em nome do Pai, do Filho e do Espírito Santo. Amém."
};

export const NOVENAS: Novena[] = [
  {
    id: "ns-desatadora",
    name: "Desatadora dos Nós",
    focus: "Problemas difíceis e paz familiar",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/15/Mary%2C_Untier_of_Knots_by_Schmidtner.png",
    colors: { from: "#2563eb", to: "#60a5fa" },
    prayers: {
      initial: "Santa Maria, cheia da presença de Deus, durante os dias de tua vida aceitaste com toda a humildade a vontade do Pai, e o maligno nunca foi capaz de envolver-te com suas confusões. Junto a Teu Filho intercedeste por nossas dificuldades e, com toda a paciência, nos deste o exemplo de como desenrolar as linhas de nossa vida. E, ao se dar para sempre como nossa Mãe, pões em ordem e fazes mais claros os laços que nos unem ao Senhor. Santa Maria, Mãe de Deus e nossa Mãe, Tu que com o coração materno desatas os nós que atrapalham nossa vida, te pedimos que recebas em tuas mãos este nó [pedir a graça aqui] e que me livres das amarras e confusões com que me castiga aquele que é meu inimigo. Amém.",
      final: "Virgem Maria, Mãe do belo amor, Mãe que jamais deixa de vir em socorro de um filho aflito. Lança teu olhar compassivo sobre mim, vê o emaranhado de nós que há em minha vida. Tu bem conheces o meu desespero, a minha dor e o quanto estou amarrado por causa destes nós. Maria, Mãe a quem Deus encarregou de desatar os nós da vida de seus filhos, confio hoje a fita da minha vida em tuas mãos. Ninguém, nem mesmo o maligno poderá tirá-la do teu precioso amparo materno. Em tuas mãos não há nó que não poderá ser desfeito. Maria, Desatadora dos Nós, rogai por nós! Amém."
    },
    days: [
      { 
        day: 1, 
        title: "O nó da desobediência", 
        reading: "Gênesis 3, 15", 
        content: '"Porei inimizade entre ti e a mulher, entre a tua descendência e a dela. Esta te ferirá a cabeça e tu lhe ferirás o calcanhar."\n\nMeditação: "Hoje, trago-te este nó da desobediência e do pecado em minha vida. Mãe, por causa da desobediência de Eva, o pecado entrou no mundo. Mas pela tua obediência, a salvação chegou a nós. Ensina-me a ser obediente à vontade de Deus, desatando o nó do meu orgulho."' 
      },
      { 
        day: 2, 
        title: "O nó das mágoas e ressentimentos", 
        reading: "Mateus 6, 14-15", 
        content: '"Porque, se perdoardes aos homens as suas ofensas, vosso Pai celeste também vos perdoará. Mas, se não perdoardes aos homens, tampouco vosso Pai vos perdoará."\n\nMeditação: "Mãe amável, hoje trago o nó das mágoas, do rancor e da falta de perdão que aprisionam o meu coração. Peço-te que desates esse nó que me impede de amar. Dá-me a graça de perdoar a todos que me ofenderam, para que a paz de Cristo reine em minha vida."' 
      },
      { 
        day: 3, 
        title: "O nó da falta de paz na família", 
        reading: "Colossenses 3, 13-14", 
        content: '"Suportai-vos uns aos outros e perdoai-vos mutuamente, se um tiver queixa contra o outro. Como o Senhor vos perdoou, assim perdoai vós também. Mas, acima de tudo, revesti-vos da caridade, que é o vínculo da perfeição."\n\nMeditação: "Mãe Desatadora dos Nós, apresento-te hoje os nós que estão destruindo a minha família e os meus relacionamentos. Tu que és a Rainha da Paz, desata os nós das brigas, da incompreensão e da desunião. Que a nossa casa seja um refúgio de amor e respeito."' 
      },
      { 
        day: 4, 
        title: "O nó dos problemas financeiros", 
        reading: "Filipenses 4, 19", 
        content: '"O meu Deus proverá a todas as vossas necessidades, segundo a sua gloriosa riqueza, em Cristo Jesus."\n\nMeditação: "Mãe provendente, entrego em tuas mãos os nós da minha vida financeira, das dívidas e da falta de trabalho. Desata as amarras da aflição e da miséria. Ajuda-me a encontrar caminhos justos e abençoados para sustentar minha família com dignidade."' 
      },
      { 
        day: 5, 
        title: "O nó das doenças", 
        reading: "Tiago 5, 14-15", 
        content: '"Alguém entre vós está doente? Mande chamar os presbíteros da Igreja, para que orem sobre ele e o unjam com óleo no nome do Senhor. A oração da fé salvará o doente, e o Senhor o levantará."\n\nMeditação: "Nossa Senhora, Saúde dos Enfermos, trago-te hoje os nós das doenças que afligem o meu corpo e a minha alma, ou de pessoas que eu amo. Desata esse nó de dor. Que a cura de Jesus flua sobre nós, restaurando nossa saúde e nossas forças para continuarmos a servir."' 
      },
      { 
        day: 6, 
        title: "O nó da depressão e da angústia", 
        reading: "Salmo 34, 17-18", 
        content: '"Os justos clamam, e o Senhor os ouve; livra-os de todas as suas angústias. O Senhor está perto dos que têm o coração quebrantado e salva os de espírito abatido."\n\nMeditação: "Mãe de Misericórdia, olha para os nós da tristeza profunda, da depressão e da ansiedade que sufocam a minha mente. Afasta de mim todo sentimento de abandono e desesperança. Traz para a minha vida a luz do Espírito Santo e a alegria de viver."' 
      },
      { 
        day: 7, 
        title: "O nó dos vícios", 
        reading: "Romanos 6, 12-14", 
        content: '"Portanto, não reine o pecado em vosso corpo mortal, de modo que obedeçais às suas paixões. O pecado não terá domínio sobre vós, porque não estais debaixo da lei, mas debaixo da graça."\n\nMeditação: "Mãe Libertadora, coloco em tuas mãos os terríveis nós dos vícios (álcool, drogas, impurezas, jogos ou qualquer outra dependência) que destroem vidas. Rompe essas correntes diabólicas! Que a graça do teu Filho me liberte e me purifique inteiramente."' 
      },
      { 
        day: 8, 
        title: "O nó da solidão", 
        reading: "Isaías 41, 10", 
        content: '"Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel."\n\nMeditação: "Mãe consoladora, rogo que desates os nós da solidão, do abandono e do medo intenso do que está por vir. Ensina-me a confiar cegamente na providência de Deus, sabendo que nunca estou sozinho, pois tu caminhas sempre ao meu lado."' 
      },
      { 
        day: 9, 
        title: "Ação de graças e consagração", 
        reading: "Lucas 1, 46-49", 
        content: '"Minha alma glorifica ao Senhor, e meu espírito exulta de alegria em Deus, meu Salvador, porque olhou para a humilhação de sua serva. Doravante todas as gerações me chamarão bem-aventurada, porque o Todo-poderoso fez grandes coisas em meu favor."\n\nMeditação: "Mãe admirável, hoje chego ao fim desta novena não para pedir, mas para agradecer. Agradeço por estares desatando todos os nós da minha vida. Consagro a ti o meu coração, a minha família e o meu futuro. Abriga-me sob o teu manto de amor, hoje e sempre."' 
      }
    ]
  },
  {
    id: "sao-judas",
    name: "São Judas Tadeu",
    focus: "Causas impossíveis e desesperadas",
    image: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Saint_Judas_Thaddeus.jpg",
    colors: { from: "#15803d", to: "#22c55e" },
    prayers: {
      initial: "São Judas, glorioso Apóstolo, fiel servo e amigo de Jesus! A Igreja vos honra e invoca universalmente como o padroeiro dos casos desesperados, dos negócios sem remédio. Rogai por mim, que sou tão miserável. Imploro vosso auxílio imediato onde o socorro desapareceu quase por completo.",
      petition: "São Judas Tadeu, intercedei por mim nesta necessidade urgente. (Faça o pedido).",
      final: "Eu vos prometo, ó bendito São Judas, lembrar-me sempre deste grande favor, e nunca deixar de vos honrar como meu especial e poderoso patrono, e fazer tudo o que estiver ao meu alcance para incentivar a devoção para convosco. Amém."
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
    type: "mercy",
    prayers: {
      initial: "Deus, Pai Misericordioso, que revelaste o Teu amor no Teu Filho Jesus Cristo e o derramaste sobre nós no Espírito Santo Consolador, confiamos-Te hoje o destino do mundo e de cada homem.",
      petition: "Pai Eterno, eu Vos ofereço o Corpo e Sangue, Alma e Divindade de Vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e do mundo inteiro.\n\n(Repetir 10x): Pela Sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.",
      final: "Deus Santo, Deus Forte, Deus Imortal, tende piedade de nós e do mundo inteiro. (3 vezes). Jesus, eu confio em Vós!"
    },
    days: [
      { day: 1, title: "Toda a humanidade", reading: "", content: "Hoje traze-me a humanidade inteira e mergulha-a no mar da Minha misericórdia." },
      { day: 2, title: "Sacerdotes", reading: "", content: "Hoje traze-me as almas dos sacerdotes e religiosos e mergulha-as na Minha insondável misericórdia." },
      { day: 3, title: "Almas fiéis", reading: "", content: "Hoje traze-me todas as almas piedosas e fiéis e mergulha-as no oceano da Minha misericórdia." },
      { day: 4, title: "Pagãos", reading: "", content: "Hoje traze-me os pagãos e aqueles que ainda não Me conhecem." },
      { day: 5, title: "Afastados", reading: "", content: "Hoje traze-me as almas dos que se afastaram da Minha Igreja." },
      { day: 6, title: "Almas mansas", reading: "", content: "Hoje traze-me as almas mansas e humildes e as almas das criancinhas." },
      { day: 7, title: "Veneradores", reading: "", content: "Hoje traze-me as almas que veneram e glorificam de maneira especial a Minha misericórdia." },
      { day: 8, title: "Almas do purgatório", reading: "", content: "Hoje traze-me as almas que se encontram na prisão do purgatório." },
      { day: 9, title: "Almas tíbias", reading: "", content: "Hoje traze-me as almas tíbias e mergulha-as no abismo da Minha misericórdia." }
    ]
  },
  {
    id: "santa-rita",
    name: "Santa Rita",
    focus: "Causas impossíveis e pacificação",
    image: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Santa_Rita_Cascia.jpg",
    colors: { from: "#7e22ce", to: "#a855f7" },
    prayers: {
      initial: "Ó poderosa e gloriosa Santa Rita, chamada Santa das causas impossíveis, advogada dos casos desesperados, refúgio na dor. Venho a vós com confiança, esperando alcançar a graça de que tanto necessito.",
      petition: "Pelo vosso sofrimento e pela vossa obediência a Deus, ajudai-me a carregar a minha cruz. (Faça o pedido).",
      final: "Alcançai-me a graça que vos peço, se for para a glória de Deus e salvação de minha alma. Ó Deus, que concedestes a Santa Rita a graça de amar os inimigos e de trazer na fronte os sinais da vossa paixão, concedei-nos a graça de perdoar e de sofrer por vosso amor. Por Cristo nosso Senhor. Amém."
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
      initial: "Ó glorioso Patriarca São Bento, que vos mostrastes sempre compassivo com os necessitados, fazei que também nós, recorrendo à vossa poderosa intercessão, obtenhamos socorro em todas as nossas aflições.",
      petition: "São Bento, protegei minha família de todo o mal e intercedei por esta graça que vos peço. (Faça o pedido).",
      final: "A Cruz Sagrada seja a minha luz, não seja o dragão o meu guia. Retira-te, satanás! Nunca me aconselhes coisas vãs. É mau o que tu me ofereces, bebe tu mesmo os teus venenos! São Bento, rogai por nós. Amém."
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
    type: "michael",
    prayers: {
      initial: "São Miguel Arcanjo, defendei-nos no combate, sede o nosso refúgio contra as maldades e ciladas do demônio. Ordene-lhe Deus, instantemente o pedimos, e vós, príncipe da milícia celeste, pelo poder divino, precipitai no inferno a satanás e a todos os espíritos malignos que andam pelo mundo para perder as almas.",
      petition: "São Miguel, protegei-me nas batalhas deste dia e alcançai-me de Deus a graça que vos suplico. (Faça o pedido).",
      final: "Glorioso São Miguel, chefe e príncipe dos exércitos celestes, fiel guardião das almas, vencedor dos espíritos rebeldes. Vinde, ó Príncipe Santíssimo, socorrei-me em minhas necessidades. Amém."
    },
    days: [
      { day: 1, title: "Serafins", reading: "", content: "Saudação ao Coro dos Serafins: Que o amor de Deus consuma todas as nossas impurezas." },
      { day: 2, title: "Querubins", reading: "", content: "Saudação ao Coro dos Querubins: Que o Senhor nos conceda a graça de abandonar o caminho do pecado." },
      { day: 3, title: "Tronos", reading: "", content: "Saudação ao Coro dos Tronos: Que o Senhor derrame em nossos corações o espírito de verdadeira humildade." },
      { day: 4, title: "Dominações", reading: "", content: "Saudação ao Coro das Dominações: Que o Senhor nos conceda a graça de dominar nossos sentidos." },
      { day: 5, title: "Potestades", reading: "", content: "Saudação ao Coro das Potestades: Protegei nossas almas contra as ciladas e as tentações do demônio." },
      { day: 6, title: "Virtudes", reading: "", content: "Saudação ao Coro das Virtudes: Que o Senhor nos dê força para obedecer seus mandamentos." },
      { day: 7, title: "Principados", reading: "", content: "Saudação ao Coro dos Principados: Encha nossas almas do espírito de verdadeira obediência e serviço." },
      { day: 8, title: "Arcanjos", reading: "", content: "Saudação ao Coro dos Arcanjos: Conceda-nos o dom da perseverança na fé e nas boas obras." },
      { day: 9, title: "Anjos", reading: "", content: "Saudação ao Coro dos Anjos: Que sejamos conduzidos pelos anjos à glória eterna de Deus. Amém." }
    ]
  }
];
