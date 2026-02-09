"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AskLowellPanel from "./AskLowellPanel";
import InternalGate from "./InternalGate";

const navItems = [
  { href: "/", label: "Home Lens", hint: "Map-first" },
  { href: "/neighborhoods", label: "Neighborhood Explorer", hint: "Spatial insight" },
  { href: "/projects", label: "Project Tracker", hint: "Lifecycle view" }
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <InternalGate />
      <aside className="sidebar">
        <h1>Lowell Urban Transformation</h1>
        <div className="nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
            >
              <span>{item.label}</span>
              <span className="badge">{item.hint}</span>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 22, fontSize: 12, color: "var(--muted)" }}>
          Internal MVP · Data refreshed quarterly · v0.1
        </div>
      </aside>
      <main>{children}</main>
      <aside className="ask-panel">
        <AskLowellPanel />
      </aside>
    </>
  );
}
