/* page-employees.jsx — Pracownicy */
const { TopNav: TNe, PageHead: PHe, SubTabs: STe, Field: Fe, Avatar: Ave, Badge: Be, Icon: Ie, Drawer: Dre, DKV: DKVe, useDrawer: useDre, Modal: Me, FInput: FIe, FSelect: FSe, DSection: DSe, DStats: DSte, DeviceRow: DvRe, ZoneRow: ZRe, MiniBars: SpRe, TLItem: TLIe } = window;

function empZones(level) {
  if (level === "Administrator") return ["Wszystkie strefy (6)"];
  if (level === "Pełny") return ["Parter", "1 piętro", "2 piętro", "Serwerownia", "Parking"];
  if (level === "Standard") return ["Parter", "1 piętro", "2 piętro", "Parking"];
  return ["Parter", "Magazyn"];
}
const EMP_ACT = [
  { t: "Wejście · Wejście główne", m: "Dziś · 14:32", cls: "" },
  { t: "Wyjście · Biuro 2p.", m: "Dziś · 12:10", cls: "grey" },
  { t: "Wejście · Parking P1", m: "Dziś · 08:02", cls: "" },
  { t: "Odmowa · Serwerownia", m: "Wczoraj · 16:40", cls: "red" },
];

function empZoneRows(level) {
  const all = [
    { name: "Parter", icon: "building" },
    { name: "1 piętro", icon: "building" },
    { name: "2 piętro", icon: "building" },
    { name: "Parking", icon: "mapPin" },
    { name: "Magazyn", icon: "folder" },
    { name: "Serwerownia", icon: "shield" },
  ];
  const map = {
    Administrator: { allow: all.map(z => z.name), twofa: ["Serwerownia"] },
    "Pełny":       { allow: ["Parter", "1 piętro", "2 piętro", "Parking", "Serwerownia"], twofa: ["Serwerownia"] },
    Standard:      { allow: ["Parter", "1 piętro", "2 piętro", "Parking"], twofa: [] },
    Ograniczony:   { allow: ["Parter", "Magazyn"], twofa: [] },
  }[level] || { allow: ["Parter"], twofa: [] };
  return all.map(z => {
    if (map.twofa.includes(z.name)) return { ...z, sub: "Wymaga 2FA", tag: "2FA", tone: "warn" };
    if (map.allow.includes(z.name)) return { ...z, sub: "Pełny dostęp", tag: "Dozwolone", tone: "up" };
    return { ...z, sub: "Brak uprawnień", tag: "Brak", tone: "neutral" };
  });
}

