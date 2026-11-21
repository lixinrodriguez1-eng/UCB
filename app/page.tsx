import SelectorRol from "@/components/SelectorRol";
import VistaCaserita from "@/components/VistaCaserita";
import VistaFamilia from "@/components/VistaFamilia";
import VistaProductor from "@/components/VistaProductor";

/** Al inicio se elige el rol: caserita (lo de siempre), productor o familia. */
export default function Inicio() {
  return <SelectorRol caserita={<VistaCaserita />} productor={<VistaProductor />} familia={<VistaFamilia />} />;
}
