// Definición de campos de las evaluaciones especializadas (schema-driven).
// Cada "sección" es un `kind` de clinical_assessments y sus valores se guardan
// como JSONB en la columna `data`. Basado en las planillas reales.

export type Field = {
  t: "head" | "text" | "number" | "textarea" | "select" | "chips" | "scale";
  k?: string;
  l: string;
  o?: (string | number)[];
  w?: "half" | "full";
  ph?: string;
  min?: number;
  max?: number;
};

export type SectionDef = {
  kind: string;
  label: string;
  group: "general" | "uro" | "dermo";
  schema: Field[];
};

// ---- Dolor (transversal) ----
export const DOLOR_SCHEMA: Field[] = [
  { t: "head", l: "Evaluación del dolor" },
  { k: "eva", l: "Intensidad (EVA 0-10)", t: "scale", min: 0, max: 10, w: "full" },
  { k: "caracteristica", l: "Característica", t: "chips", o: ["Eléctrico", "Quemante", "Punzante", "Opresivo", "Cólico", "Pulsátil", "Sordo", "Lancinante"] },
  { k: "origen", l: "Origen", t: "select", o: ["Nociceptivo", "Neuropático", "Nociplástico", "Mixto"], w: "half" },
  { k: "patron", l: "Patrón", t: "select", o: ["En reposo", "Con el movimiento", "Nocturno", "Constante", "Intermitente"], w: "half" },
  { k: "localizacion", l: "Localización", t: "text", w: "half" },
  { k: "irradiacion", l: "Irradiación", t: "text", w: "half" },
  { k: "obs", l: "Observaciones", t: "textarea", w: "full" },
];

