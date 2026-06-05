/* page-doors.jsx — Punkty dostępu / Grupy */
const { TopNav: TNd, PageHead: PHd, Field: Fd, Badge: Bd, Icon: Id, CardHead: CHd, Drawer: Drd, DKV: DKVd, useDrawer: useDrd, Modal: Md, FInput: FId, FSelect: FSd, DSection: DSd, DStats: DStd, DeviceRow: DvRd, ZoneRow: ZRd, MiniBars: SpRd, TLItem: TLId } = window;
const { useState: uSd, useRef: uRd } = React;

/* punkty dostępu — każdy ma numer (code), grupę, osobę odpowiedzialną i pozycję na mapie (viewBox 1000×600) */
const DOORS = [
  { name: "Wejście główne",    zone: "Parter",   st: "open",   last: "14:32", code: "NX-CTRL-11", group: "Pracownik podstawowy", owner: "Recepcja główna",  mx: 480, my: 548 },
  { name: "Recepcja",          zone: "Parter",   st: "open",   last: "14:30", code: "NX-CTRL-12", group: "Pracownik podstawowy", owner: "J. Wiśniewska",    mx: 470, my: 415 },
  { name: "Brama garażowa",    zone: "Parking",  st: "open",   last: "14:18", code: "NX-CTRL-13", group: "Pracownik podstawowy", owner: "Ochrona",          mx: 60,  my: 300 },
  { name: "Biuro · 1 piętro",  zone: "1 piętro", st: "open",   last: "14:21", code: "NX-CTRL-14", group: "Dział rozliczeń",      owner: "E. Dąbrowska",     mx: 420, my: 170 },
  { name: "Biuro · 2 piętro",  zone: "2 piętro", st: "open",   last: "14:11", code: "NX-CTRL-15", group: "Dział rozliczeń",      owner: "T. Lewandowski",   mx: 560, my: 170 },
  { name: "Parking P1",        zone: "Parking",  st: "open",   last: "14:15", code: "NX-CTRL-16", group: "Pracownik podstawowy", owner: "Ochrona",          mx: 180, my: 300 },
  { name: "Serwerownia",       zone: "Tech",     st: "locked", last: "12:04", code: "NX-CTRL-17", group: "Dział techniczny",     owner: "M. Nowak (IT)",    mx: 790, my: 145 },
  { name: "Magazyn",           zone: "Magazyn",  st: "locked", last: "13:10", code: "NX-CTRL-18", group: "Pracownik podstawowy", owner: "K. Mazur",         mx: 720, my: 420 },
  { name: "Archiwum",          zone: "Tech",     st: "locked", last: "11:48", code: "NX-CTRL-19", group: "Dział techniczny",     owner: "R. Kamiński",      mx: 885, my: 425 },
  { name: "Pokój socjalny",    zone: "Parter",   st: "open",   last: "14:02", code: "NX-CTRL-20", group: "Pracownik podstawowy", owner: "HR",               mx: 360, my: 470 },
  { name: "Dach · techniczne", zone: "Tech",     st: "alarm",  last: "14:11", code: "NX-CTRL-21", group: "Dział techniczny",     owner: "M. Nowak (IT)",    mx: 890, my: 110 },
  { name: "Serwis · winda",    zone: "Tech",     st: "locked", last: "09:30", code: "NX-CTRL-22", group: "Dział techniczny",     owner: "Serwis zewn.",     mx: 690, my: 220 },
];
const ST = {
  open:   { dot: "green", label: "OTWARTE",     tone: "in",      ic: "unlock", fill: "#34B048" },
  locked: { dot: "grey",  label: "ZABLOKOWANE", tone: "neutral", ic: "lock",   fill: "#A6A69C" },
  alarm:  { dot: "red",   label: "ALARM",       tone: "blk",     ic: "alert",  fill: "#F0685A" },
};

/* grupy dostępu */
const GROUPS = [
  { name: "Dział techniczny",     doors: 5, people: 12, cover: 42, color: "var(--ink)",    ic: "gear" },
  { name: "Dział rozliczeń",      doors: 2, people: 18, cover: 64, color: "var(--accent)", ic: "doc" },
  { name: "Pracownik podstawowy", doors: 5, people: 92, cover: 88, color: "var(--warn)",   ic: "users" },
];

