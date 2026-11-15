export interface ActiveCityMarker {
  city: string;
  state: string;
  count: number;
  coordinates: [number, number]; // [longitude, latitude]
}

// Centroids for each Brazilian state (Longitude, Latitude)
export const STATE_CENTROIDS: Record<string, [number, number]> = {
  AC: [-70.8120, -9.0238],
  AL: [-36.7820, -9.5713],
  AP: [-52.0030, 1.4140],
  AM: [-64.6310, -4.1860],
  BA: [-41.7007, -12.5797],
  CE: [-39.5700, -5.4984],
  DF: [-47.9292, -15.7801],
  ES: [-40.3089, -19.1834],
  GO: [-49.8362, -15.8270],
  MA: [-45.2744, -5.4200],
  MT: [-55.9211, -12.6819],
  MS: [-54.5400, -20.7722],
  MG: [-44.5550, -18.5122],
  PA: [-52.2900, -3.7900],
  PB: [-36.7820, -7.2399],
  PR: [-51.5000, -24.8900],
  PE: [-37.9987, -8.8137],
  PI: [-42.7460, -7.7183],
  RJ: [-42.5000, -22.2500],
  RN: [-36.7820, -5.7945],
  RS: [-53.5000, -30.0000],
  RO: [-62.8000, -11.5000],
  RR: [-61.3000, 2.0500],
  SC: [-50.5000, -27.2423],
  SP: [-48.5000, -22.0000],
  SE: [-37.3857, -10.5741],
  TO: [-48.2982, -10.1753]
};

