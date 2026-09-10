import { Topbar } from "@/components/layout/Topbar";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function AgendaPage() {
  return (
    <>
      <Topbar title="Agenda" subtitle="Vista semanal de turnos" />
      <ModulePlaceholder name="Agenda / Turnos" />
    </>
  );
}
