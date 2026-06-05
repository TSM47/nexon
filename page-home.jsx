/* page-home.jsx — Strona główna firmy Nexon (landing marketingowy) */
const { Icon: Ih, Badge: Bh, ITile: ITh, Avatar: Avh, TLItem: TLIh } = window;
const { useState: uSh, useEffect: uEh, useRef: uRh } = React;

/* licznik z animacją odliczania */
function Counter({ to, dur = 1500, sep, dec, suffix }) {
  const [v, setV] = uSh(0);
  uEh(() => {
    let raf, t0, done = false;
    const tick = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(to * e);
      if (p < 1) raf = requestAnimationFrame(tick); else done = true;
    };
    raf = requestAnimationFrame(tick);
    const fb = setTimeout(() => { if (!done) setV(to); }, dur + 500);
    return () => { cancelAnimationFrame(raf); clearTimeout(fb); };
  }, [to, dur]);
  let txt;
  if (dec) txt = v.toFixed(dec).replace(".", ",");
  else if (sep) txt = String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  else txt = String(Math.round(v));
  return <span>{txt}{suffix || ""}</span>;
}

/* interaktywny czytnik kart (hero) */
const SCAN_POOL = [
  { name: "Anna Kowalska",     card: "#A‑1042", role: "Administrator · Zarząd", ok: true },
  { name: "Marek Nowak",       card: "#A‑0461", role: "Karta zablokowana",      ok: false, reason: "Brak uprawnień do strefy" },
  { name: "Julia Wiśniewska",  card: "#B‑0317", role: "Standard · Finanse",     ok: true },
  { name: "Gość · T. Schmidt", card: "#G‑12",   role: "Identyfikator gościa",   ok: true },
];
function ScanDemo() {
  const [phase, setPhase] = uSh("idle");
  const [idx, setIdx] = uSh(0);
  const timers = uRh([]);
  const run = () => {
    if (phase === "scanning") return;
    timers.current.forEach(clearTimeout);
    const cur = SCAN_POOL[idx];
    setPhase("scanning");
    timers.current = [
      setTimeout(() => setPhase(cur.ok ? "ok" : "bad"), 1250),
      setTimeout(() => { setPhase("idle"); setIdx((i) => (i + 1) % SCAN_POOL.length); }, 3400),
    ];
  };
  uEh(() => () => timers.current.forEach(clearTimeout), []);
  const cur = SCAN_POOL[idx];
  const readerCls = phase === "scanning" ? "scanning" : phase === "ok" ? "ok" : phase === "bad" ? "bad" : "";
  const padIcon = phase === "ok" ? "check" : phase === "bad" ? "ban" : phase === "scanning" ? "wifi" : "card";
  const status = {
    idle:     { st: "Gotowy do odczytu", cls: "", sm: "Kliknij, aby zasymulować przejście" },
    scanning: { st: "Skanowanie…",        cls: "", sm: "Weryfikacja uprawnień" },
    ok:       { st: "Dostęp przyznany",   cls: "ok", sm: cur.role },
    bad:      { st: "Odmowa dostępu",     cls: "bad", sm: cur.reason || "Brak uprawnień" },
  }[phase];
  return (
    <div className="scan">
      <div className={"reader " + readerCls}>
        <span className="reader-ring" /><span className="reader-ring r2" /><span className="reader-ring r3" />
        <span className="reader-pad"><Ih name={padIcon} size={32} sw={2} /></span>
      </div>
      <div className="scan-status">
        <div className={"st " + status.cls}>{status.st}</div>
        <div className="sm">{status.sm}</div>
      </div>
      <div className="scan-card">
        <span className="sc-chip" />
        <div style={{ minWidth: 0 }}>
          <div className="sc-num">{cur.card} · {cur.name}</div>
          <div className="sc-role">NEXON · identyfikator zbliżeniowy</div>
        </div>
      </div>
      <button className="btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={run}>
        <Ih name="key" size={17} /> {phase === "scanning" ? "Skanowanie…" : "Zbliż kartę"}
      </button>
    </div>
  );
}

