"use client";

import { useState } from "react";
import type { PortalContext } from "@/types/portal";
import { PortalBooking } from "@/components/portal/PortalBooking";
import { PortalExercises } from "@/components/portal/PortalExercises";
import { PortalDiary } from "@/components/portal/PortalDiary";

type Tab = "turnos" | "ejercicios" | "diario";

export function PortalTabs({ token, ctx }: { token: string; ctx: PortalContext }) {
  const [tab, setTab] = useState<Tab>("turnos");
  const TABS: [Tab, string, string][] = [
    ["turnos", "Turnos", "📅"],
    ["ejercicios", "Ejercicios", "🏃"],
    ["diario", "Diario", "📝"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl2 bg-surface border border-line shadow-soft">
        {TABS.map(([k, label, icon]) => {
          const on = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg trans text-[12px] font-semibold"
              style={on ? { background: "var(--primary-soft)", color: "var(--primary-ink)" } : { color: "var(--muted)" }}
            >
              <span className="text-[16px] leading-none">{icon}</span>
              {label}
            </button>
          );
        })}
      </div>

      {tab === "turnos" && <PortalBooking token={token} defaultArea={ctx.plan?.area ?? "general"} />}
      {tab === "ejercicios" && <PortalExercises token={token} ctx={ctx} />}
      {tab === "diario" && <PortalDiary token={token} />}
    </div>
  );
}
