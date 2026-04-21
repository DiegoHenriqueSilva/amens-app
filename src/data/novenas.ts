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
  prayers: {
    initial: string;
    final: string;
  };
  days: NovenaDay[];
}

export const NOVENAS: Novena[] = [
  {
    id: "desatadora",
    name: "Nossa Senhora Desatadora dos Nós",
    focus: "Resolução de problemas difíceis e paz familiar",
    image: "https://images.unsplash.com/photo-1548625361-0026e6378e90?q=80&w=800&auto=format&fit=crop",
    prayers: {
      initial: "Sinal da Cruz. Fazer o Ato de Contrição.\n\n\"Santa Maria, cheia da presença de Deus, durante os dias de tua vida aceitaste com toda a humildade a vontade do Pai, e o maligno nunca foi capaz de envolver-te com suas confusões. Já junto a Teu Filho, intercedeste por nossas dificuldades e, com toda paciência e amor, nos deste exemplo de como desenrolar as linhas de nossa vida.\n\nAo permaneceres para sempre como nossa Mãe, pões em ordem e fazes mais claros os laços que nos unem ao Senhor.\n\nSanta Maria, Mãe de Deus e nossa Mãe, tu que com coração materno desatas os nós que entravam nossa vida, te pedimos: recebe em tuas mãos este nó (fazer o pedido) e livra-nos das amarras e confusões com que nos fustiga aquele que é nosso inimigo.\"",
      final: "\"Virgem Maria, Mãe do belo amor, Mãe que jamais deixa de vir em socorro de um filho aflito, Mãe cujas mãos não param nunca de servir seus amados filhos, pois são movidas pelo amor divino e pela imensa misericórdia que transborda de teu coração, volta teu olhar compassivo sobre mim e vê o emaranhado de nós que há em minha vida. Tu conheces o meu desespero, a minha dor e o quanto estou amarrado por causa destes nós.\n\nMaria, Mãe a quem Deus encarregou de desatar os nós da vida de seus filhos, confio hoje a fita da minha vida em tuas mãos. Ninguém, nem mesmo o maligno, poderá tirá-la do teu precioso amparo. Em tuas mãos não há nó que não poderá ser desatado.\n\n(Rezar 3 Ave-Marias). Maria, Desatadora dos Nós, rogai por nós! Amém.\""
    },
    days: [
      {
        day: 1,
        title: "O nó da desobediência e do pecado",
        reading: "Gênesis 3, 15",
        content: "Neste primeiro dia, pedimos a Maria que desate o nó da nossa desobediência. Assim como Eva atou o nó da desgraça pela incredulidade, Maria o desatou pela fé. Mãe amada, ajuda-me a desatar o nó dos meus pecados que me afastam de Deus."
      },
      {
        day: 2,
        title: "O nó das mágoas e da falta de perdão",
        reading: "Mateus 6, 14-15",
        content: "Maria, desata o nó das mágoas acumuladas. Muitas vezes guardamos ressentimentos que impedem a graça divina de fluir. Ajuda-me a perdoar de coração aqueles que me feriram, para que eu também seja perdoado pelo Pai."
      },
      {
        day: 3,
        title: "O nó da falta de paz na família",
        reading: "Colossenses 3, 13-15",
        content: "Mãe querida, a família é o santuário da vida. Desata os nós da incompreensão, da discórdia e do egoísmo em meu lar. Que a paz de Cristo reine em nossos corações e que possamos viver em harmonia."
      },
      {
        day: 4,
        title: "O nó dos problemas financeiros e desemprego",
        reading: "Filipenses 4, 19",
        content: "Mãe da Providência, tu sabes das nossas necessidades materiais. Desata o nó das dívidas, da falta de recursos e do medo do futuro. Confiamos que o Senhor suprirá todas as nossas necessidades segundo a sua riqueza em glória."
      },
      {
        day: 5,
        title: "O nó das doenças físicas e espirituais",
        reading: "Tiago 5, 14-15",
        content: "Saúde dos enfermos, desata o nó da enfermidade que aflige meu corpo ou minha alma. Intercede por mim para que a força curadora de Jesus me restaure e me dê paciência para carregar minha cruz."
      },
      {
        day: 6,
        title: "O nó da depressão e do medo",
        reading: "Salmo 34, 17-18",
        content: "Consoladora dos aflitos, desata o nó da tristeza profunda e da ansiedade. Que o Senhor se aproxime de mim, que estou com o coração quebrantado, e me salve da angústia que paralisa minha fé."
      },
      {
        day: 7,
        title: "O nó dos vícios",
        reading: "Romanos 6, 12-14",
        content: "Refúgio dos pecadores, desata o nó das dependências que escravizam a vontade e destroem a dignidade. Liberta-me, Mãe, de tudo aquilo que me impede de ser verdadeiramente livre para amar a Deus."
      },
      {
        day: 8,
        title: "O nó da solidão e do abandono",
        reading: "Isaías 41, 10",
        content: "Mãe de todos nós, desata o nó da solidão. Faz-me sentir que nunca estou sozinho, pois Deus está comigo. Que tua presença materna preencha os vazios do meu coração e me leve ao encontro dos irmãos."
      },
      {
        day: 9,
        title: "Ação de graças pelas graças alcançadas",
        reading: "Lucas 1, 46-55",
        content: "Hoje meu coração se une ao teu no Magnificat. Agradeço por todos os nós desatados em minha vida, visíveis e invisíveis. Que eu seja sempre um instrumento da alegria e da esperança que vem de Deus."
      }
    ]
  },
  {
    id: "sao-judas",
    name: "São Judas Tadeu",
    focus: "Causas impossíveis e desesperadas",
    image: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop",
    prayers: {
      initial: "\"São Judas, glorioso Apóstolo, fiel servo e amigo de Jesus, o nome do traidor foi causa de que fôsseis esquecido por muitos, mas a Igreja vos honra e invoca universalmente como o padroeiro dos casos desesperados, das causas sem remédio. Intercedei por mim, que sou tão miserável; fazei uso, eu vos imploro, desse privilégio particular que vos foi concedido, de trazer viável e imediato auxílio onde o socorro desapareceu quase por completo.\"",
      final: "\"Apressai-vos em me socorrer nesta grande necessidade (fazer o pedido), para que eu possa receber as consolações e o auxílio do céu em todas as minhas precisões, tribulações e sofrimentos, alcançando-me a graça de bendizer a Deus convosco e com todos os eleitos por toda a eternidade.\n\nEu vos prometo, ó bendito São Judas, lembrar-me sempre deste grande favor e nunca deixar de vos honrar como meu especial e poderoso patrono. Amém.\""
    },
    days: [
      {
        day: 1,
        title: "Vocação e seguimento de Cristo",
        reading: "Mateus 4, 18-22",
        content: "São Judas, tu ouviste o chamado do Mestre e deixaste tudo para segui-lo. Ajuda-me a ter a mesma disponibilidade e coragem para responder à vontade de Deus em minha vida cotidiana."
      },
      {
        day: 2,
        title: "A força da fé nos momentos difíceis",
        reading: "Marcos 11, 22-24",
        content: "Apóstolo da esperança, ensina-me a confiar no poder de Deus mesmo quando as circunstâncias parecem contrárias. Que minha fé remova montanhas de medo e dúvida do meu coração."
      },
      {
        day: 3,
        title: "O amor ao próximo",
        reading: "João 15, 12-17",
        content: "Tu que viveste a caridade no convívio com Jesus, ajuda-me a ver o rosto do Cristo em meus irmãos, especialmente nos que sofrem. Que meu amor seja concreto e generoso."
      },
      {
        day: 4,
        title: "A paciência nas tribulações",
        reading: "Romanos 5, 3-5",
        content: "Glorioso São Judas, tu enfrentaste perseguições por causa do Evangelho. Dá-me a paciência necessária para suportar as provas da vida com dignidade e confiança na recompensa eterna."
      },
      {
        day: 5,
        title: "A esperança que não decepciona",
        reading: "Romanos 8, 24-25",
        content: "Nos momentos de escuridão, que a esperança seja minha luz. Intercede para que eu nunca desista de lutar pela verdade e pelo bem, sabendo que Deus caminha ao meu lado."
      },
      {
        day: 6,
        title: "A humildade e o serviço",
        reading: "Filipenses 2, 3-8",
        content: "Tu que foste um servo humilde do Senhor, livra-me do orgulho e da vaidade. Ensina-me que a verdadeira grandeza está em servir com amor e desinteresse."
      },
      {
        day: 7,
        title: "A confiança na misericórdia",
        reading: "Hebreus 4, 14-16",
        content: "São Judas, aproxima-me do trono da graça para que eu alcance misericórdia. Que eu nunca duvide do perdão de Deus e da sua capacidade de restaurar minha vida."
      },
      {
        day: 8,
        title: "A perseverança na oração",
        reading: "Lucas 18, 1-8",
        content: "Muitas vezes me canso de pedir e esperar. Ajuda-me a orar sem cessar e com confiança filial, sabendo que o Pai escuta o clamor de seus filhos."
      },
      {
        day: 9,
        title: "A glória celestial",
        reading: "Apocalipse 21, 1-4",
        content: "Ao concluir esta novena, peço que me prepares um lugar na glória de Deus. Que minha jornada terrena seja santa e que eu possa um dia cantar as maravilhas do Senhor contigo. Amém."
      }
    ]
  },
  {
    id: "divina-misericordia",
    name: "Divina Misericórdia",
    focus: "Salvação das almas e confiança em Jesus",
    image: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop",
    prayers: {
      initial: "\"Deus, Pai Misericordioso, que revelaste o Teu amor no Teu Filho Jesus Cristo e o derramaste sobre nós no Espírito Santo Consolador, confiamos-Te hoje o destino do mundo e de cada homem. Nós Te pedimos: tem piedade de nós e do mundo inteiro.\"\n\n(Rezar um Pai Nosso, uma Ave Maria e o Credo).",
      final: "Rezar o Terço da Misericórdia:\n\nNas contas grandes: \"Eterno Pai, eu Vos ofereço o Corpo e o Sangue, a Alma e a Divindade de Vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e dos do mundo inteiro.\"\n\nNas contas pequenas: \"Pela Sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.\"\n\nAo final (3x): \"Deus Santo, Deus Forte, Deus Imortal, tende piedade de nós e do mundo inteiro. Ó Sangue e Água que jorrastes do Coração de Jesus como fonte de misericórdia para nós, eu confio em Vós!\""
    },
    days: [
      {
        day: 1,
        title: "Pela humanidade inteira",
        reading: "Mateus 25, 40",
        content: "\"Hoje, traz-me a humanidade inteira, especialmente todos os pecadores, e mergulha-os no oceano da Minha misericórdia. Com isso Me consolarás na amarga tristeza em que Me submerge a perda das almas.\""
      },
      {
        day: 2,
        title: "Pelas almas dos sacerdotes e religiosos",
        reading: "João 17, 17-19",
        content: "\"Hoje, traz-me as almas dos sacerdotes e religiosos e mergulha-as na Minha insondável misericórdia. Elas Me deram força para suportar a Minha amarga Paixão; por meio delas, como por canais, corre para a humanidade a Minha misericórdia.\""
      },
      {
        day: 3,
        title: "Pelas almas piedosas e fiéis",
        reading: "João 15, 9-11",
        content: "\"Hoje, traz-me todas as almas piedosas e fiéis e mergulha-as no oceano da Minha misericórdia. Essas almas consolaram-Me no Caminho da Cruz; foram aquela gota de consolação no meio de um mar de amargura.\""
      },
      {
        day: 4,
        title: "Pelos que ainda não conhecem a Jesus",
        reading: "Marcos 16, 15",
        content: "\"Hoje, traz-me os pagãos e aqueles que ainda não Me conhecem. Pensei neles também na Minha amarga Paixão e o seu futuro zelo consolou o Meu Coração. Mergulha-os no oceano da Minha misericórdia.\""
      },
      {
        day: 5,
        title: "Pelas almas dos que se afastaram da Igreja",
        reading: "João 10, 16",
        content: "\"Hoje, traz-me as almas dos que se afastaram da Minha Igreja e mergulha-as no oceano da Minha misericórdia. Na Minha amarga Paixão, elas dilaceravam o Meu Corpo e o Meu Coração – isto é, a Minha Igreja.\""
      },
      {
        day: 6,
        title: "Pelas almas mansas e humildes",
        reading: "Mateus 11, 29",
        content: "\"Hoje, traz-me as almas mansas e humildes e as almas das criancinhas e mergulha-as na Minha misericórdia. Essas almas são as que mais se assemelham ao Meu Coração. Elas fortaleceram-Me na Minha amarga agonia.\""
      },
      {
        day: 7,
        title: "Pelas almas que veneram a misericórdia",
        reading: "Efésios 2, 4-7",
        content: "\"Hoje, traz-me as almas que veneram e glorificam de maneira especial a Minha misericórdia. Essas almas foram as que mais sofreram com a Minha Paixão e penetraram mais profundamente no Meu espírito.\""
      },
      {
        day: 8,
        title: "Pelas almas do purgatório",
        reading: "2 Macabeus 12, 46",
        content: "\"Hoje, traz-me as almas que se encontram na prisão do purgatório e mergulha-as no abismo da Minha misericórdia. Que as torrentes do Meu Sangue refresquem o seu ardor. Todas essas almas são muito amadas por Mim.\""
      },
      {
        day: 9,
        title: "Pelas almas tíbias",
        reading: "Apocalipse 3, 15-16",
        content: "\"Hoje, traz-me as almas tíbias e mergulha-as no abismo da Minha misericórdia. Essas almas ferem mais dolorosamente o Meu Coração. Foi por causa delas que a Minha Alma sentiu uma repugnância terrível no Jardim das Oliveiras.\""
      }
    ]
  },
  {
    id: "santa-rita",
    name: "Santa Rita de Cássia",
    focus: "Causas impossíveis e pacificação familiar",
    image: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop",
    prayers: {
      initial: "\"Ó poderosa e gloriosa Santa Rita, chamada Santa das causas impossíveis, advogada dos casos desesperados, auxiliadora da última hora, refúgio e abrigo na dor que arrasta as almas ao abismo do pecado e da desesperação, com toda a confiança em vosso poder junto ao Sagrado Coração de Jesus, recorro a vós no caso difícil e imprevisto que dolorosamente oprime o meu coração.\"",
      final: "\"Alcançai-me a graça que vos peço (fazer o pedido), se for para a glória de Deus e salvação de minha alma. Pela fidelidade com que aceitastes a cruz em vossa vida, fazei que eu também aceite com amor as provações que Deus me enviar. Santa Rita, rogai por nós! Amém.\""
    },
    days: [
      {
        day: 1,
        title: "O perdão às ofensas",
        reading: "Mateus 5, 43-48",
        content: "Santa Rita, tu que perdoaste os assassinos do teu marido e rezaste pela conversão deles, ajuda-me a desterrar do meu coração qualquer sentimento de vingança. Dá-me a força para perdoar os que me ofenderam."
      },
      {
        day: 2,
        title: "A vida familiar e matrimonial",
        reading: "Efésios 5, 21-33",
        content: "Tu que viveste os desafios do matrimônio com paciência heroica, intercede pelas famílias. Que haja diálogo, respeito e amor verdadeiro entre os esposos, superando as crises com a ajuda de Deus."
      },
      {
        day: 3,
        title: "A dor da perda e o consolo divino",
        reading: "Mateus 5, 4",
        content: "Santa Rita, que sofreste a perda do marido e dos filhos, consola os que hoje choram a ausência de seus entes queridos. Que a esperança da ressurreição seja o bálsamo para as feridas da alma."
      },
      {
        day: 4,
        title: "O desejo de consagração a Deus",
        reading: "Salmo 27, 4",
        content: "Mesmo diante dos obstáculos, nunca desististe do teu chamado para a vida religiosa. Ensina-me a ser persistente em meus bons propósitos e a buscar sempre a vontade do Pai acima de tudo."
      },
      {
        day: 5,
        title: "A obediência e a humildade",
        reading: "1 Pedro 5, 5-7",
        content: "No claustro, deste exemplo de obediência perfeita. Ajuda-me a ser humilde de coração, reconhecendo que tudo o que sou e tenho vem da bondade divina. Que eu saiba escutar e obedecer à voz de Deus."
      },
      {
        day: 6,
        title: "A aceitação do sofrimento",
        reading: "Colossenses 1, 24",
        content: "Levaste na testa o estigma do espinho da Paixão de Cristo. Dá-me a graça de não reclamar dos meus pequenos sofrimentos, mas de oferecê-los em união com Jesus pela salvação do mundo."
      },
      {
        day: 7,
        title: "O amor à Eucaristia",
        reading: "João 6, 51-58",
        content: "A Eucaristia foi tua força e teu sustento. Intercede para que eu tenha um amor ardente pelo Pão do Céu e que nunca me falte o desejo de receber o Corpo de Cristo para caminhar na santidade."
      },
      {
        day: 8,
        title: "A intercessão pelos doentes",
        reading: "Marcos 6, 53-56",
        content: "Santa Rita, que tantos prodígios alcançaste em vida para os enfermos, olha para os que hoje sofrem no corpo e no espírito. Que a saúde lhes seja restaurada se for para o bem de suas almas."
      },
      {
        day: 9,
        title: "A vitória final e a coroa da glória",
        reading: "2 Timóteo 4, 7-8",
        content: "Combateste o bom combate, terminaste a corrida e guardaste a fé. Ajuda-me a ser fiel até o fim, para que eu possa um dia cantar as glórias de Deus contigo na eternidade. Amém."
      }
    ]
  },
  {
    id: "sao-bento",
    name: "São Bento",
    focus: "Proteção contra o mal e paz interior",
    image: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop",
    prayers: {
      initial: "\"Ó glorioso Patriarca São Bento, que vos mostrastes sempre compassivo com os necessitados, fazei que também nós, recorrendo à vossa poderosa intercessão, obtenhamos auxílio em todas as nossas aflições. Que nas famílias reine a paz e a tranquilidade; afastai de nós todas as ciladas do inimigo.\"",
      final: "Oração da Medalha de São Bento:\n\n\"A Cruz Sagrada seja a minha luz, não seja o dragão o meu guia. Retira-te, satanás! Nunca me aconselhes coisas vãs. É mau o que tu me ofereces, bebe tu mesmo os teus venenos!\"\n\nSão Bento, rogai por nós! Amém."
    },
    days: [
      {
        day: 1,
        title: "Escutar a voz de Deus",
        reading: "Provérbios 1, 33",
        content: "São Bento, tu que na solidão da gruta de Subíaco aprendeste a ouvir o silêncio de Deus, ajuda-me a silenciar as vozes do mundo para escutar o que o Senhor deseja me dizer hoje."
      },
      {
        day: 2,
        title: "A renúncia ao mal",
        reading: "Efésios 6, 10-12",
        content: "Pai dos monges, tu que venceste as tentações com o sinal da cruz, protege-me de todo mal. Que eu tenha a coragem de renunciar a tudo o que me afasta do caminho da luz e da verdade."
      },
      {
        day: 3,
        title: "O valor do trabalho e da oração",
        reading: "1 Tessalonicenses 5, 16-18",
        content: "\"Ora et Labora\". Ensina-me a equilibrar minha vida entre a oração que me une a Deus e o trabalho que me dignifica e serve aos outros. Que cada atividade minha seja uma oferenda ao Senhor."
      },
      {
        day: 4,
        title: "A hospitalidade e o acolhimento",
        reading: "Hebreus 13, 1-2",
        content: "Em tua Regra, ensinas a receber a todos como se fosse o próprio Cristo. Abre meu coração para acolher o próximo com bondade, sem julgamentos, vendo em cada um a face do Mestre."
      },
      {
        day: 5,
        title: "A humildade de coração",
        reading: "Lucas 14, 11",
        content: "São Bento, tu que fugiste das honras do mundo para buscar a glória de Deus, livra-me do desejo de ser exaltado. Que eu me alegre em ser pequeno aos olhos dos homens e grande diante do Pai."
      },
      {
        day: 6,
        title: "O silêncio e a escuta interior",
        reading: "Lamentações 3, 26-28",
        content: "O barulho externo muitas vezes me impede de perceber a presença divina. Ajuda-me a cultivar momentos de silêncio interior, onde Deus possa habitar e transformar meu ser."
      },
      {
        day: 7,
        title: "A obediência à vontade de Deus",
        reading: "João 14, 21",
        content: "A obediência é o caminho mais rápido para a santidade. Intercede para que eu tenha um coração dócil às inspirações do Espírito Santo e que saiba acatar os desígnios de Deus com amor."
      },
      {
        day: 8,
        title: "A busca pela verdadeira paz",
        reading: "João 14, 27",
        content: "A paz que o mundo dá é passageira. Ajuda-me a encontrar a paz profunda que vem da amizade com Deus e da consciência tranquila. Que eu seja um portador desta paz onde quer que eu vá."
      },
      {
        day: 9,
        title: "A cruz como sinal de salvação",
        reading: "Gálatas 6, 14",
        content: "Ao fim desta novena, abraço a cruz como meu maior tesouro. Que o sinal da nossa redenção me proteja sempre e me guie para a pátria celestial. São Bento, protegei-nos! Amém."
      }
    ]
  },
  {
    id: "sao-miguel",
    name: "São Miguel Arcanjo",
    focus: "Combate espiritual e proteção divina",
    image: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop",
    prayers: {
      initial: "\"São Miguel Arcanjo, defendei-nos no combate, sede o nosso refúgio contra as maldades e ciladas do demônio. Ordene-lhe Deus, instantemente o pedimos, e vós, príncipe da milícia celeste, pelo divino poder, precipitai no inferno a satanás e a todos os espíritos malignos que andam pelo mundo para perder as almas. Amém.\"",
      final: "\"Glorioso São Miguel, chefe e príncipe dos exércitos celestes, fiel guardião das almas, vencedor dos espíritos rebeldes, amado da casa de Deus, nosso admirável guia depois de Cristo, vós, cuja excelência e virtude são puríssimas, dignai-vos livrar-nos de todos os males, a nós todos que recorremos a vós com confiança, e fazei pela vossa incomparável proteção, que adiantemos cada dia mais na fidelidade em servir a Deus. Amém.\""
    },
    days: [
      {
        day: 1,
        title: "Saudação ao coro dos Serafins",
        reading: "Isaías 6, 1-3",
        content: "Por intercessão de São Miguel e do coro celeste dos Serafins, para que o Senhor nos torne dignos de ser inflamados com o fogo de uma perfeita caridade. Que o amor de Deus consuma todas as nossas impurezas."
      },
      {
        day: 2,
        title: "Saudação ao coro dos Querubins",
        reading: "Salmo 80, 1-2",
        content: "Por intercessão de São Miguel e do coro celeste dos Querubins, para que o Senhor nos conceda a graça de abandonar o caminho do pecado e seguir o caminho da perfeição cristã e da verdadeira sabedoria."
      },
      {
        day: 3,
        title: "Saudação ao coro dos Tronos",
        reading: "Colossenses 1, 15-16",
        content: "Por intercessão de São Miguel e do coro celeste dos Tronos, para que o Senhor derrame em nossos corações o espírito de verdadeira e sincera humildade, para que sejamos instrumentos de sua paz e justiça."
      },
      {
        day: 4,
        title: "Saudação ao coro das Dominações",
        reading: "Efésios 1, 20-21",
        content: "Por intercessão de São Miguel e do coro celeste das Dominações, para que o Senhor nos conceda a graça de dominar nossos sentidos e de nos corrigir das nossas más paixões, vivendo com temperança."
      },
      {
        day: 5,
        title: "Saudação ao coro das Potestades",
        reading: "1 Pedro 3, 22",
        content: "Por intercessão de São Miguel e do coro celeste das Potestades, para que o Senhor se digne de proteger nossas almas contra as ciladas e as tentações do demônio, fortalecendo nossa vontade no bem."
      },
      {
        day: 6,
        title: "Saudação ao coro das Virtudes",
        reading: "Salmo 103, 20-21",
        content: "Por intercessão de São Miguel e do coro das admiráveis Virtudes celestes, para que o Senhor não nos deixe cair em tentação, mas que nos livre de todo o mal e nos dê força para obedecer seus mandamentos."
      },
      {
        day: 7,
        title: "Saudação ao coro dos Principados",
        reading: "Efésios 3, 9-10",
        content: "Por intercessão de São Miguel e do coro dos Principados, para que o Senhor encha nossas almas do espírito de verdadeira e sincera obediência, para que saibamos honrar as autoridades e servir aos irmãos."
      },
      {
        day: 8,
        title: "Saudação ao coro dos Arcanjos",
        reading: "Judas 1, 9",
        content: "Por intercessão de São Miguel e do coro celeste dos Arcanjos, para que o Senhor nos conceda o dom da perseverança clínica na fé e nas boas obras, para que possamos chegar a possuir a glória do Paraíso."
      },
      {
        day: 9,
        title: "Saudação ao coro dos Anjos",
        reading: "Salmo 91, 11-12",
        content: "Por intercessão de São Miguel e do coro de todos os Anjos, para que o Senhor se digne de nos conceder que sejamos guardados por eles nesta vida mortal, para sermos conduzidos por eles à glória eterna de Deus. Amém."
      }
    ]
  }
];