// ---- Uroginecología · Anamnesis ----
export const UROG_ANAMNESIS: Field[] = [
  { t: "head", l: "Antecedentes ginecológicos" },
  { k: "menarca", l: "Menarca (edad)", t: "number", w: "half" },
  { k: "ciclo", l: "Ciclo menstrual", t: "select", o: ["Regular", "Irregular", "Menopausia"], w: "half" },
  { k: "anticoncep", l: "Método anticonceptivo", t: "text", w: "half" },
  { k: "cirugias_gin", l: "Cirugías ginecológicas", t: "text", w: "half" },
  { k: "its_gin", l: "ITS / infecciones genitales", t: "text", w: "half" },
  { k: "endometriosis", l: "Endometriosis", t: "select", o: ["No", "Sí", "En estudio"], w: "half" },
  { k: "fibromas", l: "Fibromas / miomas", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "dolor_premenstrual", l: "Dolores premenstruales", t: "select", o: ["No", "Leve", "Moderado", "Intenso"], w: "half" },
  { k: "dolor_menstrual", l: "Dismenorrea", t: "select", o: ["No", "Leve", "Moderado", "Intenso"], w: "half" },
  { k: "menopausia_antig", l: "Menopausia — antigüedad de los síntomas", t: "text", w: "half" },
  { t: "head", l: "Antecedentes obstétricos" },
  { k: "gestas", l: "Gestas", t: "number", w: "half" },
  { k: "partos", l: "Partos", t: "number", w: "half" },
  { k: "cesareas", l: "Cesáreas", t: "number", w: "half" },
  { k: "abortos", l: "Abortos", t: "number", w: "half" },
  { k: "tipo_parto", l: "Tipo de parto", t: "select", o: ["Vaginal", "Cesárea", "Fórceps", "Vaginal instrumentado", "Mixto"], w: "half" },
  { k: "parto_inducido", l: "¿Parto inducido?", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "induccion_detalle", l: "Inducción — especificar", t: "text", w: "half" },
  { k: "episiotomia", l: "Episiotomía", t: "select", o: ["No", "Sí", "Desgarro"], w: "half" },
  { k: "maniobras", l: "Uso de maniobras", t: "text", w: "half", ph: "Kristeller, fórceps, ventosa…" },
  { k: "motivo_cesarea", l: "Motivo de la cesárea", t: "text", w: "half" },
  { k: "peso_bebe", l: "Peso mayor del bebé (g)", t: "number", w: "half" },
  { t: "head", l: "Sexualidad" },
  { k: "vida_sexual", l: "Vida sexual activa", t: "select", o: ["Sí", "No"], w: "half" },
  { k: "dolor_relaciones", l: "Dolor en las relaciones", t: "select", o: ["No", "Leve", "Moderado", "Intenso"], w: "half" },
  { k: "dolor_penetracion", l: "Dolor a la penetración", t: "select", o: ["No", "Superficial", "Profundo", "Ambos"], w: "half" },
  { k: "vaginismo", l: "Vaginismo", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "lubricacion", l: "Falta de lubricación", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "orgasmo", l: "Orgasmo (intensidad)", t: "select", o: ["Normal", "Disminuido", "Ausente"], w: "half" },
  { k: "sexualidad_obs", l: "Observaciones (sexualidad)", t: "textarea", w: "full" },
  { t: "head", l: "Urología" },
  { k: "iu_tipo", l: "Incontinencia de orina", t: "chips", o: ["Esfuerzo", "Urgencia", "Mixta", "No refiere"] },
  { k: "urgencia_mic", l: "Urgencia miccional", t: "select", o: ["No", "Leve", "Moderada", "Severa"], w: "half" },
  { k: "frec_diurna", l: "Frecuencia diurna", t: "number", w: "half" },
  { k: "nocturia", l: "Nocturia (veces/noche)", t: "number", w: "half" },
  { k: "itu", l: "ITU a repetición", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "llenado", l: "Sensación de llenado vesical", t: "select", o: ["Normal", "Aumentada", "Disminuida", "Ausente"], w: "half" },
  { k: "vaciado", l: "Sensación de vaciado completo", t: "select", o: ["Completo", "Incompleto"], w: "half" },
  { k: "goteo_post", l: "Goteo post-miccional", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "dificultad_mic", l: "Dificultad para orinar", t: "chips", o: ["Iniciar", "Mantener", "Terminar", "No refiere"] },
  { t: "head", l: "Coloproctología" },
  { k: "hemorroides", l: "Hemorroides (tipo)", t: "select", o: ["No", "Internas", "Externas", "Mixtas"], w: "half" },
  { k: "soiling", l: "Soiling (ensuciamiento)", t: "select", o: ["No", "Ocasional", "Frecuente"], w: "half" },
  { k: "incont_heces", l: "Incontinencia de heces", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "incont_gases", l: "Incontinencia de gases", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "perdidas", l: "Pérdidas", t: "chips", o: ["Espontáneas", "Al esfuerzo", "No refiere"] },
  { k: "estrenimiento", l: "Estreñimiento", t: "select", o: ["No", "Ocasional", "Habitual"], w: "half" },
  { k: "bristol_hab", l: "Bristol habitual (1-7)", t: "number", w: "half" },
  { k: "dolor_defec", l: "Dolor al defecar", t: "select", o: ["No", "Sí"], w: "half" },
  { t: "head", l: "Estilo de vida y hábitos" },
  { k: "alimentacion", l: "Alimentación", t: "select", o: ["Equilibrada", "Rica en fibra", "Baja en fibra", "Irregular"], w: "half" },
  { k: "liquidos_ml", l: "Ingesta de líquidos (ml/día)", t: "number", w: "half" },
  { k: "cafeina", l: "Cafeína / mate por día", t: "text", w: "half" },
  { k: "actividad", l: "Actividad física", t: "select", o: ["Sedentaria", "Leve", "Moderada", "Intensa"], w: "half" },
  { k: "obs", l: "Observaciones", t: "textarea", w: "full" },
];

