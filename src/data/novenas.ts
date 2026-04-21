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
      initial: "Santa Maria, cheia da presença de Deus, durante os dias de tua vida aceitaste com toda a humildade a vontade do Pai, e o maligno nunca foi capaz de envolver-te com suas confusões. Junto a Teu Filho intercedeste por nossas dificuldades e, com toda a paciência, nos deste o exemplo de como desenrolar as lines de nossa vida. E, ao se dar para sempre como nossa Mãe, pões em ordem e fazes mais claros os laços que nos unem ao Senhor. Santa Maria, Mãe de Deus e nossa Mãe, Tu que com o coração materno desatas os nós que atrapalham nossa vida, te pedimos que recebas em tuas mãos este nó [pedir a graça aqui] e que me livres das amarras e confusões com que me castiga aquele que é meu inimigo. Amém.",
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
      initial: "São Judas, glorioso Apóstolo, fiel servo e amigo de Jesus! O nome do traidor foi causa de que fôsseis esquecido por muitos, mas a Igreja vos honra e invoca universalmente como o padroeiro dos casos desesperados, dos negócios sem remédio. Rogai por mim, que sou tão miserável. Fazei uso, eu vos imploro, desse privilégio particular que vos foi concedido, de trazer viável e imediato auxílio onde o socorro desapareceu quase por completo. Assisti-me nesta grande necessidade, para que eu possa receber as consolações e o auxílio do céu em todas as minhas precisões, tribulações e sofrimentos. [Fazer o pedido da graça aqui]. Amém.",
      final: "Eu vos prometo, ó bendito São Judas, lembrar-me sempre deste grande favor, e nunca deixar de vos honrar como meu especial e poderoso patrono, e fazer tudo o que estiver ao meu alcance para incentivar a devoção para convosco. Que o Sagrado Coração de Jesus seja adorado, glorificado e amado em todo o mundo, agora e para sempre. São Judas Tadeu, rogai por nós e ouvi as nossas preces. Amém."
    },
    days: [
      { 
        day: 1, 
        title: "Vocação e Resposta a Deus", 
        reading: "Mateus 4, 18-22", 
        content: '"Caminhando ao longo do mar da Galileia, Jesus viu dois irmãos... e disse-lhes: \'Vinde após mim, e eu farei de vós pescadores de homens\'. Eles, deixando imediatamente as redes, o seguiram."\n\nMeditação: "Glorioso São Judas Tadeu, tu ouviste o chamado de Jesus e deixaste tudo para segui-lo. Neste primeiro dia, peço-te a graça de ter um coração generoso e atento à voz de Deus. Nas minhas angústias e causas impossíveis, que eu não perca de vista que o meu principal chamado é pertencer a Cristo."' 
      },
      { 
        day: 2, 
        title: "A Força da Fé", 
        reading: "Marcos 11, 22-24", 
        content: '"Jesus respondeu-lhes: \'Tende fé em Deus. Em verdade vos digo: se alguém disser a esta montanha: Ergue-te e lança-te ao mar, e não duvidar em seu coração, mas crer que o que disser se realizará, assim lhe acontecerá\'."\n\nMeditação: "Amado São Judas, tu que viveste ao lado do Mestre e presenciaste Seus milagres, intercede pela minha fé vacilante. Ajuda-me a crer que, para Deus, nada é impossível. Apresento-te a montanha das minhas dificuldades, certo de que, pela tua intercessão, o Senhor a moverá."' 
      },
      { 
        day: 3, 
        title: "O Amor ao Próximo", 
        reading: "João 15, 12-14", 
        content: '"Este é o meu mandamento: amai-vos uns aos outros, como eu vos amei. Ninguém tem maior amor do que aquele que dá a vida por seus amigos. Vós sois meus amigos, se fizerdes o que eu vos mando."\n\nMeditação: "São Judas, apóstolo do amor, ensina-me a amar como Jesus amou. Que as minhas aflições pessoais não endureçam o meu coração para com as necessidades dos meus irmãos. Que ao buscar a tua ajuda nesta causa tão difícil, eu também seja instrumento de ajuda e compaixão para os outros."' 
      },
      { 
        day: 4, 
        title: "Paciência nas Tribulações", 
        reading: "Romanos 5, 3-5", 
        content: '"Gloriamo-nos até nas tribulações, sabendo que a tribulação produz a paciência, a paciência prova a fidelidade e a fidelidade comprovada produz a esperança. E a esperança não decepciona."\n\nMeditação: "Valente São Judas Tadeu, padroeiro dos desesperados, tu derramaste o teu sangue por amor a Cristo. Dá-me a paciência necessária para suportar esta pesada cruz. Quando o desespero bater à minha porta, lembra-me de que o sofrimento unido a Cristo produz frutos de salvação."' 
      },
      { 
        day: 5, 
        title: "A Esperança que não Falha", 
        reading: "Romanos 8, 24-25", 
        content: '"Pois fomos salvos em esperança. Ora, a esperança que se vê não é esperança; pois quem espera o que vê? Mas, se esperamos o que não vemos, nós o aguardamos com paciência."\n\nMeditação: "Ó poderoso intercessor, minha alma está cansada e o meu caso parece não ter remédio. Mas em ti, São Judas, renovo a minha esperança. Sustenta-me neste tempo de espera e não permitas que as trevas do desânimo apaguem a luz da confiança em Deus."' 
      },
      { 
        day: 6, 
        title: "Humildade e Serviço", 
        reading: "Filipenses 2, 3-8", 
        content: '"Não façais nada por espírito de rivalidade ou vanglória, mas, com humildade, considerai os outros superiores a vós mesmos... Tende em vós o mesmo sentimento que houve em Cristo Jesus."\n\nMeditação: "São Judas, tu foste humilde servidor do Reino de Deus. Livra-me do orgulho e da vaidade, que tantas vezes são a verdadeira raiz dos meus problemas. Concede-me um coração manso e humilde, pronto a aceitar a vontade do Pai, mesmo quando ela for contrária aos meus desejos."' 
      },
      { 
        day: 7, 
        title: "Confiança na Misericórdia", 
        reading: "Hebreus 4, 14-16", 
        content: '"Aproximemo-nos, portanto, com confiança do trono da graça, a fim de alcançarmos misericórdia e acharmos graça para sermos ajudados no momento oportuno."\n\nMeditação: "Apóstolo glorioso, reconheço que sou pecador e muitas vezes falhei. Mas confiando no trono da graça, recorro a ti. Alcança-me de Deus o perdão para as minhas faltas e a misericórdia para a minha situação que parece humanamente impossível de ser resolvida."' 
      },
      { 
        day: 8, 
        title: "Perseverança na Oração", 
        reading: "Lucas 18, 1-8", 
        content: '"Jesus contou-lhes uma parábola para mostrar a necessidade de orar sempre e nunca desfalecer... Acaso Deus não fará justiça aos seus escolhidos, que clamam por ele dia e noite?"\n\nMeditação: "São Judas Tadeu, padroeiro dos casos sem solução, não me deixes desistir de rezar. Mesmo que a resposta demore, que eu clame a Deus dia e noite com insistência. Sei que a tua poderosa intercessão diante do trono divino não me desamparará."' 
      },
      { 
        day: 9, 
        title: "A Glória Celestial e Ação de Graças", 
        reading: "Apocalipse 21, 1-4", 
        content: '"Ele enxugará toda lágrima dos seus olhos. Não haverá mais morte, nem luto, nem clamor, nem dor, porque as primeiras coisas passaram."\n\nMeditação: "Neste último dia da novena, glorioso São Judas Tadeu, venho te agradecer. Entrego em tuas mãos o meu futuro. Seja qual for o desfecho deste meu pedido, que ele me aproxime da glória do Céu, onde não haverá mais dor nem sofrimento, e onde poderei louvar a Deus junto contigo por toda a eternidade."' 
      }
    ]
  },
  {
    id: "divina-misericordia",
    name: "Divina Misericórdia",
    focus: "Salvação das almas e confiança",
    image: "https://diocese-sjc.org.br/wp-content/uploads/2021/04/jesusmisericordioso-Copia-300x169.jpg",
    colors: { from: "#dc2626", to: "#f87171" },
    type: "mercy",
    prayers: {
      initial: "Expirastes, Jesus, mas a fonte da vida brotou para as almas e o oceano da misericórdia abriu-se para o mundo inteiro. Ó fonte de vida, insondável Misericórdia Divina, envolve o mundo inteiro e derrama-Te sobre nós. Ó Sangue e Água, que brotastes do Coração de Jesus como fonte de misericórdia para nós, eu confio em Vós!",
      petition: "Pai Eterno, eu Vos ofereço o Corpo e Sangue, Alma e Divindade de Vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e do mundo inteiro.\n\n(Repetir 10x): Pela Sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.",
      final: "Deus Eterno, em quem a misericórdia é insondável e o tesouro da compaixão inesgotável, olhai propício para nós e multiplicai em nós a Vossa misericórdia, para que, nos momentos difíceis, não desesperemos nem fiquemos abatidos, mas nos submetamos com grande confiança à Vossa santa vontade, que é Amor e a própria Misericórdia. Amém."
    },
    days: [
      { 
        day: 1, 
        title: "Por toda a humanidade, especialmente os pecadores", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me a humanidade inteira, especialmente todos os pecadores, e mergulha-os no oceano da Minha misericórdia. Com isso consolarás a Minha amarga tristeza em que Me afreia a perda das almas."\n\nOração: Misericordiosíssimo Jesus, cuja natureza é ter piedade de nós e perdoar-nos, não olheis para os nossos pecados, mas para a confiança que depositamos na Vossa infinita bondade.' 
      },
      { 
        day: 2, 
        title: "Pelas almas dos sacerdotes e religiosos", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me as almas dos sacerdotes e religiosos e mergulha-as na Minha insondável misericórdia. Foram elas que Me deram forças para suportar a amarga Paixão."\n\nOração: Misericordiosíssimo Jesus, de quem procede tudo o que é bom, multiplicai as Vossas graças nas almas dos sacerdotes e religiosos, para que realizem dignas obras de misericórdia.' 
      },
      { 
        day: 3, 
        title: "Pelas almas piedosas e fiéis", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me todas as almas piedosas e fiéis e mergulha-as no oceano da Minha misericórdia. Estas almas consolaram-Me no Caminho da Cruz."\n\nOração: Misericordiosíssimo Jesus, que do tesouro da Vossa misericórdia concedeis a todos em abundância as Vossas graças, recebei-nos na morada do Vosso Coração compassivo.' 
      },
      { 
        day: 4, 
        title: "Pelos pagãos e pelos que ainda não conhecem a Jesus", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me os pagãos e aqueles que ainda não Me conhecem. Pensei neles também na Minha amarga Paixão, e o seu futuro zelo consolou o Meu Coração."\n\nOração: Piadosíssimo Jesus, que sois a luz de todo o mundo, recebei na morada do Vosso Coração as almas dos pagãos e daqueles que ainda não Vos conhecem.' 
      },
      { 
        day: 5, 
        title: "Pelas almas dos que se separaram da Igreja", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me as almas dos que se separaram da Minha Igreja e mergulha-os no oceano da Minha misericórdia. Na Minha amarga Paixão, elas dilaceravam o Meu Corpo e o Meu Coração."\n\nOração: Misericordiosíssimo Jesus, que sois a própria Bondade, não negueis a luz àqueles que Vos pedem. Recebei na morada do Vosso Coração as almas dos que se separaram da Igreja.' 
      },
      { 
        day: 6, 
        title: "Pelas almas mansas, humildes e das criancinhas", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me as almas mansas e humildes, assim como as almas das criancinhas, e mergulha-as na Minha misericórdia. Elas são as mais semelhantes ao Meu Coração."\n\nOração: Misericordiosíssimo Jesus, que dissestes: \'Aprendei de Mim que sou manso e humilde de Coração\', recebei as almas mansas e humildes e as das criancinhas.' 
      },
      { 
        day: 7, 
        title: "Pelas almas que veneram e glorificam a Misericórdia de Deus", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me as almas que veneram e glorificam de maneira especial a Minha misericórdia e mergulha-as nela. Estas almas sofreram mais com a Minha Paixão e penetraram mais profundamente no Meu espírito."\n\nOração: Misericordiosíssimo Jesus, cujo Coração é o próprio Amor, recebei na morada do Vosso Coração as almas que veneram e exaltam a grandeza da Vossa misericórdia.' 
      },
      { 
        day: 8, 
        title: "Pelas almas do purgatório", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me as almas que se encontram na prisão do purgatório e mergulha-as no abismo da Minha misericórdia. Que as torrentes do Meu Sangue refresquem a sua ardor."\n\nOração: Misericordiosíssimo Jesus, que dissestes que quereis misericórdia, levo à morada do Vosso Coração compassivo as almas do purgatório, que Vos são muito queridas.' 
      },
      { 
        day: 9, 
        title: "Pelas almas tíbias (frias/indiferentes)", 
        reading: "", 
        content: 'Palavras de Jesus: "Hoje, traz-Me as almas tíbias e mergulha-as no abismo da Minha misericórdia. Estas almas ferem mais dolorosamente o Meu Coração."\n\nOração: Piadosíssimo Jesus, que sois a própria compaixão, trazei para a morada do Vosso Coração as almas tíbias. Que nestas almas se aqueça o Vosso puro amor.' 
      }
    ]
  },
  {
    id: "santa-rita",
    name: "Santa Rita",
    focus: "Causas impossíveis e pacificação",
    image: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Santa_Rita_Cascia.jpg",
    colors: { from: "#7e22ce", to: "#a855f7" },
    prayers: {
      initial: "Ó poderosa e gloriosa Santa Rita de Cássia, chamada Santa das causas impossíveis, advogada dos casos desesperados, auxiliadora da última hora, refúgio e abrigo na dor que arrasta para o abismo do pecado e do desespero. Com toda a confiança em vosso celestial poder, recorro a vós no caso difícil e imprevisto que oprime dolorosamente o meu coração. [Fazer o pedido da graça aqui]. Dizei-me, ó Santa Rita, não me quereis ajudar e consolar? Afastareis o vosso olhar e a vossa piedade do meu coração tão provado por esta dor? Vós, que passastes por tantas aflições, conheceis o martírio do meu coração. Alcançai-me a graça que vos peço, se for para a glória de Deus e salvação de minha alma. Amém.",
      final: "Ó Deus, que concedestes a Santa Rita a graça de amar os inimigos e de trazer na fronte e no coração os sinais da vossa caridade e da vossa Paixão, concedei-nos a graça de perdoar aos nossos ofensores e de sofrer por vosso amor as aflições desta vida. Por Cristo, nosso Senhor. Santa Rita de Cássia, advogada das causas impossíveis, rogai por nós. Amém."
    },
    days: [
      { 
        day: 1, 
        title: "O Perdão às Ofensas", 
        reading: "Mateus 5, 43-44", 
        content: '"Ouvistes que foi dito: Amarás o teu próximo e odiarás o teu inimigo. Eu, porém, vos digo: amai os vossos inimigos e orai por aqueles que vos perseguem."\n\nMeditação: "Gloriosa Santa Rita, que tivestes a força heroica de perdoar os assassinos de vosso marido e ensinar vossos filhos a fazerem o mesmo, alcançai-me de Deus a graça de um coração purificado de todo ódio e rancor. Ajudai-me a perdoar quem me ofendeu, para que eu possa também ser perdoado por Deus e minhas preces sejam ouvidas nesta causa tão difícil."' 
      },
      { 
        day: 2, 
        title: "A Vida Familiar e Matrimonial", 
        reading: "Efésios 5, 21.25", 
        content: '"Sujeitai-vos uns aos outros no temor de Cristo... Maridos, amai as vossas mulheres, como Cristo amou a Igreja e se entregou por ela."\n\nMeditação: "Amável Santa Rita, vós suportastes um matrimônio difícil com paciência, doçura e oração incessante, conseguindo por fim a conversão de vosso esposo. Olhai para as famílias em crise e para os casais desunidos. Intercedei pelo meu lar, para que reine a paz, a fidelidade e o amor cristão."' 
      },
      { 
        day: 3, 
        title: "A Dor da Perda e o Consolo Divino", 
        reading: "Mateus 5, 4", 
        content: '"Bem-aventurados os que choram, porque serão consolados."\n\nMeditação: "Ó Santa Rita, viúva e mãe enlutada, que chorastes a morte de vosso marido e, logo depois, de vossos dois filhos, vós conheceis a dor da perda e o vazio da solidão. Consolais o meu coração nas minhas tristezas e lutos. Alcançai-me a graça da conformidade com a vontade divina e fortalecei a minha esperança no Céu."' 
      },
      { 
        day: 4, 
        title: "O Desejo de Consagração a Deus", 
        reading: "Salmo 27, 4", 
        content: '"Uma só coisa pedi ao Senhor, só isto desejo: poder morar na casa do Senhor todos os dias da minha vida, para contemplar a beleza do Senhor e frequentar o seu templo."\n\nMeditação: "Após perderdes a vossa família, ó Santa Rita, o vosso coração voltou-se inteiramente para Deus, buscando a consagração no convento. Mesmo diante das recusas iniciais, não desististes. Inspirai em mim esse mesmo desejo ardente pelas coisas do alto e uma fé inabalável de que Deus abre portas onde o mundo fecha."' 
      },
      { 
        day: 5, 
        title: "A Obediência e a Humildade", 
        reading: "1 Pedro 5, 5-6", 
        content: '"Revesti-vos todos de humildade no trato mútuo, porque Deus resiste aos soberbos, mas dá a sua graça aos humildes. Humilhai-vos, pois, debaixo da poderosa mão de Deus."\n\nMeditação: "Exemplo de obediência, Santa Rita, regastes uma madeira seca no jardim do convento apenas para obedecer à vossa superiora, e Deus fez dali brotar uma videira frutífera. Ensinai-me a obedecer a Deus nas pequenas coisas e a ser humilde, confiando que Ele pode fazer florir até mesmo os desertos da minha vida."' 
      },
      { 
        day: 6, 
        title: "A Aceitação do Sofrimento e a Cruz", 
        reading: "Colossenses 1, 24", 
        content: '"Agora me alegro nos meus sofrimentos por vós e completo na minha carne o que falta às tribulações de Cristo pelo seu Corpo, que é a Igreja."\n\nMeditação: "Santa Rita, de tanto meditar na Paixão de Cristo, recebestes na testa a ferida de um dos espinhos de Sua coroa, suportando dores terríveis por muitos anos. Dai-me a graça de não fugir das minhas cruzes, mas de abraçá-las com amor, sabendo que o sofrimento unido a Jesus é fonte de purificação e salvação."' 
      },
      { 
        day: 7, 
        title: "O Amor à Eucaristia e à Oração", 
        reading: "João 6, 51", 
        content: '"Eu sou o pão vivo que desceu do céu. Quem comer deste pão viverá eternamente. E o pão que eu darei é a minha carne para a salvação do mundo."\n\nMeditação: "No final da vossa vida, Santa Rita, vosso único alimento e sustento era a Sagrada Eucaristia. Despertai em mim uma fome e sede pelo Corpo e Sangue de Jesus. Que a Missa e a oração sejam a minha força motriz para enfrentar os casos desesperados e as provações do dia a dia."' 
      },
      { 
        day: 8, 
        title: "A Intercessão pelos Doentes", 
        reading: "Marcos 6, 56", 
        content: '"Onde quer que ele entrasse, em aldeias, cidades ou campos, colocavam os doentes nas praças e suplicavam-lhe que os deixasse tocar ao menos na orla de sua veste. E todos os que a tocavam ficavam curados."\n\nMeditação: "Santa Rita, que no frio do inverno fizestes brotar rosas e figos frescos para alegrar os que vos visitavam, mostrai o vosso poder intercessor em favor dos doentes. Olhai para a minha enfermidade ou para os enfermos da minha família, e alcançai-nos a cura física e espiritual, conforme a vontade do Pai."' 
      },
      { 
        day: 9, 
        title: "A Vitória Final e a Glória Celestial", 
        reading: "2 Timóteo 4, 7-8", 
        content: '"Combati o bom combate, terminei a corrida, guardei a fé. Agora me está reservada a coroa da justiça, que o Senhor, justo Juiz, me dará naquele dia."\n\nMeditação: "Neste último dia da novena, gloriosa Santa Rita, contemplo a vossa entrada triunfal no Céu, coroada por Jesus e Maria. Intercedei pelo meu pedido impossível, mas, acima de tudo, rogai para que eu viva de tal maneira que um dia possa juntar-me a vós na glória eterna, louvando a Deus para todo o sempre. Amém."' 
      }
    ]
  },
  {
    id: "sao-bento",
    name: "São Bento",
    focus: "Proteção contra o mal e paz",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Benedict_of_Nursia.jpg",
    colors: { from: "#3d2b1f", to: "#8b6508" },
    prayers: {
      initial: "Ó glorioso Patriarca São Bento, que vos mostrastes sempre compassivo com os necessitados, fazei que também nós, recorrendo à vossa poderosa intercessão, obtenhamos socorro em todas as nossas aflições. Que nas famílias reine a paz e a tranquilidade; afastai todas as desgraças, tanto corporais como espirituais, especialmente o pecado. Alcançai-me do Senhor a graça específica que agora vos peço [Fazer o pedido da graça aqui]. Ó São Bento, rogai por nós, para que sejamos dignos das promessas de Cristo. Amém.",
      final: "A Cruz Sagrada seja a minha luz, não seja o dragão o meu guia. Retira-te, satanás! Nunca me aconselhes coisas vãs. É mau o que tu me ofereces, bebe tu mesmo os teus venenos! São Bento, rogai por nós. Amém."
    },
    days: [
      { 
        day: 1, 
        title: "Escutar a voz de Deus", 
        reading: "Provérbios 1, 33", 
        content: '"Mas o que me escuta viverá em segurança, tranquilo e sem o temor do mal."\n\nMeditação: "A Regra de São Bento começa com a palavra: \'Escuta, filho, os preceitos do Mestre\'. Glorioso São Bento, ensinai-me a silenciar as vozes do mundo e os meus próprios ruídos internos para ouvir a vontade de Deus. Que o meu coração esteja sempre atento aos sussurros do Espírito Santo, guiando-me nas decisões difíceis e neste pedido que hoje vos apresento."' 
      },
      { 
        day: 2, 
        title: "A Renúncia ao Mal e o Combate Espiritual", 
        reading: "Efésios 6, 11-12", 
        content: '"Revesti-vos da armadura de Deus, para que possais resistir às ciladas do demônio. Pois não é contra homens de carne e sangue que temos de lutar, mas contra os principados e potestades, contra os príncipes deste mundo tenebroso."\n\nMeditação: "São Bento, vós que vencestes as tentações e destruístes ídolos pela força da Cruz, defendei-me dos ataques do inimigo. Quebrantai toda inveja, feitiçaria, maldição ou energia negativa lançada contra mim, minha família e meus negócios. Que a vossa intercessão seja um escudo impenetrável ao meu redor."' 
      },
      { 
        day: 3, 
        title: "O Trabalho e a Oração (Ora et Labora)", 
        reading: "1 Tessalonicenses 5, 16-18", 
        content: '"Alegrai-vos sempre. Orai sem cessar. Em todas as circunstâncias, dai graças, porque esta é a vosso respeito a vontade de Deus em Jesus Cristo."\n\nMeditação: "Com o vosso lema \'Ora et Labora\', ensinastes que o trabalho honesto é também uma forma de oração. São Bento, abençoai o meu trabalho, os meus projetos e o meu sustento. Ajudai-me a não ser escravo da preguiça nem do ativismo exagerado, mas a encontrar o equilíbrio perfeito, santificando o meu dia a dia."' 
      },
      { 
        day: 4, 
        title: "A Hospitalidade e o Cuidado com o Próximo", 
        reading: "Hebreus 13, 1-2", 
        content: '"Persevere o amor fraterno. Não vos esqueçais da hospitalidade, pela qual alguns, sem o saberem, hospedaram anjos."\n\nMeditação: "Na vossa Regra, São Bento, ordenais que \'todos os hóspedes sejam recebidos como o próprio Cristo\'. Dai-me a graça de ter um coração acolhedor e generoso. Que eu saiba enxergar Jesus nas pessoas que cruzam o meu caminho, tratando a todos, especialmente os mais necessitados, com respeito, caridade e paciência."' 
      },
      { 
        day: 5, 
        title: "A Humildade de Coração", 
        reading: "Lucas 14, 11", 
        content: '"Pois todo o que se exaltar será humilhado, e o que se humilhar será exaltado."\n\nMeditação: "São Bento, vós que escrevestes sobre os degraus da humildade, sabeis que o orgulho é a raiz de todos os pecados. Ajudai-me a reconhecer as minhas fraquezas e a depender inteiramente da graça de Deus. Libertai-me da arrogância, da vaidade e do desejo de ser sempre o dono da razão."' 
      },
      { 
        day: 6, 
        title: "O Silêncio e a Paz Interior", 
        reading: "Lamentações 3, 26", 
        content: '"É bom esperar em silêncio a salvação do Senhor."\n\nMeditação: "O mundo moderno é cheio de distrações e agitação, mas vós, São Bento, encontrastes Deus no silêncio da caverna de Subiaco. Dai-me a capacidade de fazer silêncio interior diante das tribulações. Que eu não me desespere nem fale precipitadamente nos momentos de crise, mas espere com confiança a salvação que vem de Deus."' 
      },
      { 
        day: 7, 
        title: "A Obediência", 
        reading: "João 14, 21", 
        content: '"Aquele que tem os meus mandamentos e os guarda, esse é que me ama. E aquele que me ama será amado por meu Pai, e eu o amarei e me manifestarei a ele."\n\nMeditação: "São Bento, mestre da obediência, intercedei por mim para que eu submeta a minha vontade aos mandamentos de Deus e aos ensinamentos da Igreja. Que eu não me rebele contra a vontade divina quando ela for contrária aos meus planos, pois sei que Deus sempre quer o melhor para a minha salvação."' 
      },
      { 
        day: 8, 
        title: "A Paz (Pax Benedictina)", 
        reading: "João 14, 27", 
        content: '"Deixo-vos a paz, dou-vos a minha paz. Não vo-la dou como o mundo a dá. Não se perturbe o vosso coração, nem se atemorize."\n\nMeditação: "A paz é o selo da Ordem Beneditina. Glorioso São Bento, levai a paz verdadeira ao meu coração angustiado, à minha família fragmentada e aos meus relacionamentos difíceis. Afastai o espírito de discórdia e fofoca, e plantai a semente da união e da fraternidade onde houver divisão."' 
      },
      { 
        day: 9, 
        title: "A Cruz como Sinal de Salvação", 
        reading: "Gálatas 6, 14", 
        content: '"Quanto a mim, que eu não me glorie a não ser na cruz de nosso Senhor Jesus Cristo, pela qual o mundo está crucificado para mim e eu para o mundo."\n\nMeditação: "No fim desta novena, São Bento, olho para o poder libertador da Santa Cruz, o sinal com o qual operastes tantos milagres e quebrastes cálices envenenados. Que a Cruz de Cristo seja sempre a minha luz e a minha proteção. Confio-vos este meu pedido final, certo de que me acompanhareis todos os dias da minha vida. Amém."' 
      }
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
      initial: "São Miguel Arcanjo, defendei-nos no combate, sede o nosso refúgio contra as maldades e ciladas do demônio. Ordene-lhe Deus, instantemente o pedimos, e vós, príncipe da milícia celeste, pelo poder divino, precipitai no inferno a satanás e a todos os espíritos malignos que andam pelo mundo para perder as almas. Glorioso São Miguel, recorro à vossa poderosa intercessão nesta novena para vos pedir a seguinte graça: [Fazer o pedido da graça aqui]. Amém.",
      final: "Glorioso São Miguel, chefe e príncipe dos exércitos celestes, fiel guardião das almas, vencedor dos espíritos rebeldes, amado da casa de Deus. Vinde, ó Príncipe Santíssimo, socorrei-me em minhas necessidades e livrai-me de todo mal. Fazei, por vossa incomparável proteção, que eu progrida a cada dia no serviço de Deus e alcance a graça que vos suplico. Amém."
    },
    days: [
      { 
        day: 1, 
        title: "Saudação ao Coro dos Serafins (Amor Ardente)", 
        reading: "Isaías 6, 1-3", 
        content: '"Eu vi o Senhor sentado num trono alto e elevado... Serafins estavam de pé acima dele; cada um tinha seis asas... E clamavam uns para os outros, dizendo: Santo, Santo, Santo é o Senhor dos Exércitos; toda a terra está cheia da sua glória."\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste dos Serafins, para que o Senhor Jesus nos torne dignos de ser abrasados de uma perfeita caridade. Que o fogo do amor de Deus consuma todo o egoísmo do meu coração e me dê forças para suportar os combates desta vida."' 
      },
      { 
        day: 2, 
        title: "Saudação ao Coro dos Querubins (Sabedoria Divina)", 
        reading: "Salmo 80, 2", 
        content: '"Ó pastor de Israel, presta ouvidos; tu, que conduzes José como um rebanho; tu, que estás entronizado acima dos querubins, resplandece."\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste dos Querubins, para que o Senhor nos conceda a graça de abandonar o caminho do pecado e seguir o caminho da perfeição cristã. Que a sabedoria de Deus ilumine a minha mente nas decisões difíceis que preciso tomar."' 
      },
      { 
        day: 3, 
        title: "Saudação ao Coro dos Tronos (Paz e Humildade)", 
        reading: "Colossenses 1, 16", 
        content: '"Pois nele foram criadas todas as coisas nos céus e na terra, as visíveis e as invisíveis, sejam tronos ou soberanias, principados ou autoridades; todas as coisas foram criadas por ele e para ele."\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste dos Tronos, para que Deus derrame em nossos corações o espírito de verdadeira e sincera humildade. Quebrando todo o orgulho, que eu possa descansar na paz que só o Senhor pode dar às almas atribuladas."' 
      },
      { 
        day: 4, 
        title: "Saudação ao Coro das Dominações (Domínio sobre as paixões)", 
        reading: "Efésios 1, 20-21", 
        content: '"Ele o ressuscitou dentre os mortos e o fez sentar-se à sua direita nas regiões celestiais, muito acima de todo principado, autoridade, poder, domínio..."\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste das Dominações, para que o Senhor nos conceda a graça de dominar nossos sentidos e de nos corrigir das nossas más paixões. Livrai-me dos impulsos que me afastam da vontade de Deus."' 
      },
      { 
        day: 5, 
        title: "Saudação ao Coro das Potestades (Defesa contra o mal)", 
        reading: "1 Pedro 3, 22", 
        content: '"Jesus Cristo, que, tendo subido ao céu, está à direita de Deus, e a quem estão submissos os anjos, as autoridades e os poderes."\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste das Potestades, para que o Senhor Jesus se digne de proteger nossas almas contra as ciladas e as tentações do demônio. Que toda a força da feitiçaria, inveja e maldição seja quebrada diante do poder da Cruz."' 
      },
      { 
        day: 6, 
        title: "Saudação ao Coro das Virtudes (Força para não cair)", 
        reading: "Salmo 103, 20-21", 
        content: '"Bendizei ao Senhor, vós, seus anjos, valorosos em poder, que executais as suas ordens... Bendizei ao Senhor, vós, todos os seus exércitos, vós, ministros seus, que fazeis a sua vontade."\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste das Virtudes, para que o Senhor não nos deixe cair em tentação, mas que nos livre de todo o mal. Fortalecei a minha vontade, Príncipe Celeste, para que eu não vacile nas provações que estou enfrentando."' 
      },
      { 
        day: 7, 
        title: "Saudação ao Coro dos Principados (Obediência e Fervor)", 
        reading: "Efésios 3, 10", 
        content: '"Para que agora, pela igreja, a multiforme sabedoria de Deus se torne conhecida dos principados e potestades nas regiões celestiais."\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste dos Principados, para que o Senhor encha nossas almas do espírito de uma verdadeira e sincera obediência. Dai-me o fervor na oração e a constância na fé, para não abandonar a minha cruz."' 
      },
      { 
        day: 8, 
        title: "Saudação ao Coro dos Arcanjos (Firmeza na Fé)", 
        reading: "Judas 1, 9", 
        content: '"Contudo, o arcanjo Miguel, quando contendia com o diabo e disputava a respeito do corpo de Moisés, não se atreveu a proferir juízo infamante contra ele; pelo contrário, disse: O Senhor te repreenda!"\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste dos Arcanjos, para que o Senhor nos conceda o dom da perseverança na fé e nas boas obras, a fim de que possamos chegar a possuir a glória do Paraíso. Combatei ao meu lado, São Miguel, e sê meu escudo invisível."' 
      },
      { 
        day: 9, 
        title: "Saudação ao Coro dos Anjos (Proteção diária)", 
        reading: "Salmo 91, 11-12", 
        content: '"Porque aos seus anjos dará ordens a teu respeito, para que te guardem em todos os teus caminhos. Eles te sustentarão nas suas mãos, para que não tropeces nalguma pedra."\n\nMeditação: "Pela intercessão de São Miguel e do coro celeste de todos os Anjos, para que sejamos guardados por eles nesta vida mortal, e por eles conduzidos à glória eterna do Céu. Agradeço-vos, glorioso Arcanjo, por ouvirdes as minhas preces nesta novena. Coloco minha vida e minha família sob a vossa guarda."' 
      }
    ]
  }
];
