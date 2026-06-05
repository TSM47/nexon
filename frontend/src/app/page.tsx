export default function Home() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Nexon — Kontrola dostępu</h1>
      <p>
        Frontend Next.js działa poprawnie. API dostępne pod{" "}
        <a href="/api/health">/api/health</a>.
      </p>
      <p>
        Interaktywny dashboard (HTML prototype) dostępny pod{" "}
        <a href="/dashboard">
          /dashboard
        </a>.
      </p>
    </main>
  );
}
