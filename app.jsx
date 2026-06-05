/* app.jsx — powłoka aplikacji + router stron */
const { Sidebar, PageHome, PageOverview, PageEmployees, PageDoors, PageCards, PageEvents, PageSecurity, PageVisitors, PageReports, PageSettings } = window;

const PAGES = {
  home: PageHome,
  overview: PageOverview,
  employees: PageEmployees,
  doors: PageDoors,
  cards: PageCards,
  events: PageEvents,
  security: PageSecurity,
  visitors: PageVisitors,
  reports: PageReports,
  settings: PageSettings,
};

function App() {
  const [page, setPage] = React.useState(() => location.hash.replace("#", "") || "overview");
  const mainRef = React.useRef(null);

  const nav = (id) => {
    if (!PAGES[id]) return;
    setPage(id);
    location.hash = id;
    if (mainRef.current) mainRef.current.scrollTo({ top: 0 });
  };

  React.useEffect(() => {
    const onHash = () => { const h = location.hash.replace("#", ""); if (PAGES[h]) setPage(h); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const Page = PAGES[page] || PageOverview;
  const isHome = page === "home";
  return (
    <div className={"app shell" + (isHome ? " home-shell" : "")}>
      {!isHome && <Sidebar page={page} onNav={nav} />}
      <main className={"main" + (isHome ? " main-home" : "")} ref={mainRef}>
        <div className="main-inner">
          <Page page={page} onNav={nav} />
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
