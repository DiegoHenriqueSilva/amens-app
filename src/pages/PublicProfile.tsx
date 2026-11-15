import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, LockKeyhole, MapPin, Sparkles, UserPlus, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NameWithInsignias, usePublicInsignias } from '@/features/insignias/Insignias';
import { ALTAR_SHELVES, EMPTY_ALTAR } from '@/features/altar/catalog';
import { AltarSlot } from '@/features/altar/AltarSlot';
import { CELESTIAL_LEVELS, getLevel } from '@/lib/faith-points';
import { toast } from 'sonner';
import '@/features/altar/altar.css';

type PublicProfileData = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  show_real_name: boolean;
  city: string | null;
  state: string | null;
  parish: string | null;
  created_at: string;
  avatar_url: string | null;
  total_xp: number;
};

type PublicAltarResponse = {
  found: boolean;
  canView: boolean;
  isPrivate?: boolean;
  profile?: PublicProfileData;
};

type FriendshipState = 'loading' | 'signed-out' | 'self' | 'friend' | 'outgoing' | 'incoming' | 'none';

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [privateAltar, setPrivateAltar] = useState(false);
  const [friendship, setFriendship] = useState<FriendshipState>('loading');
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  const insignias = usePublicInsignias(id && profile ? [id] : []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(false);
    setPrivateAltar(false);
    supabase.rpc('public_altar_profile', { p_user_id: id }).then(({data,error:requestError}) => {
      if (!active) return;
      if (requestError || !data) {
        setError(true);
        return;
      }
      const result=data as unknown as PublicAltarResponse;
      if(!result.found){setError(true);return;}
      if(!result.canView){setPrivateAltar(true);setProfile(null);return;}
      setProfile(result.profile || null);
    }).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let active=true;
    const loadFriendship=async()=>{
      setFriendship('loading');
      const {data:{user}}=await supabase.auth.getUser();
      if(!active)return;
      if(!user){setFriendship('signed-out');return;}
      if(user.id===id){setFriendship('self');return;}
      const [friendResult,outgoingResult,incomingResult]=await Promise.all([
        supabase.from('friendships').select('id').eq('user_id',user.id).eq('friend_id',id).limit(1).maybeSingle(),
        supabase.from('friend_requests').select('id').eq('sender_id',user.id).eq('receiver_id',id).eq('status','pending').limit(1).maybeSingle(),
        supabase.from('friend_requests').select('id').eq('sender_id',id).eq('receiver_id',user.id).eq('status','pending').limit(1).maybeSingle(),
      ]);
      if(!active)return;
      if(friendResult.data)setFriendship('friend');
      else if(outgoingResult.data)setFriendship('outgoing');
      else if(incomingResult.data)setFriendship('incoming');
      else setFriendship('none');
    };
    void loadFriendship();
    return()=>{active=false;};
  },[id]);

  const addFriend=async()=>{
    if(!id)return;
    if(friendship==='signed-out'){navigate('/auth');return;}
    if(friendship==='incoming'){navigate('/friends');return;}
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){navigate('/auth');return;}
    setSendingFriendRequest(true);
    const {error:sendError}=await supabase.from('friend_requests').insert({sender_id:user.id,receiver_id:id,status:'pending'});
    if(sendError){
      if(sendError.code==='23505'){
        setFriendship('outgoing');
        toast.info('A solicitação de amizade já foi enviada.');
      }else toast.error('Não foi possível enviar a solicitação de amizade.');
    }else{
      setFriendship('outgoing');
      toast.success('Solicitação de amizade enviada!');
    }
    setSendingFriendRequest(false);
  };

  const name = profile?.display_name || profile?.full_name || 'Membro da Fé';
  const level = profile ? getLevel(profile.total_xp) : null;
  const levelNumber = level ? CELESTIAL_LEVELS.indexOf(level) + 1 : 1;
  const selection = id ? insignias.data?.[id] : undefined;
  const supporterVisible = selection?.showSupporterCard === true;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;

  return <main className="devotee-altar">
    <div className="altar-panel">
      <header className="altar-header">
        <div className="altar-topbar">
          <button type="button" onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft /></button>
          <img src="/amens-wordmark-gold.png" alt="Améns" width="140" height="55" />
          <span aria-hidden="true" className="w-11 h-11" />
        </div>
        <h1>Altar de {name}</h1>
        <p>Caminhada pública de fé</p>
      </header>

      {loading && <p className="altar-status" role="status">Carregando altar…</p>}
      {error && !loading && <div className="altar-status" role="alert">
        <p>Este perfil não está disponível.</p>
        <button type="button" onClick={() => navigate('/friends')}>Voltar para amigos</button>
      </div>}
      {privateAltar && !loading && <div className="altar-status altar-private-notice" role="status">
        <LockKeyhole aria-hidden="true" />
        <h2>Este altar é privado</h2>
        <p>Apenas os amigos desta pessoa podem acompanhar sua caminhada de fé.</p>
        <FriendshipButton state={friendship} sending={sendingFriendRequest} onClick={addFriend}/>
        <button type="button" onClick={() => navigate('/friends')}>Voltar para amigos</button>
      </div>}

      {profile && !loading && <>
        <section className="altar-profile-card altar-profile-card--public" aria-label={`Perfil público de ${name}`}>
          <div className="altar-profile-card__identity">
            <span className="altar-profile-card__avatar">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <UserRound size={22} aria-hidden="true" />}
            </span>
            <span className="altar-profile-card__copy">
              <span className={'altar-profile-card__name ' + (supporterVisible ? 'insignia-supporter-name' : '')}>
                <NameWithInsignias selection={selection}>{name}</NameWithInsignias>
              </span>
              <span className="altar-profile-card__level">Nível {levelNumber} · {level?.name}</span>
              {(profile.parish || (profile.city && profile.state)) && <span className="altar-profile-card__location"><MapPin size={12} /> {[profile.parish, profile.city, profile.state].filter(Boolean).join(' · ')}</span>}
            </span>
            {supporterVisible && <Link to="/donate" className="altar-profile-card__supporter" aria-label="Apoiador do Améns. Abrir página de doações"><img src="/insignias/supporter-badge.png" alt="Apoiador do Améns" /></Link>}
          </div>
          <p className="altar-public-note">Membro desde {memberSince || 'a sua chegada ao Améns'}.</p>
          <FriendshipButton state={friendship} sending={sendingFriendRequest} onClick={addFriend}/>
        </section>

        <div className="altar-public-heading"><Sparkles size={16} /><span>Conquistas no altar</span></div>
        <div className="altar-shelves" aria-label="Altar público de conquistas">
          {ALTAR_SHELVES.map((shelf, index) => <section
            className={`altar-shelf ${index < 2 ? 'altar-shelf--saints' : ''}`}
            key={index}
            aria-label="Prateleira de conquistas"
            style={{ gridTemplateColumns: `repeat(${shelf.length}, minmax(0,1fr))` }}
          >
            <span className="altar-shelf-light" aria-hidden="true" />
            {shelf.map(item => <AltarSlot key={item.id} item={item} snapshot={EMPTY_ALTAR} onSelect={() => undefined} />)}
          </section>)}
        </div>
        <footer className="altar-footer">
          <Sparkles size={16} />
          <p>As peças visíveis representam a caminhada de fé no Améns.</p>
          <Link to="/altar">Conheça o seu altar</Link>
        </footer>
      </>}
    </div>
  </main>;
}

function FriendshipButton({state,sending,onClick}:{state:FriendshipState;sending:boolean;onClick:()=>void}) {
  if(state==='self'||state==='friend'||state==='loading')return null;
  if(state==='outgoing')return <button type="button" className="altar-friend-button altar-friend-button--pending" disabled><Clock3 aria-hidden="true"/> Solicitação enviada</button>;
  if(state==='incoming')return <button type="button" className="altar-friend-button" onClick={onClick}><UserPlus aria-hidden="true"/> Responder solicitação</button>;
  return <button type="button" className="altar-friend-button" disabled={sending} onClick={onClick}><UserPlus aria-hidden="true"/> {sending?'Enviando…':state==='signed-out'?'Entrar para adicionar':'Adicionar amigo'}</button>;
}
