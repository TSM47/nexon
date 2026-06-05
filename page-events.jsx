/* page-events.jsx — Zdarzenia / Dziennik */
const { TopNav: TNv, PageHead: PHv, SubTabs: STv, Field: Fv, Avatar: Avv, Badge: Bv, Icon: Iv, Drawer: Drv, DKV: DKVv, useDrawer: useDrv } = window;

function EventDetail({ e }) {
  const t = TYPE[e.type];
  const sys = e.name === "System";
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {sys ? <div className="itile red" style={{ width: 52, height: 52 }}><Iv name="alert" size={24} /></div> : <Avv name={e.name} size={52} />}
        <div><div style={{ fontSize: 18, fontWeight: 700 }}>{e.name}</div><div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{e.pt}</div></div>
        <span style={{ marginLeft: "auto" }}><Bv tone={t.tone}><Iv name={t.ic} size={13} /> {t.label}</Bv></span>
      </div>
      <div className="snap" style={{ height: 188, marginTop: 18 }}><span><Iv name="eye" size={20} /> podgląd z kamery</span></div>
      <div className="dsection">Szczegóły zdarzenia</div>
      <div className="card" style={{ padding: "4px 16px" }}>
        <DKVv k="Czas" v={"5 cze 2026 · " + e.time} />
        <DKVv k="Punkt dostępu" v={e.pt} />
        <DKVv k="Karta" v={e.card} />
        <DKVv k="Typ" v={t.label} />
        <DKVv k="Wynik" v={e.type === "deny" ? "Odrzucono" : e.type === "alarm" ? "Alarm" : "Zezwolono"} />
        {e.type === "deny" && <DKVv k="Powód" v="Brak uprawnień do strefy" />}
      </div>
      <div className="dsection">Przebieg</div>
      <div className="tl">
        <div className="tl-item"><div className="tl-t">Odczyt karty</div><div className="tl-m">{e.time}:0{e.type === "deny" ? 1 : 2} · {e.card}</div></div>
        <div className={"tl-item " + (e.type === "deny" ? "red" : "")}><div className="tl-t">Weryfikacja uprawnień</div><div className="tl-m">{e.type === "deny" ? "Odmowa" : "OK"}</div></div>
        {e.type !== "deny" && <div className="tl-item grey"><div className="tl-t">Otwarcie zamka</div><div className="tl-m">{e.pt}</div></div>}
      </div>
    </>
  );
}

const LOG = [
  { time: "14:32", name: "Anna Kowalska",     pt: "Wejście główne", card: "#A‑1042", type: "in" },
  { time: "14:30", name: "Robert Kamiński",   pt: "Recepcja",        card: "#A‑0011", type: "in" },
  { time: "14:28", name: "Marek Nowak",       pt: "Serwerownia",     card: "#A‑0461", type: "deny" },
  { time: "14:21", name: "Julia Wiśniewska",  pt: "Biuro · 2 piętro",card: "#B‑0317", type: "out" },
  { time: "14:18", name: "Michał Szymański",  pt: "Brama garażowa",  card: "#A‑0356", type: "in" },
  { time: "14:15", name: "Piotr Zięba",       pt: "Parking P1",      card: "#A‑0098", type: "in" },
  { time: "14:11", name: "System",            pt: "Dach · techniczne",card: "—",      type: "alarm" },
  { time: "14:02", name: "Gość · T. Schmidt", pt: "Recepcja",        card: "#G‑12",   type: "guest" },
  { time: "13:58", name: "Karolina Mazur",    pt: "Magazyn",         card: "#C‑2204", type: "in" },
  { time: "13:54", name: "Ewa Dąbrowska",     pt: "Magazyn",         card: "#C‑1190", type: "deny" },
  { time: "13:40", name: "Gość · G‑08",       pt: "Archiwum",        card: "#G‑08",   type: "deny" },
  { time: "13:22", name: "Piotr Zięba",       pt: "Parking P1",      card: "#A‑0098", type: "alarm" },
  { time: "13:10", name: "Tomasz Lewandowski",pt: "Serwerownia",     card: "#A‑0772", type: "in" },
  { time: "12:48", name: "Agnieszka Wójcik",  pt: "Wejście główne",  card: "#B‑0420", type: "out" },
  { time: "12:40", name: "Anna Kowalska",     pt: "Biuro · 1 piętro",card: "#A‑1042", type: "in" },
  { time: "12:31", name: "Robert Kamiński",   pt: "Dach · techniczne",card: "#A‑0011", type: "in" },
];
const TYPE = {
  in:    { tone: "in",      label: "Wejście",  ic: "in" },
  out:   { tone: "neutral", label: "Wyjście",  ic: "out" },
  deny:  { tone: "blk",     label: "Odmowa",   ic: "x" },
  alarm: { tone: "down",    label: "Alarm",    ic: "alert" },
  guest: { tone: "up",      label: "Gość",     ic: "user" },
};
const ECOLS = "96px 2fr 1.5fr 1.1fr 1.2fr";

