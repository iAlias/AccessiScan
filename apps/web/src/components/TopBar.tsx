import Link from "next/link";

export function TopBar() {
  return (
    <header className="app-header">
      <nav aria-label="Principale" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <Link href="/" style={{ fontWeight: 700 }}>AccessScan</Link>
      </nav>
    </header>
  );
}
