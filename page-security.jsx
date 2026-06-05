/* page-security.jsx — Centrum bezpieczeństwa (na bazie wariantu B) */
const { TopNav: TNs, PageHead: PHs, Badge: Bs, Icon: Is, CardHead: CHs, DeviceRow: DvRs } = window;
const { Spark: SpS } = window;

const SDOORS = [
  { name: "Wejście główne",   sub: "Ostatnie · 14:32", state: "Otwarte",     dot: "green", cls: "" },
  { name: "Recepcja",         sub: "Ostatnie · 14:30", state: "Otwarte",     dot: "green", cls: "" },
  { name: "Serwerownia",      sub: "Zamknięte · 12:04", state: "Zablokowane", dot: "grey",  cls: "locked" },
  { name: "Biuro · 2 piętro", sub: "Ostatnie · 14:21", state: "Otwarte",     dot: "green", cls: "" },
  { name: "Magazyn",          sub: "Zamknięte · 13:10", state: "Zablokowane", dot: "grey",  cls: "locked" },
  { name: "Parking P1",       sub: "Ostatnie · 14:15", state: "Otwarte",     dot: "green", cls: "" },
  { name: "Dach · techniczne",sub: "Drzwi wymuszone!", state: "Alarm",       dot: "red",   cls: "alarm" },
  { name: "Archiwum",         sub: "Zamknięte · 11:48", state: "Zablokowane", dot: "grey",  cls: "locked" },
];
const SALERTS = [
  { lvl: "red",   ic: "x",     t: "Próba wejścia bez uprawnień", m: "Serwerownia · Marek Nowak · 14:28" },
  { lvl: "red",   ic: "alert", t: "Drzwi wymuszone — alarm",      m: "Dach · techniczne · 14:11" },
  { lvl: "amber", ic: "card",  t: "Karta wygasła",                m: "Magazyn · Karta #C‑1190 · 13:54" },
  { lvl: "amber", ic: "key",   t: "Wielokrotna odmowa (3×)",      m: "Archiwum · Gość G‑08 · 13:40" },
  { lvl: "red",   ic: "alert", t: "Naruszenie antipassback",      m: "Parking P1 · Karta #A‑0098 · 13:22" },
];
const SLIVE = [
  { time: "14:32", who: "Anna Kowalska",    zone: "Wejście główne", card: "#A‑1042", tag: "Wejście", pill: "up" },
  { time: "14:28", who: "Marek Nowak",      zone: "Serwerownia",    card: "#A‑0461", tag: "Odmowa",  pill: "down" },
  { time: "14:21", who: "Julia Wiśniewska", zone: "Biuro · 2p.",    card: "#B‑0317", tag: "Wyjście", pill: "neutral" },
  { time: "14:15", who: "Piotr Zięba",      zone: "Parking P1",     card: "#A‑0098", tag: "Wejście", pill: "up" },
  { time: "14:02", who: "Gość · T. Schmidt",zone: "Recepcja",       card: "G‑12",    tag: "Gość",    pill: "up" },
  { time: "13:58", who: "Karolina Mazur",   zone: "Magazyn",        card: "#C‑2204", tag: "Wejście", pill: "up" },
];

function SDoorTile({ name, sub, state, dot, cls }) {
  const stColor = dot === "green" ? "var(--accent-ink)" : dot === "red" ? "var(--danger-ink)" : "var(--muted)";
  return (
    <div className={"door " + cls}>
      <div className="door-top">
        <span className={"dot " + dot} />
        <Is name={dot === "grey" ? "lock" : dot === "red" ? "alert" : "unlock"} size={17} />
      </div>
      <div className="door-name">{name}</div>
      <div className="door-sub">{sub}</div>
      <div className="door-state" style={{ color: stColor, marginTop: 10 }}>{state}</div>
    </div>
  );
}