function EmpDetail({ e }) {
  const active = e.status === "active";
  const idn = "NX-" + (1000 + EMP.indexOf(e));
  const week = [8, 9, 7, 9, 6, 2, 1];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Ave name={e.name} size={64} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em" }}>{e.name}</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{e.dept} · {e.level}</div>
          <div style={{ marginTop: 8 }}>{active ? <Be tone="in"><Ie name="check" size={13} /> Aktywny</Be> : <Be tone="blk"><Ie name="ban" size={13} /> Zawieszony</Be>}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <a className="chip-sm" style={{ flex: 1, justifyContent: "center" }}><Ie name="mail" size={15} /> {e.email}</a>
        <a className="chip-sm" style={{ justifyContent: "center" }}><Ie name="phone" size={15} /> wew. {120 + EMP.indexOf(e)}</a>
      </div>

      <DSe meta="ostatnie 7 dni">Statystyki</DSe>
      <DSte items={[
        { v: "42", k: "Przejść (7 dni)" },
        { v: "08:12", k: "Śr. wejście" },
        { v: "96", u: "%", k: "Frekwencja" },
      ]} />

      <DSe>Dostęp</DSe>
      <div className="card" style={{ padding: "4px 16px" }}>
        <DKVe k="Poziom dostępu" v={e.level} />
        <DKVe k="Przypisana karta" v={e.card} mono />
        <DKVe k="ID pracownika" v={idn} mono />
        <DKVe k="Kod PIN" v={active ? "Ustawiony" : "Zablokowany"} />
        <DKVe k="Biometria" v={e.level === "Administrator" || e.level === "Pełny" ? "Zarejestrowana" : "Brak"} />
        <DKVe k="Przełożony" v={e.dept === "Zarząd" ? "—" : "A. Kowalska"} />
        <DKVe k="Zatrudniony" v="od 2023" />
      </div>

      <DSe meta={empZoneRows(e.level).filter(z => z.tag !== "Brak").length + " z 6 stref"}>Uprawnione strefy</DSe>
      <div>{empZoneRows(e.level).map((z, i) => <ZRe key={i} icon={z.icon} name={z.name} sub={z.sub} tag={z.tag} tone={z.tone} />)}</div>

      <DSe meta="pon – nie">Frekwencja (7 dni)</DSe>
      <SpRe data={week} hi={1} labels={["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"]} />

      <DSe meta="ostatnie 4">Ostatnia aktywność</DSe>
      <div className="tl ic-tl">
        <TLIe kind="in" title="Wejście · Wejście główne" meta="Parter" rt="14:32" />
        <TLIe kind="out" title="Wyjście · Biuro 2p." meta="2 piętro" rt="12:10" />
        <TLIe kind="in" title="Wejście · Parking P1" meta="Parking" rt="08:02" />
        <TLIe kind="red" title="Odmowa · Serwerownia" meta="Brak 2FA · wczoraj" rt="16:40" />
      </div>
    </>
  );
}

const EMP = [
  { name: "Anna Kowalska",     email: "a.kowalska@nexon.pl",   dept: "Zarząd",      level: "Administrator", card: "#A‑1042", last: "Dziś · 14:32", status: "active" },
  { name: "Marek Nowak",       email: "m.nowak@nexon.pl",      dept: "IT",          level: "Pełny",         card: "#A‑0461", last: "Dziś · 14:28", status: "suspended" },
  { name: "Julia Wiśniewska",  email: "j.wisniewska@nexon.pl", dept: "Finanse",     level: "Standard",      card: "#B‑0317", last: "Dziś · 14:21", status: "active" },
  { name: "Piotr Zięba",       email: "p.zieba@nexon.pl",      dept: "Logistyka",   level: "Standard",      card: "#A‑0098", last: "Dziś · 14:15", status: "active" },
  { name: "Karolina Mazur",    email: "k.mazur@nexon.pl",      dept: "Magazyn",     level: "Ograniczony",   card: "#C‑2204", last: "Dziś · 13:58", status: "active" },
  { name: "Tomasz Lewandowski",email: "t.lewandowski@nexon.pl",dept: "IT",          level: "Pełny",         card: "#A‑0772", last: "Dziś · 12:40", status: "active" },
  { name: "Ewa Dąbrowska",     email: "e.dabrowska@nexon.pl",  dept: "HR",          level: "Standard",      card: "#B‑0540", last: "Wczoraj · 17:02", status: "active" },
  { name: "Robert Kamiński",   email: "r.kaminski@nexon.pl",   dept: "Ochrona",     level: "Administrator", card: "#A‑0011", last: "Dziś · 06:01", status: "active" },
  { name: "Agnieszka Wójcik",  email: "a.wojcik@nexon.pl",     dept: "Marketing",   level: "Ograniczony",   card: "—",       last: "Brak karty", status: "suspended" },
  { name: "Michał Szymański",  email: "m.szymanski@nexon.pl",  dept: "Logistyka",   level: "Standard",      card: "#A‑0356", last: "Dziś · 11:12", status: "active" },
];

const COLS = "2.3fr 1fr 1.2fr 0.9fr 1.1fr 1fr 36px";