// ---- Uroginecología · Evaluación física ----
export const UROG_FISICA: Field[] = [
  { t: "head", l: "Evaluación abdominal" },
  { k: "diastasis", l: "Diástasis de rectos", t: "select", o: ["No", "Supraumbilical", "Umbilical", "Infraumbilical", "Mixta"], w: "half" },
  { k: "diastasis_cm", l: "Separación (cm / dedos)", t: "text", w: "half" },
  { k: "transverso", l: "Activación del transverso", t: "select", o: ["Ausente", "Deficiente", "Presente", "Óptima"], w: "half" },
  { k: "respiracion", l: "Tipo de respiración", t: "select", o: ["Diafragmática", "Costal", "Paradójica", "Mixta"], w: "half" },
  { k: "tono_abd", l: "Tono abdominal (patrón diafragmático)", t: "select", o: ["Hipotónico", "Normal", "Hipertónico"], w: "half" },
  { k: "cicatrices", l: "Cicatrices (quirúrgicas / obstétricas)", t: "textarea", w: "full" },
  { t: "head", l: "Evaluación pélvica" },
  { k: "oxford", l: "Escala Oxford modificada (0-5)", t: "scale", min: 0, max: 5, w: "full" },
  { k: "perfect_P", l: "PERFECT · P (Power 0-5)", t: "select", o: [0, 1, 2, 3, 4, 5], w: "half" },
  { k: "perfect_E", l: "PERFECT · E (Endurance seg)", t: "number", w: "half" },
  { k: "perfect_R", l: "PERFECT · R (Repeticiones)", t: "number", w: "half" },
  { k: "perfect_F", l: "PERFECT · F (Fast)", t: "number", w: "half" },
  { k: "distancia_ano_vulvar", l: "Distancia ano-vulvar (cm)", t: "number", w: "half" },
  { k: "apertura_vaginal", l: "Apertura vaginal", t: "text", w: "half" },
  { k: "nucleo_fibroso", l: "Núcleo fibroso central", t: "select", o: ["Normotono", "Hipotono", "Hipertono"], w: "half" },
  { k: "musculos_parasitos", l: "Uso de músculos parásitos", t: "chips", o: ["Glúteos", "Aductores", "Abdominales", "Apnea"] },
  { k: "tono_pelv", l: "Tono muscular", t: "select", o: ["Hipotónico", "Normotónico", "Hipertónico"], w: "half" },
  { k: "popq", l: "Prolapso (POP-Q simplificado)", t: "select", o: ["Sin prolapso", "Grado I", "Grado II", "Grado III", "Grado IV"], w: "half" },
  { k: "compartimento", l: "Compartimento comprometido", t: "chips", o: ["Anterior (cistocele)", "Posterior (rectocele)", "Apical (útero)"] },
  { k: "puntos_gatillo", l: "Puntos gatillo miofasciales", t: "textarea", w: "full" },
  { k: "obs", l: "Observaciones", t: "textarea", w: "full" },
];

// ---- Salud masculina ----
export const URO_MALE: Field[] = [
  { t: "head", l: "Antecedentes" },
  { k: "its", l: "Infecciones genitales / ITS", t: "text", w: "full" },
  { k: "prostatica", l: "Enfermedad prostática", t: "select", o: ["No", "HBP", "Prostatitis", "Post-prostatectomía", "Otra"], w: "half" },
  { k: "prostatica_cual", l: "¿Cuál? / detalle", t: "text", w: "half" },
  { k: "prostatica_tto", l: "Tratamiento prostático", t: "text", w: "full" },
  { t: "head", l: "Esfera sexual" },
  { k: "ereccion", l: "Dificultades en la erección", t: "select", o: ["No", "Leve", "Moderada", "Severa"], w: "half" },
  { k: "orinar_relaciones", l: "Ganas de orinar durante las relaciones", t: "select", o: ["No", "Sí"], w: "half" },
  { k: "orgasmo", l: "Orgasmo", t: "select", o: ["Normal", "Disminuido", "Ausente"], w: "half" },
  { k: "obs", l: "Observaciones", t: "textarea", w: "full" },
];

// ---- Dermatofuncional · Facial ----
export const DERMO_FACIAL: Field[] = [
  { t: "head", l: "Evaluación facial" },
  { k: "piel", l: "Tipo de piel", t: "select", o: ["Normal", "Grasa", "Seca", "Mixta"], w: "half" },
  { k: "fototipo", l: "Fototipo (Fitzpatrick)", t: "select", o: ["I", "II", "III", "IV", "V", "VI"], w: "half" },
  { k: "hidratacion", l: "Hidratación", t: "select", o: ["Regular", "Buena", "Muy buena"], w: "half" },
  { k: "glogau", l: "Clasificación Glogau", t: "select", o: ["Tipo I", "Tipo II", "Tipo III", "Tipo IV"], w: "half" },
  { k: "arrugas", l: "Arrugas", t: "chips", o: ["Dinámicas", "Estáticas", "Líneas de expresión", "Gravitacionales"] },
  { k: "manchas", l: "Manchas (tipo)", t: "text", w: "half" },
  { k: "manchas_loc", l: "Localización", t: "text", w: "half" },
  { k: "acne", l: "Acné", t: "chips", o: ["Comedones", "Pápulas", "Pústulas"] },
  { k: "fotoenv", l: "Fotoenvejecimiento", t: "textarea", w: "full" },
];

