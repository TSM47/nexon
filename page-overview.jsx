/* page-overview.jsx — Przegląd (na bazie wariantu A) */
const { TopNav: TNo, PageHead: PHo, Toolbar: TBo, CardHead: CHo, EventRow: ERo, Icon: Io } = window;
const { AreaChart: ACo, VolumeBars: VBo, WeekBars: WBo, ZoneBars: ZBo } = window;

const OVR_EVENTS = [
  { kind: "in",    ic: "in",   name: "Anna Kowalska",     place: "Wejście główne · Karta #A‑1042",  tag: "Wejście", tagPill: "up",      time: "14:32" },
  { kind: "deny",  ic: "x",    name: "Marek Nowak",       place: "Serwerownia · Brak uprawnień",     tag: "Odmowa",  tagPill: "down",    time: "14:28" },
  { kind: "out",   ic: "out",  name: "Julia Wiśniewska",  place: "Biuro 2p. · Karta #B‑0317",        tag: "Wyjście", tagPill: "neutral", time: "14:21" },
  { kind: "in",    ic: "in",   name: "Piotr Zięba",       place: "Parking P1 · Karta #A‑0098",       tag: "Wejście", tagPill: "up",      time: "14:15" },
  { kind: "guest", ic: "user", name: "Gość: T. Schmidt",  place: "Recepcja · Identyfikator G‑12",    tag: "Gość",    tagPill: "up",      time: "14:02" },
  { kind: "in",    ic: "in",   name: "Karolina Mazur",    place: "Magazyn · Karta #C‑2204",          tag: "Wejście", tagPill: "up",      time: "13:58" },
];

function GoArrow({ to, onNav }) { return <button className="arrow" onClick={() => onNav(to)}><Io name="arrowUR" size={18} /></button>; }

function PageOverview({ page, onNav }) {
  return (
    <>
      <TNo page={page} onNav={onNav} />
      <PHo crumb={["Strona główna", "Pulpit"]} title="Witaj z powrotem, Marku" right={<TBo range="20 – 27 sty 2026" />} />

      <div style={{ display: "grid", gridTemplateColumns: "392px minmax(0,1fr) 360px", gridTemplateAreas: '"left vol newc" "left zone zone"', gap: 18 }}>

        <section className="card" style={{ gridArea: "left", display: "flex", flexDirection: "column", padding: 22 }}>
          <div className="card-h">
            <div>
              <div className="card-sub" style={{ marginTop: 0, marginBottom: 6 }}>Osoby w budynku teraz</div>
              <div className="big-num">247<span className="dim" style={{ fontSize: 30 }}> / 312</span></div>
              <div style={{ marginTop: 8 }}><span className="pill up"><Io name="in" size={14}/> +18 dzisiaj</span></div>
            </div>
            <GoArrow to="security" onNav={onNav} />
          </div>

          <div className="actions">
            <button className="act primary" onClick={() => onNav("doors")}><Io name="unlock" size={20} /></button>
            <button className="act danger" onClick={() => onNav("security")}><Io name="lock" size={20} /></button>
            <button className="act" onClick={() => onNav("cards")}><Io name="card" size={20} /></button>
            <button className="act" onClick={() => onNav("reports")}><Io name="download" size={20} /></button>
          </div>

          <div style={{ margin: "6px -4px 4px" }}><ACo height={146} tip="247 osób · 14:00" /></div>
          <div style={{ height: 1, background: "var(--line)", margin: "14px 0 16px" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>Ostatnie zdarzenia</div>
            <span className="lnk" style={{ fontSize: 14, color: "var(--muted)" }} onClick={() => onNav("events")}>Zobacz wszystkie →</span>
          </div>
          <div className="ev-list">{OVR_EVENTS.map((e, i) => <ERo key={i} {...e} />)}</div>
        </section>

        <section className="card" style={{ gridArea: "vol", padding: 24 }}>
          <CHo title="Ruch przejść" sub="1 sty – 5 cze 2026" right={<GoArrow to="events" onNav={onNav} />} />
          <div style={{ marginTop: 20 }}><VBo height={196} /></div>
        </section>

        <section className="card" style={{ gridArea: "newc", padding: 24 }}>
          <CHo title="Szybkie akcje" sub="Najczęstsze operacje" right={null} />
          <div className="qa-grid" style={{ marginTop: 18 }}>
            <button className="qa-btn" onClick={() => onNav("employees")}>
              <span className="qa-ic black"><Io name="userPlus" size={21} /></span>
              <span className="qa-l">Tworzenie użytkownika</span>
              <span className="qa-s">Dodaj pracownika</span>
            </button>
            <button className="qa-btn" onClick={() => onNav("employees")}>
              <span className="qa-ic"><Io name="edit" size={21} /></span>
              <span className="qa-l">Edycja użytkownika</span>
              <span className="qa-s">Zmień dane i dostęp</span>
            </button>
            <button className="qa-btn" onClick={() => onNav("cards")}>
              <span className="qa-ic"><Io name="card" size={21} /></span>
              <span className="qa-l">Tworzenie karty</span>
              <span className="qa-s">Wydaj identyfikator</span>
            </button>
            <button className="qa-btn" onClick={() => onNav("doors")}>
              <span className="qa-ic"><Io name="door" size={21} /></span>
              <span className="qa-l">Edycja punktu dostępu</span>
              <span className="qa-s">Konfiguruj strefę</span>
            </button>
          </div>
        </section>

        <section className="card" style={{ gridArea: "zone", padding: 24 }}>
          <div className="card-h" style={{ marginBottom: 24 }}>
            <div>
              <div className="card-title">Aktywność wg stref</div>
              <div className="card-sub">Przejścia i odmowy w podziale na strefy</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="chip"><Io name="calendar" size={16} /> 20 – 27 sty 2026</button>
              <GoArrow to="reports" onNav={onNav} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 60, marginBottom: 22, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--accent)", color: "#0d2a13", display: "grid", placeItems: "center", flex: "none" }}><Io name="door" size={22} /></div>
              <div>
                <div style={{ fontSize: 14, color: "var(--muted)" }}>Strefa · Wejście główne</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <span className="big-num" style={{ fontSize: 32 }}>3 204<span className="dim" style={{ fontSize: 20 }}> przejść</span></span>
                  <span className="pill down">−4%</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--black)", color: "#fff", display: "grid", placeItems: "center", flex: "none" }}><Io name="shield" size={22} /></div>
              <div>
                <div style={{ fontSize: 14, color: "var(--muted)" }}>Strefa · Serwerownia</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <span className="big-num" style={{ fontSize: 32 }}>412<span className="dim" style={{ fontSize: 20 }}> przejść</span></span>
                  <span className="pill up">+6%</span>
                </div>
              </div>
            </div>
          </div>
          <ZBo height={210} />
        </section>
      </div>
    </>
  );
}
window.PageOverview = PageOverview;
