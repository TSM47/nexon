/* shared.jsx — ikony, nawigacja, nagłówki, prymitywy UI */
const { useState, useRef, useEffect, useLayoutEffect } = React;

/* ---------- Ikony ---------- */
function Icon({ name, size = 22, sw = 1.7, className }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  if (className) p.className = className;
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    users: <><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.5 19a5 5 0 0 0-2.5-4.3"/></>,
    door: <><path d="M4 21h16"/><path d="M6 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17"/><path d="M18 21V8l-3-2"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/></>,
    card: <><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/></>,
    activity: <><path d="M3 12h4l2.5 7 5-15L17 12h4"/></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/></>,
    shield: <><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/><path d="M9.3 12l1.8 1.8 3.6-3.6"/></>,
    doc: <><path d="M7 3h7l4 4v14a0 0 0 0 1 0 0H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 16.5h6"/></>,
    chart: <><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7" rx="1"/><rect x="12.5" y="7" width="3" height="11" rx="1"/><rect x="18" y="13" width="3" height="5" rx="1"/></>,
    headset: <><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="3.5" height="6" rx="1.5"/><rect x="17.5" y="13" width="3.5" height="6" rx="1.5"/><path d="M20 19a4 4 0 0 1-4 3h-2"/></>,
    gear: <><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.1a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.1-2.9l-.1-.1A2 2 0 1 1 7 3.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V2.4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></>,
    sliders: <><path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2.2"/><circle cx="8" cy="16" r="2.2"/></>,
    filter: <><path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrowUR: <><path d="M7 17 17 7M9 7h8v8"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></>,
    download: <><path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
    unlock: <><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></>,
    key: <><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15 12v2.5"/></>,
    check: <><path d="M5 12.5 10 17l9-10"/></>,
    x: <><path d="M6 6l12 12M18 6 6 18"/></>,
    alert: <><path d="M12 3.5 22 20H2L12 3.5Z"/><path d="M12 10v4.5M12 17.4v.1"/></>,
    fire: <><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.6-2.4 1.3-3 .2 1 .7 1.6 1.4 1.8C10.5 7.7 12 6 12 3Z"/></>,
    user: <><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></>,
    userPlus: <><circle cx="10" cy="8" r="3.4"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 7v6M22 10h-6"/></>,
    in: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M4 12h10M10 8l4 4-4 4"/></>,
    out: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M20 12H10M14 8l-4 4 4 4"/></>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></>,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></>,
    folder: <><path d="M3.5 7a2 2 0 0 1 2-2h3.2a2 2 0 0 1 1.5.7l1 1.1h7.3a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V7Z"/></>,
    dots: <><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></>,
    edit: <><path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/></>,
    trash: <><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></>,
    chevR: <><path d="M9 5l7 7-7 7"/></>,
    chevD: <><path d="M5 9l7 7 7-7"/></>,
    building: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></>,
    mapPin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></>,
    wifi: <><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9 9 0 0 1 13 0M8.5 16a4.5 4.5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8" fill="currentColor" stroke="none"/></>,
    power: <><path d="M12 3v9M6.5 7a8 8 0 1 0 11 0"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></>,
    phone: <><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 19a0 0 0 0 1 0 0v-3l-5-2-1.5 2"/><path d="M5 4a16 16 0 0 0 14 16" opacity="0"/></>,
    refresh: <><path d="M20 11a8 8 0 1 0-1.5 6"/><path d="M20 5v6h-6"/></>,
    logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M4 12h11M11 8l4 4-4 4"/></>,
    globe: <><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17"/></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3M20 14v.01M14 20h.01M17 20h3v.01"/></>,
    printer: <><path d="M6 9V4h12v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 17h10v4H7z"/></>,
    ban: <><circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}
Icon.logo = (s = 36) => (
  <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
    <rect x="5" y="5" width="13" height="13" rx="4.5" fill="#18180F"/>
    <rect x="22" y="22" width="13" height="13" rx="4.5" fill="#18180F"/>
    <path d="M18 11.5c3.5 0 7 3.2 7 7" stroke="#18180F" strokeWidth="3.4" strokeLinecap="round"/>
  </svg>
);

