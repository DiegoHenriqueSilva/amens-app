export interface RosaryMystery {
  title: string;
  description: string;
}

export interface RosaryType {
  id: string;
  name: string;
  description: string;
  mysteries?: RosaryMystery[];
  isCustom?: boolean;
}

export const PRAYERS = {
  SINAL_CRUZ: "Pelo sinal da Santa Cruz, livrai-nos, Deus, nosso Senhor, dos nossos inimigos. Em nome do Pai, do Filho e do Espírito Santo. Amém.",
  CREDO: "Creio em Deus Pai Todo-Poderoso, Criador do céu e da terra, e em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo, nasceu da Virgem Maria, padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado, desceu à mansão dos mortos, ressuscitou ao terceiro dia, subiu aos céus, está sentado à direita de Deus Pai Todo-Poderoso, de onde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo, na Santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.",
  PAI_NOSSO: "Pai Nosso que estais no céu, santificado seja o vosso nome, venha a nós o vosso reino, seja feita a vossa vontade, assim na terra como no céu. O pão nosso de cada dia nos dai hoje, perdoai as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido, e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.",
  AVE_MARIA: "Ave Maria, cheia de graça, o Senhor é convosco, bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora de nossa morte. Amém.",
  GLORIA: "Glória ao Pai, ao Filho e ao Espírito Santo. Como era no princípio, agora e sempre. Amém.",
  OH_MEU_JESUS: "Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem.",
  SALVE_RAINHA: "Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva; a vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei; e depois deste desterro nos mostrai Jesus, bendito fruto do vosso ventre, ó clemente, ó piedosa, ó doce sempre Virgem Maria. Rogai por nós, Santa Mãe de Deus, para que sejamos dignos das promessas de Cristo. Amém.",
  MISERICORDIA_PAI: "Eterno Pai, eu Vos ofereço o Corpo e Sangue, Alma e Divindade de Vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e dos do mundo inteiro.",
  MISERICORDIA_DEZENA: "Pela Sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.",
  MISERICORDIA_FIM: "Deus Santo, Deus Forte, Deus Imortal, tende piedade de nós e do mundo inteiro.",
  LIBERTACAO_GRANDE: "Se Jesus me libertar, serei verdadeiramente livre.",
  LIBERTACAO_PEQUENA: "Jesus, tem piedade de mim. Jesus, cura-me. Jesus, salva-me. Jesus, liberta-me.",
  MIGUEL_INICIO: "Vinde, ó Deus, em meu auxílio. Senhor, socorrei-me e salvai-me.",
  MIGUEL_CONCLUSAO: "Gloriosíssimo São Miguel, chefe e príncipe dos exércitos celestes, fiel guardião das almas, vencedor dos espíritos rebeldes, amado da casa de Deus, nosso admirável guia depois de Cristo; vós, cuja excelência e virtude são altíssimas, dignai-vos livrar-nos de todos os males, nós todos que recorremos a vós com confiança, e fazei por vossa incomparável proteção, que adiantemos cada dia mais na fidelidade em servir a Deus. Amém.",
  MIGUEL_HONRA_MIGUEL: "1º Pai-Nosso em honra a São Miguel Arcanjo.",
  MIGUEL_HONRA_GABRIEL: "2º Pai-Nosso em honra a São Gabriel Arcanjo.",
  MIGUEL_HONRA_RAFAEL: "3º Pai-Nosso em honra a São Rafael Arcanjo.",
  MIGUEL_HONRA_ANJO: "4º Pai-Nosso em honra ao seu Anjo da Guarda.",
};

export const COROS_ANJOS = [
  "Pela intercessão de São Miguel e do coro celeste dos Serafins, para que o Senhor Jesus nos torne dignos de sermos abrasados de uma perfeita caridade. Amém.",
  "Pela intercessão de São Miguel e do coro celeste dos Querubins, para que o Senhor Jesus nos conceda a graça de fugirmos do pecado e procurarmos a perfeição cristã. Amém.",
  "Pela intercessão de São Miguel e do coro celeste dos Tronos, para que Deus derrame em nossos corações o espírito de verdadeira e sincera humildade. Amém.",
  "Pela intercessão de São Miguel e do coro celeste das Dominações, para que o Senhor nos conceda a graça de dominar nossos sentidos e de nos corrigir das nossas más paixões. Amém.",
  "Pela intercessão de São Miguel e do coro celeste das Potestades, para que o Senhor Jesus se digne de proteger nossas almas contra as ciladas e as tentações do demônio. Amém.",
  "Pela intercessão de São Miguel e do coro celeste das Virtudes, para que o Senhor não nos deixe cair em tentação, mas nos livre de todo mal. Amém.",
  "Pela intercessão de São Miguel e do coro celeste dos Principados, para que o Senhor encha nossas almas do espírito de uma verdadeira e sincera obediência. Amém.",
  "Pela intercessão de São Miguel e do coro celeste dos Arcanjos, para que o Senhor nos conceda o dom da perseverança na fé e nas boas obras, a fim de que possamos chegar a possuir a glória eterna do paraíso. Amém.",
  "Pela intercessão de São Miguel e do coro celeste de todos os Anjos, para que sejamos guardados por eles nesta vida mortal e conduzidos por eles à glória eterna do céu. Amém.",
];

