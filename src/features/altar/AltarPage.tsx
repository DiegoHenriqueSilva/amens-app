import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleHelp, LockKeyhole, Sparkles, X, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as Dialog from '@radix-ui/react-dialog';
import { useAltar } from './AltarProvider';
import { useUserRole } from '@/hooks/use-user-role';
import { ALTAR_ITEMS, ALTAR_SHELVES, getItemProgress, type AltarItem } from './catalog';
import { AltarArt, AltarSlot } from './AltarSlot';
import { InsigniaSettings, NameWithInsignias, useMyInsignias, usePublicInsignias } from '@/features/insignias/Insignias';
import { CELESTIAL_LEVELS, getLevel } from '@/lib/faith-points';
import { toast } from 'sonner';
import './altar.css';

export default function AltarPage() {
  const {snapshot,userId,loading,error,refresh}=useAltar();
  const {isAdmin}=useUserRole();
  const [previewAll,setPreviewAll]=useState(false);
  useEffect(()=>setPreviewAll(false),[userId,isAdmin]);
  const preview=isAdmin&&previewAll;
  const displaySnapshot=preview ? {
    metrics:snapshot.metrics,
    achievements:ALTAR_ITEMS.map(item=>({itemId:item.id,level:item.levels.length,unlockedAt:'',notifiedAt:null})),
  } : snapshot;
  const [params,setParams]=useSearchParams();
  const [help,setHelp]=useState(false);
  const [showInsignias,setShowInsignias]=useState(false);
  const selected=ALTAR_ITEMS.find(i=>i.id===params.get('item'));
  const profileQuery=useQuery({
    queryKey:['altar-profile',userId],
    enabled:!!userId,
    queryFn:async()=>{
      const [{data:profile,error:profileError},{data:xp}]=await Promise.all([
        supabase.from('profiles').select('display_name,full_name,avatar_url,altar_private').eq('id',userId!).maybeSingle(),
        supabase.from('user_xp').select('total_xp').eq('user_id',userId!).maybeSingle(),
      ]);
      if(profileError) throw profileError;
      return {profile,totalXp:xp?.total_xp??0};
    },
    staleTime:60000,
  });
  const insignias=usePublicInsignias(userId?[userId]:[]);
  const myInsignias=useMyInsignias(userId);
  useEffect(()=>{refresh();},[refresh]);
  const close=()=>setParams({}, {replace:true});
  return <main className="devotee-altar">
    <div className="altar-panel">
      <header className="altar-header">
        <div className="altar-topbar"><Link to="/" aria-label="Voltar ao início"><ArrowLeft/></Link>
          <img src="/amens-wordmark-gold.png" alt="Améns" width="140" height="55"/>
          <button type="button" onClick={()=>setHelp(true)} aria-label="Como funciona o altar"><CircleHelp/></button></div>
        <h1>Altar do Devoto</h1><p>Sua caminhada de fé</p>
      </header>
      {userId&&profileQuery.data&&<>
        <AltarProfileCard profile={profileQuery.data.profile} totalXp={profileQuery.data.totalXp} selection={insignias.data?.[userId]} showSupportInvite={myInsignias.isSuccess&&!myInsignias.data.eligible.includes('supporter')} onToggleInsignias={()=>setShowInsignias(value=>!value)} showInsignias={showInsignias}/>
        <Link className="altar-edit-profile-link altar-edit-profile-link--visible" to="/profile/edit">Editar meu perfil</Link>
        <AltarPrivacySetting
          initialValue={profileQuery.data.profile?.altar_private === true}
          onSaved={()=>void profileQuery.refetch()}
        />
      </>}
      {userId&&showInsignias&&<div className="altar-insignia-dropdown"><InsigniaSettings userId={userId}/></div>}
      {loading&&<p className="altar-status" role="status">Preparando seu altar…</p>}
      {!loading&&!userId&&<div className="altar-status"><p>Entre na sua conta para guardar suas conquistas.</p><Link className="altar-primary" to="/auth">Entrar no Améns</Link></div>}
      {error&&<div className="altar-status" role="alert">Não foi possível atualizar suas conquistas.<button type="button" onClick={refresh}>Tentar novamente</button></div>}
      {isAdmin&&<div className="altar-status">
        <button type="button" aria-pressed={preview} onClick={()=>setPreviewAll(value=>!value)}>
          {preview?'Mostrar minhas conquistas':'Visualizar todos os troféus'}
        </button>
        {preview&&<p role="status">Prévia administrativa — suas conquistas reais não foram alteradas.</p>}
      </div>}
      <div className="altar-shelves" aria-label="Prateleiras de conquistas" aria-busy={loading}>
        {ALTAR_SHELVES.map((shelf,index)=><section className={`altar-shelf ${index<2?'altar-shelf--saints':''}`} key={index}
          aria-label={['Santos de devoção','Santos de proteção','Fidelidade, intercessão e Palavra','Vida de oração','Promessas e comunidade'][index]}
          style={{gridTemplateColumns:`repeat(${shelf.length}, minmax(0,1fr))`}}>
          <span className="altar-shelf-light" aria-hidden="true" />
          {shelf.map(item=><AltarSlot key={item.id} item={item} snapshot={displaySnapshot} onSelect={()=>setParams({item:item.id},{replace:true})}/>)}
        </section>)}
      </div>
      <footer className="altar-footer"><Sparkles size={16}/><p>Cada gesto de fé encontra um lugar aqui.</p><button type="button" onClick={()=>setHelp(true)}>Conheça sua caminhada</button></footer>
    </div>
    <Dialog.Root open={!!selected} onOpenChange={open=>{if(!open)close();}}>
      {selected&&<ItemDetails item={selected} close={close} preview={preview}/>}
    </Dialog.Root>
    <Dialog.Root open={help} onOpenChange={setHelp}>
      <Dialog.Portal><Dialog.Overlay className="altar-dialog-overlay"/><Dialog.Content className="altar-dialog altar-help">
        <Dialog.Title>Seu espaço de devoção</Dialog.Title>
        <Dialog.Description>As peças do altar celebram sua caminhada no Améns.</Dialog.Description>
        <p>Toque nas silhuetas para conhecer os requisitos. As peças conquistadas ganham luz e permanecem no seu altar, mesmo depois de alcançar novos níveis.</p>
        <p>Os dias de acesso e de leitura não precisam ser consecutivos. No Evangelho, vale a meta de dias lidos <strong>ou</strong> de compartilhamentos, sem somar as duas contagens.</p>
        <p>Amizades e convites aceitos contam pessoas diferentes. A lavanda permanece no altar somente enquanto as notificações estiverem ativas.</p>
        <p>Aproveitamos os pedidos, intercessões e conexões que ainda estão registrados na sua conta. Leituras, acessos, terços e dias de novena passam a ser registrados para o altar a partir desta atualização.</p>
        <p>Uma conquista antiga reconhecida agora terá a data em que foi registrada no altar. Estas lembranças celebram sua dedicação; não medem o valor da sua fé.</p>
        <Dialog.Close className="altar-primary">Entendi</Dialog.Close>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </main>;
}

