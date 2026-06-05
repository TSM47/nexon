/* forms.jsx — zaawansowane kreatory (wizard): pracownik, karta, punkt dostępu */
const { Modal: WModal, FInput: WIn, FSelect: WSel, Icon: WIc } = window;
const { useState: uS, useEffect: uE } = React;

const ALL_ZONES = ["Parter", "1 piętro", "2 piętro", "Recepcja", "Serwerownia", "Magazyn", "Parking", "Archiwum"];
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".");

/* ---------- kontrolki ---------- */
function Stepper({ labels, current }) {
  return (
    <div className="steps">
      {labels.map((l, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className={"step-line" + (i <= current ? " done" : "")} />}
          <div className={"step" + (i === current ? " active" : i < current ? " done" : "")}>
            <span className="num">{i < current ? <WIc name="check" size={14} /> : i + 1}</span>
            <span className="lab">{l}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
function RadioCards({ value, onChange, options, cols }) {
  return (
    <div className={"rcards" + (cols ? " cols" + cols : "")}>
      {options.map((o) => (
        <button key={o.id} type="button" className={"rcard" + (value === o.id ? " sel" : "")} onClick={() => onChange(o.id)}>
          <span className="rc-ic"><WIc name={o.ic} size={20} /></span>
          <span style={{ minWidth: 0 }}>
            <span className="rc-t" style={{ display: "block" }}>{o.title}</span>
            {o.desc && <span className="rc-d" style={{ display: "block" }}>{o.desc}</span>}
          </span>
          <span className="rc-check">{value === o.id && <WIc name="check" size={13} />}</span>
        </button>
      ))}
    </div>
  );
}
function ChipMulti({ value, onChange, options }) {
  const has = (o) => value.includes(o);
  const tog = (o) => onChange(has(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="cmwrap">
      {options.map((o) => (
        <button key={o} type="button" className={"cmchip" + (has(o) ? " sel" : "")} onClick={() => tog(o)}>
          {has(o) && <span className="ck"><WIc name="check" size={11} /></span>}{o}
        </button>
      ))}
    </div>
  );
}
function ToggleRow({ title, desc, on, onChange }) {
  return (
    <div className="trow">
      <div><div className="tt">{title}</div>{desc && <div className="td">{desc}</div>}</div>
      <button type="button" className={"tgl" + (on ? " on" : "")} onClick={() => onChange(!on)} />
    </div>
  );
}
function Sum({ k, v }) { return <div className="sumrow"><span className="sk">{k}</span><span className="sv">{v}</span></div>; }
function Sec({ children }) { return <div className="dsection">{children}</div>; }

function WizardShell({ open, onClose, title, sub, labels, current, setCurrent, canNext, onFinish, finishLabel, children }) {
  const last = labels.length - 1;
  return (
    <WModal open={open} onClose={onClose} title={title} sub={sub} width={580}
      footer={<>
        {current > 0
          ? <button className="btn-ghost" onClick={() => setCurrent(current - 1)}><WIc name="chevR" size={16} style={{ transform: "rotate(180deg)" }} /> Wstecz</button>
          : <button className="btn-ghost" onClick={onClose}>Anuluj</button>}
        <div style={{ flex: 1 }} />
        {current < last
          ? <button className="btn-dark" style={{ opacity: canNext ? 1 : .45, pointerEvents: canNext ? "auto" : "none" }} onClick={() => setCurrent(current + 1)}>Dalej <WIc name="chevR" size={16} /></button>
          : <button className="btn-dark" onClick={onFinish}><WIc name="check" size={16} /> {finishLabel}</button>}
      </>}>
      <Stepper labels={labels} current={current} />
      <div className="step-pane" key={current}>{children}</div>
    </WModal>
  );
}

/* ---------- Kreator: Dodaj pracownika ---------- */
const EMP_DEF = { first: "", last: "", email: "", tel: "", dept: "IT", role: "", hired: "", level: "Standard", zones: ["Parter"], sched: "Godziny pracy (06–22)", twofa: false, cardOpt: "new", cardType: "Stała", cardValid: "", existingCard: "#A‑1100" };
const EMP_LEVELS = [
  { id: "Administrator", title: "Administrator", desc: "Pełny dostęp + konfiguracja systemu", ic: "shield" },
  { id: "Pełny", title: "Pełny", desc: "Wszystkie strefy w godzinach pracy", ic: "key" },
  { id: "Standard", title: "Standard", desc: "Strefy biurowe i wspólne", ic: "user" },
  { id: "Ograniczony", title: "Ograniczony", desc: "Wybrane strefy wg harmonogramu", ic: "lock" },
];
function EmployeeWizard({ open, onClose, onCreate }) {
  const [step, setStep] = uS(0);
  const [f, setF] = uS(EMP_DEF);
  uE(() => { if (open) { setStep(0); setF(EMP_DEF); } }, [open]);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const name = (f.first.trim() + " " + f.last.trim()).trim();
  const canNext = step === 0 ? (f.first.trim() && f.last.trim()) : true;
  const finish = () => {
    const email = f.email.trim() || (name ? slug(name) + "@nexon.pl" : "");
    const card = f.cardOpt === "new" ? ("#A‑" + (2200 + Math.floor(Math.random() * 700))) : f.cardOpt === "existing" ? f.existingCard : "—";
    onCreate({ name, email, dept: f.dept, level: f.level, card, last: "Brak wejść", status: "active" });
    onClose();
  };
  return (
    <WizardShell open={open} onClose={onClose} title="Dodaj pracownika" sub="Profil, uprawnienia i karta dostępu" labels={["Dane", "Dostęp", "Karta"]} current={step} setCurrent={setStep} canNext={canNext} onFinish={finish} finishLabel="Dodaj pracownika">
      {step === 0 && <>
        <div style={{ display: "flex", gap: 16, marginBottom: 18, alignItems: "center" }}>
          <button type="button" className="photo-slot"><WIc name="userPlus" size={24} /></button>
          <div><div style={{ fontWeight: 600, fontSize: 14.5 }}>Zdjęcie pracownika</div><div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>PNG lub JPG · opcjonalne</div></div>
        </div>
        <div className="form-grid">
          <div className="frow"><WIn label="Imię *" value={f.first} onChange={set("first")} placeholder="Jan" /><WIn label="Nazwisko *" value={f.last} onChange={set("last")} placeholder="Kowalski" /></div>
          <div className="frow"><WIn label="E‑mail" value={f.email} onChange={set("email")} placeholder="auto z imienia" /><WIn label="Telefon" value={f.tel} onChange={set("tel")} placeholder="+48 600 000 000" /></div>
          <div className="frow"><WSel label="Dział" value={f.dept} onChange={set("dept")} options={["Zarząd", "IT", "Finanse", "HR", "Logistyka", "Magazyn", "Marketing", "Ochrona"]} /><WIn label="Stanowisko" value={f.role} onChange={set("role")} placeholder="np. Specjalista" /></div>
          <WIn label="Data zatrudnienia" type="date" value={f.hired} onChange={set("hired")} />
        </div>
      </>}
      {step === 1 && <>
        <div className="flbl">Poziom dostępu</div>
        <RadioCards value={f.level} onChange={set("level")} options={EMP_LEVELS} />
        <Sec>Uprawnione strefy ({f.zones.length})</Sec>
        <ChipMulti value={f.zones} onChange={set("zones")} options={ALL_ZONES} />
        <Sec>Harmonogram dostępu</Sec>
        <WSel label="" value={f.sched} onChange={set("sched")} options={["Całodobowy (24/7)", "Godziny pracy (06–22)", "Tylko dni robocze", "Własny…"]} />
        <div style={{ marginTop: 12 }}><ToggleRow title="Wymagaj 2FA w strefach krytycznych" desc="PIN lub aplikacja przy serwerowni i archiwum" on={f.twofa} onChange={set("twofa")} /></div>
      </>}
      {step === 2 && <>
        <div className="flbl">Karta dostępu</div>
        <RadioCards value={f.cardOpt} onChange={set("cardOpt")} options={[
          { id: "new", title: "Wydaj nową kartę", desc: "Utwórz identyfikator teraz", ic: "card" },
          { id: "existing", title: "Przypisz istniejącą", desc: "Wybierz wolną kartę z puli", ic: "key" },
          { id: "none", title: "Bez karty", desc: "Przypiszę później", ic: "ban" },
        ]} />
        {f.cardOpt === "new" && <div className="frow" style={{ marginTop: 14 }}><WSel label="Typ karty" value={f.cardType} onChange={set("cardType")} options={["Stała", "Tymczasowa"]} /><WIn label="Ważna do" type="date" value={f.cardValid} onChange={set("cardValid")} /></div>}
        {f.cardOpt === "existing" && <div style={{ marginTop: 14 }}><WSel label="Wolna karta" value={f.existingCard} onChange={set("existingCard")} options={["#A‑1100", "#A‑1101", "#B‑0900", "#C‑3001"]} /></div>}
        <Sec>Podsumowanie</Sec>
        <Sum k="Pracownik" v={name || "—"} />
        <Sum k="Dział · stanowisko" v={f.dept + (f.role ? " · " + f.role : "")} />
        <Sum k="Poziom dostępu" v={f.level} />
        <Sum k="Strefy" v={f.zones.length + " z " + ALL_ZONES.length} />
        <Sum k="Karta" v={f.cardOpt === "new" ? "Nowa (" + f.cardType + ")" : f.cardOpt === "existing" ? f.existingCard : "Brak"} />
      </>}
    </WizardShell>
  );
}

/* ---------- Kreator: Wydaj kartę ---------- */
const CARD_DEF = { type: "Stała", holder: "", company: "", zones: ["Parter", "Recepcja"], level: "Standard", valid: "", sched: "Godziny pracy (06–22)", antipass: true, print: true };
function MiniCardFace({ holder, type, valid }) {
  return (
    <div style={{ borderRadius: 18, padding: 20, color: "#fff", background: "linear-gradient(150deg, #232318, #18180F 60%)", boxShadow: "0 12px 30px -16px rgba(0,0,0,.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, letterSpacing: ".08em", fontSize: 14 }}>NEXON</span>
        <WIc name="wifi" size={18} />
      </div>
      <div style={{ width: 38, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#E7C77A,#B8923F)", marginTop: 20 }} />
      <div className="mono" style={{ fontSize: 16, letterSpacing: ".12em", marginTop: 16 }}>A • •••• • NX</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
        <div><div style={{ fontSize: 9.5, opacity: .55, letterSpacing: ".08em" }}>POSIADACZ</div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{holder || "—"}</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 9.5, opacity: .55, letterSpacing: ".08em" }}>{type.toUpperCase()}</div><div className="mono" style={{ fontSize: 12 }}>{valid || "12.2028"}</div></div>
      </div>
    </div>
  );
}
function CardWizard({ open, onClose, onCreate }) {
  const [step, setStep] = uS(0);
  const [f, setF] = uS(CARD_DEF);
  uE(() => { if (open) { setStep(0); setF(CARD_DEF); } }, [open]);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const canNext = step === 0 ? !!f.holder.trim() : true;
  const finish = () => {
    const holder = f.type === "Gość" && f.company ? f.holder.trim() : f.holder.trim();
    onCreate({ holder, type: f.type, valid: f.valid.trim() || (f.type === "Gość" ? "Dziś 18:00" : "12.2028"), st: "active", zones: f.zones });
    onClose();
  };
  return (
    <WizardShell open={open} onClose={onClose} title="Wydaj kartę dostępu" sub="Typ, posiadacz i uprawnienia identyfikatora" labels={["Posiadacz", "Uprawnienia", "Podgląd"]} current={step} setCurrent={setStep} canNext={canNext} onFinish={finish} finishLabel="Wydaj kartę">
      {step === 0 && <>
        <div className="flbl">Typ karty</div>
        <RadioCards value={f.type} onChange={set("type")} options={[
          { id: "Stała", title: "Stała", desc: "Dla pracownika etatowego", ic: "card" },
          { id: "Tymczasowa", title: "Tymczasowa", desc: "Na określony czas", ic: "clock" },
          { id: "Gość", title: "Gość", desc: "Identyfikator gościa / wykonawcy", ic: "user" },
        ]} />
        <Sec>Posiadacz</Sec>
        <div className="form-grid">
          <WIn label="Imię i nazwisko *" value={f.holder} onChange={set("holder")} placeholder="np. Jan Kowalski" />
          {f.type === "Gość" && <WIn label="Firma" value={f.company} onChange={set("company")} placeholder="np. Siemens AG" />}
        </div>
      </>}
      {step === 1 && <>
        <div className="flbl">Uprawnione strefy ({f.zones.length})</div>
        <ChipMulti value={f.zones} onChange={set("zones")} options={ALL_ZONES} />
        <Sec>Szczegóły</Sec>
        <div className="form-grid">
          <div className="frow"><WSel label="Poziom" value={f.level} onChange={set("level")} options={["Standard", "Pełny", "Ograniczony"]} /><WIn label="Ważna do" type="date" value={f.valid} onChange={set("valid")} /></div>
          <WSel label="Harmonogram" value={f.sched} onChange={set("sched")} options={["Całodobowy (24/7)", "Godziny pracy (06–22)", "Tylko dni robocze", "Jednorazowo (gość)"]} />
        </div>
        <div style={{ marginTop: 12 }}><ToggleRow title="Antipassback" desc="Blokuj ponowne wejście bez zarejestrowanego wyjścia" on={f.antipass} onChange={set("antipass")} /></div>
      </>}
      {step === 2 && <>
        <MiniCardFace holder={f.holder} type={f.type} valid={f.valid} />
        <Sec>Podsumowanie</Sec>
        <Sum k="Posiadacz" v={f.holder || "—"} />
        {f.type === "Gość" && f.company && <Sum k="Firma" v={f.company} />}
        <Sum k="Typ" v={f.type} />
        <Sum k="Strefy" v={f.zones.join(", ") || "—"} />
        <Sum k="Ważna do" v={f.valid || (f.type === "Gość" ? "Dziś 18:00" : "12.2028")} />
        <div style={{ marginTop: 10 }}><ToggleRow title="Wydrukuj kartę po wydaniu" desc="Wyślij do drukarki kart przy recepcji" on={f.print} onChange={set("print")} /></div>
      </>}
    </WizardShell>
  );
}

/* ---------- Kreator: Dodaj punkt dostępu ---------- */
const DOOR_DEF = { name: "", zone: "Parter", kind: "Drzwi", reader: "RFID", stan: "Otwarte", mode: "Standardowy", autolock: "Po 10 s", forced: true, antipass: false, gEmp: true, gSec: true, gServ: false, gGuest: false };
function DoorWizard({ open, onClose, onCreate }) {
  const [step, setStep] = uS(0);
  const [f, setF] = uS(DOOR_DEF);
  uE(() => { if (open) { setStep(0); setF(DOOR_DEF); } }, [open]);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const canNext = step === 0 ? !!f.name.trim() : true;
  const finish = () => {
    onCreate({ name: f.name.trim(), zone: f.zone, st: f.stan === "Zablokowane" ? "locked" : "open", last: "—" });
    onClose();
  };
  return (
    <WizardShell open={open} onClose={onClose} title="Dodaj punkt dostępu" sub="Drzwi lub czytnik w wybranej strefie" labels={["Punkt", "Konfiguracja", "Harmonogram"]} current={step} setCurrent={setStep} canNext={canNext} onFinish={finish} finishLabel="Dodaj punkt">
      {step === 0 && <>
        <div className="form-grid">
          <WIn label="Nazwa punktu *" value={f.name} onChange={set("name")} placeholder="np. Wejście boczne" />
          <WSel label="Strefa" value={f.zone} onChange={set("zone")} options={["Parter", "1 piętro", "2 piętro", "Parking", "Magazyn", "Tech"]} />
        </div>
        <Sec>Typ punktu</Sec>
        <RadioCards cols={2} value={f.kind} onChange={set("kind")} options={[
          { id: "Drzwi", title: "Drzwi", desc: "Standardowe wejście", ic: "door" },
          { id: "Brama", title: "Brama", desc: "Wjazd / garaż", ic: "door" },
          { id: "Kołowrót", title: "Kołowrót", desc: "Bramka osobowa", ic: "users" },
          { id: "Winda", title: "Winda", desc: "Kontrola pięter", ic: "building" },
        ]} />
        <Sec>Czytnik</Sec>
        <RadioCards cols={2} value={f.reader} onChange={set("reader")} options={[
          { id: "RFID", title: "RFID", desc: "Karta zbliżeniowa", ic: "card" },
          { id: "RFID + PIN", title: "RFID + PIN", desc: "Karta i kod", ic: "key" },
          { id: "Biometria", title: "Biometria", desc: "Odcisk / twarz", ic: "user" },
          { id: "Kod PIN", title: "Kod PIN", desc: "Tylko klawiatura", ic: "lock" },
        ]} />
      </>}
      {step === 1 && <>
        <div className="flbl">Stan początkowy</div>
        <RadioCards cols={2} value={f.stan} onChange={set("stan")} options={[
          { id: "Otwarte", title: "Otwarte", desc: "Dostęp aktywny", ic: "unlock" },
          { id: "Zablokowane", title: "Zablokowane", desc: "Wymaga odblokowania", ic: "lock" },
        ]} />
        <div className="frow" style={{ marginTop: 14 }}>
          <WSel label="Tryb pracy" value={f.mode} onChange={set("mode")} options={["Standardowy", "Śluza (interlock)", "Lockdown‑ready"]} />
          <WSel label="Auto‑blokada" value={f.autolock} onChange={set("autolock")} options={["Natychmiast", "Po 10 s", "Po 30 s", "Wyłączona"]} />
        </div>
        <div style={{ marginTop: 10 }}>
          <ToggleRow title="Alarm na wymuszenie drzwi" desc="Zgłoś, gdy drzwi otwarto siłą lub przytrzymano" on={f.forced} onChange={set("forced")} />
          <ToggleRow title="Antipassback" desc="Wymagaj sekwencji wejście→wyjście" on={f.antipass} onChange={set("antipass")} />
        </div>
      </>}
      {step === 2 && <>
        <div className="flbl">Dostęp grup</div>
        <ToggleRow title="Pracownicy · 06:00–22:00" on={f.gEmp} onChange={set("gEmp")} />
        <ToggleRow title="Ochrona · 24/7" on={f.gSec} onChange={set("gSec")} />
        <ToggleRow title="Serwis · 08:00–17:00" on={f.gServ} onChange={set("gServ")} />
        <ToggleRow title="Goście · 09:00–18:00" on={f.gGuest} onChange={set("gGuest")} />
        <Sec>Podsumowanie</Sec>
        <Sum k="Nazwa" v={f.name || "—"} />
        <Sum k="Strefa" v={f.zone} />
        <Sum k="Typ · czytnik" v={f.kind + " · " + f.reader} />
        <Sum k="Stan / tryb" v={f.stan + " · " + f.mode} />
      </>}
    </WizardShell>
  );
}

Object.assign(window, { EmployeeWizard, CardWizard, DoorWizard });
