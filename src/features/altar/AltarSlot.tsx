import { LockKeyhole } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getItemProgress, type AltarItem, type AltarSnapshot } from './catalog';

// Atlas rectangles preserve each object's original proportions; no image distortion.
const rows=[0,253,485,716,926,1145,1374];
export function AltarArt({index,className=''}:{index:number;className?:string}) {
  const column=index%5,row=Math.floor(index/5);
  const saintRects=[[42,0,169,253],[278,0,164,253],[488,0,183,253],[728,0,157,253],[954,0,153,253],[22,253,200,232]];
  const [x,y,width,height]=saintRects[index]??[column*229,rows[row],229,rows[row+1]-rows[row]];
  return <span aria-hidden="true" className={`altar-art ${className}`} style={{
    aspectRatio:`${width} / ${height}`,
    backgroundSize:`${1145/width*100}% ${1374/height*100}%`,
    backgroundPosition:`${x/(1145-width)*100}% ${y/(1374-height)*100}%`,
  }}/>;
}
export function AltarSlot({item,snapshot,onSelect}:{item:AltarItem;snapshot:AltarSnapshot;onSelect:()=>void}) {
  const p=getItemProgress(item,snapshot);
  const state=p.max?'max_level':p.level?'unlocked':'locked';
  return <Tooltip delayDuration={250}><TooltipTrigger asChild>
    <button type="button" className={`altar-slot altar-slot--${state}`} onClick={onSelect}
      aria-label={`${item.name}. ${p.level?item.levels[p.level-1].name+' conquistado':p.next.requirement}`}>
      <span className="altar-slot-object"><AltarArt index={p.art}/>{!p.level&&<span className="altar-lock"><LockKeyhole size={13}/></span>}</span>
      <span className="altar-nameplate">{item.label}</span>
    </button>
  </TooltipTrigger><TooltipContent className="altar-tooltip" side="top">
    <strong>{item.name}</strong><p>{p.max?'Conquista completa. Toque para ver os detalhes.':p.next.requirement}</p>
    {!p.max&&<small>{p.current} / {p.next.target}</small>}
  </TooltipContent></Tooltip>;
}
