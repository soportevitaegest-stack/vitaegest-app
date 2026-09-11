"use client";

import { useState } from "react";
import { PerfilForm } from "./PerfilForm";
import { InsurersPanel, type Insurer } from "./InsurersPanel";
import { ServicesPanel, type Service } from "./ServicesPanel";
import { AgendaConfigForm, type ScheduleData } from "./AgendaConfigForm";

type Tab = "general" | "aranceles" | "agenda";

export function ConfigTabs({
  profile,
  insurers,
  services,
  schedule,
}: {
  profile: { full_name: string; license_number: string; clinic_name: string; specialties: string[] };
  insurers: Insurer[];
  services: Service[];
  schedule: Partial<ScheduleData> | null;
}) {
  const [tab, setTab] = useState<Tab>("general");
  const TABS: [Tab, string][] = [
    ["general", "General"],
    ["aranceles", "Aranceles y Obras Sociales"],
    ["agenda", "Agenda"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 p-1 rounded-xl2 w-fit" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        {TABS.map(([k, l]) => {
          const on = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} className="text-[13px] font-semibold px-3.5 py-1.5 rounded-lg trans"
              style={on ? { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}>
              {l}
            </button>
          );
        })}
      </div>

      {tab === "general" && (
        <PerfilForm
          fullName={profile.full_name}
          license={profile.license_number}
          clinic={profile.clinic_name}
          specialties={profile.specialties}
        />
      )}

      {tab === "aranceles" && (
        <div className="flex flex-col gap-4">
          <InsurersPanel insurers={insurers} />
          <ServicesPanel services={services} />
        </div>
      )}

      {tab === "agenda" && <AgendaConfigForm initial={schedule} />}
    </div>
  );
}