function MiniCard({ icon, icTone = "soft", label, val, pill, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className={"stat-ic " + icTone}><Ie name={icon} size={20} /></span>
        {pill && <span className={"pill " + tone}>{pill}</span>}
      </div>
      <div className="stat-val">{val}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

function PageEmployees({ page, onNav }) {
  const [tab, setTab] = React.useState("all");
  const [list, setList] = React.useState(EMP);
  const [addOpen, setAddOpen] = React.useState(false);
  const dr = useDre();
  const rows = list.filter(e => tab === "all" ? true : tab === "active" ? e.status === "active" : e.status === "suspended");
  const tabs = [
    { id: "all", label: "Wszyscy", count: list.length },
    { id: "active", label: "Aktywni", count: list.filter(e => e.status === "active").length },
    { id: "suspended", label: "Zawieszeni", count: list.filter(e => e.status === "suspended").length },
  ];
  return (
    <>
      <TNe page={page} onNav={onNav} />
      <PHe crumb={["Strona główna", "Pracownicy"]} title="Pracownicy"
        right={<button className="btn-accent" onClick={() => setAddOpen(true)}><Ie name="userPlus" size={18} /> Dodaj pracownika</button>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 18 }}>
        <MiniCard icon="users" icTone="dark"  label="Wszyscy pracownicy"   val="312" pill="+14" tone="up" />
        <MiniCard icon="check" icTone="green" label="Z aktywnym dostępem"  val="298" pill="96%" tone="up" />
        <MiniCard icon="ban"   icTone="amber" label="Zawieszeni"           val="8"   pill="2 nowe" tone="warn" />
        <MiniCard icon="in"    icTone="soft"  label="W budynku teraz"      val="247" pill="79%" tone="up" />
      </div>

      <section className="card" style={{ padding: 24 }}>
        <div className="emp-toolbar">
          <STe tabs={tabs} active={tab} onChange={setTab} />
          <div className="emp-toolbar-r">
            <Fe placeholder="Szukaj pracownika…" width={220} />
            <button className="chip"><Ie name="filter" size={16} /> Dział</button>
            <button className="chip"><Ie name="sliders" size={16} /> Poziom dostępu</button>
          </div>
        </div>

        <div className="tbl-head" style={{ gridTemplateColumns: COLS }}>
          <span>Pracownik</span><span>Dział</span><span>Poziom dostępu</span><span>Karta</span><span>Ostatnie wejście</span><span>Status</span><span></span>
        </div>
        {rows.map((e, i) => (
          <div key={i} className="tbl-row" style={{ gridTemplateColumns: COLS }} onClick={() => dr.show(e)}>
            <div className="cell-name">
              <Avatar name={e.name} size={42} />
              <div style={{ minWidth: 0 }}>
                <div className="nm">{e.name}</div>
                <div className="sub">{e.email}</div>
              </div>
            </div>
            <span className="cell-mut">{e.dept}</span>
            <span><span className="pill neutral">{e.level}</span></span>
            <span>{e.card === "—"
              ? <span className="cell-mut">—</span>
              : <button className="card-badge mono" onClick={(ev) => { ev.stopPropagation(); onNav("cards"); }}><Ie name="card" size={14} /> {e.card}</button>}</span>
            <span className="cell-mut">{e.last}</span>
            <span>{e.status === "active"
              ? <Be tone="in"><Ie name="check" size={13} /> Aktywny</Be>
              : <Be tone="blk"><Ie name="ban" size={13} /> Zawieszony</Be>}</span>
            <button className="arrow" style={{ width: 32, height: 32, background: "transparent", border: "none" }}><Ie name="dots" size={18} /></button>
          </div>
        ))}
      </section>

      <Dre open={dr.open} onClose={dr.close} title="Profil pracownika" sub={dr.sel ? dr.sel.dept : ""}
        footer={<><button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}><Ie name="edit" size={16} /> Edytuj</button>
          <button className="btn-dark" style={{ flex: 1, justifyContent: "center" }} onClick={() => onNav("cards")}><Ie name="card" size={16} /> Karta</button></>}>
        {dr.sel && <EmpDetail e={dr.sel} />}
      </Dre>

      <EmployeeWizard open={addOpen} onClose={() => setAddOpen(false)} onCreate={(emp) => setList([emp, ...list])} />
    </>
  );
}
window.PageEmployees = PageEmployees;
