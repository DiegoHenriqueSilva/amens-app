import {useEffect,useState,type ReactNode} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {BookOpen,Flame,Heart,HandHeart,Wheat} from 'lucide-react';
import {Link} from 'react-router-dom';
import {supabase} from '@/integrations/supabase/client';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {toast} from 'sonner';
import './insignias.css';

export const INSIGNIAS = [
  {id:'intercessor',name:'Intercessão',description:'Intercedeu por 30 causas diferentes.',Icon:HandHeart},
  {id:'constancy',name:'Constância',description:'Acessou o Améns em 30 dias diferentes.',Icon:Flame},
  {id:'gospel',name:'Evangelho',description:'Leu o Evangelho em 15 dias ou realizou 15 compartilhamentos.',Icon:BookOpen},
  {id:'supporter',name:'Apoiador(a) do Améns',description:'Ajudou a manter este espaço de oração.',Icon:Heart},
] as const;
type PublicSelection={selected:string[];showSupporterCard:boolean};
type Preferences=PublicSelection & {eligible:string[]};
const rpc=async<T,>(name:string,args?:Record<string,unknown>):Promise<T>=>{
  const {data,error}=await (supabase.rpc as any)(name,args);
  if(error)throw error;
  return data as T;
};
export function usePublicInsignias(ids:string[]) {
  const users=[...new Set(ids.filter(Boolean))].sort();
  return useQuery<Record<string,PublicSelection>>({
    queryKey:['public-insignias',users],
    enabled:users.length>0,
    queryFn:async()=>{
      const result:Record<string,PublicSelection>={};
      for(let i=0;i<users.length;i+=200) Object.assign(result,await rpc('public_insignias',{p_users:users.slice(i,i+200)}));
      return result;
    },
    staleTime:30000,retry:1,
  });
}
export function useMyInsignias(userId?:string|null) {
  return useQuery<Preferences>({
    queryKey:['my-insignias',userId],
    enabled:!!userId,
    queryFn:()=>rpc<Preferences>('my_insignias'),
    retry:1,
  });
}
export function NameWithInsignias({children,selection}:{children:ReactNode;selection?:PublicSelection}) {
  const chosen=selection?.selected??[];
  const supporterVisible=selection?.showSupporterCard===true;
  const visible=supporterVisible?[...chosen.filter(id=>id!=='supporter'),'supporter']:chosen.filter(id=>id!=='supporter');
  return <span className="insignia-name-group">
    <span className={supporterVisible?'insignia-supporter-name':undefined}>{children}</span>
    {INSIGNIAS.filter(b=>visible.includes(b.id)).map(({id,name,description,Icon})=>
      <Popover key={id}><PopoverTrigger asChild>
        <button type="button" className={`insignia-symbol ${id==='supporter'?'insignia-supporter-glow':''}`} aria-label={name} onClick={event=>event.stopPropagation()}>
          <Icon size={19} strokeWidth={1.8} aria-hidden="true"/>
          {id==='supporter'&&<Wheat className="insignia-supporter-branch" size={16} strokeWidth={1.8} aria-hidden="true"/>}
        </button>
      </PopoverTrigger><PopoverContent className="w-64 text-sm" onClick={event=>event.stopPropagation()}>
        <strong>{name}</strong><p className="mt-1 font-normal">{description}</p>
        {id==='supporter'&&<Link className="insignia-supporter-cta" to="/donate">Ajude você também!</Link>}
      </PopoverContent></Popover>)}
  </span>;
}
export function InsigniaSettings({userId}:{userId:string}) {
  const qc=useQueryClient();
  const query=useMyInsignias(userId);
  const [selected,setSelected]=useState<string[]>([]);
  const [showCard,setShowCard]=useState(false);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{if(query.data){setSelected(query.data.selected.filter(id=>id!=='supporter'));setShowCard(query.data.showSupporterCard);}},[query.data]);
  async function save(){
    setSaving(true);
    try{
      await rpc('save_insignias',{p_selected:selected,p_show_card:showCard});
      await Promise.all([qc.invalidateQueries({queryKey:['my-insignias',userId]}),qc.invalidateQueries({queryKey:['public-insignias']})]);
      toast.success('Insígnias atualizadas.');
    }catch{toast.error('Não foi possível salvar suas insígnias. Tente novamente.');}
    finally{setSaving(false);}
  }
  if(query.isLoading)return <p role="status">Carregando insígnias…</p>;
  if(query.isError)return <section className="insignia-settings"><p>As insígnias ainda não estão disponíveis.</p><button type="button" onClick={()=>query.refetch()}>Tentar novamente</button></section>;
  const eligible=query.data?.eligible??[];
  const supporter=eligible.includes('supporter');
  return <section className="insignia-settings" aria-label="Minhas insígnias">
    <h2>Minhas insígnias</h2><p>Escolha até três para mostrar ao lado do seu nome. Desmarque todas se preferir não exibir.</p>
    <div className="insignia-options">{INSIGNIAS.filter(({id})=>id!=='supporter').map(({id,name,description,Icon})=>
      <label key={id} className={!eligible.includes(id)?'insignia-option-locked':''}>
        <input type="checkbox" checked={selected.includes(id)} disabled={saving||!eligible.includes(id)||(!selected.includes(id)&&selected.length>=3)}
          onChange={event=>setSelected(current=>event.target.checked?[...current,id]:current.filter(value=>value!==id))}/>
        <Icon size={21} aria-hidden="true"/><span><strong>{name}</strong><small>{id==='supporter'&&!supporter?'Disponível após confirmação de uma doação.':description}</small></span>
      </label>)}</div>
    {supporter&&<label className="insignia-card-choice"><input type="checkbox" checked={showCard} disabled={saving} onChange={event=>setShowCard(event.target.checked)}/> Mostrar o cartão de apoiador no meu perfil</label>}
    <button className="insignia-save" type="button" disabled={saving} onClick={save}>{saving?'Salvando…':'Salvar insígnias'}</button>
  </section>;
}
