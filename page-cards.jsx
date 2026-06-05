/* page-cards.jsx — Karty dostępu */
const { TopNav: TNc, PageHead: PHc, Field: Fc, Avatar: Avc, Badge: Bc, Icon: Ic, CardHead: CHc, Drawer: Drc, DKV: DKVc, useDrawer: useDrc, Modal: Mc, FInput: FIc, FSelect: FSc, DSection: DSc, DStats: DStc, DeviceRow: DvRc, ZoneRow: ZRc, MiniBars: SpRc, TLItem: TLIc, StatusDot: SDc } = window;

function CardFace({ num, holder, valid }) {
  const parts = num.replace("#", "").split("‑");
  return (
    <div style={{ borderRadius: 20, padding: 22, color: "#fff", background: "linear-gradient(150deg, #232318, #18180F 60%)", position: "relative", overflow: "hidden", boxShadow: "0 12px 30px -16px rgba(0,0,0,.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, letterSpacing: ".08em", fontSize: 15 }}>NEXON</span>
        <Ic name="wifi" size={20} />
      </div>
      <div style={{ width: 42, height: 32, borderRadius: 7, background: "linear-gradient(135deg,#E7C77A,#B8923F)", marginTop: 26 }} />
      <div className="mono" style={{ fontSize: 18, letterSpacing: ".12em", marginTop: 18 }}>{(parts[0] || "A") + " • " + (parts[1] || "0000") + " • NX"}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
        <div><div style={{ fontSize: 10, opacity: .55, letterSpacing: ".08em" }}>POSIADACZ</div><div style={{ fontSize: 14, fontWeight: 600 }}>{holder}</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, opacity: .55, letterSpacing: ".08em" }}>WAŻNA</div><div className="mono" style={{ fontSize: 13 }}>{valid}</div></div>
      </div>
    </div>
  );
}
function cardZoneRows(type) {
  const base = type === "Gość"
    ? [{ name: "Recepcja", tag: "Dozwolone", tone: "up" }, { name: "Parter", tag: "Dozwolone", tone: "up" }, { name: "1 piętro", tag: "Brak", tone: "neutral" }]
    : type === "Tymczasowa"
    ? [{ name: "Parter", tag: "Dozwolone", tone: "up" }, { name: "Magazyn", tag: "Dozwolone", tone: "up" }, { name: "Serwerownia", tag: "Brak", tone: "neutral" }]
    : [{ name: "Parter", tag: "Dozwolone", tone: "up" }, { name: "1 piętro", tag: "Dozwolone", tone: "up" }, { name: "2 piętro", tag: "Dozwolone", tone: "up" }, { name: "Parking", tag: "Dozwolone", tone: "up" }, { name: "Serwerownia", tag: "2FA", tone: "warn" }];
  return base;
}