// Accurate coordinates for capitals & major Brazilian cities [Longitude, Latitude]
export const MAJOR_CITIES_COORDS: Record<string, [number, number]> = {
  // Capitais
  'rio branco-ac': [-67.8243, -9.9749],
  'maceio-al': [-35.7351, -9.6658],
  'macapa-ap': [-51.0544, 0.0389],
  'manaus-am': [-60.0217, -3.1190],
  'salvador-ba': [-38.5108, -12.9714],
  'fortaleza-ce': [-38.5434, -3.7172],
  'brasilia-df': [-47.9292, -15.7801],
  'vitoria-es': [-40.3378, -20.3155],
  'goiania-go': [-49.2532, -16.6869],
  'sao luis-ma': [-44.3028, -2.5307],
  'cuiaba-mt': [-56.0969, -15.6014],
  'campo grande-ms': [-54.6464, -20.4697],
  'belo horizonte-mg': [-43.9378, -19.9208],
  'belem-pa': [-48.5044, -1.4558],
  'joao pessoa-pb': [-34.8610, -7.1150],
  'curitiba-pr': [-49.2731, -25.4284],
  'recife-pe': [-34.8813, -8.0578],
  'teresina-pi': [-42.8016, -5.0920],
  'rio de janeiro-rj': [-43.1729, -22.9068],
  'natal-rn': [-35.2094, -5.7945],
  'porto alegre-rs': [-51.2177, -30.0346],
  'porto velho-ro': [-63.9039, -8.7619],
  'boa vista-rr': [-60.6758, 2.8235],
  'florianopolis-sc': [-48.5496, -27.5949],
  'sao paulo-sp': [-46.6333, -23.5505],
  'aracaju-se': [-37.0731, -10.9472],
  'palmas-to': [-48.3336, -10.2491],

  // Paraná
  'umuarama-pr': [-53.3250, -23.7644],
  'londrina-pr': [-51.1628, -23.3045],
  'maringa-pr': [-51.9333, -23.4253],
  'ponta grossa-pr': [-50.1619, -25.0950],
  'cascavel-pr': [-53.4553, -24.9578],
  'foz do iguacu-pr': [-54.5853, -25.5469],
  'guarapuava-pr': [-51.4642, -25.3953],
  'paranagua-pr': [-48.5225, -25.5206],
  'toledo-pr': [-53.7431, -24.7136],
  'apucarana-pr': [-51.4611, -23.5511],
  'campo mourao-pr': [-52.3814, -24.0458],

  // São Paulo
  'aparecida-sp': [-45.2325, -22.8469],
  'guarulhos-sp': [-46.5333, -23.4628],
  'campinas-sp': [-47.0608, -22.9056],
  'sao bernardo do campo-sp': [-46.5650, -23.6939],
  'santo andre-sp': [-46.5383, -23.6572],
  'osasco-sp': [-46.7917, -23.5325],
  'sorocaba-sp': [-47.4578, -23.5015],
  'ribeirao preto-sp': [-47.8103, -21.1775],
  'sao jose dos campos-sp': [-45.8869, -23.1896],
  'santos-sp': [-46.3333, -23.9608],
  'sao jose do rio preto-sp': [-49.3794, -20.8114],
  'piracicaba-sp': [-47.6492, -22.7253],
  'bauru-sp': [-49.0606, -22.3147],
  'jundiai-sp': [-46.8833, -23.1864],
  'franca-sp': [-47.4008, -20.5386],
  'barretos-sp': [-48.5678, -20.5572],
  'araraquara-sp': [-48.1758, -21.7944],
  'sao carlos-sp': [-47.8908, -22.0175],
  'limeira-sp': [-47.4017, -22.5647],
  'presidente prudente-sp': [-51.3889, -22.1256],
  'marilia-sp': [-49.9500, -22.2139],
  'taubate-sp': [-45.5561, -23.0264],

  // Rio de Janeiro
  'sao goncalo-rj': [-43.0531, -22.8269],
  'duque de caxias-rj': [-43.3117, -22.7856],
  'nova iguacu-rj': [-43.4511, -22.7556],
  'niteroi-rj': [-43.1033, -22.8833],
  'campos dos goytacazes-rj': [-41.3236, -21.7544],
  'petropolis-rj': [-43.1789, -22.5050],
  'volta redonda-rj': [-44.1042, -22.5231],

  // Minas Gerais
  'uberlandia-mg': [-48.2772, -18.9186],
  'contagem-mg': [-44.0536, -19.9322],
  'juiz de fora-mg': [-43.3503, -21.7586],
  'betim-mg': [-44.1983, -19.9678],
  'montes claros-mg': [-43.8647, -16.7350],
  'uberaba-mg': [-47.9317, -19.7478],
  'governador valadares-mg': [-41.9494, -18.8511],
  'ipatinga-mg': [-42.5367, -19.4683],
  'divinopolis-mg': [-44.8889, -20.1436],
  'pocos de caldas-mg': [-46.5681, -21.7878],

  // Rio Grande do Sul
  'caxias do sul-rs': [-51.1794, -29.1678],
  'pelotas-rs': [-52.3425, -31.7654],
  'canoas-rs': [-51.1836, -29.9178],
  'santa maria-rs': [-53.8069, -29.6842],
  'passo fundo-rs': [-52.4067, -28.2611],

  // Santa Catarina
  'joinville-sc': [-48.8456, -26.3045],
  'blumenau-sc': [-49.0661, -26.9194],
  'sao jose-sc': [-48.6367, -27.6136],
  'chapeco-sc': [-52.6153, -27.1006],
  'criciuma-sc': [-49.3703, -28.6775],

  // Bahia
  'feira de santana-ba': [-38.9667, -12.2667],
  'vitoria da conquista-ba': [-40.8389, -14.8661],
  'camacari-ba': [-38.3236, -12.6975],
  'itabuna-ba': [-39.2789, -14.7939],
  'ilheus-ba': [-39.0333, -14.7889],
  'juazeiro-ba': [-40.5028, -9.4136],

  // Pernambuco
  'jaboatao dos guararapes-pe': [-35.0150, -8.1128],
  'olinda-pe': [-34.8550, -8.0089],
  'caruaru-pe': [-35.9761, -8.2833],
  'petrolina-pe': [-40.5008, -9.3892],

  // Ceará
  'caucaia-ce': [-38.6531, -3.7317],
  'juazeiro do norte-ce': [-39.3150, -7.2131],
  'sobral-ce': [-40.3528, -3.6894],

  // Espírito Santo
  'vila velha-es': [-40.2925, -20.3297],
  'serra-es': [-40.3078, -20.1286],
  'cariacica-es': [-40.4200, -20.2639],

  // Goiás & Outros
  'anapolis-go': [-48.9528, -16.3267],
  'rio verde-go': [-50.9194, -17.7928],
  'imperatriz-ma': [-53.0333, -5.5264],
  'dourados-ms': [-54.8089, -22.2211],
  'rondonopolis-mt': [-54.6367, -16.4678],
  'sinop-mt': [-55.5089, -11.8642],
  'campina grande-pb': [-35.8811, -7.2306],
  'parnaiba-pi': [-41.7767, -2.9031],
  'mossoro-rn': [-37.3442, -5.1878],
  'ji-parana-ro': [-61.9458, -10.8828],
  'araguaina-to': [-48.2078, -7.1903],
  'arapiraca-al': [-36.6608, -9.7517],
  'santarem-pa': [-54.7089, -2.4431],
  'maraba-pa': [-49.1178, -5.3686],
  'parintins-am': [-56.7358, -2.6283],
};

function normalizeKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Returns [Longitude, Latitude] for any city in Brazil.
 * Falls back to state centroid with deterministic scatter for inner cities.
 */
export function getCityCoordinates(cityName: string, stateUf: string): [number, number] {
  if (!cityName && !stateUf) return [-47.9292, -15.7801];
  
  const normCity = cityName ? normalizeKey(cityName) : '';
  const normUf = stateUf ? stateUf.toUpperCase().trim() : 'DF';
  const key = `${normCity}-${normUf.toLowerCase()}`;

  if (MAJOR_CITIES_COORDS[key]) {
    return MAJOR_CITIES_COORDS[key];
  }

  const centroid = STATE_CENTROIDS[normUf] || [-47.9292, -15.7801];

  if (!normCity) return centroid;

  // Pseudo-random deterministic offset around state centroid so small cities don't stack directly on top
  let hash = 0;
  for (let i = 0; i < normCity.length; i++) {
    hash = (hash << 5) - hash + normCity.charCodeAt(i);
    hash |= 0;
  }

  const offsetLng = ((Math.abs(hash) % 100) / 100) * 1.6 - 0.8;
  const offsetLat = (((Math.abs(hash) >> 4) % 100) / 100) * 1.6 - 0.8;

  return [centroid[0] + offsetLng, centroid[1] + offsetLat];
}