/* strumień zdarzeń na żywo */
const FEED_POOL = [
  { kind: "in",  t: "Anna Kowalska · Wejście",      m: "Wejście główne · #A‑1042" },
  { kind: "out", t: "Julia Wiśniewska · Wyjście",   m: "Recepcja · #B‑0317" },
  { kind: "in",  t: "Piotr Zięba · Wejście",        m: "Parking P1 · #A‑0098" },
  { kind: "red", t: "Marek Nowak · Odmowa",         m: "Serwerownia · brak uprawnień" },
  { kind: "in",  t: "Gość · T. Schmidt · Wejście",  m: "Recepcja · #G‑12" },
  { kind: "out", t: "Karolina Mazur · Wyjście",     m: "Magazyn · #C‑2204" },
  { kind: "in",  t: "Tomasz Lewandowski · Wejście", m: "Biuro 2p. · #A‑0772" },
];
function fmtClock(d) { return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function ActivityFeed() {
  const [items, setItems] = uSh(() => FEED_POOL.slice(0, 5).map((e, i) => ({ ...e, rt: ["14:32", "14:21", "14:15", "14:11", "14:02"][i], id: i, fresh: false })));
  const next = uRh(5);
  uEh(() => {
    const iv = setInterval(() => {
      setItems((prev) => {
        const e = FEED_POOL[next.current % FEED_POOL.length];
        next.current += 1;
        const item = { ...e, rt: fmtClock(new Date()), id: next.current + 100, fresh: true };
        return [item, ...prev.map((p) => ({ ...p, fresh: false }))].slice(0, 5);
      });
    }, 2800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="tl ic-tl">
      {items.map((e) => (
        <div key={e.id} className={e.fresh ? "feed-fresh" : ""}>
          <TLIh kind={e.kind} title={e.t} meta={e.m} rt={e.rt} />
        </div>
      ))}
    </div>
  );
}

/* mini wizualizacje do sekcji */
function MiniFloor() {
  return (
    <svg viewBox="0 0 380 240" className="mini-floor" preserveAspectRatio="xMidYMid meet">
      <rect x="18" y="40" width="150" height="180" rx="12" className="mf-room" />
      <rect x="184" y="40" width="178" height="86" rx="12" className="mf-room" />
      <rect x="184" y="138" width="178" height="82" rx="12" className="mf-room" />
      <text x="30" y="68" className="mf-lbl">Parter</text>
      <text x="196" y="66" className="mf-lbl">Biura</text>
      <text x="196" y="166" className="mf-lbl">Tech</text>
      {[{ x: 18, y: 130, c: "#34B048", on: true }, { x: 270, y: 84, c: "#34B048" }, { x: 273, y: 178, c: "#A6A69C" }, { x: 200, y: 220, c: "#34B048" }].map((m, i) => (
        <g key={i}>
          {m.on && <circle cx={m.x} cy={m.y} r="20" fill="none" stroke="#34B048" strokeWidth="2" opacity=".45" />}
          <circle cx={m.x} cy={m.y} r="11" fill={m.c} stroke="#fff" strokeWidth="3" />
        </g>
      ))}
    </svg>
  );
}
function MiniSched() {
  const rows = [
    { n: "Pracownicy", t: "06–22", l: 25, w: 67, c: "var(--accent)" },
    { n: "Ochrona", t: "24 h", l: 0, w: 100, c: "var(--ink)" },
    { n: "Serwis", t: "08–17", l: 33, w: 38, c: "var(--warn)" },
    { n: "Goście", t: "09–18", l: 37, w: 38, c: "#5A6ACF" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{r.n}</span>
            <span className="muted" style={{ fontSize: 13 }}>{r.t}</span>
          </div>
          <div className="sched"><div className="sched-fill" style={{ left: r.l + "%", width: r.w + "%", background: r.c }} /></div>
        </div>
      ))}
      <div className="axis-x" style={{ marginTop: 2 }}><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
    </div>
  );
}

/* FAQ */
const FAQ = [
  { q: "Czy Nexon działa z naszymi obecnymi czytnikami?", a: "Tak. Wspieramy standardy MIFARE DESFire, RFID 13,56 MHz oraz biometrię. W większości wdrożeń wymieniamy jedynie kontroler, zachowując istniejące okablowanie." },
  { q: "Jak szybko można uruchomić system?", a: "Pilotaż jednej strefy uruchamiamy w 48 godzin. Pełne wdrożenie obiektu trwa zwykle od 1 do 3 tygodni, łącznie z migracją kart i szkoleniem zespołu." },
  { q: "Co się dzieje, gdy zniknie internet?", a: "Kontrolery działają autonomicznie — decyzje o dostępie zapadają lokalnie, a zdarzenia synchronizują się po przywróceniu łącza. Zero przestoju na drzwiach." },
  { q: "Czy spełniacie wymogi RODO i audytu?", a: "Tak. Pełny, niemodyfikowalny dziennik przejść, szyfrowanie AES-128 i zgodność SOC 2. Raporty eksportujesz jednym kliknięciem do PDF lub CSV." },
  { q: "Czy mogę zarządzać wieloma lokalizacjami?", a: "Oczywiście — jeden pulpit obsługuje dowolną liczbę obiektów, ze wspólnymi grupami dostępu i centralnym monitoringiem zdarzeń." },
];
function FaqList() {
  const [open, setOpen] = uSh(0);
  return (
    <div className="mk-faq">
      {FAQ.map((f, i) => (
        <div key={i} className={"faq-item" + (open === i ? " open" : "")}>
          <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
            {f.q}<Ih name="chevD" size={20} className="chev" />
          </button>
          <div className="faq-a"><div>{f.a}</div></div>
        </div>
      ))}
    </div>
  );
}

/* navbar strony głównej */
function smoothScroll(c, top, dur = 520) {
  const start = c.scrollTop, diff = top - start, t0 = performance.now();
  let raf;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    c.scrollTop = start + diff * (1 - Math.pow(1 - p, 3));
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  setTimeout(() => { cancelAnimationFrame(raf); c.scrollTop = top; }, dur + 140); // gwarancja, gdy rAF wstrzymany
}
function HomeNav({ onNav }) {
  const goTo = (id) => {
    const c = document.querySelector(".main");
    const el = document.getElementById(id);
    if (!c || !el) return;
    const top = c.scrollTop + el.getBoundingClientRect().top - c.getBoundingClientRect().top - 78;
    smoothScroll(c, Math.max(0, top));
  };
  const toTop = () => { const c = document.querySelector(".main"); if (c) smoothScroll(c, 0); };
  return (
    <nav className="home-nav">
      <button className="hn-brand" onClick={toTop}>{Ih.logo(30)} Nexon</button>
      <div className="hn-links">
        <button onClick={() => goTo("caps")}>Możliwości</button>
        <button onClick={() => goTo("steps")}>Jak to działa</button>
        <button onClick={() => goTo("plans")}>Cennik</button>
        <button onClick={() => goTo("faq")}>FAQ</button>
      </div>
      <div className="hn-cta">
        <button className="hn-ghost" onClick={() => onNav("overview")}>Zaloguj</button>
        <button className="btn-accent" style={{ height: 42 }} onClick={() => onNav("overview")}><Ih name="grid" size={17} /> Wypróbuj pulpit</button>
      </div>
    </nav>
  );
}

const CAPS = [
  { ic: "card",   t: "Biometria, RFID i PIN",     d: "Jeden czytnik obsługuje karty zbliżeniowe, kod PIN i odcisk palca w strefach krytycznych.", to: "doors" },
  { ic: "shield", t: "Alerty i lockdown",         d: "Reakcja na wymuszenie w sekundę i jeden przycisk awaryjnej blokady całego obiektu.", to: "security" },
  { ic: "mapPin", t: "Mapa obiektu na żywo",      d: "Plan budynku z góry — otwierasz i blokujesz drzwi prosto z mapy.", to: "doors" },
  { ic: "chart",  t: "Raporty i audyt RODO",      d: "Pełen dziennik i analityka ruchu gotowe do eksportu jednym kliknięciem.", to: "reports" },
  { ic: "user",   t: "Goście i wykonawcy",        d: "Karty czasowe z kodem QR, ważne dokładnie tak długo, jak trzeba.", to: "visitors" },
  { ic: "key",    t: "Karty i identyfikatory",    d: "Wydawaj, blokuj i drukuj karty stałe, tymczasowe oraz gościnne.", to: "cards" },
];

const INTEGRATIONS = [
  { ic: "card",     n: "MIFARE DESFire" },
  { ic: "wifi",     n: "RFID 13,56 MHz" },
  { ic: "key",      n: "SSO / SAML" },
  { ic: "building", n: "BMS / KNX" },
  { ic: "doc",      n: "REST API" },
  { ic: "bell",     n: "Slack / e-mail" },
  { ic: "users",    n: "Active Directory" },
  { ic: "activity", n: "Webhooki" },
  { ic: "eye",      n: "Kamery ONVIF" },
];

const PLANS = [
  { n: "Starter", price: "499", unit: "/ mies.", d: "Dla jednej lokalizacji i małego zespołu.", feat: false, cta: "Rozpocznij", to: "overview",
    items: ["Do 10 punktów dostępu", "Karty stałe i tymczasowe", "Harmonogramy czasowe", "Dziennik przejść 90 dni"] },
  { n: "Biznes", price: "1 290", unit: "/ mies.", d: "Najczęstszy wybór rosnących obiektów.", feat: true, cta: "Wypróbuj pulpit", to: "overview",
    items: ["Do 100 punktów dostępu", "Mapa obiektu na żywo", "Biometria i 2FA", "Alerty i lockdown", "Raporty i audyt RODO"] },
  { n: "Enterprise", price: "Indywidualnie", unit: "", d: "Wiele lokalizacji i integracje pod klucz.", feat: false, cta: "Umów rozmowę", to: "overview",
    items: ["Bez limitu punktów", "Wiele lokalizacji", "SSO / SAML i API", "Dedykowany opiekun", "SLA 99,99%"] },
];

function PageHome({ page, onNav }) {
  return (
    <div className="home mk">
      <HomeNav onNav={onNav} />
      {/* HERO */}
      <section className="hh">
        <div className="hh-grid" />
        <div className="hh-glow" />
        <div className="hh-mark">{Ih.logo(280)}</div>
        <div className="hh-inner">
          <div>
            <span className="hh-live"><span className="lp" /> System operacyjny · 99,98% dostępności</span>
            <h1>Kontrola dostępu,<br />która <span className="g">po prostu działa</span>.</h1>
            <p className="hh-sub">Nexon łączy czytniki, karty, harmonogramy i monitoring w jednej platformie. Otwieraj, blokuj i audytuj każde drzwi z jednego pulpitu — z dowolnego miejsca.</p>
            <div className="hh-cta">
              <button className="btn-accent" style={{ height: 48 }} onClick={() => onNav("overview")}><Ih name="grid" size={18} /> Wypróbuj pulpit</button>
              <button className="btn-on-dark" onClick={() => onNav("doors")}><Ih name="mapPin" size={18} /> Zobacz mapę obiektu</button>
            </div>
            <div className="hh-trust">
              <div className="t"><b>SOC 2</b> i szyfrowanie AES</div>
              <div className="t"><b>24/7</b> monitoring zdarzeń</div>
              <div className="t"><b>&lt;120 ms</b> czas odczytu</div>
            </div>
          </div>
          <ScanDemo />
        </div>
      </section>

      {/* ZAUFANIE */}
      <div className="mk-trust">
        <div className="lbl">Zaufały nam zespoły bezpieczeństwa w</div>
        <div className="mk-logos">
          {["Vertex", "Kontur", "Aurio", "Polmech", "Statera", "Nordis"].map((n, i) => (
            <span key={i} className="lg"><span className="dotmark" /> {n}</span>
          ))}
        </div>
      </div>

      {/* FUNKCJE — naprzemienne sekcje */}
      <div className="mk-block">
        <div className="mk-head">
          <div className="eyebrow">Platforma</div>
          <h2>Bezpieczeństwo bez kompromisów w wygodzie</h2>
          <p>Trzy filary, które codziennie oszczędzają czas zespołom ochrony i administracji.</p>
        </div>
        <div className="mk-splits">
          {/* split 1 — mapa */}
          <div className="mk-split">
            <div className="mk-split-txt">
              <div className="eyebrow">Mapa na żywo</div>
              <h3>Otwieraj i blokuj drzwi prosto z planu budynku</h3>
              <p>Każdy punkt dostępu widzisz tam, gdzie naprawdę jest. Kliknięcie wystarczy, by zwolnić zamek, podejrzeć grupę uprawnień albo wprowadzić lockdown.</p>
              <ul className="mk-bul">
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Status każdego przejścia w czasie rzeczywistym</li>
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Zdalne otwarcie i blokada jednym kliknięciem</li>
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Awaryjny lockdown całego obiektu</li>
              </ul>
              <button className="mk-link" onClick={() => onNav("doors")}>Zobacz mapę obiektu <Ih name="arrowUR" size={16} /></button>
            </div>
            <div className="mk-visual"><MiniFloor /></div>
          </div>

          {/* split 2 — harmonogramy */}
          <div className="mk-split rev">
            <div className="mk-split-txt">
              <div className="eyebrow">Harmonogramy</div>
              <h3>Okna czasowe, które zmieniasz w sekundę</h3>
              <p>Przeciągasz suwak — zmiana wchodzi w życie od razu. Inne reguły dla pracowników, ochrony, serwisu i gości, bez dzwonienia do integratora.</p>
              <ul className="mk-bul">
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Reguły per grupa dostępu i strefa</li>
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Antipassback i tryb dwuskładnikowy 2FA</li>
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Zmiany z natychmiastową synchronizacją</li>
              </ul>
              <button className="mk-link" onClick={() => onNav("doors")}>Skonfiguruj harmonogram <Ih name="arrowUR" size={16} /></button>
            </div>
            <div className="mk-visual"><MiniSched /></div>
          </div>

          {/* split 3 — monitoring */}
          <div className="mk-split">
            <div className="mk-split-txt">
              <div className="eyebrow">Monitoring</div>
              <h3>Każde wejście i odmowa — od razu widoczne</h3>
              <p>Strumień zdarzeń na żywo, powiadomienia o wymuszeniach i pełny dziennik gotowy do audytu. Nic nie umyka uwadze.</p>
              <ul className="mk-bul">
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Alerty o wymuszeniu i naruszeniach</li>
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Niemodyfikowalny dziennik przejść</li>
                <li><span className="ck"><Ih name="check" size={13} sw={2.4} /></span> Eksport raportów do PDF i CSV</li>
              </ul>
              <button className="mk-link" onClick={() => onNav("security")}>Otwórz centrum bezpieczeństwa <Ih name="arrowUR" size={16} /></button>
            </div>
            <div className="mk-visual" style={{ paddingTop: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Na żywo w obiekcie</span>
                <span className="hh-live" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-soft)", color: "var(--accent-ink)", height: 30 }}><span className="lp" style={{ background: "var(--accent-deep)" }} /> Na żywo</span>
              </div>
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>

      {/* JAK TO DZIAŁA */}
      <div className="mk-block" id="steps">
        <div className="mk-head">
          <div className="eyebrow">Wdrożenie</div>
          <h2>Od montażu do pełnej kontroli w 3 krokach</h2>
        </div>
        <div className="mk-steps">
          {[
            { n: "1", cls: "d", ic: "card", t: "Podłącz czytniki", d: "Montujemy kontrolery Nexon na istniejącym okablowaniu. Bez wymiany infrastruktury." },
            { n: "2", cls: "g", ic: "key", t: "Wydaj karty", d: "Importujesz pracowników i przypisujesz karty oraz poziomy dostępu w kilka minut." },
            { n: "3", cls: "s", ic: "grid", t: "Zarządzaj z pulpitu", d: "Otwierasz, blokujesz, audytujesz i raportujesz — wszystko z jednego ekranu." },
          ].map((s, i) => (
            <div key={i} className="mk-step">
              <div className={"num " + s.cls}><Ih name={s.ic} size={24} /></div>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PASEK LICZB */}
      <section className="mk-ribbon">
        {[
          { to: 128, label: "Obiektów pod ochroną" },
          { to: 3410, sep: true, label: "Punktów dostępu" },
          { to: 48920, sep: true, label: "Przejść dziennie" },
          { to: 99.98, dec: 2, suffix: "%", label: "Dostępność systemu" },
        ].map((s, i) => (
          <div key={i} className="rb">
            <div className="rv"><Counter to={s.to} sep={s.sep} dec={s.dec} suffix={s.suffix && <span className="u">{s.suffix}</span>} /></div>
            <div className="rl">{s.label}</div>
          </div>
        ))}
      </section>

      {/* MOŻLIWOŚCI — układ edytorski */}
      <div className="mk-block" id="caps">
        <div className="mk-caps">
          <div className="mk-caps-head">
            <div className="eyebrow">Możliwości</div>
            <h2>Wszystko, czego potrzebuje ochrona — w jednym</h2>
            <p>Jedna platforma zamiast pięciu osobnych systemów. Mniej sprzętu, mniej szkoleń, jeden spójny obraz dostępu.</p>
            <button className="btn-dark" style={{ marginTop: 24 }} onClick={() => onNav("overview")}><Ih name="grid" size={17} /> Zobacz w pulpicie</button>
          </div>
          <div className="mk-cap-list">
            {CAPS.map((c, i) => (
              <button key={i} className="cap-row" onClick={() => onNav(c.to)}>
                <span className="cap-ic"><Ih name={c.ic} size={23} /></span>
                <span className="cap-tx">
                  <span className="t">{c.t}</span>
                  <span className="d">{c.d}</span>
                </span>
                <span className="cap-ar"><Ih name="arrowUR" size={19} /></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* INTEGRACJE */}
      <section className="mk-integ">
        <div className="mk-integ-tx">
          <div className="eyebrow">Integracje</div>
          <h3>Działa z Twoją obecną infrastrukturą</h3>
          <p>Podłączamy się do tego, co już masz — od standardów kart, przez katalog użytkowników, po systemy budynkowe i powiadomienia.</p>
        </div>
        <div className="mk-integ-grid">
          {INTEGRATIONS.map((it, i) => (
            <div key={i} className="integ"><span className="ig-ic"><Ih name={it.ic} size={17} /></span> {it.n}</div>
          ))}
        </div>
      </section>

      {/* CYTAT */}
      <section className="mk-quote">
        <div className="qm">“</div>
        <blockquote>Wymieniliśmy trzy osobne systemy na jeden Nexon. Czas reakcji ochrony spadł o połowę, a audyt RODO przestał być koszmarem.</blockquote>
        <div className="who">
          <Avh name="Robert Kamiński" size={46} />
          <div>
            <div className="nm">Robert Kamiński</div>
            <div className="ro">Kierownik bezpieczeństwa · Statera</div>
          </div>
        </div>
      </section>

      {/* CENNIK */}
      <div className="mk-block" id="plans">
        <div className="mk-head">
          <div className="eyebrow">Cennik</div>
          <h2>Plan dopasowany do skali obiektu</h2>
          <p>Przejrzyste stawki, bez ukrytych kosztów. Zmieniasz plan, kiedy rośniesz.</p>
        </div>
        <div className="mk-plans">
          {PLANS.map((p, i) => (
            <div key={i} className={"plan" + (p.feat ? " feat" : "")}>
              {p.feat && <span className="plan-badge">Polecany</span>}
              <div className="pn">{p.n}</div>
              <div className="pp">{p.price}{p.unit && <small> {p.unit}</small>}</div>
              <div className="pd">{p.d}</div>
              <ul>
                {p.items.map((it, j) => <li key={j}><Ih name="check" size={16} sw={2.4} className="ck" /> {it}</li>)}
              </ul>
              <button className={(p.feat ? "btn-accent" : "btn-dark") + " pbtn"} onClick={() => onNav(p.to)}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mk-block" id="faq">
        <div className="mk-head">
          <div className="eyebrow">FAQ</div>
          <h2>Najczęstsze pytania</h2>
        </div>
        <FaqList />
      </div>

      {/* CTA */}
      <section className="home-cta">
        <div className="cta-mark">{Ih.logo(220)}</div>
        <div style={{ position: "relative" }}>
          <h2>Gotowy, by przejąć kontrolę<br />nad każdym wejściem?</h2>
          <p>Uruchom pilotaż w 48 godzin. Bez wymiany okablowania.</p>
        </div>
        <button className="btn-cta-dark" style={{ position: "relative" }} onClick={() => onNav("overview")}><Ih name="arrowUR" size={19} /> Wypróbuj pulpit</button>
      </section>

      {/* STOPKA */}
      <footer className="mk-footer">
        <div className="mk-foot-top">
          <div className="mk-foot-brand">
            <span className="fb-logo"><span className="lk">{Ih.logo(24)}</span> Nexon</span>
            <p>Platforma kontroli dostępu dla nowoczesnych obiektów. Bezpieczeństwo, które po prostu działa.</p>
          </div>
          <div className="mk-foot-col">
            <h5>Produkt</h5>
            <a onClick={() => onNav("overview")}>Pulpit</a>
            <a onClick={() => onNav("doors")}>Punkty dostępu</a>
            <a onClick={() => onNav("cards")}>Karty</a>
            <a onClick={() => onNav("reports")}>Raporty</a>
          </div>
          <div className="mk-foot-col">
            <h5>Firma</h5>
            <a>O nas</a>
            <a>Kariera</a>
            <a>Partnerzy</a>
            <a>Kontakt</a>
          </div>
          <div className="mk-foot-col">
            <h5>Wsparcie</h5>
            <a>Dokumentacja</a>
            <a>Status systemu</a>
            <a>Centrum pomocy</a>
            <a>Bezpieczeństwo</a>
          </div>
        </div>
        <div className="mk-foot-bot">
          <span>© 2026 Nexon Sp. z o.o. · Wszelkie prawa zastrzeżone</span>
          <div className="soc">
            <span><Ih name="globe" size={17} /></span>
            <span><Ih name="mail" size={17} /></span>
            <span><Ih name="phone" size={17} /></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
window.PageHome = PageHome;