export const MISTERIOS = {
  GOZOSOS: [
    { title: "1º Mistério: A Anunciação", description: "O Anjo Gabriel anuncia a Maria que ela será a Mãe de Deus." },
    { title: "2º Mistério: A Visitação", description: "Maria visita sua prima Isabel." },
    { title: "3º Mistério: O Nascimento", description: "Jesus nasce em uma gruta em Belém." },
    { title: "4º Mistério: A Apresentação", description: "Maria e José apresentam Jesus no Templo." },
    { title: "5º Mistério: O Encontro", description: "Jesus é encontrado no Templo entre os doutores." },
  ],
  DOLOROSOS: [
    { title: "1º Mistério: A Agonia no Horto", description: "A agonia de Jesus no Jardim das Oliveiras." },
    { title: "2º Mistério: A Flagelação", description: "A flagelação de Nosso Senhor Jesus Cristo." },
    { title: "3º Mistério: A Coroação de Espinhos", description: "A coroação de espinhos de Jesus." },
    { title: "4º Mistério: O Caminho do Calvário", description: "Jesus carrega a Cruz a caminho do Calvário." },
    { title: "5º Mistério: A Crucifixão", description: "A crucificação e morte de Jesus." },
  ],
  GLORIOSOS: [
    { title: "1º Mistério: A Ressurreição", description: "A Ressurreição de Jesus Cristo." },
    { title: "2º Mistério: A Ascensão", description: "A Ascensão de Jesus ao Céu." },
    { title: "3º Mistério: A Vinda do Espírito Santo", description: "A vinda do Espírito Santo sobre os Apóstolos." },
    { title: "4º Mistério: A Assunção de Maria", description: "A Assunção de Maria ao Céu." },
    { title: "5º Mistério: A Coroação de Maria", description: "A coroação de Maria como Rainha do Céu." },
  ],
  LUMINOSOS: [
    { title: "1º Mistério: O Batismo de Jesus", description: "O Batismo de Jesus no Rio Jordão." },
    { title: "2º Mistério: As Bodas de Caná", description: "A auto-revelação de Jesus nas Bodas de Caná." },
    { title: "3º Mistério: O Anúncio do Reino", description: "O anúncio do Reino de Deus e o convite à conversão." },
    { title: "4º Mistério: A Transfiguração", description: "A Transfiguração de Jesus no Monte Tabor." },
    { title: "5º Mistério: A Instituição da Eucaristia", description: "A instituição da Eucaristia." },
  ],
};

export const ROSARY_TYPES: RosaryType[] = [
  {
    id: "misterios",
    name: "Santo Terço Mariano",
    description: "Invocando a intercessão de Maria através dos mistérios do Rosário.",
  },
  {
    id: "misericordia",
    name: "Terço da Misericórdia",
    description: "Pela Sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.",
  },
  {
      id: "libertacao",
      name: "Terço da Libertação",
      description: "Se Jesus me libertar, serei verdadeiramente livre. Jaculatórias de cura e libertação.",
  },
  {
      id: "miguel",
      name: "Coroa de São Miguel",
      description: "Honrando os nove coros de anjos para proteção e vitória espiritual.",
  },
];

export const getMysteriesByDay = () => {
  const day = new Date().getDay(); // 0 (Dom) a 6 (Sab)
  switch (day) {
    case 1: // Segunda
    case 6: // Sábado
      return MISTERIOS.GOZOSOS;
    case 2: // Terça
    case 5: // Sexta
      return MISTERIOS.DOLOROSOS;
    case 4: // Quinta
      return MISTERIOS.LUMINOSOS;
    default: // Quarta e Domingo
      return MISTERIOS.GLORIOSOS;
  }
};
