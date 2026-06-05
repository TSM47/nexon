import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexon — Kontrola dostępu",
  description: "System zarządzania kontrolą dostępu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