/* ---------- Konfiguracja nawigacji ---------- */
const NAV = [
  { id: "overview", label: "Przegląd",            ic: "grid" },
  { id: "employees", label: "Pracownicy",         ic: "users" },
  { id: "doors",    label: "Punkty dostępu",       ic: "door" },
  { id: "cards",    label: "Karty dostępu",        ic: "card" },
  { id: "events",   label: "Zdarzenia",            ic: "activity" },
  { id: "security", label: "Centrum bezpieczeństwa", ic: "shield" },
  { id: "visitors", label: "Goście",               ic: "user" },
  { id: "reports",  label: "Raporty",              ic: "doc" },
];
const TOP = [
  { id: "overview", label: "Pulpit" },
  { id: "employees", label: "Personel" },
  { id: "cards", label: "Identyfikatory" },
  { id: "doors", label: "Strefy" },
  { id: "events", label: "Dziennik" },
];
const PAGE_TITLE = {
  overview: "Pulpit", employees: "Pracownicy", doors: "Punkty dostępu", cards: "Karty dostępu",
  events: "Zdarzenia", security: "Monitoring", visitors: "Goście", reports: "Analityka", settings: "Ustawienia",
};

/* ---------- Avatary ---------- */
const FACES = ["https://i.pravatar.cc/120?img=12","https://i.pravatar.cc/120?img=33","https://i.pravatar.cc/120?img=15"];
const ME = "https://i.pravatar.cc/120?img=68";
const TONES = ["#18180F","#34B048","#5A6ACF","#C6402F","#9A6712","#3E7C8C","#7A4Fb8"];
function toneFor(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return TONES[h%TONES.length]; }
function initials(n){ return n.replace(/[^\p{L} ]/gu,"").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase(); }

function Avatar({ name = "", img, size = 40 }) {
  const st = { width: size, height: size, fontSize: size * 0.36 };
  if (img) return <div className="ava" style={{ ...st, backgroundImage: `url(${img})` }} />;
  return <div className="ava" style={{ ...st, background: toneFor(name) }}>{initials(name)}</div>;
}

function Avatars() {
  return (
    <div className="avatars">
      {FACES.map((f, i) => <div key={i} className="av" style={{ backgroundImage: `url(${f})` }} />)}
      <div className="av more">+5</div>
    </div>
  );
}

