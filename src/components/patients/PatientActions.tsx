"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePatientActive, deletePatient } from "@/server/actions/patients";

export function PatientActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = () =>
    start(async () => {
      await togglePatientActive(id, !isActive);
      router.refresh();
    });

  const remove = () => {
    if (!confirm("¿Eliminar este paciente? Esta acción no se puede deshacer.")) return;
    start(async () => {
      const res = await deletePatient(id);
      if (res?.error) {
        alert(res.error);
        return;
      }
      router.push("/pacientes");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={pending}
        className="text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 border border-line trans disabled:opacity-50"
        style={{ background: "var(--surface-2)", color: "var(--ink)" }}
      >
        {isActive ? "Desactivar" : "Activar"}
      </button>
      <button
        onClick={remove}
        disabled={pending}
        className="text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 border trans disabled:opacity-50"
        style={{ borderColor: "var(--rose)", color: "var(--rose)", background: "var(--surface)" }}
      >
        Eliminar
      </button>
    </div>
  );
}