function AltarPrivacySetting({initialValue,onSaved}:{initialValue:boolean;onSaved:(value:boolean)=>void}) {
  const [isPrivate,setIsPrivate]=useState(initialValue);
  const [saving,setSaving]=useState(false);
  useEffect(()=>setIsPrivate(initialValue),[initialValue]);
  const change=async(value:boolean)=>{
    setIsPrivate(value);
    setSaving(true);
    const {error}=await supabase.rpc('save_altar_privacy',{p_private:value});
    if(error){
      setIsPrivate(!value);
      toast.error('Não foi possível alterar a privacidade do altar.');
    }else{
      onSaved(value);
      toast.success(value?'Seu altar agora está visível apenas para amigos.':'Seu altar agora está público.');
    }
    setSaving(false);
  };
  return <label className="altar-privacy-setting">
    <span className="altar-privacy-setting__icon"><LockKeyhole size={18} aria-hidden="true"/></span>
    <span className="altar-privacy-setting__copy"><strong>Tornar meu altar privado</strong><small>Apenas seus amigos poderão vê-lo.</small></span>
    <input type="checkbox" role="switch" checked={isPrivate} disabled={saving} aria-label="Tornar meu altar privado" onChange={event=>void change(event.target.checked)}/>
    <span className="altar-privacy-setting__switch" aria-hidden="true" />
  </label>;
}