/* ---------- Sidebar (nawigacja) ---------- */
function Sidebar({ page = "overview", onNav = () => {} }) {
  return (
    <aside className="sb">
      <button className="sb-logo" onClick={() => onNav("home")} title="Nexon — strona główna">{Icon.logo(34)}</button>
      <nav className="sb-nav">
        {NAV.map((n) => (
          <button key={n.id} className={"sb-btn" + (n.id === page ? " active" : "")} onClick={() => onNav(n.id)}>
            <Icon name={n.ic} size={22} />
            <span className="lbl">{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="sb-spacer" />
      <button className={"sb-btn" + (page === "settings" ? " active" : "")} onClick={() => onNav("settings")}>
        <Icon name="gear" size={22} /><span className="lbl">Ustawienia</span>
      </button>
      <div className="sb-foot"><Icon name="headset" size={20} /></div>
    </aside>
  );
}

/* ---------- Górny pasek ---------- */
function TopNav({ page = "overview", onNav = () => {} }) {
  return (
    <div className="top">
      <label className="top-search">
        <Icon name="search" size={18} />
        <input placeholder="Szukaj osób, kart lub stref…" />
        <span className="kbd">⌘K</span>
      </label>
      <div className="top-right">
        <div className="live-chip"><span className="lp" /> Na żywo · 14:32</div>
        <button className="icon-btn" title="Pełny ekran"><Icon name="arrowUR" size={18} /></button>
        <div className="user-chip">
          <div className="avatar-me" style={{ backgroundImage: `url(${ME})` }} />
          <div className="uc-meta">
            <div className="uc-name">Marek Zieliński</div>
            <div className="uc-role">Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Nagłówek strony ---------- */
function Crumb({ items = ["Strona główna", "Pulpit"] }) {
  return (
    <div className="crumb">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">→</span>}
          <span className="crumb-item"><Icon name="folder" size={17} /> {it}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
function PageHead({ crumb, title, right }) {
  return (
    <div className="page-head">
      <div>
        <Crumb items={crumb} />
        <h1 className="title">{title}</h1>
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{right}</div>}
    </div>
  );
}

/* ---------- Sub-zakładki ---------- */
function SubTabs({ tabs, active, onChange = () => {} }) {
  return (
    <div className="segs">
      {tabs.map((t) => (
        <button key={t.id} className={"seg" + (t.id === active ? " active" : "")} onClick={() => onChange(t.id)}>
          {t.label}{t.count != null && <span className="cnt">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Drobne prymitywy ---------- */
function Field({ placeholder = "Szukaj…", width = 240 }) {
  return (
    <div className="field" style={{ minWidth: width }}>
      <Icon name="search" size={18} />
      <input placeholder={placeholder} />
    </div>
  );
}
function Toggle({ on = false }) {
  const [v, setV] = useState(on);
  return <button className={"tgl" + (v ? " on" : "")} onClick={() => setV(!v)} />;
}
function Badge({ tone = "neutral", children, lg }) { return <span className={"pill " + tone + (lg ? " lg" : "")}>{children}</span>; }
function ArrowBtn() { return <button className="arrow"><Icon name="arrowUR" size={18} /></button>; }
function ITile({ tone = "soft", size = 44, name, r = 13, children }) {
  return <div className={"itile " + tone} style={{ width: size, height: size, borderRadius: r }}>{children || <Icon name={name} size={Math.round(size * 0.46)} />}</div>;
}
function CardHead({ title, sub, right }) {
  return (
    <div className="card-h">
      <div>
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {right !== undefined ? right : <ArrowBtn />}
    </div>
  );
}
function Toolbar({ range = "20 – 27 sty 2026" }) {
  return (
    <div className="toolbar">
      <button className="icon-btn"><Icon name="search" size={19} /></button>
      <button className="icon-btn"><Icon name="sliders" size={19} /></button>
      <button className="chip"><Icon name="calendar" size={17} /> {range}</button>
      <button className="chip soft"><Icon name="plus" size={17} /> <span className="mut">{range}</span></button>
    </div>
  );
}
function EventRow({ kind, ic, name, place, time, tag, tagPill }) {
  const icCls = { in: "in", out: "out", deny: "deny", guest: "guest" }[kind] || "in";
  return (
    <div className="ev">
      <div className={"ev-ic " + icCls}><Icon name={ic} size={19} /></div>
      <div className="ev-main">
        <div className="ev-name">{name}</div>
        <div className="ev-meta">{place}</div>
      </div>
      <div className="ev-right">
        {tagPill ? <span className={"pill " + tagPill}>{tag}</span> : <div className="ev-amt">{tag}</div>}
        <div className="ev-time">{time}</div>
      </div>
    </div>
  );
}

/* ---------- Drawer szczegółów (portal do body, pozycja liczona w JS) ---------- */
function Drawer({ open, onClose, title, sub, headExtra, footer, children }) {
  const ref = useRef(null);
  const place = React.useCallback(() => {
    const el = ref.current; if (!el) return;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const w = Math.min(486, vw * 0.94);
    el.style.width = w + "px";
    el.style.left = (vw - w) + "px";
    el.style.right = "auto";
    el.style.transform = open ? "none" : "translateX(" + (w + 24) + "px)";
  }, [open]);
  useLayoutEffect(place);
  useEffect(() => {
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [place]);
  return ReactDOM.createPortal(
    <>
      <div className={"drawer-back" + (open ? " open" : "")} onClick={onClose} />
      <aside ref={ref} className={"drawer" + (open ? " open" : "")} aria-hidden={!open}>
        <div className="drawer-head">
          <div style={{ minWidth: 0 }}>
            {title && <div className="card-title">{title}</div>}
            {sub && <div className="card-sub">{sub}</div>}
            {headExtra}
          </div>
          <button className="icon-btn solid" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>,
    document.body
  );
}
function DKV({ k, v, mono }) { return <div className="dkv"><span className="k">{k}</span><span className={"v" + (mono ? " mono" : "")}>{v}</span></div>; }

/* ---------- Sekcja drawera z opcjonalnym meta po prawej ---------- */
function DSection({ children, meta }) {
  return <div className="dsection"><span>{children}</span>{meta && <span className="ds-meta">{meta}</span>}</div>;
}

/* ---------- Mini-statystyki w drawerze ---------- */
function DStats({ items }) {
  return (
    <div className="dstats">
      {items.map((s, i) => (
        <div key={i} className="dstat">
          <div className="sv">{s.v}{s.u && <span className="u">{s.u}</span>}</div>
          <div className="sk">{s.k}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Wiersz statusu (urządzenie / zabezpieczenie) ---------- */
function StatusDot({ tone = "ok", children }) {
  return <span className={"dstatus " + tone}><span className="dd-dot" />{children}</span>;
}
function DeviceRow({ icon, name, desc, tone = "ok", status }) {
  return (
    <div className="drow">
      <span className="di"><Icon name={icon} size={18} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="dn">{name}</div>
        {desc && <div className="dd">{desc}</div>}
      </div>
      {status && <StatusDot tone={tone}>{status}</StatusDot>}
    </div>
  );
}

/* ---------- Szczegółowy wiersz strefy ---------- */
function ZoneRow({ icon = "mapPin", name, sub, tag, tone = "neutral" }) {
  return (
    <div className="zrow">
      <div className="zl">
        <span className="zi"><Icon name={icon} size={16} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="zn">{name}</div>
          {sub && <div className="zs">{sub}</div>}
        </div>
      </div>
      {tag && <span className={"pill " + tone}>{tag}</span>}
    </div>
  );
}

/* ---------- Mini wykres słupkowy (np. ruch w ciągu dnia) ---------- */
function MiniBars({ data, labels, hi }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="spark">
        {data.map((v, i) => (
          <div key={i} className={"sb" + (hi === i ? " hi" : "")}><i style={{ height: Math.max(8, Math.round((v / max) * 100)) + "%" }} /></div>
        ))}
      </div>
      {labels && <div className="spark-x">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>}
    </div>
  );
}

/* ---------- Wpis osi czasu z ikoną kierunku ---------- */
function TLItem({ kind = "in", title, meta, rt }) {
  const ic = kind === "out" ? "out" : kind === "red" ? "ban" : "in";
  return (
    <div className="tl-item">
      <span className={"tl-ic " + kind}><Icon name={ic} size={14} sw={2} /></span>
      {rt && <span className="tl-rt">{rt}</span>}
      <div className="tl-t">{title}</div>
      <div className="tl-m">{meta}</div>
    </div>
  );
}

/* ---------- Modal (portal, pozycja liczona w JS) ---------- */
function Modal({ open, onClose, title, sub, footer, children, width = 460 }) {
  const ref = useRef(null);
  const place = React.useCallback(() => {
    const el = ref.current; if (!el) return;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const w = Math.min(width, vw * 0.94);
    el.style.width = w + "px";
    el.style.left = Math.round((vw - w) / 2) + "px";
    const h = el.offsetHeight;
    el.style.top = Math.max(20, Math.round((vh - h) / 2)) + "px";
  }, [width]);
  useLayoutEffect(() => { if (open) place(); });
  useEffect(() => { window.addEventListener("resize", place); return () => window.removeEventListener("resize", place); }, [place]);
  return ReactDOM.createPortal(
    <>
      <div className={"modal-back" + (open ? " open" : "")} onClick={onClose} />
      <div ref={ref} className={"modal" + (open ? " open" : "")} aria-hidden={!open}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div><div className="card-title">{title}</div>{sub && <div className="card-sub">{sub}</div>}</div>
            <button className="icon-btn solid" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </>,
    document.body
  );
}
function FInput({ label, value, onChange, placeholder, type = "text" }) {
  return <div><label className="flbl">{label}</label><input className="inp" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
}
function FSelect({ label, value, onChange, options }) {
  return <div><label className="flbl">{label}</label><select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
}
function useDrawer() {
  const [sel, setSel] = useState(null);
  const [open, setOpen] = useState(false);
  return {
    sel, open,
    show: (item) => { setSel(item); setOpen(true); },
    close: () => setOpen(false),
  };
}

Object.assign(window, {
  Icon, NAV, TOP, PAGE_TITLE, FACES, ME, toneFor, initials,
  Avatar, Avatars, Sidebar, TopNav, Crumb, PageHead, SubTabs,
  Field, Toggle, Badge, ArrowBtn, ITile, CardHead, Toolbar, EventRow,
  Drawer, DKV, useDrawer, Modal, FInput, FSelect,
  DSection, DStats, StatusDot, DeviceRow, ZoneRow, MiniBars, TLItem,
});