/* plan budynku — pomieszczenia (viewBox 1000×600) */
const ROOMS = [
  { x: 60,  y: 70,  w: 250, h: 470, label: "Parking" },
  { x: 330, y: 70,  w: 300, h: 210, label: "Biura · 1–2 p." },
  { x: 330, y: 300, w: 300, h: 240, label: "Hol · Parter" },
  { x: 650, y: 70,  w: 290, h: 210, label: "Tech · Serwerownia" },
  { x: 650, y: 300, w: 290, h: 240, label: "Magazyn · Archiwum" },
];

/* ---------- wiersz listy drzwi ---------- */
function DoorRow({ d, idx, onToggle, onOpen }) {
  const s = ST[d.st];
  const open = d.st === "open";
  return (
    <div className={"door-row" + (d.st === "alarm" ? " alarm" : "")}>
      <span className={"dot " + s.dot} />
      <div className="dr-main">
        <div className="dr-name">{d.name}</div>
        <div className="dr-sub">{d.zone} · ostatnie {d.last}</div>
      </div>
      <span className="dr-code mono">{d.code}</span>
      <span className="dr-badge"><Bd tone={s.tone}>{s.label}</Bd></span>
      <div className="dr-actions">
        {open
          ? <button className="btn-ghost dr-btn" onClick={() => onToggle(idx)}><Id name="lock" size={15} /> Zablokuj</button>
          : <button className="btn-dark dr-btn" onClick={() => onToggle(idx)}><Id name="unlock" size={15} /> Otwórz</button>}
        <button className="icon-btn dr-eye" title="Szczegóły" onClick={() => onOpen(d)}><Id name="eye" size={16} /></button>
      </div>
    </div>
  );
}

/* ---------- panel wybranych drzwi na mapie ---------- */
function FloorPanel({ d, idx, onToggle, onOpen, onClose }) {
  const s = ST[d.st];
  const open = d.st === "open";
  return (
    <div className="floor-panel">
      <div className="fp-top">
        <div style={{ minWidth: 0 }}>
          <div className="fp-name">{d.name}</div>
          <div className="fp-code mono">{d.code} · {d.zone}</div>
        </div>
        <button className="icon-btn solid" onClick={onClose}><Id name="x" size={16} /></button>
      </div>
      <div style={{ margin: "12px 0" }}><Bd tone={s.tone} lg>{s.label}</Bd></div>
      <div className="fp-kv"><span>Grupa</span><b>{d.group}</b></div>
      <div className="fp-kv"><span>Odpowiedzialny</span><b>{d.owner}</b></div>
      <div className="fp-kv"><span>Ostatnie przejście</span><b>Dziś · {d.last}</b></div>
      <div className="fp-actions">
        {open
          ? <button className="btn-ghost" style={{ flex: 1, justifyContent: "center", height: 42 }} onClick={() => onToggle(idx)}><Id name="lock" size={16} /> Zablokuj</button>
          : <button className="btn-dark" style={{ flex: 1, justifyContent: "center", height: 42 }} onClick={() => onToggle(idx)}><Id name="unlock" size={16} /> Otwórz</button>}
        <button className="icon-btn" style={{ width: 42, height: 42 }} title="Szczegóły" onClick={() => onOpen(d)}><Id name="eye" size={17} /></button>
      </div>
    </div>
  );
}

