/* eslint-disable no-undef */
// Améns 2.0 — screen components
// Each screen renders inside the iOS frame's scroll area.

const { useState, useEffect, useRef } = React;

// -------- shared bits --------
const Ornament = ({ className = "" }) => (
  <span className={"inline-block text-[10px] leading-none " + className} style={{ color: "var(--gold)" }}>✦</span>
);

const HairlineDivider = ({ withMark = false, className = "" }) => (
  <div className={"flex items-center gap-2 " + className}>
    <div className="flex-1 h-px" style={{ background: "var(--hairline)" }} />
    {withMark && <Ornament />}
    <div className="flex-1 h-px" style={{ background: "var(--hairline)" }} />
  </div>
);

const Header = ({ title, onBack, right }) => (
  <div className="flex items-center justify-between px-5 pt-3 pb-2">
    {onBack ? (
      <button onClick={onBack} className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full active:bg-black/5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
    ) : <div className="w-9" />}
    <div className="font-serif text-[17px] tracking-tight" style={{ color: "var(--ink)" }}>{title}</div>
    <div className="w-9 flex items-center justify-end">{right}</div>
  </div>
);

// =====================================================================
// SCREEN: HOJE (Home)
// =====================================================================
function ScreenToday({ goto, user }) {
  return (
    <div className="pb-8">
      {/* tiny brand bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1">
        <div className="flex flex-col">
          <span className="font-serif italic text-[22px] leading-none" style={{ color: "var(--ink)" }}>Améns</span>
          <span className="text-[9px] uppercase tracking-[0.32em] mt-1" style={{ color: "var(--gold)" }}>Unidos pela fé</span>
        </div>
        <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--vellum)", border: "1px solid var(--hairline)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink)" }}>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
        </button>
      </div>

      {/* greeting */}
      <div className="px-5 mt-5">
        <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>Bom dia, {user.firstName}.</p>
        <h1 className="font-serif text-[30px] leading-[1.1] mt-1 max-w-[280px]" style={{ color: "var(--ink)" }}>
          Há uma intenção esperando por você hoje.
        </h1>
      </div>

      {/* HERO — daily intercession */}
      <div className="px-5 mt-6">
        <button onClick={() => goto("pray")} className="w-full text-left rounded-[22px] overflow-hidden block"
          style={{ background: "var(--vellum)", border: "1px solid var(--hairline)", boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 12px 28px -18px rgba(28,22,40,0.18)" }}>
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <Ornament />
              <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Causa para interceder</span>
            </div>
            <p className="font-serif text-[22px] leading-[1.25]" style={{ color: "var(--ink)" }}>
              "Que minha mãe encontre paz após a cirurgia. Ela sempre foi nossa força."
            </p>
            <div className="flex items-center gap-3 mt-5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{ background: "var(--hairline)", color: "var(--ink-soft)" }}>JS</div>
              <span className="text-[12px]" style={{ color: "var(--ink-soft)" }}>Joana, 34 · São Paulo</span>
            </div>
          </div>
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--ink)", color: "var(--paper)" }}>
            <span className="text-[14px] font-medium">Rezar com Joana</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
          </div>
        </button>
        <p className="text-[11px] mt-3 px-1" style={{ color: "var(--ink-soft)" }}>
          Você pode interceder por até 3 causas hoje · 2 restantes
        </p>
      </div>

      {/* daily rituals — horizontal row */}
      <div className="mt-8">
        <div className="px-5 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Rituais de hoje</span>
          </div>
          <span className="text-[11px]" style={{ color: "var(--marian)" }}>Ver tudo</span>
        </div>
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
          <RitualCard
            kind="Evangelho"
            title="Mt 13, 31–35"
            sub="O reino é como uma semente"
            duration="3 min · leitura"
            badge="hoje"
            onClick={() => goto("gospel")}
          />
          <RitualCard
            kind="Terço"
            title="Mistérios gloriosos"
            sub="Quinta-feira"
            duration="18 min · guiado por voz"
            onClick={() => goto("today")}
          />
          <RitualCard
            kind="Novena"
            title="N. Sra. Aparecida"
            sub="Dia 4 de 9"
            duration="continuar"
            progress={0.44}
            onClick={() => goto("today")}
          />
          <RitualCard
            kind="Promessa"
            title="Receber uma palavra"
            sub="Uma citação para o seu dia"
            duration="apenas hoje"
            onClick={() => goto("today")}
          />
        </div>
      </div>

      {/* community pulse */}
      <div className="px-5 mt-7">
        <div className="rounded-[18px] px-5 py-4 flex items-center gap-4"
          style={{ background: "transparent", border: "1px solid var(--hairline)" }}>
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "var(--marian)", opacity: 0.12 }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--marian)" }} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>342 pessoas estão rezando agora</p>
            <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>Corrente de oração ao vivo · 12 países</p>
          </div>
          <button onClick={() => goto("community")}
            className="text-[12px] font-medium px-3 py-1.5 rounded-full"
            style={{ color: "var(--marian)", border: "1px solid var(--marian-soft)" }}>
            Entrar
          </button>
        </div>
      </div>

      {/* faith journey — quiet strip */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Sua caminhada</span>
          <span className="text-[11px] font-mono" style={{ color: "var(--ink-soft)" }}>14 dias</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex-1 h-2 rounded-full"
              style={{ background: i < 12 ? "var(--marian)" : "var(--hairline)", opacity: i < 12 ? (0.35 + (i / 14) * 0.65) : 1 }} />
          ))}
        </div>
        <p className="text-[11px] mt-2" style={{ color: "var(--ink-soft)" }}>
          Hoje: leia o Evangelho e interceda por uma causa para completar.
        </p>
      </div>
    </div>
  );
}

