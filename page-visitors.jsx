/* page-visitors.jsx — Goście */
const { TopNav: TNg, PageHead: PHg, SubTabs: STg, Field: Fg, Avatar: Avg, Badge: Bg, Icon: Ig, CardHead: CHg, Drawer: Drg, DKV: DKVg, useDrawer: useDrg } = window;

function VisitorDetail({ v }) {
  const s = VST[v.st];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avg name={v.name} size={56} />
        <div><div style={{ fontSize: 19, fontWeight: 700 }}>{v.name}</div><div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{v.comp}</div></div>
        <span style={{ marginLeft: "auto" }}><Bg tone={s.tone}>{s.label}</Bg></span>
      </div>
      <div className="dsection">Identyfikator gościa</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div className="qr" style={{ width: 84, height: 84 }}><Ig name="qr" size={30} /></div>
        <div><div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>#G‑12</div><div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Ważny: dziś do 18:00</div></div>
      </div>
      <div className="dsection">Wizyta</div>
      <div className="card" style={{ padding: "4px 16px" }}>
        <DKVg k="Gospodarz" v={v.host} />
        <DKVg k="Firma" v={v.comp} />
        <DKVg k="Przyjście" v={v.in} />
        <DKVg k="Wyjście" v={v.out} />
        <DKVg k="Dozwolone strefy" v="Recepcja, Parter" />
      </div>
      <div className="dsection">Przebieg wizyty</div>
      <div className="tl">
        <div className="tl-item"><div className="tl-t">Zarejestrowano w recepcji</div><div className="tl-m">Dziś · {v.in !== "—" ? v.in : "oczekuje"}</div></div>
        {v.in !== "—" && <div className="tl-item grey"><div className="tl-t">Wejście · Recepcja</div><div className="tl-m">Dziś · {v.in}</div></div>}
        {v.out !== "—" && <div className="tl-item grey"><div className="tl-t">Wymeldowano</div><div className="tl-m">Dziś · {v.out}</div></div>}
      </div>
    </>
  );
}
const { WeekBars: WBg } = window;

const VIS = [
  { name: "Thomas Schmidt", comp: "Siemens AG",     host: "Anna Kowalska",    in: "14:02", out: "—",     st: "inside" },
  { name: "Laura Bianchi",  comp: "Pirelli",        host: "Julia Wiśniewska", in: "13:30", out: "—",     st: "inside" },
  { name: "Jan Dvořák",     comp: "Škoda",          host: "Piotr Zięba",      in: "11:10", out: "12:45", st: "done" },
  { name: "Sofia García",   comp: "Telefónica",     host: "Ewa Dąbrowska",    in: "—",     out: "—",     st: "waiting" },
  { name: "Lukas Meyer",    comp: "Bosch",          host: "Tomasz Lewandowski",in: "09:50",out: "11:20", st: "done" },
  { name: "Nora Hansen",    comp: "Equinor",        host: "Robert Kamiński",  in: "—",     out: "—",     st: "waiting" },
  { name: "Marco Rossi",    comp: "Leonardo",       host: "Anna Kowalska",    in: "10:15", out: "—",     st: "inside" },
  { name: "Petra Kovač",    comp: "Gorenje",        host: "Karolina Mazur",   in: "08:40", out: "10:05", st: "done" },
];
const VST = {
  inside:  { tone: "in",      label: "W budynku",  ic: "in" },
  waiting: { tone: "exp",     label: "Oczekuje",   ic: "clock" },
  done:    { tone: "neutral", label: "Zakończono", ic: "check" },
};
const VCOLS = "1.8fr 1.3fr 1.5fr 0.8fr 0.8fr 1.1fr";

