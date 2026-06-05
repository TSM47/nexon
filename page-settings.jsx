/* page-settings.jsx — Ustawienia */
const { TopNav: TNx, PageHead: PHx, Toggle: Tgx, Badge: Bx, Icon: Ix, CardHead: CHx, ITile: ITx } = window;

const SETNAV = [
  { id: "org",     label: "Organizacja",        ic: "building" },
  { id: "sec",     label: "Bezpieczeństwo",     ic: "shield" },
  { id: "notif",   label: "Powiadomienia",      ic: "bell" },
  { id: "integ",   label: "Integracje",         ic: "globe" },
  { id: "devices", label: "Urządzenia",         ic: "wifi" },
  { id: "roles",   label: "Role i uprawnienia", ic: "key" },
];

function SRow({ title, desc, children, last }) {
  return (
    <div className="drow" style={{ alignItems: "flex-start", borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <div style={{ paddingRight: 20 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</div>
        {desc && <div className="muted" style={{ fontSize: 13, marginTop: 3, maxWidth: 460 }}>{desc}</div>}
      </div>
      <div style={{ flex: "none", paddingTop: 2 }}>{children}</div>
    </div>
  );
}
function FieldBox({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 7, fontWeight: 500 }}>{label}</div>
      <div style={{ height: 46, borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--soft)", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 14.5, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function PanelOrg() {
  return (
    <section className="card" style={{ padding: 26 }}>
      <CHx title="Organizacja" sub="Dane firmy i lokalizacji" right={null} />
      <div style={{ display: "flex", gap: 16, alignItems: "center", margin: "20px 0 8px" }}>
        <div className="itile black" style={{ width: 64, height: 64, borderRadius: 18 }}>{Icon.logo ? <span style={{ filter: "invert(1)" }}>{Icon.logo(34)}</span> : null}</div>
        <div><div style={{ fontWeight: 700, fontSize: 18 }}>Nexon Sp. z o.o.</div><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Logo i nazwa w panelu</div></div>
        <button className="btn-ghost" style={{ marginLeft: "auto" }}><Ix name="upload" size={16} /> Zmień logo</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
        <FieldBox label="Nazwa firmy" value="Nexon Sp. z o.o." />
        <FieldBox label="NIP" value="701‑042‑88‑12" />
        <FieldBox label="Adres budynku" value="ul. Przykładowa 12, Warszawa" />
        <FieldBox label="Strefa czasowa" value="Europe/Warsaw (UTC+2)" />
      </div>
    </section>
  );
}
function PanelSec() {
  const rows = [
    ["Wymagaj 2FA dla stref krytycznych", "Druga weryfikacja (PIN lub aplikacja) przy wejściu do serwerowni i archiwum.", true],
    ["Antipassback", "Blokuj ponowne wejście tą samą kartą bez zarejestrowanego wyjścia.", true],
    ["Lockdown jednym kliknięciem", "Pokaż przycisk natychmiastowej blokady wszystkich drzwi.", true],
    ["Auto‑blokada po 3 odmowach", "Tymczasowo zablokuj kartę po trzech nieudanych próbach pod rząd.", false],
    ["Rejestracja zdjęć z kamer", "Zapisuj klatkę z kamery przy każdym zdarzeniu odmowy.", true],
  ];
  return (
    <>
      <section className="card" style={{ padding: 26 }}>
        <CHx title="Zasady bezpieczeństwa" sub="Reguły kontroli dostępu" right={null} />
        <div style={{ marginTop: 8 }}>
          {rows.map(([t, d, on], i) => <SRow key={i} title={t} desc={d} last={i === rows.length - 1}><Tgx on={on} /></SRow>)}
        </div>
      </section>
      <section className="card" style={{ padding: 26, marginTop: 18 }}>
        <CHx title="Godziny pracy budynku" sub="Domyślne okno dostępu pracowników" right={null} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
          <FieldBox label="Otwarcie" value="06:00" />
          <FieldBox label="Zamknięcie" value="22:00" />
        </div>
        <div style={{ marginTop: 6 }}><SRow title="Dostęp w weekendy" desc="Zezwól na wejścia w soboty i niedziele według uprawnień." last><Tgx on={false} /></SRow></div>
      </section>
    </>
  );
}
function PanelNotif() {
  const rows = [
    ["Alarmy bezpieczeństwa", "E‑mail i push do zespołu ochrony przy każdym alarmie.", true],
    ["Odmowy dostępu", "Powiadomienie push o odmowie w strefach krytycznych.", true],
    ["Drzwi wymuszone / przytrzymane", "Natychmiastowy alert, gdy drzwi otwarte zbyt długo.", true],
    ["Wygasające karty", "Cotygodniowe podsumowanie kart wygasających w ciągu 30 dni.", true],
    ["Raport dzienny", "Codzienne podsumowanie ruchu o 8:00.", false],
  ];
  return (
    <section className="card" style={{ padding: 26 }}>
      <CHx title="Powiadomienia" sub="Kanały i zdarzenia" right={null} />
      <div style={{ marginTop: 8 }}>
        {rows.map(([t, d, on], i) => <SRow key={i} title={t} desc={d} last={i === rows.length - 1}><Tgx on={on} /></SRow>)}
      </div>
    </section>
  );
}
function PanelInteg() {
  const items = [
    { name: "Active Directory", desc: "Synchronizacja pracowników i działów", ic: "users", on: true },
    { name: "Slack", desc: "Alarmy na kanał #ochrona", ic: "bell", on: true },
    { name: "Google Workspace", desc: "Logowanie SSO menedżerów", ic: "globe", on: true },
    { name: "Kamery (RTSP)", desc: "Podgląd przy zdarzeniach", ic: "eye", on: false },
    { name: "System BMS", desc: "Integracja z automatyką budynku", ic: "building", on: false },
  ];
  return (
    <section className="card" style={{ padding: 26 }}>
      <CHx title="Integracje" sub="Połączone systemy" right={null} />
      <div style={{ marginTop: 12 }}>
        {items.map((it, i) => (
          <div key={i} className="drow">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <ITx tone={it.on ? "green" : "soft"} size={42} name={it.ic} />
              <div><div style={{ fontWeight: 600, fontSize: 14.5 }}>{it.name}</div><div className="muted" style={{ fontSize: 13 }}>{it.desc}</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {it.on ? <Bx tone="in">Połączono</Bx> : <span className="muted" style={{ fontSize: 13.5 }}>Nieaktywne</span>}
              <Tgx on={it.on} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function PanelDevices() {
  const dev = [
    { name: "Czytnik · Wejście główne", type: "RFID + PIN", st: "online", sig: "Sygnał 98%" },
    { name: "Czytnik · Recepcja",        type: "RFID",       st: "online", sig: "Sygnał 95%" },
    { name: "Kontroler · Serwerownia",   type: "Biometria",  st: "online", sig: "Sygnał 90%" },
    { name: "Czytnik · Parking P1",      type: "RFID dalekiego zasięgu", st: "online", sig: "Sygnał 88%" },
    { name: "Czytnik · Dach techniczny", type: "RFID",       st: "offline", sig: "Brak sygnału" },
    { name: "Kontroler · Magazyn",       type: "RFID + PIN", st: "online", sig: "Sygnał 92%" },
  ];
  const DC = "1.9fr 1.3fr 1.2fr 1fr";
  return (
    <section className="card" style={{ padding: 26 }}>
      <CHx title="Urządzenia" sub="11 czytników · 10 online" right={<button className="chip"><Ix name="refresh" size={16} /> Odśwież</button>} />
      <div className="tbl-head" style={{ gridTemplateColumns: DC, marginTop: 12 }}><span>Urządzenie</span><span>Typ</span><span>Łączność</span><span>Status</span></div>
      {dev.map((d, i) => (
        <div key={i} className="tbl-row" style={{ gridTemplateColumns: DC }}>
          <div className="cell-name"><ITx tone={d.st === "online" ? "soft" : "red"} size={38} name="wifi" /><span className="nm" style={{ fontSize: 14.5 }}>{d.name}</span></div>
          <span className="cell-mut">{d.type}</span>
          <span className="cell-mut">{d.sig}</span>
          <span>{d.st === "online" ? <Bx tone="in"><span className="dot green" style={{ boxShadow: "none", width: 7, height: 7 }} /> Online</Bx> : <Bx tone="blk">Offline</Bx>}</span>
        </div>
      ))}
    </section>
  );
}
function PanelRoles() {
  const roles = [
    { name: "Administrator", people: 4,  perms: "Pełny dostęp · konfiguracja", tone: "blk" },
    { name: "Ochrona",       people: 12, perms: "Monitoring · lockdown · logi", tone: "neutral" },
    { name: "Menedżer",      people: 28, perms: "Pracownicy · karty · raporty", tone: "neutral" },
    { name: "Pracownik",     people: 268,perms: "Strefy wg harmonogramu", tone: "neutral" },
    { name: "Gość",          people: 142,perms: "Recepcja · strefy tymczasowe", tone: "exp" },
  ];
  const RC = "1.3fr 0.8fr 2fr 36px";
  return (
    <section className="card" style={{ padding: 26 }}>
      <CHx title="Role i uprawnienia" sub="5 ról dostępu" right={<button className="btn-dark"><Ix name="plus" size={18} /> Nowa rola</button>} />
      <div className="tbl-head" style={{ gridTemplateColumns: RC, marginTop: 12 }}><span>Rola</span><span>Osoby</span><span>Uprawnienia</span><span></span></div>
      {roles.map((r, i) => (
        <div key={i} className="tbl-row" style={{ gridTemplateColumns: RC }}>
          <span><Bx tone={r.tone} lg>{r.name}</Bx></span>
          <span className="cell-strong">{r.people}</span>
          <span className="cell-mut">{r.perms}</span>
          <button className="arrow" style={{ width: 32, height: 32, background: "transparent", border: "none" }}><Ix name="edit" size={16} /></button>
        </div>
      ))}
    </section>
  );
}

function PageSettings({ page, onNav }) {
  const [sec, setSec] = React.useState("sec");
  const panel = { org: <PanelOrg />, sec: <PanelSec />, notif: <PanelNotif />, integ: <PanelInteg />, devices: <PanelDevices />, roles: <PanelRoles /> }[sec];
  return (
    <>
      <TNx page={page} onNav={onNav} />
      <PHx crumb={["Strona główna", "Ustawienia"]} title="Ustawienia"
        right={<><button className="btn-ghost">Anuluj</button><button className="btn-dark"><Ix name="check" size={18} /> Zapisz zmiany</button></>} />

      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        <section className="card" style={{ padding: 14 }}>
          <div className="set-nav">
            {SETNAV.map((s) => (
              <div key={s.id} className={"set-item" + (s.id === sec ? " active" : "")} onClick={() => setSec(s.id)}>
                <span className="ic" style={{ display: "grid", placeItems: "center" }}><Ix name={s.ic} size={19} /></span>{s.label}
              </div>
            ))}
          </div>
        </section>
        <div>{panel}</div>
      </div>
    </>
  );
}
window.PageSettings = PageSettings;
