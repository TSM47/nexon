/* charts.jsx — wykresy (SVG / div-bars) dla pulpitu kontroli dostępu */

/* ---------- Krzywa obecności (area) ---------- */
function AreaChart({ height = 150, tip = "247 osób · 14:00" }) {
  // obecność w ciągu dnia (0–24h), wartości 0..1
  const pts = [0.08,0.10,0.14,0.40,0.66,0.72,0.70,0.74,0.62,0.80,0.92,0.78,0.58,0.30,0.18];
  const W = 560, H = height;
  const step = W / (pts.length - 1);
  const y = (v) => H - 14 - v * (H - 34);
  let d = `M0 ${y(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const x = i * step, px = (i - 1) * step;
    const cx = (px + x) / 2;
    d += ` C ${cx} ${y(pts[i-1])}, ${cx} ${y(pts[i])}, ${x} ${y(pts[i])}`;
  }
  const area = d + ` L ${W} ${H} L 0 ${H} Z`;
  const markI = 10, markX = markI * step, markY = y(pts[markI]);
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#54D165" stopOpacity="0.30"/>
            <stop offset="1" stopColor="#54D165" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#agrad)" />
        <path d={d} fill="none" stroke="#3FB94F" strokeWidth="2.5" />
        <line x1={markX} y1={markY} x2={markX} y2={H} stroke="#3FB94F" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5"/>
        <circle cx={markX} cy={markY} r="5.5" fill="#fff" stroke="#3FB94F" strokeWidth="2.5"/>
      </svg>
      <div className="tip" style={{ position: "absolute", left: `${(markX/W)*100}%`, top: 2, transform: "translateX(-50%)" }}>{tip}</div>
    </div>
  );
}

/* ---------- Słupki ruchu przejść (jak Transaction Volume) ---------- */
function VolumeBars({ height = 200 }) {
  const seed = [22,30,18,44,26,52,38,60,34,70,46,82,58,90,66,96,72,88,62,78,50,86,68,94,
                76,84,58,72,46,64,40,56,34,50,28,44,24,38,20,34];
  const max = Math.max(...seed);
  const focus = 22;
  return (
    <div style={{ position: "relative" }}>
      <div className="bars" style={{ height }}>
        {seed.map((v, i) => {
          const active = i >= focus - 1 && i <= focus + 14;
          return <div key={i} className={"bar" + (active ? "" : " faint")}
            style={{ height: `${(v / max) * 100}%`, background: active ? "var(--ink)" : "var(--soft-2)" }} />;
        })}
      </div>
      <div className="axis-x">
        {["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz"].map(m => <span key={m}>{m}</span>)}
      </div>
      <div className="card" style={{ position: "absolute", left: "26%", top: "34%", padding: "12px 16px", borderRadius: 16, minWidth: 210 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="big-num" style={{ fontSize: 26 }}>1 204<span className="dim" style={{ fontSize: 18 }}> przejść</span></span>
          <span className="pill down">−11%</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Pik o 09:00 · 186 przejść</div>
      </div>
    </div>
  );
}

/* ---------- Słupki tygodnia (jak New Customers) ---------- */
function WeekBars({ values = [40,55,48,90,52,30,22], focus = 3, height = 92 }) {
  const max = Math.max(...values);
  const days = ["Pon","Wt","Śr","Czw","Pt","Sob","Ndz"];
  return (
    <div>
      <div style={{ position: "relative" }}>
        <div className="week" style={{ height }}>
          {values.map((v, i) => (
            <div key={i} className={"wk" + (i === focus ? " green" : "")} style={{ height: `${(v / max) * 100}%` }} />
          ))}
        </div>
        <div className="tip" style={{ position: "absolute", left: `${(focus + 0.5) / values.length * 100}%`, top: -14, transform: "translateX(-50%)" }}>{values[focus]}</div>
      </div>
      <div className="axis-x" style={{ marginTop: 8 }}>
        {days.map((d, i) => <span key={d} style={{ flex: 1, textAlign: "center", color: i === focus ? "var(--ink)" : "var(--muted)", fontWeight: i === focus ? 600 : 400 }}>{d}</span>)}
      </div>
    </div>
  );
}

/* ---------- Słupki stref (jak Transaction Performance) ---------- */
function ZoneBars({ height = 240 }) {
  const vals = [0.45,0.62,0.40,0.55,0.95,0.70,0.50,0.78,0.42];
  const months = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz"];
  const focus = 4;
  return (
    <div style={{ position: "relative", display: "flex", gap: 18 }}>
      <div className="axis-y" style={{ height, paddingBottom: 22 }}>
        {["1,2k","1k","800","600","400","200","0"].map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="grow">
        <div className="zbars" style={{ height }}>
          {vals.map((v, i) => (
            <div key={i} className={"zcol " + (i === focus ? "green" : "hatch")} style={{ height: `${v * 100}%` }} />
          ))}
        </div>
        <div className="axis-x">{months.map(m => <span key={m} style={{ flex: 1, textAlign: "center" }}>{m}</span>)}</div>
        <div style={{ position: "absolute", left: `${(focus + 0.5) / vals.length * 92 + 6}%`, top: "20%", display: "flex", flexDirection: "column", gap: 6, transform: "translateX(-50%)" }}>
          <div className="tip"><span className="g" /> 598 wejść</div>
          <div className="tip"><span className="r" /> 245 odmów</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Trend odmów (linia + area, czerwony) ---------- */
function DenialTrend({ height = 130 }) {
  const pts = [0.30,0.42,0.28,0.50,0.38,0.62,0.44,0.70,0.52,0.40,0.58,0.34];
  const W = 520, H = height;
  const step = W / (pts.length - 1);
  const y = (v) => H - 12 - v * (H - 28);
  let d = `M0 ${y(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const x = i * step, px = (i - 1) * step, cx = (px + x) / 2;
    d += ` C ${cx} ${y(pts[i-1])}, ${cx} ${y(pts[i])}, ${x} ${y(pts[i])}`;
  }
  const area = d + ` L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="dgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0685A" stopOpacity="0.22"/>
          <stop offset="1" stopColor="#F0685A" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#dgrad)" />
      <path d={d} fill="none" stroke="#E0503F" strokeWidth="2.5" />
    </svg>
  );
}

/* ---------- Mini sparkline do KPI ---------- */
function Spark({ color = "#3FB94F", up = true }) {
  const pts = up ? [0.3,0.5,0.4,0.6,0.55,0.8,0.7,0.95] : [0.8,0.6,0.7,0.5,0.55,0.35,0.45,0.25];
  const W = 110, H = 38, step = W / (pts.length - 1);
  const y = (v) => H - 4 - v * (H - 10);
  let d = `M0 ${y(pts[0])}`;
  for (let i = 1; i < pts.length; i++) { const x = i*step, px=(i-1)*step, cx=(px+x)/2; d += ` C ${cx} ${y(pts[i-1])}, ${cx} ${y(pts[i])}, ${x} ${y(pts[i])}`; }
  return <svg viewBox={`0 0 ${W} ${H}`} width="110" height="38"><path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round"/></svg>;
}

Object.assign(window, { AreaChart, VolumeBars, WeekBars, ZoneBars, DenialTrend, Spark });
