import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ALTAR_CHANGED, flushAltarEvents, recordAltarEvent } from './events';
import { ALTAR_ITEMS, EMPTY_ALTAR, type AltarSnapshot, type AltarAchievement } from './catalog';
import './altar-notice.css';

const Context=createContext({snapshot:EMPTY_ALTAR,userId:null as string|null,loading:true,error:false,refresh:()=>{}});
export const useAltar=()=>useContext(Context);

export function AltarProvider({children}:{children:ReactNode}) {
  const [userId,setUserId]=useState<string|null>(null);
  const [snapshot,setSnapshot]=useState<AltarSnapshot>(EMPTY_ALTAR);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [notice,setNotice]=useState<AltarAchievement|null>(null);
  const [noticeCount,setNoticeCount]=useState(1);
  const [welcomeVisible,setWelcomeVisible]=useState(()=>document.documentElement.classList.contains('amens-welcome'));
  const activeUser=useRef<string|null>(null);
  const busy=useRef(false);
  const refreshAgain=useRef(false);
  const seen=useRef(new Set<string>());

  const refresh=useCallback(async()=>{
    const uid=activeUser.current;
    if (!uid||document.visibilityState==='hidden') return;
    if (busy.current) {refreshAgain.current=true;return;}
    busy.current=true;
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),20000);
    try {
      await flushAltarEvents();
      const {data:{session}}=await supabase.auth.getSession();
      if(!session||session.user.id!==uid) return;
      const {data,error:failure}=await supabase.rpc('altar_sync')
        .setHeader('Authorization',`Bearer ${session.access_token}`).abortSignal(controller.signal);
      if (activeUser.current!==uid) return;
      if(failure) throw failure;
      setSnapshot(data as AltarSnapshot);
      setError(false);
      const pending=(data as AltarSnapshot).achievements.filter(a=>!a.notifiedAt&&!seen.current.has(`${uid}:${a.itemId}:${a.level}`));
      if (pending.length) {
        const award=pending[pending.length-1];
        setNoticeCount(pending.length);
        setNotice(award);
        // Summarize a historic import with the latest item instead of flooding the screen.
        for (const a of pending) {
          seen.current.add(`${uid}:${a.itemId}:${a.level}`);
          void supabase.rpc('altar_acknowledge',{p_item:a.itemId,p_level:a.level})
            .setHeader('Authorization',`Bearer ${session.access_token}`).then(()=>{}).catch(()=>{});
        }
      }
    } catch { if(activeUser.current===uid) setError(true); }
    finally {
      window.clearTimeout(timeout);busy.current=false;
      if(activeUser.current===uid)setLoading(false);
      if(refreshAgain.current){refreshAgain.current=false;window.setTimeout(()=>void refresh(),0);}
    }
  },[]);

  useEffect(()=>{
    let disposed=false;
    const changeUser=(id:string|null)=>{
      if(disposed||id===activeUser.current) {if(!id)setLoading(false);return;}
      activeUser.current=id;setUserId(id);setSnapshot(EMPTY_ALTAR);setNotice(null);setError(false);setLoading(!!id);
      if(id) void recordAltarEvent('login').then(refresh);
    };
    void supabase.auth.getSession().then(({data:{session}})=>changeUser(session?.user.id??null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      // Schedule work outside the Supabase auth lock.
      window.setTimeout(()=>changeUser(session?.user.id??null),0);
    });
    const onWake=()=>{if(document.visibilityState!=='hidden'&&activeUser.current)void recordAltarEvent('login').then(refresh);};
    window.addEventListener(ALTAR_CHANGED,refresh);
    window.addEventListener('online',onWake);
    document.addEventListener('visibilitychange',onWake);
    const timer=window.setInterval(()=>{void refresh();},45000);
    return()=>{disposed=true;subscription.unsubscribe();window.clearInterval(timer);window.removeEventListener(ALTAR_CHANGED,refresh);window.removeEventListener('online',onWake);document.removeEventListener('visibilitychange',onWake);};
  },[refresh]);
  useEffect(()=>{
    const observer=new MutationObserver(()=>setWelcomeVisible(document.documentElement.classList.contains('amens-welcome')));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{if(!notice||welcomeVisible)return;const timer=window.setTimeout(()=>setNotice(null),9000);return()=>window.clearTimeout(timer);},[notice,welcomeVisible]);
  const item=ALTAR_ITEMS.find(i=>i.id===notice?.itemId);
  return <Context.Provider value={{snapshot,userId,loading,error,refresh}}>
    {children}
    {notice&&item&&!welcomeVisible&&<aside className="altar-achievement-notice" role="status" aria-live="polite">
      <Sparkles aria-hidden="true" size={25}/>
      <Link to={`/altar?item=${item.id}`} onClick={()=>setNotice(null)}>
        <strong>{noticeCount>1?`${noticeCount} novas conquistas no seu altar`:'Uma nova conquista no seu altar'}</strong>
        <span>{item.name} · {item.levels[notice.level-1]?.name}</span>
        <small>Toque para conhecer</small>
      </Link>
      <button type="button" onClick={()=>setNotice(null)} aria-label="Fechar aviso de conquista"><X size={19}/></button>
    </aside>}
  </Context.Provider>;
}