function AltarProfileCard({profile,totalXp,selection,showSupportInvite,onToggleInsignias,showInsignias}:{profile:{display_name?:string|null;full_name?:string|null;avatar_url?:string|null};totalXp:number;selection?:{selected:string[];showSupporterCard:boolean};showSupportInvite:boolean;onToggleInsignias:()=>void;showInsignias:boolean}) {
  const name=profile.display_name||profile.full_name||'Membro da Fé';
  const level=getLevel(totalXp);
  const levelNumber=CELESTIAL_LEVELS.indexOf(level)+1;
  const supporterVisible=selection?.showSupporterCard===true;
  return <section className="altar-profile-card" aria-label="Meu perfil no altar">
    <div className="altar-profile-card__identity">
      <span className="altar-profile-card__avatar">{profile.avatar_url?<img src={profile.avatar_url} alt="" />:<UserRound size={22} aria-hidden="true"/>}</span>
      <span className="altar-profile-card__copy"><span className={'altar-profile-card__name '+(supporterVisible?'insignia-supporter-name':'')}>{name}</span><span className="altar-profile-card__level">Nível {levelNumber} · {level.name}</span></span>
      {supporterVisible&&<Link to="/donate" className="altar-profile-card__supporter" aria-label="Apoiador do Améns. Abrir página de doações"><img src="/insignias/supporter-badge.png" alt="Apoiador do Améns" /></Link>}
      {showSupportInvite&&<Link to="/donate" className="altar-profile-card__support-invite" aria-label="Apoie o Améns e fortaleça esta missão">
        <small>Faça parte</small><strong>Apoie o Améns</strong><span>Fortaleça esta missão</span>
      </Link>}
    </div>
    <button type="button" className="altar-profile-card__link" onClick={onToggleInsignias} aria-expanded={showInsignias}>Ver minhas insígnias <span aria-hidden="true">{showInsignias?'⌃':'›'}</span></button>
  </section>;
}

function ItemDetails({item,close,preview}:{item:AltarItem;close:()=>void;preview:boolean}) {
  const {snapshot,userId}=useAltar();
  const p=getItemProgress(item,snapshot);
  return <Dialog.Portal><Dialog.Overlay className="altar-dialog-overlay"/><Dialog.Content className="altar-dialog">
    <span className="altar-sheet-handle" aria-hidden="true"/>
    <Dialog.Close className="altar-close" aria-label="Fechar detalhes"><X size={20}/></Dialog.Close>
    <AltarArt index={preview?item.levels[item.levels.length-1].art:p.art} className={`altar-detail-art ${p.level||preview?'':'altar-detail-art--locked'}`}/>
    {preview&&<p>Prévia da peça no nível máximo. Seu progresso real aparece abaixo.</p>}
    <Dialog.Title>{item.name}</Dialog.Title>
    <span className={`altar-tier ${p.max?'altar-tier--gold':''}`}>{p.level?<><Sparkles size={15}/>{item.levels[p.level-1].name} conquistado</>:<><LockKeyhole size={15}/>Ainda não conquistado</>}</span>
    <Dialog.Description>{p.level?item.levels[p.level-1].requirement:p.next.requirement}</Dialog.Description>
    {p.award&&<p className="altar-date">Registrado em {new Date(p.award.unlockedAt).toLocaleDateString('pt-BR')}</p>}
    {!p.max&&<section className="altar-progress">
      <h3>{p.level?'Próximo nível':'Sua primeira conquista'}: {p.next.name}</h3>
      <p>{p.next.requirement}</p>
      <div><span>{p.current} de {p.next.target}</span><span>{Math.floor(p.percent)}%</span></div>
      <progress value={p.percent} max={100} aria-label="Progresso da próxima conquista"/>
      {item.id==='gospel'&&<small>{snapshot.metrics.gospel_read??0} dias de leitura · {snapshot.metrics.gospel_share??0} compartilhamentos</small>}
      {item.id==='fraternity'&&p.level===2&&<small>Retornos: {snapshot.metrics.feedback_percent??0}% · Meta: 75%</small>}
    </section>}
    {p.max&&<p className="altar-complete">Esta peça já alcançou seu nível máximo.</p>}
    {item.levels.length>1&&<div className="altar-evolution" aria-label="Evolução da peça">{item.levels.map((level,index)=>
      <div className={index+1===p.level?'altar-evolution-current':''} key={level.name}>
        <AltarArt index={level.art}/><span>{level.name}{index+1>p.level&&<LockKeyhole size={12}/>}</span>
      </div>)}</div>}
    <Link to={userId?item.route:'/auth'} className="altar-primary" onClick={close}><Sparkles size={17}/>{userId?'Continuar minha caminhada':'Entrar para começar'}</Link>
  </Dialog.Content></Dialog.Portal>;
}
