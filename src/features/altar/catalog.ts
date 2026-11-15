export interface AltarLevel { name: string; target: number; art: number; requirement: string }
export interface AltarItem {
  id: string; name: string; label: string; metric: string; route: string;
  levels: AltarLevel[];
}
export interface AltarAchievement { itemId: string; level: number; unlockedAt: string; notifiedAt: string | null }
export interface AltarSnapshot { metrics: Record<string, number>; achievements: AltarAchievement[] }
export const EMPTY_ALTAR: AltarSnapshot = { metrics: {}, achievements: [] };
const saints = [
  ['ns-desatadora','Desatadora de Nós'], ['sao-judas','São Judas Tadeu'],
  ['divina-misericordia','Divina Misericórdia'], ['santa-rita','Santa Rita'],
  ['sao-bento','São Bento'], ['sao-miguel','São Miguel'],
];
export const ALTAR_ITEMS: AltarItem[] = [
  ...saints.map(([id,name],art) => ({id,name,label:name,metric:id,route:`/novena/${id}`,
    levels:[{name:'Conquistado',target:9,art,requirement:`Conclua os 9 dias da novena de ${name}.`}]})),
  { id:'candle',name:'Lâmpada do Peregrino',label:'Fidelidade',metric:'login',route:'/',levels:
    [30,60,120].map((target,i)=>({name:['Bronze','Prata','Ouro'][i],target,art:6+i,requirement:`Acesse sua conta em ${target} dias diferentes. Não precisam ser consecutivos.`})) },
  { id:'cross',name:'Cruz das Orações Atendidas',label:'Intercessão',metric:'cause',route:'/pray',levels:
    [30,60,120].map((target,i)=>({name:['Bronze','Prata','Ouro'][i],target,art:9+i,requirement:`Interceda por ${target} causas diferentes de outras pessoas.`})) },
  { id:'fraternity',name:'Preces da Fraternidade',label:'Fraternidade',metric:'request',route:'/submit',levels:
    [30,60,90].map((target,i)=>({name:['Selo simples','Selo prateado','Livro dourado'][i],target,art:12+i,requirement:`Envie ${target} pedidos de oração${i===2?' e dê retorno de status em pelo menos 75% dos seus pedidos':''}.`})) },
  { id:'gospel',name:'Livro dos Evangelhos',label:'Evangelho',metric:'gospel',route:'/daily-gospel',levels:
    [15,30,45].map((target,i)=>({name:['Couro','Prata','Ouro'][i],target,art:15+i,requirement:`Leia o Evangelho em ${target} dias diferentes OU realize ${target} compartilhamentos.`})) },
  {id:'rosary-wood',name:'Rosário de Madeira',label:'Terço Mariano',metric:'rosary_marian',route:'/rosary/misterios',levels:[{name:'Madeira polida',target:10,art:18,requirement:'Conclua 10 Terços Marianos.'}]},
  {id:'rosary-pearl',name:'Rosário de Madrepérola',label:'Misericórdia',metric:'rosary_mercy',route:'/rosary/misericordia',levels:[{name:'Madrepérola',target:10,art:19,requirement:'Conclua 10 Terços da Misericórdia.'}]},
  {id:'rosary-gold',name:'Coroa de Virtude',label:'Libertação e São Miguel',metric:'rosary_special',route:'/rosary-selection',levels:[{name:'Elos dourados',target:10,art:20,requirement:'Conclua 10 orações entre Terços da Libertação e Coroas de São Miguel.'}]},
  {id:'chalice',name:'Cálice da Divina Promessa',label:'Promessas',metric:'promise_read',route:'/divine-promise',levels:[
    {name:'Estanho',target:30,art:21,requirement:'Leia 30 promessas retiradas no aplicativo.'},
    {name:'Ouro',target:60,art:22,requirement:'Leia 60 promessas retiradas no aplicativo.'}]},
  {id:'shield',name:'Placa de Conexão',label:'Amigos',metric:'connection',route:'/friends',levels:
    [5,10,15].map((target,i)=>({name:['Bronze','Prata','Ouro'][i],target,art:23+i,requirement:`Conecte-se a ${target} pessoas por amizades ou convites aceitos. Cada pessoa conta uma vez.`}))},
  {id:'lavender',name:'Lavanda da Acolhida',label:'Notificações',metric:'notifications',route:'/notifications',levels:[{name:'Ativa',target:1,art:26,requirement:'Mantenha as notificações ativas para manter este arranjo no seu altar.'}]},
];
export const ALTAR_SHELVES = [ALTAR_ITEMS.slice(0,3),ALTAR_ITEMS.slice(3,6),ALTAR_ITEMS.slice(6,10),ALTAR_ITEMS.slice(10,13),ALTAR_ITEMS.slice(13)];
export function getItemProgress(item: AltarItem, snapshot: AltarSnapshot) {
  const earned = snapshot.achievements.filter(a=>a.itemId===item.id).sort((a,b)=>b.level-a.level);
  const level = earned[0]?.level ?? 0;
  const next = item.levels[Math.min(level,item.levels.length-1)];
  const current = snapshot.metrics[item.metric] ?? 0;
  let percent = Math.min(100, current / next.target * 100);
  if (item.id==='fraternity' && level===2) percent = Math.min(percent,(snapshot.metrics.feedback_percent??0)/75*100);
  return {level,next,current,percent,award:earned[0],max:level===item.levels.length,
    art:item.levels[Math.max(0,level-1)].art};
}
