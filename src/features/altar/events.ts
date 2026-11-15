import { supabase } from '@/integrations/supabase/client';

export type AltarEventKind = 'login'|'gospel_read'|'gospel_share'|'promise_read'|'novena_day'|'rosary_marian'|'rosary_mercy'|'rosary_special';
interface PendingEvent { userId: string; kind: AltarEventKind; key: string }
const STORAGE_KEY = 'amens:altar:pending:v1';
export const ALTAR_CHANGED = 'amens:altar:changed';
let flushPromise: Promise<void> | null = null;
let memory: PendingEvent[] = [];
let storageUnavailable = false;
function readQueue(): PendingEvent[] {
  if (storageUnavailable) return memory;
  try { const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); return Array.isArray(data)?data:[]; } catch { return memory; }
}
function writeQueue(events: PendingEvent[]) {
  memory=events;
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(events)); } catch { storageUnavailable=true; }
}
export function refreshAltar() { window.dispatchEvent(new Event(ALTAR_CHANGED)); }
export function flushAltarEvents(): Promise<void> {
  if (flushPromise) return flushPromise;
  if (!navigator.onLine) return Promise.resolve();
  flushPromise=flushQueue().finally(()=>{flushPromise=null;});
  return flushPromise;
}
async function flushQueue() {
  try {
    const {data:{session}}=await supabase.auth.getSession();
    if (!session) return;
    const userId=session.user.id;
    for (const event of readQueue().filter(e=>e.userId===userId)) {
      const controller=new AbortController();
      const timeout=window.setTimeout(()=>controller.abort(),15000);
      let error;
      try {
        // Bind retries to their originating account even if another tab signs in.
        ({error}=await supabase.rpc('altar_record_event',{p_kind:event.kind,p_key:event.key})
          .setHeader('Authorization',`Bearer ${session.access_token}`).abortSignal(controller.signal));
      } finally {window.clearTimeout(timeout);}
      if (error) break;
      writeQueue(readQueue().filter(e=>!(e.userId===userId&&e.kind===event.kind&&e.key===event.key)));
    }
  } catch { /* Altar connectivity must never interrupt an existing activity. */ }
}
export async function recordAltarEvent(kind: AltarEventKind, key: string=crypto.randomUUID()) {
  try {
    const {data:{session}}=await supabase.auth.getSession();
    if (!session) return;
    if (kind==='login'||kind==='gospel_read') key=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
    const event={userId:session.user.id,kind,key};
    const queue=readQueue();
    if (!queue.some(e=>e.userId===event.userId&&e.kind===kind&&e.key===key)) writeQueue([...queue,event]);
    await flushAltarEvents();
    refreshAltar();
  } catch { /* Achievements are a non-blocking companion feature. */ }
}