function RitualCard({ kind, title, sub, duration, badge, progress, onClick }) {
  return (
    <button onClick={onClick}
      className="flex-shrink-0 w-[180px] text-left rounded-[18px] p-4 flex flex-col justify-between min-h-[160px]"
      style={{ background: "var(--vellum)", border: "1px solid var(--hairline)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: "var(--gold)" }}>{kind}</span>
        {badge && <span className="text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm"
          style={{ background: "var(--ink)", color: "var(--paper)" }}>{badge}</span>}
      </div>
      <div className="mt-4">
        <p className="font-serif text-[16px] leading-tight" style={{ color: "var(--ink)" }}>{title}</p>
        <p className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>{sub}</p>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-3">
          <div className="h-1 rounded-full" style={{ background: "var(--hairline)" }}>
            <div className="h-1 rounded-full" style={{ width: `${progress * 100}%`, background: "var(--marian)" }} />
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: "var(--ink-soft)" }}>{duration}</p>
        </div>
      ) : (
        <p className="text-[10px] mt-3" style={{ color: "var(--ink-soft)" }}>{duration}</p>
      )}
    </button>
  );
}

// =====================================================================
// SCREEN: ORAR POR UMA CAUSA
// =====================================================================
function ScreenPray({ goto }) {
  const [prayedFor, setPrayedFor] = useState(0); // seconds focus
  const [showSuggested, setShowSuggested] = useState(false);
  const [reactions, setReactions] = useState({});
  const timerRef = useRef();

  useEffect(() => {
    timerRef.current = setInterval(() => setPrayedFor(p => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const reactionList = [
    { id: "compassion", label: "Compaixão" },
    { id: "grace", label: "Graça" },
    { id: "strength", label: "Força" },
    { id: "patience", label: "Paciência" },
    { id: "hope", label: "Esperança" },
  ];

  return (
    <div className="pb-8">
      <Header title="" onBack={() => goto("today")}
        right={
          <button className="w-9 h-9 flex items-center justify-center rounded-full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-soft)" }}>
              <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        }
      />

      {/* meta */}
      <div className="px-7 mt-2">
        <div className="flex items-center gap-2">
          <Ornament />
          <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>
            Causa de Joana, 34
          </span>
        </div>
        <p className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>
          Enviado há 2 horas · São Paulo, BR
        </p>
      </div>

      {/* big quiet prayer text */}
      <div className="px-7 mt-7">
        <p className="font-serif text-[26px] leading-[1.35]" style={{ color: "var(--ink)" }}>
          Que minha mãe encontre paz após a cirurgia. Ela sempre foi nossa força em casa — peço que ela atravesse esse momento com confiança.
        </p>
      </div>

      <div className="px-7 mt-8">
        <HairlineDivider withMark />
      </div>

      {/* focus timer */}
      <div className="px-7 mt-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Em oração</p>
          <p className="font-serif text-[22px] tabular-nums mt-1" style={{ color: "var(--ink)" }}>{fmtTime(prayedFor)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Acompanhando agora</p>
          <p className="text-[13px] mt-1" style={{ color: "var(--ink)" }}>14 irmãos</p>
        </div>
      </div>

      {/* emotional reactions */}
      <div className="px-7 mt-7">
        <p className="text-[10px] uppercase tracking-[0.28em] mb-3" style={{ color: "var(--ink-soft)" }}>
          Envie um sinal a Joana
        </p>
        <div className="flex flex-wrap gap-2">
          {reactionList.map(r => {
            const active = reactions[r.id];
            return (
              <button key={r.id}
                onClick={() => setReactions(s => ({ ...s, [r.id]: !s[r.id] }))}
                className="px-3.5 py-2 rounded-full text-[12px] transition-all"
                style={{
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--paper)" : "var(--ink)",
                  border: "1px solid " + (active ? "var(--ink)" : "var(--hairline)"),
                }}>
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* suggested prayer collapsible */}
      <div className="px-7 mt-7">
        <button onClick={() => setShowSuggested(s => !s)} className="w-full flex items-center justify-between py-3">
          <span className="text-[13px]" style={{ color: "var(--marian)" }}>Sugestão de oração</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--marian)", transform: showSuggested ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {showSuggested && (
          <div className="rounded-[14px] px-5 py-4 mt-1" style={{ background: "var(--vellum)", border: "1px solid var(--hairline)" }}>
            <p className="font-serif text-[15px] leading-relaxed italic" style={{ color: "var(--ink)" }}>
              Senhor, conforta o coração de Joana e de sua mãe. Que tua presença atravesse as paredes do hospital e que a recuperação seja serena. Amém.
            </p>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="px-5 mt-8 space-y-3">
        <button onClick={() => goto("today")} className="w-full h-12 rounded-full text-[14px] font-medium flex items-center justify-center gap-2"
          style={{ background: "var(--ink)", color: "var(--paper)" }}>
          Concluí esta oração
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button className="h-11 rounded-full text-[12.5px]" style={{ color: "var(--ink)", border: "1px solid var(--hairline)" }}>
            Receber outra
          </button>
          <button className="h-11 rounded-full text-[12.5px]" style={{ color: "var(--ink)", border: "1px solid var(--hairline)" }}>
            Enviar a um amigo
          </button>
        </div>
        <button className="w-full text-[11px] py-2" style={{ color: "var(--ink-soft)" }}>
          Reportar conteúdo inadequado
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// SCREEN: ENVIAR PEDIDO
// =====================================================================
function ScreenSubmit({ goto }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tag, setTag] = useState(null);

  const tags = [
    { id: "family", label: "Família" },
    { id: "health", label: "Saúde" },
    { id: "work", label: "Trabalho" },
    { id: "gratitude", label: "Gratidão" },
    { id: "peace", label: "Paz" },
    { id: "other", label: "Outro" },
  ];

  const canSend = title.trim().length >= 5;

  return (
    <div className="pb-8">
      <Header title="Nova intenção" onBack={() => goto("today")} />

      <div className="px-5 mt-2">
        <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>
          Sua intenção poderá ser orada por outros membros da comunidade.
        </p>
      </div>

      {/* anonymity */}
      <div className="px-5 mt-5">
        <div className="rounded-[16px] px-4 py-3.5 flex items-center gap-3"
          style={{ background: isAnonymous ? "var(--ink)" : "transparent", border: "1px solid " + (isAnonymous ? "var(--ink)" : "var(--hairline)"), transition: "all .2s" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: isAnonymous ? "rgba(255,255,255,0.08)" : "var(--vellum)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: isAnonymous ? "var(--paper)" : "var(--ink)" }}>
              <path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium" style={{ color: isAnonymous ? "var(--paper)" : "var(--ink)" }}>
              Enviar como anônimo
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: isAnonymous ? "rgba(245,239,227,0.65)" : "var(--ink-soft)" }}>
              Seu nome e foto ficam ocultos.
            </p>
          </div>
          <button onClick={() => setIsAnonymous(a => !a)}
            className="w-11 h-6 rounded-full relative flex-shrink-0 transition-colors"
            style={{ background: isAnonymous ? "var(--gold)" : "var(--hairline)" }}>
            <span className="absolute top-[2px] w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: isAnonymous ? "22px" : "2px" }} />
          </button>
        </div>
      </div>

      {/* title */}
      <div className="px-5 mt-6">
        <label className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Em uma frase</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Pela saúde da minha mãe…"
          className="w-full mt-2 bg-transparent border-0 border-b font-serif text-[20px] py-2 outline-none focus:border-b focus:outline-none"
          style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: title.length > 0 && title.length < 5 ? "#B85C3A" : "var(--ink-soft)" }}>
            {title.length < 5 ? `mínimo 5 caracteres` : `título pronto`}
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--ink-soft)" }}>{title.length}/80</span>
        </div>
      </div>

      {/* body */}
      <div className="px-5 mt-5">
        <label className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Conte mais (opcional)</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value.slice(0, 1000))}
          placeholder="Descreva o que está no seu coração. Quem ler vai rezar por você."
          rows={5}
          className="w-full mt-2 rounded-[14px] p-3.5 text-[14px] outline-none resize-none leading-relaxed"
          style={{ background: "var(--vellum)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
        />
        <div className="flex justify-end mt-1">
          <span className="text-[10px] font-mono" style={{ color: "var(--ink-soft)" }}>{body.length}/1000</span>
        </div>
      </div>

      {/* tag */}
      <div className="px-5 mt-5">
        <label className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Tema (opcional)</label>
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map(t => {
            const active = tag === t.id;
            return (
              <button key={t.id} onClick={() => setTag(active ? null : t.id)}
                className="px-3 py-1.5 rounded-full text-[12px]"
                style={{
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--paper)" : "var(--ink)",
                  border: "1px solid " + (active ? "var(--ink)" : "var(--hairline)"),
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* moderation note */}
      <div className="px-5 mt-7">
        <div className="flex gap-2 items-start">
          <Ornament className="mt-1" />
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Pedidos passam por uma moderação leve. Mantemos o espaço respeitoso, católico e seguro para todos.
          </p>
        </div>
      </div>

      <div className="px-5 mt-7">
        <button disabled={!canSend} onClick={() => goto("today")}
          className="w-full h-12 rounded-full text-[14px] font-medium transition-opacity"
          style={{ background: "var(--ink)", color: "var(--paper)", opacity: canSend ? 1 : 0.35 }}>
          Compartilhar com a comunidade
        </button>
        <p className="text-center text-[10.5px] mt-3" style={{ color: "var(--ink-soft)" }}>
          Você ganha 1 ponto na sua caminhada por hoje.
        </p>
      </div>
    </div>
  );
}

// =====================================================================
// SCREEN: COMUNIDADE
// =====================================================================
function ScreenCommunity({ goto }) {
  return (
    <div className="pb-8">
      <Header title="Comunidade"
        right={<button className="text-[12px]" style={{ color: "var(--marian)" }}>Filtros</button>}
      />

      {/* live banner */}
      <div className="px-5 mt-2">
        <div className="rounded-[18px] overflow-hidden" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          <div className="px-5 py-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#E89F4C" }} />
              <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#E89F4C" }}>Ao vivo</span>
            </div>
            <p className="font-serif text-[19px] leading-tight">Corrente de oração das 19h</p>
            <p className="text-[12px] mt-1" style={{ color: "rgba(245,239,227,0.65)" }}>
              342 irmãos rezando o Pai Nosso simultaneamente
            </p>
            <button className="mt-4 px-4 py-2 rounded-full text-[12.5px] font-medium"
              style={{ background: "var(--paper)", color: "var(--ink)" }}>
              Entrar agora
            </button>
          </div>
        </div>
      </div>

      {/* feed of intentions */}
      <div className="px-5 mt-7 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Intenções recentes</span>
      </div>

      <div className="px-5 mt-3 space-y-3">
        <CommunityCard
          name="Marcos, 41"
          city="Belo Horizonte"
          time="há 12 min"
          tag="Trabalho"
          text="Que eu encontre coragem para começar de novo depois da demissão. Tenho duas filhas em casa."
          praying={28}
        />
        <CommunityCard
          anonymous
          time="há 25 min"
          tag="Saúde"
          text="Estou com medo do diagnóstico que recebo amanhã. Peço apenas que eu não esteja sozinho(a) nesse momento."
          praying={87}
        />
        <CommunityCard
          name="Lúcia, 67"
          city="Recife"
          time="há 1 h"
          tag="Gratidão"
          text="Meu neto voltou para casa. Demorei um ano para pedir esta graça. Obrigada a todos que rezaram comigo."
          praying={156}
          gratitude
        />
      </div>
    </div>
  );
}

function CommunityCard({ name, city, time, tag, text, praying, anonymous, gratitude }) {
  return (
    <div className="rounded-[18px] p-5" style={{ background: "var(--vellum)", border: "1px solid var(--hairline)" }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium"
          style={{ background: "var(--hairline)", color: "var(--ink-soft)" }}>
          {anonymous ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><circle cx="9" cy="10" r="0.5" fill="currentColor" /><circle cx="15" cy="10" r="0.5" fill="currentColor" /></svg>
          ) : name.slice(0, 1)}
        </div>
        <div className="flex-1">
          <p className="text-[12.5px]" style={{ color: "var(--ink)" }}>{anonymous ? "Alguém preferiu anonimato" : `${name} · ${city}`}</p>
          <p className="text-[10.5px]" style={{ color: "var(--ink-soft)" }}>{time}</p>
        </div>
        <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm"
          style={{ color: gratitude ? "var(--gold)" : "var(--marian)", background: gratitude ? "rgba(163,122,44,0.08)" : "rgba(46,79,139,0.06)" }}>
          {tag}
        </span>
      </div>
      <p className="font-serif text-[15.5px] leading-snug mt-4" style={{ color: "var(--ink)" }}>"{text}"</p>
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px dashed var(--hairline)" }}>
        <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{praying} pessoas rezaram</p>
        <button className="text-[12px] font-medium" style={{ color: "var(--marian)" }}>
          {gratitude ? "Celebrar →" : "Rezar comigo →"}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// SCREEN: PERFIL
// =====================================================================
function ScreenProfile({ user, goto }) {
  return (
    <div className="pb-8">
      <Header title=""
        right={<button className="w-9 h-9 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: "var(--ink-soft)" }}>
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>}
      />

      <div className="px-5 mt-2 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center font-serif text-[28px]"
          style={{ background: "var(--vellum)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
          {user.firstName[0]}
        </div>
        <p className="font-serif text-[22px] mt-3" style={{ color: "var(--ink)" }}>{user.firstName} {user.lastName}</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--ink-soft)" }}>Caminhando há 14 dias</p>
      </div>

      {/* journey arc */}
      <div className="px-5 mt-7">
        <div className="rounded-[20px] p-5" style={{ background: "var(--vellum)", border: "1px solid var(--hairline)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Ornament />
            <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Sua caminhada</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-serif text-[42px] leading-none" style={{ color: "var(--ink)" }}>247</p>
            <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>pontos de fé</p>
          </div>
          <p className="text-[12.5px] mt-3" style={{ color: "var(--ink)" }}>Aprendiz da escuta · nível 3</p>
          <div className="mt-3">
            <div className="h-1.5 rounded-full" style={{ background: "rgba(46,79,139,0.12)" }}>
              <div className="h-1.5 rounded-full" style={{ width: "62%", background: "var(--marian)" }} />
            </div>
            <p className="text-[10.5px] mt-1.5" style={{ color: "var(--ink-soft)" }}>53 pontos para o próximo nível</p>
          </div>
        </div>
      </div>

      {/* stats — quiet typographic */}
      <div className="px-5 mt-6 grid grid-cols-3 gap-3">
        {[
          { n: "82", l: "intercessões" },
          { n: "31", l: "pedidos enviados" },
          { n: "9", l: "novenas" },
        ].map(s => (
          <div key={s.l} className="text-center py-4 rounded-[14px]" style={{ border: "1px solid var(--hairline)" }}>
            <p className="font-serif text-[22px]" style={{ color: "var(--ink)" }}>{s.n}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] mt-1" style={{ color: "var(--ink-soft)" }}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* recent intercessions list */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>Intercessões recentes</span>
          <span className="text-[11px]" style={{ color: "var(--marian)" }}>Ver tudo</span>
        </div>
        <div className="space-y-0">
          {[
            { who: "Joana", what: "Pela mãe após cirurgia", when: "há 2 h" },
            { who: "Alguém anônimo", what: "Pelo diagnóstico de amanhã", when: "ontem" },
            { who: "Marcos", what: "Coragem após demissão", when: "ontem" },
            { who: "Lúcia", what: "Pelo retorno do neto", when: "há 3 dias" },
          ].map((it, i) => (
            <div key={i} className="flex items-start justify-between py-3"
              style={{ borderBottom: i < 3 ? "1px solid var(--hairline)" : "none" }}>
              <div className="flex-1 pr-3">
                <p className="text-[13px]" style={{ color: "var(--ink)" }}>{it.what}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-soft)" }}>{it.who} · {it.when}</p>
              </div>
              <button className="text-[11px]" style={{ color: "var(--marian)" }}>Rezar de novo</button>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-7">
        <button className="w-full text-[12px] py-3 rounded-full" style={{ color: "var(--ink-soft)", border: "1px solid var(--hairline)" }}>
          Sair
        </button>
      </div>
    </div>
  );
}

// expose to global
Object.assign(window, {
  ScreenToday, ScreenPray, ScreenSubmit, ScreenCommunity, ScreenProfile,
});
