import { Topbar } from "@/components/layout/Topbar";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function FacturacionPage() {
  return (
    <>
      <Topbar title="Facturación" subtitle="Cobros, obras sociales y bonos" />
      <ModulePlaceholder name="Facturación" />
    </>
  );
}