function MiniV({ label, val, pill, tone }) {
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

function PageVisitors({ page, onNav }) {
  const [tab, setTab] = React.useState("all");
  const dr = useDrg();
  const rows = VIS.filter(v => tab === "all" ? true : v.st === tab);
  const tabs = [
    { id: "all", label: "Wszyscy", count: VIS.length },
    { id: "inside", label: "W budynku", count: VIS.filter(v => v.st === "inside").length },
    { id: "waiting", label: "Oczekiwani", count: VIS.filter(v => v.st === "waiting").length },
    { id: "done", label: "Zakończone", count: VIS.filter(v => v.st === "done").length },
  ];
  return (
    <>
      <TNg page={page} onNav={onNav} />
      <PHg crumb={["Strona główna", "Goście"]} title="Goście"
        right={<><Fg placeholder="Szukaj gościa…" /><button className="btn-dark"><Ig name="userPlus" size={18} /> Zarejestruj gościa</button></>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 18 }}>
        <MiniV label="Goście dzisiaj" val="142" pill="+7,5%" tone="up" />
        <MiniV label="W budynku teraz" val="18" pill="aktywni" tone="up" />
        <MiniV label="Oczekiwani" val="26" pill="dziś" tone="warn" />
        <MiniV label="Śr. czas wizyty" val="1:12" pill="−4 min" tone="up" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="card" style={{ padding: 24 }}>
            <CHg title="Ruch gości" sub="Bieżący tydzień" right={null} />
            <div className="num-xl" style={{ fontSize: 44, marginTop: 14 }}>142</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 18px" }}>
              <span className="pill up">+7,5%</span><span className="muted" style={{ fontSize: 14 }}>+12 vs. tydz.</span>
            </div>
            <WBg values={[24,31,28,38,22,9,5]} focus={3} height={84} />
          </section>
          <section className="card" style={{ padding: 24 }}>
            <CHg title="Następni oczekiwani" sub="Zaplanowane wizyty" right={null} />
            <div style={{ marginTop: 8 }}>
              {VIS.filter(v => v.st === "waiting").concat(VIS.filter(v => v.st === "inside")).slice(0,3).map((v, i) => (
                <div key={i} className="al">
                  <Avatar name={v.name} size={38} />
                  <div style={{ flex: 1 }}><div className="al-title">{v.name}</div><div className="al-meta">{v.comp} · gość: {v.host}</div></div>
                  <Bg tone={VST[v.st].tone}>{VST[v.st].label}</Bg>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
            <STg tabs={tabs} active={tab} onChange={setTab} />
            <button className="chip"><Ig name="calendar" size={16} /> Dziś</button>
          </div>
          <div className="tbl-head" style={{ gridTemplateColumns: VCOLS }}>
            <span>Gość</span><span>Firma</span><span>Gospodarz</span><span>Przyjście</span><span>Wyjście</span><span>Status</span>
          </div>
          {rows.map((v, i) => {
            const s = VST[v.st];
            return (
              <div key={i} className="tbl-row" style={{ gridTemplateColumns: VCOLS }} onClick={() => dr.show(v)}>
                <div className="cell-name"><Avatar name={v.name} size={38} /><span className="nm" style={{ fontSize: 14.5 }}>{v.name}</span></div>
                <span className="cell-mut">{v.comp}</span>
                <span className="cell-mut">{v.host}</span>
                <span className="mono cell-mut" style={{ fontSize: 13.5 }}>{v.in}</span>
                <span className="mono cell-mut" style={{ fontSize: 13.5 }}>{v.out}</span>
                <span><Bg tone={s.tone}><Ig name={s.ic} size={13} /> {s.label}</Bg></span>
              </div>
            );
          })}
        </section>
      </div>

      <Drg open={dr.open} onClose={dr.close} title="Szczegóły wizyty" sub={dr.sel ? dr.sel.comp : ""}
        footer={<><button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}><Ig name="printer" size={16} /> Identyfikator</button>
          <button className="btn-dark" style={{ flex: 1, justifyContent: "center" }}><Ig name="out" size={16} /> Zamelduj wyjście</button></>}>
        {dr.sel && <VisitorDetail v={dr.sel} />}
      </Drg>
    </>
  );
}
window.PageVisitors = PageVisitors;