function MiniE({ label, val, pill, tone }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="card-sub" style={{ marginTop: 0 }}>{label}</span>
        {pill && <span className={"pill " + tone}>{pill}</span>}
      </div>
      <div className="big-num" style={{ fontSize: 34, marginTop: 10 }}>{val}</div>
    </div>
  );
}

function PageEvents({ page, onNav }) {
  const [tab, setTab] = React.useState("all");
  const dr = useDrv();
  const inSet = ["in", "out", "guest"];
  const rows = LOG.filter(e => tab === "all" ? true : tab === "in" ? inSet.includes(e.type) : tab === "deny" ? e.type === "deny" : e.type === "alarm");
  const tabs = [
    { id: "all", label: "Wszystkie", count: LOG.length },
    { id: "in", label: "Wejścia/wyjścia", count: LOG.filter(e => inSet.includes(e.type)).length },
    { id: "deny", label: "Odmowy", count: LOG.filter(e => e.type === "deny").length },
    { id: "alarm", label: "Alarmy", count: LOG.filter(e => e.type === "alarm").length },
  ];
  return (
    <>
      <TNv page={page} onNav={onNav} />
      <PHv crumb={["Strona główna", "Zdarzenia"]} title="Zdarzenia"
        right={<><Fv placeholder="Szukaj w dzienniku…" /><button className="chip"><Iv name="calendar" size={16} /> Dziś · 5 cze 2026</button><button className="btn-dark"><Iv name="download" size={18} /> Eksportuj</button></>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 18 }}>
        <MiniE label="Zdarzenia dziś" val="1 204" pill="−11%" tone="down" />
        <MiniE label="Udane wejścia" val="1 120" pill="93%" tone="up" />
        <MiniE label="Odmowy dostępu" val="23" pill="+5" tone="down" />
        <MiniE label="Alarmy" val="2" pill="uwaga" tone="warn" />
      </div>

      <section className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <STv tabs={tabs} active={tab} onChange={setTab} />
          <button className="chip"><Iv name="filter" size={16} /> Punkt dostępu</button>
        </div>
        <div className="tbl-head" style={{ gridTemplateColumns: ECOLS }}>
          <span>Czas</span><span>Osoba</span><span>Punkt dostępu</span><span>Karta</span><span>Typ zdarzenia</span>
        </div>
        {rows.map((e, i) => {
          const t = TYPE[e.type];
          const sys = e.name === "System";
          return (
            <div key={i} className="tbl-row" style={{ gridTemplateColumns: ECOLS }} onClick={() => dr.show(e)}>
              <span className="mono cell-mut" style={{ fontSize: 13.5 }}>{e.time}</span>
              <div className="cell-name">
                {sys ? <div className="itile red" style={{ width: 36, height: 36 }}><Iv name="alert" size={17} /></div> : <Avatar name={e.name} size={36} />}
                <span className="nm" style={{ fontSize: 14.5 }}>{e.name}</span>
              </div>
              <span className="cell-mut">{e.pt}</span>
              <span className="mono cell-mut" style={{ fontSize: 13.5 }}>{e.card}</span>
              <span><Bv tone={t.tone}><Iv name={t.ic} size={13} /> {t.label}</Bv></span>
            </div>
          );
        })}
      </section>

      <Drv open={dr.open} onClose={dr.close} title="Szczegóły zdarzenia" sub={dr.sel ? dr.sel.time : ""}
        footer={<><button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => onNav("employees")}><Iv name="user" size={16} /> Profil</button>
          <button className="btn-dark" style={{ flex: 1, justifyContent: "center" }}><Iv name="download" size={16} /> Eksportuj</button></>}>
        {dr.sel && <EventDetail e={dr.sel} />}
      </Drv>
    </>
  );
}
window.PageEvents = PageEvents;
