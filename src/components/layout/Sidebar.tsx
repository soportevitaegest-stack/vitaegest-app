"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "./icons";
import { Logo } from "./Logo";

// Barra lateral de navegación del área privada.
export function Sidebar({ professionalName = "Profesional", license = "" }: { professionalName?: string; license?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="hidden md:flex flex-col w-[248px] shrink-0 h-screen sticky top-0 border-r border-line bg-surface px-4 py-5">
      <div className="px-2 mb-7">
        <Logo size={36} />
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={
                "group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl2 trans text-sm font-medium " +
                (active ? "text-primary-ink" : "text-muted hover:text-ink")
              }
              style={active ? { background: "var(--primary-soft)" } : undefined}
            >
              <span className={active ? "text-primary" : "text-muted group-hover:text-ink trans"}>
                {Icon?.({ size: 20 })}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 px-1 pt-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-primary-ink"
          style={{ background: "var(--primary-soft)" }}
        >
          {professionalName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate">{professionalName}</div>
          {license && <div className="text-[11px] text-muted truncate">{license}</div>}
        </div>
      </div>
    </aside>
  );
}
