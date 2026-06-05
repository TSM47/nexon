/* page-reports.jsx — Raporty / Analityka (na bazie wariantu C) */
const { TopNav: TNr, PageHead: PHr, Toolbar: TBr, Icon: Ir, CardHead: CHr } = window;
const { AreaChart: ACr, VolumeBars: VBr, DenialTrend: DTr, Spark: SPr } = window;

const RKPI = [
  { dark: true,  ic: "user",     label: "Osoby w budynku", val: "247",   pill: "up",   delta: "+18", spark: "#54D165", up: true },
  { dark: false, ic: "activity", label: "Przejścia dziś",  val: "1 204", pill: "down", delta: "−11%", spark: "#3FB94F", up: false },
  { dark: false, ic: "x",        label: "Odmowy dziś",     val: "23",    pill: "down", delta: "+5",  spark: "#E0503F", up: true },
  { dark: false, ic: "card",     label: "Aktywne karty",   val: "1 248", pill: "up",   delta: "+6",  spark: "#3FB94F", up: true },
];
const RDEN = [
  { t: "Brak uprawnień",          n: 12, w: 100, c: "var(--danger)" },
  { t: "Karta wygasła",           n: 6,  w: 52,  c: "var(--warn)" },
  { t: "Naruszenie antipassback", n: 3,  w: 26,  c: "var(--ink-2)" },
  { t: "Strefa zamknięta",        n: 2,  w: 18,  c: "var(--faint)" },
];
const RZON = [
  { t: "Wejście główne", n: "3 204", w: 100 },
  { t: "Recepcja",       n: "2 890", w: 88 },
  { t: "Parking P1",     n: "1 642", w: 52 },
  { t: "Biuro · 2p.",    n: "1 210", w: 38 },
  { t: "Serwerownia",    n: "412",   w: 14 },
];

function RKpiTile({ dark, ic, label, val, pill, delta, spark, up }) {
  return (
    <div className={"kpi" + (dark ? " dark" : "")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="kpi-label">
          <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: dark ? "rgba(255,255,255,.12)" : "var(--soft)" }}><Ir name={ic} size={17} /></span>
          {label}
        </div>
        <span className={"pill " + pill}>{delta}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div className="kpi-val">{val}</div>
        <SPr color={spark} up={up} />
      </div>
    </div>
  );
}

function PageReports({ page, onNav }) {
  return (
    <>
      <TNr page={page} onNav={onNav} />
      <PHr crumb={["Strona główna", "Analityka"]} title="Analityka dostępu"
        right={<><TBr range="20 – 27 sty 2026" /><button className="btn-dark"><Ir name="download" size={18} /> Raport PDF</button></>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 18 }}>
        {RKPI.map((k, i) => <RKpiTile key={i} {...k} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18, marginBottom: 18 }}>
        <section className="card" style={{ padding: 24 }}>
          <CHr title="Ruch przejść" sub="Liczba przejść w ciągu doby · godziny szczytu" />
          <div style={{ marginTop: 20 }}><VBr height={188} /></div>
        </section>
        <section className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <CHr title="Obecność dziś" sub="Osoby w budynku w czasie" />
          <div className="big-num" style={{ fontSize: 40, marginTop: 14 }}>247<span className="dim" style={{ fontSize: 22 }}> osób</span></div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", margin: "0 -6px -6px" }}><ACr height={150} tip="247 · 14:00" /></div>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <section className="card" style={{ padding: 24 }}>
          <CHr title="Najczęstsze strefy" sub="Wg liczby przejść · 7 dni" />
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            {RZON.map((z, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{z.t}</span>
                  <span className="mono" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{z.n}</span>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: "var(--soft-2)", overflow: "hidden" }}>
                  <div style={{ width: z.w + "%", height: "100%", borderRadius: 6, background: i === 0 ? "var(--accent)" : "var(--black)" }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ padding: 24 }}>
          <div className="card-h">
            <div><div className="card-title">Trend odmów dostępu</div><div className="card-sub">Odmowy w ostatnich 12 dniach</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="big-num" style={{ fontSize: 30 }}>23</span><span className="pill down">+5</span></div>
          </div>
          <div style={{ margin: "12px -6px 18px" }}><DTr height={120} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {RDEN.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: d.c, flex: "none" }} />
                <span style={{ flex: 1, fontSize: 14, color: "var(--ink-2)" }}>{d.t}</span>
                <div style={{ width: 120, height: 8, borderRadius: 5, background: "var(--soft-2)", overflow: "hidden" }}>
                  <div style={{ width: d.w + "%", height: "100%", background: d.c, borderRadius: 5 }} />
                </div>
                <span className="mono" style={{ fontSize: 13, width: 22, textAlign: "right" }}>{d.n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
window.PageReports = PageReports;