/* ---------- mapa budynku ---------- */
function FloorMap({ list, onToggle, onOpen }) {
  const [sel, setSel] = uSd(null);
  const d = sel != null ? list[sel] : null;
  return (
    <div className="floor">
      <svg viewBox="0 0 1000 600" className="floor-svg" preserveAspectRatio="xMidYMid meet">
        <rect x="40" y="40" width="920" height="520" rx="22" className="floor-outer" />
        {ROOMS.map((r, i) => (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="14" className="floor-room" />
            <text x={r.x + 18} y={r.y + 30} className="floor-room-lbl">{r.label}</text>
          </g>
        ))}
        {list.map((dr, i) => {
          const active = sel === i;
          return (
            <g key={i} className={"fm" + (active ? " on" : "")} onClick={() => setSel(i)}>
              {active && <circle cx={dr.mx} cy={dr.my} r="22" className="fm-ring" />}
              {dr.st === "alarm" && <circle cx={dr.mx} cy={dr.my} r="20" className="fm-alarm" />}
              <circle cx={dr.mx} cy={dr.my} r="13" style={{ fill: ST[dr.st].fill }} stroke="#fff" strokeWidth="3.5" />
              <text x={dr.mx} y={dr.my - 24} textAnchor="middle" className="fm-lbl">{dr.name}</text>
            </g>
          );
        })}
      </svg>
      {d
        ? <FloorPanel d={d} idx={sel} onToggle={onToggle} onOpen={onOpen} onClose={() => setSel(null)} />
        : <div className="floor-hint"><Id name="mapPin" size={16} /> Kliknij punkt, aby otworzyć / zablokować</div>}
      <div className="floor-legend">
        <span><i style={{ background: ST.open.fill }} /> Otwarte</span>
        <span><i style={{ background: ST.locked.fill }} /> Zablokowane</span>
        <span><i style={{ background: ST.alarm.fill }} /> Alarm</span>
      </div>
    </div>
  );
}

/* ---------- edytowalny harmonogram ---------- */
const SCHED0 = [
  { name: "Pracownicy", start: 6, end: 22, color: "var(--accent)" },
  { name: "Ochrona",    start: 0, end: 24, color: "var(--ink)" },
  { name: "Serwis",     start: 8, end: 17, color: "var(--warn)" },
  { name: "Goście",     start: 9, end: 18, color: "#5A6ACF" },
];
const fmtH = (h) => {
  const hh = Math.floor(h), mm = (h - hh) * 60;
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
};
const pct = (h) => (h / 24 * 100) + "%";

function SchedRow({ row, onChange }) {
  const ref = uRd(null);
  const hourAt = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    let h = ((clientX - r.left) / r.width) * 24;
    return Math.max(0, Math.min(24, Math.round(h * 2) / 2));
  };
  const startDrag = (mode) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const baseS = row.start, baseE = row.end, x0 = e.clientX;
    const onMove = (ev) => {
      if (mode === "start") onChange({ start: Math.min(hourAt(ev.clientX), row.end - 0.5) });
      else if (mode === "end") onChange({ end: Math.max(hourAt(ev.clientX), row.start + 0.5) });
      else {
        const r = ref.current.getBoundingClientRect();
        const dh = ((ev.clientX - x0) / r.width) * 24;
        const dur = baseE - baseS;
        let ns = Math.round((baseS + dh) * 2) / 2;
        ns = Math.max(0, Math.min(24 - dur, ns));
        onChange({ start: ns, end: ns + dur });
      }
    };
    const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };
  const allDay = row.start === 0 && row.end === 24;
  return (
    <div className="sr">
      <div className="sr-head">
        <span className="sr-name">{row.name}</span>
        <span className="sr-time mono">{allDay ? "Całodobowo" : fmtH(row.start) + " – " + fmtH(row.end)}</span>
      </div>
      <div className="sched sched-edit" ref={ref} onPointerDown={startDrag("move")}>
        <div className="sched-fill" style={{ left: pct(row.start), width: pct(row.end - row.start), background: row.color }} />
        <span className="sched-h" style={{ left: pct(row.start) }} onPointerDown={startDrag("start")} />
        <span className="sched-h" style={{ left: pct(row.end) }} onPointerDown={startDrag("end")} />
      </div>
    </div>
  );
}

function ScheduleEditor() {
  const [rows, setRows] = uSd(SCHED0);
  const [saved, setSaved] = uSd(SCHED0);
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved);
  const update = (idx, patch) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  return (
    <section className="card" style={{ padding: 24 }}>
      <CHd title="Harmonogramy dostępu" sub="Przeciągnij suwaki, aby zmienić okna czasowe grup"
        right={<div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" style={{ height: 40 }} disabled={!dirty} onClick={() => setRows(saved)}><Id name="refresh" size={15} /> Przywróć</button>
          <button className="btn-accent" style={{ height: 40, opacity: dirty ? 1 : .5, pointerEvents: dirty ? "auto" : "none" }} onClick={() => setSaved(rows)}><Id name="check" size={16} /> Zatwierdź</button>
        </div>} />
      <div className="sched-grid">
        {rows.map((r, i) => <SchedRow key={i} row={r} onChange={(p) => update(i, p)} />)}
        <div className="sched-axis"><span>00</span><span>03</span><span>06</span><span>09</span><span>12</span><span>15</span><span>18</span><span>21</span><span>24</span></div>
      </div>
    </section>
  );
}

