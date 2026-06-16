import Link from "next/link";

export function TopBar() {
  return (
    <header className="app-header">
      <nav aria-label="Principale">
        <Link className="app-header__logo" href="/">AccessScan</Link>
      </nav>
    </header>
  );
}
