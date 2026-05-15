/* eslint-disable no-undef */
// Améns 2.0 — root app, navigation, theming, tweaks

const { useState } = React;

const USER = { firstName: "Pedro", lastName: "Souza" };

// =====================================================================
// THEME TOKENS — switchable via Tweaks
// =====================================================================
const THEMES = {
  paper: {
    name: "Papel & tinta (novo)",
    "--paper": "#F5EFE3",
    "--vellum": "#FBF8F1",
    "--ink": "#1B1B2F",
    "--ink-soft": "#6B6679",
    "--marian": "#2E4F8B",
    "--marian-soft": "rgba(46,79,139,0.22)",
    "--gold": "#A37A2C",
    "--hairline": "#E6DDC8",
    "--app-bg": "#F5EFE3",
  },
  marian: {
    name: "Manto mariano",
    "--paper": "#F2F0EB",
    "--vellum": "#FFFFFF",
    "--ink": "#15233F",
    "--ink-soft": "#5A6577",
    "--marian": "#1F3D7A",
    "--marian-soft": "rgba(31,61,122,0.22)",
    "--gold": "#9C7B2E",
    "--hairline": "#DDDFE3",
    "--app-bg": "#F2F0EB",
  },
  night: {
    name: "Vigília (noturno)",
    "--paper": "#15131C",
    "--vellum": "#1F1C28",
    "--ink": "#F5EFE3",
    "--ink-soft": "#9089A0",
    "--marian": "#9BB4EC",
    "--marian-soft": "rgba(155,180,236,0.24)",
    "--gold": "#D8B36A",
    "--hairline": "#2C2836",
    "--app-bg": "#15131C",
  },
  legacy: {
    name: "Original (Divine Gold)",
    "--paper": "#fdfcf7",
    "--vellum": "#FAFAFA",
    "--ink": "#3d2800",
    "--ink-soft": "#6b5a3a",
    "--marian": "#1D4ED8",
    "--marian-soft": "rgba(29,78,216,0.2)",
    "--gold": "#d4a017",
    "--hairline": "#E6DBC4",
    "--app-bg": "#fdfcf7",
  },
};

function applyTheme(themeKey) {
  const t = THEMES[themeKey] || THEMES.paper;
  const root = document.documentElement;
  Object.entries(t).forEach(([k, v]) => {
    if (k.startsWith("--")) root.style.setProperty(k, v);
  });
}

// =====================================================================
// BOTTOM NAV — 4 items + center FAB
// =====================================================================
function BottomNav({ current, goto }) {
  const items = [
    { id: "today", label: "Hoje", icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
      </svg>
    )},
    { id: "community", label: "Comunidade", icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    )},
    { id: "fab", label: "", icon: null, fab: true },
    { id: "chain", label: "Corrente", icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07L11 5" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07L13 19" />
      </svg>
    )},
    { id: "profile", label: "Perfil", icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
      </svg>
    )},
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 50 }}>
      {/* paper gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(to top, var(--app-bg) 35%, transparent)" }} />
      <div className="relative pointer-events-auto px-4 pb-4 pt-2">
        <div className="rounded-[28px] flex items-end justify-around px-2 py-2 relative"
          style={{ background: "var(--vellum)", border: "1px solid var(--hairline)", boxShadow: "0 18px 36px -22px rgba(28,22,40,0.25)" }}>
          {items.map(item => {
            if (item.fab) {
              return (
                <button key="fab" onClick={() => goto("submit")}
                  className="relative -mt-7 w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
                  style={{ background: "var(--ink)", color: "var(--paper)", boxShadow: "0 14px 28px -10px rgba(28,22,40,0.5)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              );
            }
            const active = current === item.id;
            return (
              <button key={item.id} onClick={() => goto(item.id)}
                className="flex flex-col items-center justify-center py-2 px-2 min-w-[52px]"
                style={{ color: active ? "var(--ink)" : "var(--ink-soft)" }}>
                {item.icon(active)}
                <span className="text-[9.5px] mt-1 font-medium">{item.label}</span>
                <div className="h-0.5 w-1 rounded-full mt-1" style={{ background: active ? "var(--gold)" : "transparent" }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// ROOT APP — runs inside iOS frame's scroll area
// =====================================================================
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "paper",
  "showWordmark": true,
  "screen": "today"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState(t.screen || "today");

  React.useEffect(() => { applyTheme(t.theme); }, [t.theme]);
  React.useEffect(() => { setScreen(t.screen); }, [t.screen]);

  const goto = (s) => {
    setScreen(s);
    setTweak("screen", s);
    // scroll to top
    const sc = document.querySelector("[data-screen-scroll]");
    if (sc) sc.scrollTop = 0;
  };

  const renderScreen = () => {
    switch (screen) {
      case "today": return <ScreenToday goto={goto} user={USER} />;
      case "pray": return <ScreenPray goto={goto} />;
      case "submit": return <ScreenSubmit goto={goto} />;
      case "community": return <ScreenCommunity goto={goto} />;
      case "chain": return <ScreenCommunity goto={goto} />;
      case "profile": return <ScreenProfile goto={goto} user={USER} />;
      case "gospel": return <ScreenToday goto={goto} user={USER} />;
      default: return <ScreenToday goto={goto} user={USER} />;
    }
  };

  // map "fab", "submit", "pray" etc to nav highlight
  const navCurrent = ["today", "pray", "gospel"].includes(screen) ? "today"
    : screen === "submit" ? null
    : screen === "community" ? "community"
    : screen === "chain" ? "chain"
    : screen === "profile" ? "profile" : "today";

  return (
    <>
      <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--app-bg)" }}>
        {/* subtle paper grain */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.4]"
          style={{
            backgroundImage: "radial-gradient(ellipse at top, rgba(163,122,44,0.08), transparent 55%), radial-gradient(ellipse at bottom right, rgba(46,79,139,0.05), transparent 50%)",
          }} />
        <div data-screen-scroll className="relative h-full overflow-y-auto" style={{ paddingBottom: 110 }}>
          {renderScreen()}
        </div>
        <BottomNav current={navCurrent} goto={goto} />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Paleta">
          <TweakSelect
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={Object.entries(THEMES).map(([k, v]) => ({ value: k, label: v.name }))}
          />
          <p style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
            Compare lado a lado: "Original (Divine Gold)" reaplica a paleta atual do app dentro do mesmo layout para ver o impacto.
          </p>
        </TweakSection>
        <TweakSection label="Tela">
          <TweakSelect
            value={t.screen}
            onChange={(v) => setTweak("screen", v)}
            options={[
              { value: "today", label: "Hoje" },
              { value: "pray", label: "Orar por uma Causa" },
              { value: "submit", label: "Enviar Pedido" },
              { value: "community", label: "Comunidade" },
              { value: "profile", label: "Perfil" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Recursos">
          <a href="Relatório de Redesign.html" target="_blank"
            style={{ display: "block", textAlign: "center", padding: "10px 12px", borderRadius: 10, background: "#1B1B2F", color: "#F5EFE3", fontSize: 12, textDecoration: "none", fontWeight: 500 }}>
            Abrir relatório completo →
          </a>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// Mount inside iOS frame
function Root() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
      <IOSDevice width={402} height={874} dark={false}>
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          {/* status bar safe space */}
          <div style={{ height: 54, flexShrink: 0 }} />
          <div style={{ position: 'absolute', top: 54, left: 0, right: 0, bottom: 0 }}>
            <App />
          </div>
        </div>
      </IOSDevice>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Root />);