function PageSecurity({ page, onNav }) {
  return (
    <>
      <TNs page={page} onNav={onNav} />
      <PHs crumb={["Strona główna", "Monitoring"]} title="Centrum bezpieczeństwa"
        right={<><span className="chip soft" style={{ color: "var(--accent-ink)", fontWeight: 600 }}><span className="dot green" style={{ boxShadow: "none" }} /> Na żywo</span><button className="chip"><Is name="calendar" size={16} /> Dziś · 5 cze 2026</button></>} />

      <div style={{ display: "grid", gridTemplateColumns: "356px minmax(0,1fr) 384px", gridTemplateAreas: '"occ doors alerts" "events events events"', gap: 18 }}>
        <div style={{ gridArea: "occ", display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="card" style={{ padding: 22 }}>
            <div className="card-h">
              <div className="card-sub" style={{ marginTop: 0 }}>W budynku teraz</div>
              <button className="arrow" onClick={() => onNav("overview")}><Is name="arrowUR" size={18} /></button>
            </div>
            <div className="big-num" style={{ marginTop: 10 }}>247<span className="dim" style={{ fontSize: 28 }}> / 312</span></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <span className="pill up"><Is name="in" size={14} /> +18 dzisiaj</span>
              <SpS color="#3FB94F" up={true} />
            </div>
          </section>
          <section className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div><div className="card-sub" style={{ marginTop: 0 }}>Odmowy dostępu · dziś</div><div className="big-num" style={{ fontSize: 34, marginTop: 4 }}>23</div></div>
              <span className="pill down">+5</span>
            </div>
            <div style={{ height: 1, background: "var(--line)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div><div className="card-sub" style={{ marginTop: 0 }}>Aktywne karty</div><div className="big-num" style={{ fontSize: 34, marginTop: 4 }}>1 248</div></div>
              <span className="pill up">+6</span>
            </div>
          </section>
          <section className="card" style={{ padding: 22, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="card-h">
              <div className="card-sub" style={{ marginTop: 0 }}>Kondycja systemu</div>
              <span className="pill up"><Is name="check" size={14} /> Sprawny</span>
            </div>
            <div style={{ marginTop: 8, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <DvRs icon="grid" name="Kontrolery" desc="12 / 12 online" tone="ok" status="OK" />
                <DvRs icon="power" name="Zasilanie" desc="Sieć + UPS · 8 h" tone="ok" status="Stabilne" />
                <DvRs icon="wifi" name="Łącze sieciowe" desc="Ping 14 ms" tone="ok" status="Online" />
                <DvRs icon="refresh" name="Kopia zapasowa" desc="Dziś · 03:00" tone="ok" status="Aktualna" />
                <DvRs icon="download" name="Firmware" desc="1 aktualizacja oczekuje" tone="warn" status="Do zrobienia" />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <span className="muted" style={{ fontSize: 13 }}>Ostatni audyt · dziś 06:00</span>
                <button className="chip" style={{ height: 32 }} onClick={() => onNav("reports")}><Is name="doc" size={15} /> Raport</button>
              </div>
            </div>
          </section>
        </div>

        <section className="card" style={{ gridArea: "doors", padding: 24 }}>
          <CHs title="Status drzwi" sub="12 punktów dostępu · 8 aktywnych" right={<div style={{ display: "flex", gap: 8 }}><Bs tone="up">6 otwartych</Bs><Bs tone="neutral">3 zablok.</Bs><Bs tone="down">1 alarm</Bs></div>} />
          <div className="door-grid" style={{ marginTop: 20, gridTemplateColumns: "repeat(2,1fr)" }}>
            {SDOORS.map((d, i) => <SDoorTile key={i} {...d} />)}
          </div>
        </section>

        <section className="card" style={{ gridArea: "alerts", padding: 24, display: "flex", flexDirection: "column" }}>
          <CHs title="Alerty" sub="5 wymaga uwagi" right={<span className="pill down">5</span>} />
          <div style={{ marginTop: 8, flex: 1 }}>
            {SALERTS.map((a, i) => (
              <div key={i} className="al">
                <div className={"al-ic " + a.lvl}><Is name={a.ic} size={18} /></div>
                <div style={{ flex: 1 }}><div className="al-title">{a.t}</div><div className="al-meta">{a.m}</div></div>
                <button className="arrow" style={{ width: 32, height: 32 }} onClick={() => onNav("events")}><Is name="arrowUR" size={15} /></button>
              </div>
            ))}
          </div>
          <button className="act danger" style={{ height: 54, borderRadius: 16, gap: 10, fontWeight: 700, fontSize: 15, display: "flex" }}>
            <Is name="lock" size={20} /> Lockdown · zablokuj wszystkie
          </button>
        </section>

        <section className="card" style={{ gridArea: "events", padding: 24 }}>
          <CHs title="Zdarzenia na żywo" sub="Strumień przejść w czasie rzeczywistym" right={<button className="chip"><Is name="sliders" size={16} /> Filtruj</button>} />
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1.4fr 1.2fr 1fr 130px", gap: 16, padding: "0 8px 12px", fontSize: 13, color: "var(--muted)", fontWeight: 500, borderBottom: "1px solid var(--line)" }}>
              <span>Czas</span><span>Osoba</span><span>Strefa</span><span>Karta</span><span style={{ textAlign: "right" }}>Status</span>
            </div>
            {SLIVE.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1.4fr 1.2fr 1fr 130px", gap: 16, padding: "13px 8px", alignItems: "center", borderBottom: i < SLIVE.length - 1 ? "1px solid var(--line)" : "none" }}>
                <span className="mono" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{r.time}</span>
                <span style={{ fontWeight: 600, fontSize: 14.5 }}>{r.who}</span>
                <span style={{ color: "var(--ink-2)", fontSize: 14 }}>{r.zone}</span>
                <span className="mono" style={{ fontSize: 13.5, color: "var(--muted)" }}>{r.card}</span>
                <span style={{ textAlign: "right" }}><span className={"pill " + r.pill}>{r.tag}</span></span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
window.PageSecurity = PageSecurity;