// ---- Dermatofuncional · Corporal ----
export const DERMO_CORPORAL: Field[] = [
  { t: "head", l: "Diagnóstico" },
  { k: "pefe", l: "PEFE / Fibrosis / Nódulos", t: "chips", o: ["PEFE", "Fibrosis", "Nódulos"] },
  { k: "pefe_loc", l: "Localización", t: "text", w: "full" },
  { k: "edema", l: "Edema / Lipedema / Linfedema", t: "select", o: ["No", "Edema", "Lipedema", "Linfedema"], w: "half" },
  { k: "adiposidad", l: "Adiposidad", t: "select", o: ["Localizada", "Generalizada"], w: "half" },
  { k: "adiposidad_tipo", l: "Consistencia", t: "select", o: ["Blanda", "Dura"], w: "half" },
  { k: "flacidez", l: "Flacidez", t: "select", o: ["Cutánea", "Muscular", "Mixta"], w: "half" },
  { k: "estrias", l: "Estrías", t: "select", o: ["Blancas", "Rosadas", "Ambas"], w: "half" },
  { t: "head", l: "Antropometría" },
  { k: "peso", l: "Peso actual (kg)", t: "number", w: "half" },
  { k: "peso_deseado", l: "Peso deseado (kg)", t: "number", w: "half" },
  { k: "talla", l: "Talla (cm)", t: "number", w: "half" },
  { k: "imc", l: "IMC", t: "number", w: "half" },
  { k: "grasa", l: "% grasa corporal", t: "number", w: "half" },
  { k: "cintura", l: "Cintura (cm)", t: "number", w: "half" },
  { k: "cadera", l: "Cadera (cm)", t: "number", w: "half" },
  { k: "obs", l: "Observaciones", t: "textarea", w: "full" },
];

// ---- Dermatofuncional · Postquirúrgico ----
export const DERMO_POSTQX: Field[] = [
  { t: "head", l: "Cirugía" },
  { k: "tipo_cirugia", l: "Tipo de cirugía", t: "text", w: "half", ph: "Abdominoplastia, lipo, mamoplastia…" },
  { k: "tecnica", l: "Técnica quirúrgica", t: "text", w: "half" },
  { k: "fecha_qx", l: "Fecha de cirugía", t: "text", w: "half" },
  { k: "dias_postqx", l: "Días de postoperatorio", t: "number", w: "half" },
  { t: "head", l: "Clínica" },
  { k: "dolor", l: "Dolor", t: "select", o: ["No", "Leve", "Moderado", "Intenso"], w: "half" },
  { k: "edema", l: "Edema", t: "select", o: ["No", "Leve", "Moderado", "Severo"], w: "half" },
  { k: "equimosis", l: "Equimosis", t: "select", o: ["No", "Leve", "Moderada", "Extensa"], w: "half" },
  { k: "seroma", l: "Seroma", t: "select", o: ["No", "Sí", "En resolución"], w: "half" },
  { t: "head", l: "Cicatriz y fibrosis" },
  { k: "cicatriz_fase", l: "Fase de cicatrización", t: "select", o: ["Inflamatoria", "Proliferativa", "Remodelación / maduración"] },
  { k: "cicatriz_patologica", l: "Cicatriz patológica", t: "chips", o: ["Adherencias", "Hipertrófica", "Atrófica", "Retráctil", "Queloide"] },
  { k: "fibrosis_tipo", l: "Fibrosis · tipo", t: "select", o: ["No", "Difusa", "Nodular", "Retráctil"], w: "half" },
  { k: "fibrosis_estadio", l: "Fibrosis · estadio", t: "select", o: ["I", "II", "III", "IV"], w: "half" },
  { k: "complicaciones", l: "Complicaciones", t: "textarea", w: "full" },
];