function DoorDetail({ d }) {
  const s = ST[d.st];
  const alarm = d.st === "alarm", locked = d.st === "locked";
  const tech = d.zone === "Tech";
  const ctrl = d.code;
  const hours = [4, 9, 18, 31, 26, 22, 17, 14, 28, 24, 12, 7, 3, 2, 1, 1];
  const peak = hours.indexOf(Math.max(...hours));
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className={"itile " + (alarm ? "red" : locked ? "soft" : "green")} style={{ width: 56, height: 56, borderRadius: 16 }}><Id name={s.ic} size={26} /></div>
        <div><div style={{ fontSize: 19, fontWeight: 700 }}>{d.name}</div><div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{d.zone} · {ctrl}</div></div>
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <Bd tone={s.tone} lg>{s.label}</Bd>
        {!alarm && <Bd tone="up"><Id name="wifi" size={13} /> Online</Bd>}
        {alarm && <Bd tone="down"><Id name="alert" size={13} /> Wymagana reakcja</Bd>}
      </div>

      <DSd>Na żywo</DSd>
      <DStd items={[
        { v: "204", k: "Przejść dziś" },
        { v: "18", k: "W strefie teraz" },
        { v: alarm ? "5" : "2", k: "Odmów dziś" },
      ]} />

      <DSd>Konfiguracja</DSd>
      <div className="card" style={{ padding: "4px 16px" }}>
        <DKVd k="Numer punktu" v={ctrl} mono />
        <DKVd k="Grupa dostępu" v={d.group} />
        <DKVd k="Typ czytnika" v={tech ? "Biometria + PIN" : "RFID 13,56 MHz"} />
        <DKVd k="Tryb pracy" v={tech ? "2FA · podwyższony" : "Standardowy"} />
        <DKVd k="Auto-blokada" v="Po 10 s" />
        <DKVd k="Anti-passback" v={tech ? "Włączony" : "Wyłączony"} />
      </div>

      <DSd meta={alarm ? "ostatni sync 4 min temu" : "ostatni sync 12 s temu"}>Łączność i zasilanie</DSd>
      <div className="card" style={{ padding: 16 }}>
        <DvRd icon="wifi" name="Sieć" desc={alarm ? "Pakiety tracone" : "Sygnał 98% · ping 14 ms"} tone={alarm ? "bad" : "ok"} status={alarm ? "Niestabilna" : "Stabilna"} />
        <DvRd icon="power" name="Zasilanie" desc="PoE · bufor UPS 8 h" tone="ok" status="OK" />
      </div>

      <DSd>Urządzenia punktu</DSd>
      <div className="card" style={{ padding: 16 }}>
        <DvRd icon="card" name={tech ? "Czytnik biometryczny" : "Czytnik RFID"} desc={ctrl + "-R1"} tone="ok" status="Aktywny" />
        <DvRd icon="lock" name="Zamek elektrozaczep" desc={locked ? "Stan: zablokowany" : "Stan: zwolniony"} tone="ok" status="Sprawny" />
        <DvRd icon="alert" name="Czujnik wymuszenia" desc="Kontaktron drzwiowy" tone={alarm ? "bad" : "ok"} status={alarm ? "Wyzwolony" : "Czuwa"} />
      </div>

      <DSd meta={"szczyt " + (6 + peak) + ":00"}>Ruch w ciągu dnia</DSd>
      <SpRd data={hours} hi={peak} labels={["06", "", "09", "", "12", "", "15", "", "18", "", "", "22"]} />

      <DSd meta="ostatnie 3 z 204">Ostatnie przejścia</DSd>
      <div className="tl ic-tl">
        <TLId kind="in" title="Anna Kowalska · Wejście" meta="Recepcja · #A‑1042" rt="14:32" />
        <TLId kind="out" title="Julia Wiśniewska · Wyjście" meta="Recepcja · #B‑0317" rt="14:21" />
        <TLId kind="red" title="Marek Nowak · Odmowa" meta="Brak uprawnień · #A‑0461" rt="14:28" />
      </div>
    </>
  );
}

