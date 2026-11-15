import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft, CheckCircle2, HandHeart, HeartHandshake, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import "./donate.css";

type Donation = {
  id: string;
  amountCents: number;
  charityAmountCents: number;
  environment: "test" | "production";
  status: string;
  statusDetail?: string | null;
  approvedAt?: string | null;
  createdAt: string;
};

const presetValues = [1000, 2500, 5000, 10000];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statusCopy: Record<string, string> = {
  creating: "Preparando pagamento",
  created: "Aguardando pagamento",
  pending: "Pagamento em análise",
  approved: "Doação confirmada",
  partially_refunded: "Doação parcialmente devolvida",
  rejected: "Pagamento não aprovado",
  cancelled: "Pagamento cancelado",
  refunded: "Valor devolvido",
  expired: "Pagamento expirado",
  create_failed: "Pagamento não iniciado",
};

export default function Donate() {
  const [params, setParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selected, setSelected] = useState(2500);
  const [custom, setCustom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Donation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const result = params.get("result");

  const customCents = useMemo(() => {
    const normalized = custom.trim().replace(/\s/g, "").replace(".", "").replace(",", ".");
    if (!normalized || !/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
    return Math.round(Number(normalized) * 100);
  }, [custom]);
  const amountCents = custom ? customCents : selected;

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase.rpc("my_donations");
    if (!error && Array.isArray(data)) setHistory(data as Donation[]);
    setLoadingHistory(false);
  };

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user || null);
      setLoadingUser(false);
      if (data.session) void loadHistory();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user || null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!result || !user) return;
    void loadHistory();
    const timer = window.setTimeout(() => void loadHistory(), 3500);
    return () => window.clearTimeout(timer);
  }, [result, user?.id]);

  const startDonation = async () => {
    if (!user) {
      window.location.assign("/auth?redirect=/donate");
      return;
    }
    if (!amountCents || amountCents < 500 || amountCents > 1000000) {
      toast.error("Escolha um valor entre R$ 5,00 e R$ 10.000,00.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-donation-order", {
        body: { amountCents, native: Capacitor.getPlatform() === "android" },
      });
      if (error || typeof data?.checkoutUrl !== "string") throw error || new Error("Invalid checkout response");
      if (Capacitor.getPlatform() === "android") await Browser.open({ url: data.checkoutUrl });
      else window.location.assign(data.checkoutUrl);
    } catch {
      toast.error("Não foi possível abrir o Mercado Pago. Tente novamente em instantes.");
      setSubmitting(false);
    }
  };

  const clearResult = () => {
    params.delete("result");
    setParams(params, { replace: true });
  };

  return <main className="donate-page">
    <section className="donate-shell">
      <header className="donate-header">
        <Link to="/" aria-label="Voltar ao início"><ArrowLeft /></Link>
        <img src="/amens-wordmark-gold.png" alt="Améns" />
        <span aria-hidden="true"><HeartHandshake /></span>
      </header>

      <section className="donate-hero">
        <span>Faça parte desta missão</span>
        <h1>Apoie o Améns</h1>
        <p>Sua contribuição ajuda a manter este espaço gratuito, acolhedor e sempre disponível.</p>
        <div><Sparkles /><strong>Metade de cada valor doado será reservada para instituições de caridade.</strong></div>
      </section>

      {result && <section className={`donate-result donate-result--${result}`} role="status">
        <CheckCircle2 />
        <div><strong>{result === "approved" ? "Pagamento enviado para confirmação" : result === "pending" ? "Pagamento pendente" : "Pagamento não concluído"}</strong>
          <p>{result === "approved" ? "O Mercado Pago confirmará a doação com segurança. Isso pode levar alguns instantes." : result === "pending" ? "Assim que o Mercado Pago confirmar o valor, atualizaremos seu apoio automaticamente." : "Nenhum reconhecimento será liberado. Você pode tentar novamente quando desejar."}</p></div>
        <button type="button" onClick={clearResult}>Fechar</button>
      </section>}

      <section className="donate-card" aria-labelledby="donate-value-title">
        <div className="donate-card__heading"><HandHeart /><div><h2 id="donate-value-title">Escolha sua contribuição</h2><p>Doação única e segura pelo Mercado Pago</p></div></div>
        <div className="donate-values" role="group" aria-label="Valores sugeridos">
          {presetValues.map(value => <button key={value} type="button" className={!custom && selected === value ? "is-selected" : ""} onClick={() => { setCustom(""); setSelected(value); }}>{money.format(value / 100)}</button>)}
        </div>
        <label className="donate-custom"><span>Outro valor</span><span className="donate-custom__input"><b>R$</b><input inputMode="decimal" value={custom} onChange={event => setCustom(event.target.value)} placeholder="0,00" aria-label="Outro valor em reais" /></span></label>
        <button className="donate-submit" type="button" disabled={submitting || loadingUser} onClick={startDonation}>
          {submitting ? <><Loader2 className="donate-spinner" />Abrindo o Mercado Pago…</> : user ? <>Continuar para o pagamento <span>›</span></> : <>Entrar para fazer uma doação <span>›</span></>}
        </button>
        <p className="donate-security"><ShieldCheck /> O pagamento acontece no ambiente protegido do Mercado Pago. O Améns não recebe os dados do seu cartão.</p>
      </section>

      {user && (loadingHistory || history.length > 0) && <section className="donate-history">
        <h2>Minhas contribuições</h2>
        {loadingHistory && !history.length ? <p>Atualizando…</p> : history.slice(0, 5).map(item => <article key={item.id}>
          <span><strong>{money.format(item.amountCents / 100)}</strong><small>{new Date(item.createdAt).toLocaleDateString("pt-BR")} · {item.environment === "test" ? "Teste" : "Produção"}</small></span>
          <b className={`donate-status donate-status--${item.status}`}>{statusCopy[item.status] || "Em atualização"}</b>
        </article>)}
      </section>}
    </section>
  </main>;
}