// ---- Dermatofuncional · Linfático ----
export const DERMO_LINFATICO: Field[] = [
  { t: "head", l: "Linfedema" },
  { k: "origen", l: "Origen", t: "select", o: ["Primario", "Secundario", "Mixto"], w: "half" },
  { k: "causa", l: "Causa (si es secundario/mixto)", t: "text", w: "half" },
  { k: "clasificacion", l: "Clasificación", t: "select", o: ["Leve", "Moderado", "Severo"], w: "half" },
  { k: "estadio", l: "Estadio (ISL)", t: "select", o: ["0 (latente)", "I", "II", "III (elefantiasis)"], w: "half" },
  { k: "miembro", l: "Miembro afectado", t: "select", o: ["MSD", "MSI", "MID", "MII"], w: "half" },
  { k: "godet", l: "Signo de Godet (fóvea)", t: "select", o: ["Negativo", "+", "++", "+++"], w: "half" },
  { k: "stemmer", l: "Signo de Stemmer", t: "select", o: ["Negativo", "Positivo"], w: "half" },
  { k: "obs", l: "Observaciones", t: "textarea", w: "full" },
];

// ---- Dermatofuncional · Venoso ----
export const DERMO_VENOSO: Field[] = [
  { t: "head", l: "Clasificación" },
  { k: "ceap", l: "CEAP (clase clínica)", t: "select", o: ["C0", "C1", "C2", "C3", "C4", "C5", "C6"], w: "half" },
  { k: "coloracion", l: "Coloración", t: "chips", o: ["Normal", "Hiperpigmentación", "Dermatitis ocre", "Eritema", "Cianosis", "Palidez"] },
  { t: "head", l: "Úlceras" },
  { k: "ulcera", l: "Úlcera", t: "select", o: ["No", "Activa", "Cicatrizada"], w: "half" },
  { k: "ulcera_tipo", l: "Tipo de úlcera", t: "select", o: ["Venosa", "Arterial", "Mixta", "Neuropática"], w: "half" },
  { k: "edema", l: "Edema", t: "select", o: ["No", "Leve", "Moderado", "Severo"], w: "half" },
  { k: "obs", l: "Observaciones", t: "textarea", w: "full" },
];

// Catálogo de secciones (kind ↔ etiqueta ↔ grupo ↔ schema)
export const SECTION_DEFS: SectionDef[] = [
  { kind: "general", label: "Dolor", group: "general", schema: DOLOR_SCHEMA },
  { kind: "uro_anamnesis", label: "Uro · Anamnesis", group: "uro", schema: UROG_ANAMNESIS },
  { kind: "uro_physical", label: "Uro · Ev. física", group: "uro", schema: UROG_FISICA },
  { kind: "uro_male", label: "Uro · Salud masculina", group: "uro", schema: URO_MALE },
  { kind: "dermo_facial", label: "Dermato · Facial", group: "dermo", schema: DERMO_FACIAL },
  { kind: "dermo_corporal", label: "Dermato · Corporal", group: "dermo", schema: DERMO_CORPORAL },
  { kind: "dermo_postquirurgico", label: "Dermato · Post-qx", group: "dermo", schema: DERMO_POSTQX },
  { kind: "dermo_linfatico", label: "Dermato · Linfático", group: "dermo", schema: DERMO_LINFATICO },
  { kind: "dermo_venoso", label: "Dermato · Venoso", group: "dermo", schema: DERMO_VENOSO },
];

// Filtra las secciones según las especialidades del profesional (0007).
// specialties vacío = muestra todo.
export function sectionsForSpecialties(specialties: string[]): SectionDef[] {
  const showUro = specialties.length === 0 || specialties.includes("pelvic_perineal");
  const showDermo = specialties.length === 0 || specialties.includes("dermatofunctional");
  return SECTION_DEFS.filter((s) => {
    if (s.group === "general") return true;
    if (s.group === "uro") return showUro;
    if (s.group === "dermo") return showDermo;
    return true;
  });
}
