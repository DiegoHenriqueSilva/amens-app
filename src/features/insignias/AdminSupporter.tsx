import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';

export function AdminSupporter({user,onClose}:{user:{id:string;name:string};onClose:()=>void}) {
  const qc=useQueryClient();
  const [saving,setSaving]=useState(false);
  const query=useQuery({queryKey:['admin-supporter',user.id],retry:1,queryFn:async()=>{
    const {data,error}=await (supabase.rpc as any)('admin_supporter',{p_user:user.id});
    if(error)throw error;
    return data as boolean;
  }});
  async function save(){
    setSaving(true);
    try {
      const {error}=await (supabase.rpc as any)('admin_supporter',{p_user:user.id,p_active:!query.data});
      if(error)throw error;
      await Promise.all(['admin-supporter','my-insignias','public-insignias'].map(key=>qc.invalidateQueries({queryKey:[key]})));
      toast.success(query.data?'Reconhecimento removido.':'Doação confirmada. Insígnia liberada.');
      onClose();
    }catch{toast.error('Não foi possível atualizar o reconhecimento.');}
    finally{setSaving(false);}
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!saving)onClose();}}><DialogContent>
    <DialogHeader><DialogTitle>Apoio ao Améns</DialogTitle><DialogDescription>{user.name}</DialogDescription></DialogHeader>
    {query.isLoading?<p>Consultando reconhecimento…</p>:query.isError?<p role="alert">Não foi possível consultar. <button onClick={()=>query.refetch()}>Tentar novamente</button></p>:<>
      <p>{query.data?'Esta conta já tem uma doação confirmada. Remova o reconhecimento apenas para corrigir um registro incorreto.':'Confirme apenas se você já verificou o recebimento da doação desta pessoa.'}</p>
      <p className="text-sm text-muted-foreground">A pessoa poderá escolher no perfil se deseja exibir a insígnia e o cartão. O valor doado não será mostrado.</p>
      <Button disabled={saving} onClick={save}>{saving?'Salvando…':query.data?'Remover reconhecimento':'Confirmar doação recebida'}</Button>
    </>}
  </DialogContent></Dialog>;
}