function PageDoors({ page, onNav }) {
  const dr = useDrd();
  const [list, setList] = uSd(DOORS);
  const [addOpen, setAddOpen] = uSd(false);
  const [view, setView] = uSd("list");
  const cnt = { open: list.filter(d => d.st === "open").length, locked: list.filter(d => d.st === "locked").length, alarm: list.filter(d => d.st === "alarm").length };
  const toggleDoor = (idx) => setList(l => l.map((d, i) => (i === idx ? { ...d, st: d.st === "open" ? "locked" : "open" } : d)));
  const onCreate = (door) => { setList([{ ...door, code: "NX-CTRL-" + (10 + list.length + 1), group: "Pracownik podstawowy", owner: "—", mx: 480, my: 480 }, ...list]); dr.show(door); };
  return (
    <>
      <TNd page={page} onNav={onNav} />
      <PHd crumb={["Strona główna", "Punkty dostępu"]} title="Punkty dostępu"
        right={<button className="btn-accent" onClick={() => setAddOpen(true)}><Id name="plus" size={18} /> Dodaj punkt</button>} />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 18, alignItems: "start" }}>
          <section className="card" style={{ padding: 24 }}>
            <CHd title="Status drzwi" sub={list.length + " punktów dostępu"} right={
              <div style={{ display: "flex", gap: 8 }}>
                <Badge tone="up">{cnt.open} otwartych</Badge><Badge tone="neutral">{cnt.locked} zablok.</Badge>{cnt.alarm > 0 && <Badge tone="down">{cnt.alarm} alarm</Badge>}
              </div>} />
            <div className="door-toolbar">
              <Fd placeholder="Szukaj drzwi lub grupy…" width={260} />
              <div className="segs">
                <button className={"seg" + (view === "list" ? " active" : "")} onClick={() => setView("list")}><Id name="grid" size={15} /> Lista</button>
                <button className={"seg" + (view === "map" ? " active" : "")} onClick={() => setView("map")}><Id name="mapPin" size={15} /> Mapa</button>
              </div>
            </div>
            {view === "list"
              ? <div className="door-list">{list.map((d, i) => <DoorRow key={i} d={d} idx={i} onToggle={toggleDoor} onOpen={dr.show} />)}</div>
              : <div style={{ marginTop: 18 }}><FloorMap list={list} onToggle={toggleDoor} onOpen={dr.show} /></div>}
          </section>

          <section className="card" style={{ padding: 24 }}>
            <CHd title="Grupy" sub="3 grupy dostępu" right={<button className="icon-btn" title="Dodaj grupę"><Id name="plus" size={18} /></button>} />
            <div style={{ marginTop: 10 }}>
              {GROUPS.map((g, i) => (
                <div key={i} className="zone-card" style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="itile soft" style={{ width: 38, height: 38, background: g.color, color: g.color === "var(--accent)" ? "#0d2a13" : "#fff" }}><Id name={g.ic} size={18} /></div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{g.name}</div>
                        <div className="door-sub">{g.doors} drzwi · {g.people} osób</div>
                      </div>
                    </div>
                    <span className="mono muted" style={{ fontSize: 13 }}>{g.cover}%</span>
                  </div>
                  <div className="sched" style={{ marginTop: 12 }}><div className="sched-fill" style={{ left: 0, width: g.cover + "%", background: g.color }} /></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <ScheduleEditor />
      </div>

      <Drd open={dr.open} onClose={dr.close} title="Punkt dostępu" sub={dr.sel ? dr.sel.name : ""}
        footer={dr.sel && (dr.sel.st === "open"
          ? <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}><Id name="lock" size={16} /> Zablokuj</button>
          : <button className="btn-dark" style={{ flex: 1, justifyContent: "center" }}><Id name="unlock" size={16} /> Otwórz zdalnie</button>)}>
        {dr.sel && <DoorDetail d={dr.sel} />}
      </Drd>

      <DoorWizard open={addOpen} onClose={() => setAddOpen(false)} onCreate={onCreate} />
    </>
  );
}
window.PageDoors = PageDoors;