function CardDetail({ c }) {
  const s = CST[c.st];
  const blocked = c.st === "blocked", expiring = c.st === "expiring";
  const uid = "04:" + c.num.replace(/[#‑]/g, "").slice(0, 2) + ":A2:7F:E1:5C:80";
  return (
    <>
      <CardFace num={c.num} holder={c.holder} valid={c.valid} />
      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <Bc tone={s.tone} lg><Ic name={s.ic} size={13} /> {s.label}</Bc>
        {expiring && <Bc tone="exp"><Ic name="clock" size={13} /> Wkrótce wygasa</Bc>}
        {!blocked && !expiring && <Bc tone="up"><Ic name="wifi" size={13} /> Sparowana</Bc>}
      </div>

      <DSc>Aktywność</DSc>
      <DStc items={[
        { v: "1 284", k: "Użyć łącznie" },
        { v: "6", k: "Użyć dziś" },
        { v: "14:32", k: "Ostatnie" },
      ]} />

      <DSc>Szczegóły</DSc>
      <div className="card" style={{ padding: "4px 16px" }}>
        <DKVc k="Numer karty" v={c.num} mono />
        <DKVc k="Posiadacz" v={c.holder} />
        <DKVc k="Typ" v={c.type} />
        <DKVc k="Technologia" v="MIFARE DESFire EV3" />
        <DKVc k="UID" v={uid} mono />
        <DKVc k="Wydana" v="01.2023 · R. Kamiński" />
        <DKVc k="Ważna do" v={c.valid} mono />
        <DKVc k="Status" v={s.label} />
      </div>

      <DSc>Zabezpieczenia</DSc>
      <div className="card" style={{ padding: 16 }}>
        <DvRc icon="shield" name="Szyfrowanie" desc="AES-128 · klucz dywersyfikowany" tone="ok" status="Aktywne" />
        <DvRc icon="key" name="Ochrona przed klonowaniem" desc="Uwierzytelnianie wzajemne" tone="ok" status="OK" />
        <DvRc icon="lock" name="2FA w strefach krytycznych" desc="PIN przy serwerowni" tone={c.type === "Stała" ? "ok" : "off"} status={c.type === "Stała" ? "Wł." : "Wył."} />
      </div>

      <DSc meta={cardZoneRows(c.type).filter(z => z.tag !== "Brak").length + " stref"}>Uprawnione strefy</DSc>
      <div>{cardZoneRows(c.type).map((z, i) => <ZRc key={i} icon="mapPin" name={z.name} tag={z.tag} tone={z.tone} />)}</div>

      <DSc meta="ostatnie 3">Historia użycia</DSc>
      <div className="tl ic-tl">
        <TLIc kind="in" title="Wejście · Wejście główne" meta="Parter" rt="14:32" />
        <TLIc kind="out" title="Wyjście · Recepcja" meta="Parter" rt="12:48" />
        <TLIc kind="in" title="Wejście · Parking P1" meta="Parking" rt="08:05" />
      </div>
    </>
  );
}

const CARDS = [
  { num: "#A‑1042", holder: "Anna Kowalska",    type: "Stała",      valid: "12.2027", st: "active" },
  { num: "#A‑0461", holder: "Marek Nowak",      type: "Stała",      valid: "08.2026", st: "blocked" },
  { num: "#B‑0317", holder: "Julia Wiśniewska", type: "Stała",      valid: "03.2027", st: "active" },
  { num: "#A‑0098", holder: "Piotr Zięba",      type: "Stała",      valid: "11.2026", st: "active" },
  { num: "#C‑2204", holder: "Karolina Mazur",   type: "Tymczasowa", valid: "30.06.2026", st: "expiring" },
  { num: "#G‑12",   holder: "Gość · T. Schmidt",type: "Gość",       valid: "Dziś 18:00", st: "active" },
  { num: "#A‑0772", holder: "Tomasz Lewandowski",type: "Stała",     valid: "05.2028", st: "active" },
  { num: "#B‑0540", holder: "Ewa Dąbrowska",    type: "Stała",      valid: "07.2026", st: "expiring" },
];
const CST = {
  active:   { tone: "in",  label: "Aktywna",   ic: "check" },
  blocked:  { tone: "blk", label: "Zablokowana", ic: "ban" },
  expiring: { tone: "exp", label: "Wygasa",    ic: "clock" },
};
const CCOLS = "1fr 2fr 1.1fr 1.2fr 1.1fr";

function MiniCardC({ icon, icTone = "soft", label, val, pill, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className={"stat-ic " + icTone}><Ic name={icon} size={20} /></span>
        {pill && <span className={"pill " + tone}>{pill}</span>}
      </div>
      <div className="stat-val">{val}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}
const ZCOUNT = { "Stała": "Strefy robocze (4)", "Tymczasowa": "Parter, Magazyn", "Gość": "Recepcja, Parter" };

function PageCards({ page, onNav }) {
  const dr = useDrc();
  const [list, setList] = React.useState(CARDS);
  const [addOpen, setAddOpen] = React.useState(false);
  const [sel, setSel] = React.useState(CARDS[0]);
  const [q, setQ] = React.useState("");
  const results = q ? CARDS.filter(c => (c.num + " " + c.holder).toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];
  const onCreate = (data) => {
    const prefix = data.type === "Gość" ? "G" : data.type === "Tymczasowa" ? "C" : "A";
    const num = "#" + prefix + "‑" + (1000 + list.length);
    const card = { num, holder: data.holder, type: data.type, valid: data.valid, st: "active" };
    setList([card, ...list]); dr.show(card);
  };
  return (
    <>
      <TNc page={page} onNav={onNav} />
      <PHc crumb={["Strona główna", "Karty dostępu"]} title="Karty dostępu"
        right={<button className="btn-accent" onClick={() => setAddOpen(true)}><Ic name="plus" size={18} /> Wydaj kartę</button>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 18 }}>
        <MiniCardC icon="card"  icTone="dark"  label="Wszystkie karty"    val="1 248" pill="+6"    tone="up" />
        <MiniCardC icon="check" icTone="green" label="Aktywne"            val="1 190" pill="95%"   tone="up" />
        <MiniCardC icon="clock" icTone="amber" label="Wygasające ≤30 dni" val="32"    pill="uwaga" tone="warn" />
        <MiniCardC icon="ban"   icTone="red"   label="Zablokowane"        val="26"    pill="2%"    tone="down" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px minmax(0,1fr)", gap: 18, alignItems: "stretch" }}>
        {/* podgląd karty */}
        <section className="card" style={{ padding: 22, display: "flex", flexDirection: "column" }}>
          <div className="card-search">
            <Ic name="search" size={17} />
            <input placeholder="Szukaj numerem karty…" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button className="cs-clear" onClick={() => setQ("")}><Ic name="x" size={15} /></button>}
          </div>
          {q && (results.length > 0
            ? <div className="card-results">
                {results.map((c, i) => (
                  <button key={i} className="cs-item" onClick={() => { setSel(c); setQ(""); }}>
                    <span className="mono">{c.num}</span><span className="cs-h">{c.holder}</span>
                  </button>
                ))}
              </div>
            : <div className="card-empty">Brak karty „{q}”</div>)}

          <CardFace num={sel.num} holder={sel.holder} valid={sel.valid} />

          <div style={{ marginTop: 18 }}>
            <div className="drow"><span className="k">Posiadacz</span><span className="val">{sel.holder}</span></div>
            <div className="drow"><span className="k">Typ</span><span className="val">{sel.type}</span></div>
            <div className="drow"><span className="k">Ważna do</span><span className="val mono">{sel.valid}</span></div>
            <div className="drow"><span className="k">Strefy</span><span className="val">{ZCOUNT[sel.type]}</span></div>
            <div className="drow"><span className="k">Status</span><span className="val">{CST[sel.st].label}</span></div>
            <div className="drow"><span className="k">Ostatnie wejście</span><span className="val">Dziś · 14:32</span></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 18 }}>
            <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}><Ic name="printer" size={16} /> Drukuj</button>
            <button className="btn-ghost" style={{ flex: 1, justifyContent: "center", color: "var(--danger-ink)", borderColor: "var(--danger-soft)" }}><Ic name="ban" size={16} /> Zablokuj</button>
          </div>
        </section>

        {/* tabela kart */}
        <section className="card" style={{ padding: 24 }}>
          <CHc title="Wszystkie karty" sub="1 248 wydanych identyfikatorów" right={<div style={{ display: "flex", gap: 10, alignItems: "center" }}><Fc placeholder="Szukaj karty…" width={200} /><button className="chip"><Ic name="filter" size={16} /> Filtruj</button></div>} />
          <div className="tbl-head" style={{ gridTemplateColumns: CCOLS, marginTop: 12 }}>
            <span>Karta</span><span>Posiadacz</span><span>Typ</span><span>Ważność</span><span>Status</span>
          </div>
          {list.map((c, i) => {
            const s = CST[c.st];
            return (
              <div key={i} className="tbl-row" style={{ gridTemplateColumns: CCOLS }} onClick={() => dr.show(c)}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div className="itile black" style={{ width: 36, height: 26, borderRadius: 7 }}><Ic name="card" size={15} /></div>
                  <span className="mono cell-strong" style={{ fontSize: 13.5 }}>{c.num}</span>
                </div>
                <div className="cell-name">
                  <Avatar name={c.holder} size={36} />
                  <span className="nm" style={{ fontSize: 14.5 }}>{c.holder}</span>
                </div>
                <span><span className="pill neutral">{c.type}</span></span>
                <span className="mono cell-mut" style={{ fontSize: 13.5 }}>{c.valid}</span>
                <span><Bc tone={s.tone}><Ic name={s.ic} size={13} /> {s.label}</Bc></span>
              </div>
            );
          })}
        </section>
      </div>

      <Drc open={dr.open} onClose={dr.close} title="Szczegóły karty" sub={dr.sel ? dr.sel.num : ""}
        footer={<><button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}><Ic name="printer" size={16} /> Drukuj</button>
          <button className="btn-ghost" style={{ flex: 1, justifyContent: "center", color: "var(--danger-ink)", borderColor: "var(--danger-soft)" }}><Ic name="ban" size={16} /> Zablokuj</button></>}>
        {dr.sel && <CardDetail c={dr.sel} />}
      </Drc>

      <CardWizard open={addOpen} onClose={() => setAddOpen(false)} onCreate={onCreate} />
    </>
  );
}
window.PageCards = PageCards;
