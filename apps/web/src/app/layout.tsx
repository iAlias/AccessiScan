import "./globals.css";
import "./dashboard.css";

export const metadata = { title: "AccessScan" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <a href="#main" className="skip-link">Salta al contenuto principale</a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
