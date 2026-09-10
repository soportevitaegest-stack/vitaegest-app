import { Topbar } from "@/components/layout/Topbar";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function ConfiguracionPage() {
  return (
    <>
      <Topbar title="Configuración" subtitle="Perfil, aranceles y obras sociales" />
      <ModulePlaceholder name="Configuración" />
    </>
  );
}
