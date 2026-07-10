/**
 * ============================================================================
 * DASHBOARD EJECUTIVO — ASIGNACIONES ACADÉMICAS 2026
 * Comparación de desempeño entre profesores
 * ----------------------------------------------------------------------------
 * Stack: React + TypeScript + Tailwind CSS + Recharts
 * Listo para Lovable / Vercel. Componente único con sub-componentes
 * reutilizables; para producción puede dividirse en /components y /lib.
 * ============================================================================
 */

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  LabelList,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  PieChart,
  Pie,
} from "recharts";

/* ============================================================================
 * 1. TIPOS Y DATOS
 * ========================================================================== */

export type Semaforo = "VERDE" | "AMARILLO" | "ROJO" | "NA";

/**
 * Detalle de una actividad reportada por un profesor, con las horas separadas
 * por semestre. Alimenta la página de análisis individual (tabla por ítem +
 * gráficos). Es opcional en `Profesor`: solo está presente cuando los datos
 * cargados traen el desglose por actividad (CSV consolidado a nivel actividad).
 */
export interface Actividad {
  /** Sección/componente del reporte: docencia, innovación, investigación, gestión, etc. */
  componente: string;
  /** Descripción o evidencia concreta de la actividad. */
  actividad: string;
  hrsS1: number;
  hrsS2: number;
}

export interface Profesor {
  profesor: string;
  categoria: string;
  docenciaHoras: number;
  innovacionHoras: number;
  docenciaTotal: number;
  investigacionHoras: number;
  gestionHoras: number;
  cargaTotal: number;
  perfil: string;
  /** Detalle opcional por actividad (para la página de análisis individual). */
  actividades?: Actividad[];
}

/* ---------------------------------------------------------------------------
 * Dimensiones del quehacer profesoral: agrupan los "componentes" del reporte
 * en 4 categorías principales (+ "otros"). Se usan tanto para agregar horas
 * como para colorear los gráficos de la página individual.
 * ------------------------------------------------------------------------- */

export type Dimension = "docencia" | "innovacion" | "investigacion" | "gestion" | "otros";

export const DIMENSION_META: Record<Dimension, { label: string; color: string }> = {
  docencia: { label: "Docencia", color: "#2563eb" },
  innovacion: { label: "Innovación", color: "#7c3aed" },
  investigacion: { label: "Investigación", color: "#059669" },
  gestion: { label: "Gestión y proyección", color: "#d97706" },
  otros: { label: "Formación y otros", color: "#64748b" },
};

/** Mapea el texto de un "componente" del reporte a una de las dimensiones. */
export function componenteToDimension(componente: string): Dimension {
  const s = componente
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/ciencia|ctei|tecnologia e innovacion|investigacion|proyecto/.test(s)) return "investigacion";
  if (/innovacion educativa|docencia e innovacion|^innovacion$/.test(s)) return "innovacion";
  if (/programacion academica|docencia directa|^docencia$/.test(s) || s.includes("docencia"))
    return "docencia";
  if (/servicio|proyeccion social|gestion|administracion|jefatura/.test(s)) return "gestion";
  return "otros";
}

/** Suma las horas (S1+S2) de una lista de actividades, agrupadas por dimensión. */
export function sumByDimension(actividades: Actividad[]): Record<Dimension, number> {
  const out: Record<Dimension, number> = {
    docencia: 0,
    innovacion: 0,
    investigacion: 0,
    gestion: 0,
    otros: 0,
  };
  actividades.forEach((a) => {
    out[componenteToDimension(a.componente)] += (a.hrsS1 || 0) + (a.hrsS2 || 0);
  });
  return out;
}

/** Deriva los campos agregados de `Profesor` a partir del detalle por actividad. */
export function aggregatesFromActividades(actividades: Actividad[]) {
  const r = (v: number) => Math.round(v * 10) / 10;
  const d = sumByDimension(actividades);
  const docenciaHoras = r(d.docencia);
  const innovacionHoras = r(d.innovacion);
  const investigacionHoras = r(d.investigacion);
  const gestionHoras = r(d.gestion);
  const docenciaTotal = r(docenciaHoras + innovacionHoras);
  const cargaTotal = r(docenciaTotal + investigacionHoras + gestionHoras);
  return { docenciaHoras, innovacionHoras, docenciaTotal, investigacionHoras, gestionHoras, cargaTotal };
}

export type MetricKey =
  | "docenciaTotal"
  | "investigacionHoras"
  | "gestionHoras"
  | "innovacionHoras"
  | "cargaTotal";

export interface MetricDef {
  key: MetricKey;
  label: string;
  shortLabel: string;
  description: string;
  /** true si un valor extremo alto puede ser riesgo (p. ej. sobrecarga) */
  highIsRisk?: boolean;
}

export const METRICS: MetricDef[] = [
  {
    key: "docenciaTotal",
    label: "Docencia total (horas)",
    shortLabel: "Docencia",
    description: "Horas de docencia directa + innovación docente",
  },
  {
    key: "investigacionHoras",
    label: "Investigación (horas)",
    shortLabel: "Investigación",
    description: "Horas dedicadas a proyectos y productos de investigación",
  },
  {
    key: "gestionHoras",
    label: "Gestión académica (horas)",
    shortLabel: "Gestión",
    description: "Horas de gestión, coordinación y administración académica",
  },
  {
    key: "innovacionHoras",
    label: "Innovación docente (horas)",
    shortLabel: "Innovación",
    description: "Horas dedicadas a innovación y desarrollo de cursos",
  },
  {
    key: "cargaTotal",
    label: "Carga total (horas)",
    shortLabel: "Carga total",
    description: "Suma de docencia, investigación y gestión",
    highIsRisk: true,
  },
];

/**
 * Dataset de ejemplo (Asignaciones_Academicas_2026_Unificado_v2.csv), usado
 * solo si el usuario elige "Usar datos de ejemplo" en vez de cargar su propia
 * carpeta local con archivos .csv de profesores.
 */
export const SAMPLE_DATA: Profesor[] = [
  { profesor: "Cristian Camilo Osorio Gomez", categoria: "Asistente I", docenciaHoras: 24, innovacionHoras: 549, docenciaTotal: 573, investigacionHoras: 193, gestionHoras: 70, cargaTotal: 836, perfil: "Docencia" },
  { profesor: "Daniel Felipe Ruiz Restrepo", categoria: "Asistente II", docenciaHoras: 528, innovacionHoras: 0, docenciaTotal: 528, investigacionHoras: 261, gestionHoras: 667, cargaTotal: 1456, perfil: "Balanceado" },
  { profesor: "Juliana Montoya Arango", categoria: "Asistente I", docenciaHoras: 100, innovacionHoras: 605, docenciaTotal: 705, investigacionHoras: 107, gestionHoras: 329, cargaTotal: 1141, perfil: "Docencia" },
  { profesor: "Dario Alonso Ramirez Amaya", categoria: "Asistente I", docenciaHoras: 480, innovacionHoras: 45, docenciaTotal: 525, investigacionHoras: 311, gestionHoras: 109, cargaTotal: 945, perfil: "Balanceado" },
  { profesor: "Juan Camilo Molina Villegas", categoria: "Titular", docenciaHoras: 312, innovacionHoras: 23, docenciaTotal: 335, investigacionHoras: 410, gestionHoras: 125, cargaTotal: 870, perfil: "Investigacion" },
  { profesor: "Alejandra Maria Carmona Duque", categoria: "Asistente I", docenciaHoras: 396, innovacionHoras: 0, docenciaTotal: 396, investigacionHoras: 647, gestionHoras: 293, cargaTotal: 1336, perfil: "Investigacion" },
  { profesor: "Juan Pablo Ospina Zapata", categoria: "Asociado", docenciaHoras: 402, innovacionHoras: 0, docenciaTotal: 402, investigacionHoras: 624, gestionHoras: 113, cargaTotal: 1139, perfil: "Investigacion" },
  { profesor: "Carlos Alejandro Escobar Sierra", categoria: "Titular", docenciaHoras: 784, innovacionHoras: 25, docenciaTotal: 809, investigacionHoras: 25, gestionHoras: 0, cargaTotal: 834, perfil: "Docencia" },
  { profesor: "Jose Fernando Duque Trujillo", categoria: "Asociado", docenciaHoras: 494, innovacionHoras: 0, docenciaTotal: 494, investigacionHoras: 72, gestionHoras: 881, cargaTotal: 1447, perfil: "Gestion" },
  { profesor: "Andres Felipe Hernandez Estrada", categoria: "Asistente I", docenciaHoras: 330, innovacionHoras: 341, docenciaTotal: 671, investigacionHoras: 364, gestionHoras: 285, cargaTotal: 1320, perfil: "Balanceado" },
  { profesor: "Leonel Francisco Castañeda Heredia", categoria: "Distinguido", docenciaHoras: 0, innovacionHoras: 0, docenciaTotal: 0, investigacionHoras: 0, gestionHoras: 0, cargaTotal: 872, perfil: "Sabatico" },
  { profesor: "Alejandro Vasquez Hernandez", categoria: "Asistente", docenciaHoras: 120, innovacionHoras: 47, docenciaTotal: 167, investigacionHoras: 226, gestionHoras: 531, cargaTotal: 924, perfil: "Gestion" },
  { profesor: "Ana Beatriz Acevedo Jaramillo", categoria: "Titular", docenciaHoras: 374, innovacionHoras: 0, docenciaTotal: 374, investigacionHoras: 313, gestionHoras: 87, cargaTotal: 774, perfil: "Balanceado" },
  { profesor: "Nicolas Guarin Zapata", categoria: "Asistente II", docenciaHoras: 140, innovacionHoras: 0, docenciaTotal: 140, investigacionHoras: 934, gestionHoras: 382, cargaTotal: 1456, perfil: "Investigacion" },
  { profesor: "Juan Carlos Botero Palacio", categoria: "Escalafon_Puntos", docenciaHoras: 336, innovacionHoras: 87, docenciaTotal: 423, investigacionHoras: 398, gestionHoras: 376, cargaTotal: 1197, perfil: "Balanceado" },
  { profesor: "Luis Eduardo Olmos Sanchez", categoria: "Asistente I", docenciaHoras: 302, innovacionHoras: 60, docenciaTotal: 362, investigacionHoras: 421, gestionHoras: 219, cargaTotal: 1117, perfil: "Investigacion" },
];

/**
 * Detalle por actividad (S1/S2) para algunos profesores de ejemplo, tomado de
 * sus reportes reales de asignación académica. Solo cubre una parte del grupo:
 * los demás usan el resumen agregado en la página individual. Al cargar tu
 * propio CSV consolidado a nivel actividad, TODOS los profesores muestran este
 * mismo nivel de detalle.
 */
export const SAMPLE_ACTIVIDADES: Record<string, Actividad[]> = {
  "Cristian Camilo Osorio Gomez": [
    { componente: "Docencia", actividad: "Acueductos y Alcantarillados (4406)", hrsS1: 24, hrsS2: 0 },
    { componente: "Innovación", actividad: "Experiencias de aprendizaje experiencial", hrsS1: 48, hrsS2: 0 },
    { componente: "Innovación", actividad: "Diseño mesocurricular de programa", hrsS1: 436, hrsS2: 0 },
    { componente: "Innovación", actividad: "Rediseño de syllabus", hrsS1: 65, hrsS2: 0 },
    { componente: "Investigación", actividad: "Miembro de comités de CTeI", hrsS1: 48, hrsS2: 0 },
    { componente: "Investigación", actividad: "Publicación bibliográfica (GNC)", hrsS1: 145, hrsS2: 0 },
    { componente: "Gestión", actividad: "Promoción y mercadeo de programas", hrsS1: 70, hrsS2: 0 },
  ],
  "Juan Pablo Ospina Zapata": [
    { componente: "Docencia", actividad: "Movilidad Urbana (6792)", hrsS1: 131, hrsS2: 0 },
    { componente: "Docencia", actividad: "Transporte Urbano - Vías Urb. (7016)", hrsS1: 70, hrsS2: 0 },
    { componente: "Docencia", actividad: "Sistemas de Transporte (4409)", hrsS1: 70, hrsS2: 0 },
    { componente: "Docencia", actividad: "Principios de Diseño Urbano (5000)", hrsS1: 131, hrsS2: 0 },
    { componente: "Investigación", actividad: "Proyecto: Modelos de interacción espacial", hrsS1: 109, hrsS2: 108 },
    { componente: "Investigación", actividad: "Proyecto: La forma de las ciudades", hrsS1: 106, hrsS2: 108 },
    { componente: "Investigación", actividad: "Coordinación de grupos de investigación", hrsS1: 44, hrsS2: 0 },
    { componente: "Investigación", actividad: "Liderazgo de semilleros", hrsS1: 19, hrsS2: 0 },
    { componente: "Investigación", actividad: "Publicación bibliográfica (GNC)", hrsS1: 28, hrsS2: 0 },
    { componente: "Investigación", actividad: "Dirección de tesis doctoral", hrsS1: 17, hrsS2: 17 },
    { componente: "Investigación", actividad: "Dirección de tesis doctoral", hrsS1: 17, hrsS2: 17 },
    { componente: "Investigación", actividad: "Formulación de proyectos de CTeI", hrsS1: 17, hrsS2: 17 },
    { componente: "Gestión", actividad: "Jefatura de programa", hrsS1: 61, hrsS2: 0 },
    { componente: "Gestión", actividad: "Participación en comités y consejos", hrsS1: 52, hrsS2: 0 },
  ],
  "Alejandra Maria Carmona Duque": [
    { componente: "Docencia", actividad: "Ecología Urbana (4997)", hrsS1: 120, hrsS2: 0 },
    { componente: "Docencia", actividad: "Tesis Doctoral-1 (7463)", hrsS1: 72, hrsS2: 0 },
    { componente: "Docencia", actividad: "Cambio Climático (5791)", hrsS1: 144, hrsS2: 0 },
    { componente: "Docencia", actividad: "Cambio Climático (5559)", hrsS1: 60, hrsS2: 0 },
    { componente: "Investigación", actividad: "Proyecto: Detección de tendencias hidroclimatológicas", hrsS1: 109, hrsS2: 106 },
    { componente: "Investigación", actividad: "Proyecto: Drenaje urbano Valle de Aburrá", hrsS1: 109, hrsS2: 108 },
    { componente: "Investigación", actividad: "Publicación bibliográfica (GNC)", hrsS1: 20, hrsS2: 20 },
    { componente: "Investigación", actividad: "Publicación bibliográfica (GNC)", hrsS1: 20, hrsS2: 20 },
    { componente: "Investigación", actividad: "Publicación bibliográfica (GNC)", hrsS1: 24, hrsS2: 24 },
    { componente: "Investigación", actividad: "Coordinación de grupos de investigación", hrsS1: 24, hrsS2: 24 },
    { componente: "Investigación", actividad: "Liderazgo de semilleros", hrsS1: 20, hrsS2: 19 },
    { componente: "Gestión", actividad: "Participación en comités y consejos", hrsS1: 22, hrsS2: 22 },
    { componente: "Gestión", actividad: "Grupos de estudio y primarios", hrsS1: 22, hrsS2: 22 },
    { componente: "Gestión", actividad: "Coordinación de línea académica", hrsS1: 44, hrsS2: 43 },
    { componente: "Gestión", actividad: "Otro servicio interno", hrsS1: 26, hrsS2: 22 },
    { componente: "Gestión", actividad: "Cuerpos colegiados externos (proyección social)", hrsS1: 24, hrsS2: 24 },
    { componente: "Gestión", actividad: "Tutoría y asesoría a estudiantes", hrsS1: 13, hrsS2: 13 },
  ],
  "Jose Fernando Duque Trujillo": [
    { componente: "Docencia", actividad: "Énfasis I (4289)", hrsS1: 120, hrsS2: 0 },
    { componente: "Docencia", actividad: "Geología Estructural (4275)", hrsS1: 48, hrsS2: 0 },
    { componente: "Docencia", actividad: "Tectónica (4278)", hrsS1: 110, hrsS2: 0 },
    { componente: "Docencia", actividad: "Geología Estructural (4274)", hrsS1: 72, hrsS2: 0 },
    { componente: "Docencia", actividad: "Geología Estructural (4697)", hrsS1: 0, hrsS2: 48 },
    { componente: "Docencia", actividad: "Énfasis I (3908)", hrsS1: 0, hrsS2: 48 },
    { componente: "Docencia", actividad: "Tectónica (3898)", hrsS1: 0, hrsS2: 48 },
    { componente: "Investigación", actividad: "Proyecto: CCUS con recobro mejorado de gas (SIMCCS)", hrsS1: 34, hrsS2: 0 },
    { componente: "Investigación", actividad: "Proyecto: Procedencia secciones estratigráficas Urabá", hrsS1: 38, hrsS2: 0 },
    { componente: "Gestión", actividad: "Participación en comités y consejos", hrsS1: 144, hrsS2: 0 },
    { componente: "Gestión", actividad: "Dirección de área académica", hrsS1: 305, hrsS2: 432 },
  ],
};

/* Adjunta el detalle por actividad a los profesores de ejemplo que lo tienen y
   recalcula sus horas agregadas para que el resumen y el detalle sean consistentes. */
SAMPLE_DATA.forEach((p) => {
  const acts = SAMPLE_ACTIVIDADES[p.profesor];
  if (acts) {
    p.actividades = acts;
    Object.assign(p, aggregatesFromActividades(acts));
  }
});

/* ============================================================================
 * 1b. CARGA DE DATOS DESDE UNA CARPETA LOCAL (.csv y/o .md)
 * ----------------------------------------------------------------------------
 * El dashboard no trae datos reales embebidos: al abrirlo, pide seleccionar
 * una carpeta local que contenga archivos .csv (una fila por profesor) y/o
 * .md (un archivo por profesor, con front-matter YAML o líneas "Campo: valor").
 * Los encabezados/campos esperados coinciden con `Profesor`, con alias
 * comunes en español; los campos totales/perfil se calculan automáticamente
 * si el archivo no los trae.
 * ========================================================================== */

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, keyof Profesor> = {
  profesor: "profesor",
  nombre: "profesor",
  docente: "profesor",
  nombreprofesor: "profesor",
  categoria: "categoria",
  categoriaprofesoral: "categoria",
  docenciahoras: "docenciaHoras",
  horasdocencia: "docenciaHoras",
  innovacionhoras: "innovacionHoras",
  horasinnovacion: "innovacionHoras",
  docenciatotal: "docenciaTotal",
  investigacionhoras: "investigacionHoras",
  horasinvestigacion: "investigacionHoras",
  gestionhoras: "gestionHoras",
  horasgestion: "gestionHoras",
  cargatotal: "cargaTotal",
  perfil: "perfil",
  perfilprincipal: "perfil",
};

const NUMERIC_FIELDS: (keyof Profesor)[] = [
  "docenciaHoras",
  "innovacionHoras",
  "docenciaTotal",
  "investigacionHoras",
  "gestionHoras",
  "cargaTotal",
];

/** Parser CSV simple: soporta campos entre comillas y detecta "," o ";" como delimitador. */
function parseCSV(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf("\n") + 1 || text.length);
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // el salto de línea lo maneja "\n"
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Perfil principal inferido cuando el archivo no trae la columna "perfil". */
function classifyPerfil(p: {
  docenciaTotal: number;
  investigacionHoras: number;
  gestionHoras: number;
  cargaTotal: number;
}): string {
  const { docenciaTotal, investigacionHoras, gestionHoras, cargaTotal } = p;
  if (cargaTotal <= 0) return "Balanceado";
  const shares: [string, number][] = [
    ["Docencia", docenciaTotal],
    ["Investigacion", investigacionHoras],
    ["Gestion", gestionHoras],
  ];
  const [topLabel, topValue] = shares.reduce((a, b) => (b[1] > a[1] ? b : a));
  return topValue / cargaTotal >= 0.45 ? topLabel : "Balanceado";
}

/** Convierte el texto de un archivo .csv en filas tipadas `Profesor`. */
function parseProfesoresCSV(text: string): Profesor[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const fieldByCol = rows[0].map((h) => HEADER_ALIASES[normalizeHeader(h)]);

  const out: Profesor[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const record: Partial<Record<keyof Profesor, string | number>> = {};

    fieldByCol.forEach((field, i) => {
      if (!field) return;
      const raw = (cells[i] ?? "").trim();
      if (NUMERIC_FIELDS.includes(field)) {
        record[field] = raw ? Number(raw.replace(",", ".")) || 0 : 0;
      } else {
        record[field] = raw;
      }
    });

    if (!record.profesor) continue;

    const docenciaHoras = Number(record.docenciaHoras ?? 0);
    const innovacionHoras = Number(record.innovacionHoras ?? 0);
    const docenciaTotal = Number(record.docenciaTotal ?? docenciaHoras + innovacionHoras);
    const investigacionHoras = Number(record.investigacionHoras ?? 0);
    const gestionHoras = Number(record.gestionHoras ?? 0);
    const cargaTotal = Number(
      record.cargaTotal ?? docenciaTotal + investigacionHoras + gestionHoras
    );

    out.push({
      profesor: String(record.profesor),
      categoria: record.categoria ? String(record.categoria) : "Sin categoría",
      docenciaHoras,
      innovacionHoras,
      docenciaTotal,
      investigacionHoras,
      gestionHoras,
      cargaTotal,
      perfil: record.perfil
        ? String(record.perfil)
        : classifyPerfil({ docenciaTotal, investigacionHoras, gestionHoras, cargaTotal }),
    });
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * CSV consolidado a nivel de ACTIVIDAD (una fila por actividad de cada
 * profesor). Es el formato recomendado: alimenta a la vez el análisis
 * comparativo (agregando horas) y la página de análisis individual (detalle
 * por ítem y por semestre). Columnas esperadas (con alias):
 *   profesor, categoria, componente, actividad, hrsS1, hrsS2
 * ------------------------------------------------------------------------- */

interface ActRow {
  profesor: string;
  categoria: string;
  componente: string;
  actividad: string;
  hrsS1: number;
  hrsS2: number;
}

const ACT_HEADER: Record<string, keyof ActRow> = {
  profesor: "profesor",
  nombre: "profesor",
  docente: "profesor",
  nombreprofesor: "profesor",
  categoria: "categoria",
  categoriaprofesoral: "categoria",
  componente: "componente",
  seccion: "componente",
  dimension: "componente",
  area: "componente",
  actividad: "actividad",
  descripcion: "actividad",
  descripcionevidencia: "actividad",
  evidencia: "actividad",
  item: "actividad",
  detalle: "actividad",
  hrss1: "hrsS1",
  horass1: "hrsS1",
  hs1: "hrsS1",
  hrss2: "hrsS2",
  horass2: "hrsS2",
  hs2: "hrsS2",
};

/** ¿El encabezado del CSV corresponde al formato por actividad (componente + horas por semestre)? */
function csvHeaderIsActividad(header: string[]): boolean {
  const fields = header.map((h) => ACT_HEADER[normalizeHeader(h)]);
  return fields.includes("componente") && (fields.includes("hrsS1") || fields.includes("hrsS2"));
}

/** Convierte un CSV por actividad en filas tipadas `ActRow`. */
function parseActividadRows(text: string): ActRow[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const fieldByCol = rows[0].map((h) => ACT_HEADER[normalizeHeader(h)]);
  const out: ActRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const rec: ActRow = { profesor: "", categoria: "", componente: "", actividad: "", hrsS1: 0, hrsS2: 0 };
    fieldByCol.forEach((field, i) => {
      if (!field) return;
      const raw = (cells[i] ?? "").trim();
      if (field === "hrsS1") rec.hrsS1 = raw ? Number(raw.replace(",", ".")) || 0 : 0;
      else if (field === "hrsS2") rec.hrsS2 = raw ? Number(raw.replace(",", ".")) || 0 : 0;
      else if (field === "profesor") rec.profesor = raw;
      else if (field === "categoria") rec.categoria = raw;
      else if (field === "componente") rec.componente = raw;
      else if (field === "actividad") rec.actividad = raw;
    });
    if (!rec.profesor) continue;
    out.push(rec);
  }
  return out;
}

/** Agrupa filas de actividad por profesor y construye `Profesor[]` con detalle + agregados derivados. */
function buildProfesoresFromActRows(rows: ActRow[]): Profesor[] {
  const byProf = new Map<string, ActRow[]>();
  rows.forEach((r) => {
    const list = byProf.get(r.profesor) ?? [];
    list.push(r);
    byProf.set(r.profesor, list);
  });
  const out: Profesor[] = [];
  byProf.forEach((list, profesor) => {
    const actividades: Actividad[] = list.map((r) => ({
      componente: r.componente,
      actividad: r.actividad,
      hrsS1: r.hrsS1,
      hrsS2: r.hrsS2,
    }));
    const categoria = list.map((r) => r.categoria).find((c) => c && c.trim()) || "Sin categoría";
    const agg = aggregatesFromActividades(actividades);
    out.push({
      profesor,
      categoria,
      ...agg,
      perfil: classifyPerfil({
        docenciaTotal: agg.docenciaTotal,
        investigacionHoras: agg.investigacionHoras,
        gestionHoras: agg.gestionHoras,
        cargaTotal: agg.cargaTotal,
      }),
      actividades,
    });
  });
  return out;
}

/* ---------------------------------------------------------------------------
 * CARGA DE ARCHIVOS .xlsx (reportes "Resumen de Asignación Académica" del
 * sistema). El lector de Excel (SheetJS) se importa de forma diferida desde su
 * CDN oficial solo cuando hay .xlsx, para no pesar en el bundle ni cambiar la
 * build. Cada fila de la tabla es una actividad (Componente + Hrs S1/S2).
 * ------------------------------------------------------------------------- */

const SHEETJS_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

/** Deriva el nombre del profesor desde el nombre del archivo (texto entre paréntesis o quitando prefijos del sistema). */
function nameFromFilename(filename: string): string {
  let n = filename.replace(/\.(xlsx|xlsm|xls|csv|md)$/i, "");
  const paren = n.match(/\(([^)]+)\)/);
  if (paren) return paren[1].trim();
  n = n.replace(/^(resumen\s+de\s+)?asignaci[oó]n\s*(acad[eé]mica|inicial|actualizada)?/i, "");
  n = n.replace(/[_-]+/g, " ").trim();
  return n || filename;
}

const stripAccentsLower = (s: string) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Convierte un libro .xlsx (leído con SheetJS) en filas de actividad tipadas. */
function xlsxWorkbookToActRows(wb: any, XLSX: any, fallbackName: string): ActRow[] {
  const out: ActRow[] = [];
  const sheetName: string = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
  if (!rows.length) return out;

  // Nombre y categoría del profesor, si el archivo trae un bloque de encabezado.
  let profesor = "";
  let categoria = "";
  rows.forEach((row) => {
    row.forEach((cell, ci) => {
      const t = stripAccentsLower(cell).trim();
      if ((t === "nombres" || t === "nombre") && !profesor) {
        const v = row[ci + 1];
        if (v) profesor = String(v).trim();
      }
      if (t.startsWith("categoria profesoral") && !categoria) {
        const v = row[ci + 1];
        if (v) categoria = String(v).trim();
      }
    });
  });
  if (!profesor) profesor = fallbackName;
  if (!categoria) categoria = "Sin categoría";

  // Fila de encabezado de la tabla de actividades (Componente + Hrs S1/S2).
  let headerIdx = -1;
  let cCmp = -1;
  let cS1 = -1;
  let cS2 = -1;
  let cAct = -1;
  for (let i = 0; i < rows.length; i++) {
    const norm = rows[i].map((c) => stripAccentsLower(c).replace(/[^a-z0-9]/g, ""));
    const cmp = norm.findIndex((h) => h === "componente");
    const s1 = norm.findIndex((h) => h === "hrss1" || h === "horass1");
    const s2 = norm.findIndex((h) => h === "hrss2" || h === "horass2");
    if (cmp >= 0 && (s1 >= 0 || s2 >= 0)) {
      headerIdx = i;
      cCmp = cmp;
      cS1 = s1;
      cS2 = s2;
      cAct = norm.findIndex(
        (h) => h.startsWith("descripcion") || h === "evidencia" || h === "actividad"
      );
      break;
    }
  }
  if (headerIdx < 0) return out;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const componente = String(row[cCmp] ?? "").trim();
    if (!componente || componente.toLowerCase() === "total") continue;
    const hrsS1 = cS1 >= 0 ? Number(String(row[cS1] ?? "").replace(",", ".")) || 0 : 0;
    const hrsS2 = cS2 >= 0 ? Number(String(row[cS2] ?? "").replace(",", ".")) || 0 : 0;
    const actividad = cAct >= 0 ? String(row[cAct] ?? "").trim() : "";
    if (hrsS1 === 0 && hrsS2 === 0 && !actividad) continue;
    out.push({ profesor, categoria, componente, actividad, hrsS1, hrsS2 });
  }
  return out;
}

/** Quita las etiquetas <br> (usadas como salto de línea dentro de celdas de tabla) para no romper la extracción de números. */
function stripBr(text: string): string {
  return text.replace(/<br\s*\/?>/gi, " ");
}

/** Toma el valor de una fila de tabla markdown "|**Etiqueta**|valor|...": la celda siguiente a la etiqueta. */
function extractTableValue(text: string, labelPattern: string): string | null {
  const re = new RegExp(
    `\\|\\s*\\*{0,2}\\s*${labelPattern}\\s*\\*{0,2}\\s*\\|\\s*([^|\\n]*)\\|`,
    "i"
  );
  const m = text.match(re);
  if (!m) return null;
  const value = m[1].replace(/\*/g, "").trim();
  return value || null;
}

/**
 * Extrae, en orden de aparición, los números asociados a cada palabra "Total"
 * del documento (una por subsección del reporte: 1.1, 1.2, 2.1, 2.2,
 * Servicios, 4.1, 4.2, 5.1, 5.2). Solo toma la racha de dígitos/espacios/
 * "|"/"*" que sigue inmediatamente a "Total", ignorando el resto del
 * documento — así funciona tanto con filas de tabla normales como con
 * párrafos donde varias subsecciones quedaron pegadas por errores de
 * conversión del documento original.
 */
function extractTotalsSequence(text: string): number[][] {
  const totals: number[][] = [];
  const re = /\btotal\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const rest = text.slice(m.index + m[0].length);
    const run = rest.match(/^[\s|*.,0-9-]*/)?.[0] ?? "";
    const nums = (run.match(/-?\d+(?:[.,]\d+)?/g) || []).map((n) => Number(n.replace(",", ".")));
    totals.push(nums);
  }
  return totals;
}

function sumLastTwo(nums: number[]): number {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  return nums[nums.length - 2] + nums[nums.length - 1];
}

/**
 * Parser especializado para el reporte "Asignación académica" exportado por
 * SGI Almera: una tabla de encabezado con NOMBRES/CATEGORÍA PROFESORAL,
 * seguida de secciones con filas "Total" de las que se toman las horas.
 * Se detecta automáticamente por la presencia de una fila "|**NOMBRES**|...".
 */
function parseAsignacionAcademica(rawText: string, fallbackName: string): Profesor | null {
  const text = stripBr(rawText);

  const nombre = extractTableValue(text, "nombres?") ?? fallbackName;
  if (!nombre) return null;

  const categoria = extractTableValue(text, "categor[ií]a\\s+profesoral") ?? "Sin categoría";

  const totals = extractTotalsSequence(text);
  const at = (i: number) => totals[i] ?? [];

  const docenciaHoras = at(0).length ? at(0)[at(0).length - 1] : 0;
  const innovacionHoras = sumLastTwo(at(1));
  const investigacionHoras = sumLastTwo(at(2)) + sumLastTwo(at(3));
  const gestionHoras = sumLastTwo(at(4));
  const sabaticoHoras = sumLastTwo(at(7));
  const licenciaHoras = sumLastTwo(at(8));

  const docenciaTotal = docenciaHoras + innovacionHoras;
  const cargaBase = docenciaTotal + investigacionHoras + gestionHoras;

  let cargaTotal = cargaBase;
  let perfil = classifyPerfil({ docenciaTotal, investigacionHoras, gestionHoras, cargaTotal: cargaBase });
  if (cargaBase === 0 && sabaticoHoras > 0) {
    cargaTotal = sabaticoHoras;
    perfil = "Sabatico";
  } else if (cargaBase === 0 && licenciaHoras > 0) {
    cargaTotal = licenciaHoras;
    perfil = "Licencia";
  }

  return {
    profesor: nombre,
    categoria,
    docenciaHoras,
    innovacionHoras,
    docenciaTotal,
    investigacionHoras,
    gestionHoras,
    cargaTotal,
    perfil,
  };
}

/**
 * Convierte un archivo .md de un solo profesor en un `Profesor`. Si el
 * archivo tiene el formato del reporte "Asignación académica" (SGI Almera),
 * usa ese parser especializado; si no, cae a un formato genérico más simple:
 *  - Front-matter YAML al inicio (--- clave: valor ---)
 *  - Líneas de cuerpo tipo "**Categoria:** Titular", "- Categoria: Titular"
 *    o "Categoria: Titular"
 * El nombre del profesor se toma, en orden, del campo `profesor`/`nombre`,
 * del primer encabezado "# Nombre" del archivo, o del nombre del archivo.
 */
function parseProfesorMarkdown(text: string, fallbackName: string): Profesor | null {
  if (/\|\s*\*{0,2}\s*nombres?\s*\*{0,2}\s*\|/i.test(text) || /asignaci[oó]n\s+acad[eé]mica/i.test(text)) {
    const parsed = parseAsignacionAcademica(text, fallbackName);
    if (parsed) return parsed;
  }
  return parseGenericProfesorMarkdown(text, fallbackName);
}

function parseGenericProfesorMarkdown(text: string, fallbackName: string): Profesor | null {
  const record: Partial<Record<keyof Profesor, string | number>> = {};

  const setField = (rawKey: string, rawValue: string) => {
    const field = HEADER_ALIASES[normalizeHeader(rawKey)];
    if (!field) return;
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    record[field] = NUMERIC_FIELDS.includes(field)
      ? value
        ? Number(value.replace(",", ".")) || 0
        : 0
      : value;
  };

  let body = text;
  const frontMatterMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (frontMatterMatch) {
    body = text.slice(frontMatterMatch[0].length);
    frontMatterMatch[1].split("\n").forEach((line) => {
      const m = line.match(/^\s*([^:]+):\s*(.*)$/);
      if (m) setField(m[1], m[2]);
    });
  }

  body.split("\n").forEach((line) => {
    const m = line.match(/^\s*(?:[-*]\s+)?\*{0,2}([^*:]+?)\*{0,2}\s*:\s*(.+?)\s*$/);
    if (m) setField(m[1], m[2]);
  });

  if (!record.profesor) {
    const titleMatch = body.match(/^#{1,6}\s+(.+)$/m);
    if (titleMatch) record.profesor = titleMatch[1].trim();
  }
  if (!record.profesor && fallbackName) record.profesor = fallbackName;
  if (!record.profesor) return null;

  const docenciaHoras = Number(record.docenciaHoras ?? 0);
  const innovacionHoras = Number(record.innovacionHoras ?? 0);
  const docenciaTotal = Number(record.docenciaTotal ?? docenciaHoras + innovacionHoras);
  const investigacionHoras = Number(record.investigacionHoras ?? 0);
  const gestionHoras = Number(record.gestionHoras ?? 0);
  const cargaTotal = Number(
    record.cargaTotal ?? docenciaTotal + investigacionHoras + gestionHoras
  );

  return {
    profesor: String(record.profesor),
    categoria: record.categoria ? String(record.categoria) : "Sin categoría",
    docenciaHoras,
    innovacionHoras,
    docenciaTotal,
    investigacionHoras,
    gestionHoras,
    cargaTotal,
    perfil: record.perfil
      ? String(record.perfil)
      : classifyPerfil({ docenciaTotal, investigacionHoras, gestionHoras, cargaTotal }),
  };
}

/** Une los profesores de varios .csv/.md de la carpeta; si un nombre se repite, gana la última fila leída. */
function dedupeByProfesor(list: Profesor[]): Profesor[] {
  const map = new Map<string, Profesor>();
  list.forEach((p) => map.set(p.profesor, p));
  return [...map.values()];
}

/**
 * `webkitdirectory` no está tipado en React; este objeto se castea una sola
 * vez para poder pedirle al input que abra el selector de carpetas del SO
 * en lugar del selector de archivos individuales.
 */
const DIRECTORY_INPUT_PROPS = {
  webkitdirectory: "",
  directory: "",
} as unknown as InputHTMLAttributes<HTMLInputElement>;

/* ============================================================================
 * 2. MOTOR ESTADÍSTICO
 * ========================================================================== */

export interface Stats {
  n: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  p33: number;
  p66: number;
  skewness: number;
  cv: number; // coeficiente de variación %
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function computeStats(values: number[]): Stats {
  const n = values.length;
  if (n === 0) {
    return { n: 0, mean: 0, median: 0, min: 0, max: 0, std: 0, p33: 0, p66: 0, skewness: 0, cv: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(n - 1, 1);
  const std = Math.sqrt(variance);
  const median = percentile(sorted, 0.5);
  const skewness =
    std > 0
      ? (n / Math.max((n - 1) * (n - 2), 1)) *
        values.reduce((s, v) => s + ((v - mean) / std) ** 3, 0)
      : 0;
  return {
    n,
    mean: round1(mean),
    median: round1(median),
    min: sorted[0],
    max: sorted[n - 1],
    std: round1(std),
    p33: round1(percentile(sorted, 0.33)),
    p66: round1(percentile(sorted, 0.66)),
    skewness: round1(skewness),
    cv: mean !== 0 ? round1((std / mean) * 100) : 0,
  };
}

/**
 * Clasificación semafórica adaptativa.
 * - Distribución aprox. simétrica (|asimetría| <= 1): media ± 0.5·σ
 * - Distribución sesgada (|asimetría| > 1): percentiles P33 / P66
 * Con n pequeño y variables muy sesgadas (p. ej. Innovación, CV ≈ 180%),
 * los percentiles son más robustos que la desviación estándar.
 */
export function classify(value: number, stats: Stats): Semaforo {
  if (stats.n < 3 || stats.std === 0) return "AMARILLO";
  const usePercentiles = Math.abs(stats.skewness) > 1;
  const upper = usePercentiles ? stats.p66 : stats.mean + 0.5 * stats.std;
  const lower = usePercentiles ? stats.p33 : stats.mean - 0.5 * stats.std;
  if (value >= upper) return "VERDE";
  if (value < lower) return "ROJO";
  return "AMARILLO";
}

export const methodologyLabel = (stats: Stats): string =>
  Math.abs(stats.skewness) > 1
    ? `Percentiles P33 (${stats.p33} h) / P66 (${stats.p66} h) — distribución sesgada (asimetría ${stats.skewness})`
    : `Media ± 0.5·σ → umbrales ${round1(stats.mean - 0.5 * stats.std)} h / ${round1(
        stats.mean + 0.5 * stats.std
      )} h — distribución aprox. simétrica`;

/** z-score de un valor frente a las estadísticas del grupo */
export const zScore = (value: number, stats: Stats): number =>
  stats.std > 0 ? round1((value - stats.mean) / stats.std) : 0;

/** Puntaje global: promedio de z-scores en docencia, investigación y gestión */
export function globalScore(p: Profesor, statsByMetric: Record<MetricKey, Stats>): number {
  const keys: MetricKey[] = ["docenciaTotal", "investigacionHoras", "gestionHoras"];
  const zs = keys.map((k) => zScore(p[k], statsByMetric[k]));
  return round1(zs.reduce((s, z) => s + z, 0) / keys.length);
}

/* ============================================================================
 * 3. INSIGHTS AUTOMÁTICOS
 * ========================================================================== */

export interface Insight {
  type: "atipico" | "concentracion" | "brecha" | "riesgo" | "mejora";
  text: string;
}

export function buildInsights(
  rows: { name: string; value: number; z: number; semaforo: Semaforo }[],
  stats: Stats,
  metric: MetricDef
): Insight[] {
  const insights: Insight[] = [];
  if (rows.length < 3) return insights;

  const outliers = rows.filter((r) => Math.abs(r.z) >= 2);
  outliers.forEach((o) =>
    insights.push({
      type: "atipico",
      text: `${o.name} presenta un comportamiento atípico en ${metric.shortLabel.toLowerCase()} (${o.value} h, z = ${o.z}).`,
    })
  );

  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total > 0) {
    const top3 = [...rows].sort((a, b) => b.value - a.value).slice(0, 3);
    const share = Math.round((top3.reduce((s, r) => s + r.value, 0) / total) * 100);
    if (share >= 45) {
      insights.push({
        type: "concentracion",
        text: `El top 3 concentra el ${share}% de las horas de ${metric.shortLabel.toLowerCase()} del grupo filtrado.`,
      });
    }
  }

  if (stats.min >= 0 && stats.max > 0) {
    const gap = stats.max - stats.min;
    if (gap > stats.mean) {
      insights.push({
        type: "brecha",
        text: `Brecha significativa: ${gap} h entre el máximo (${stats.max} h) y el mínimo (${stats.min} h), superior al promedio del grupo (${stats.mean} h).`,
      });
    }
  }

  const rojos = rows.filter((r) => r.semaforo === "ROJO");
  if (rojos.length > 0) {
    insights.push({
      type: "riesgo",
      text: `${rojos.length} profesor(es) por debajo del umbral inferior en ${metric.shortLabel.toLowerCase()}: ${rojos
        .map((r) => r.name.split(" ").slice(0, 2).join(" "))
        .join(", ")}.`,
    });
  }

  if (metric.highIsRisk) {
    const sobrecarga = rows.filter((r) => r.value > stats.mean + stats.std);
    if (sobrecarga.length > 0) {
      insights.push({
        type: "riesgo",
        text: `Posible sobrecarga (> μ + 1σ = ${round1(stats.mean + stats.std)} h): ${sobrecarga
          .map((r) => r.name.split(" ").slice(0, 2).join(" "))
          .join(", ")}.`,
      });
    }
  } else if (stats.cv > 80) {
    insights.push({
      type: "mejora",
      text: `Alta dispersión (CV ${stats.cv}%): conviene revisar criterios de asignación de ${metric.shortLabel.toLowerCase()} para equilibrar cargas.`,
    });
  }

  return insights.slice(0, 5);
}

/* ============================================================================
 * 4. TOKENS DE DISEÑO Y COMPONENTES BASE
 * ========================================================================== */

const SEMAFORO_STYLE: Record<Semaforo, { bg: string; text: string; dot: string; label: string }> = {
  VERDE: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500", label: "Verde" },
  AMARILLO: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", label: "Amarillo" },
  ROJO: { bg: "bg-rose-50", text: "text-rose-800", dot: "bg-rose-500", label: "Rojo" },
  NA: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400", label: "N/A" },
};

const BAR_COLOR: Record<Semaforo, string> = {
  VERDE: "#10b981",
  AMARILLO: "#f59e0b",
  ROJO: "#f43f5e",
  NA: "#94a3b8",
};

const shortName = (full: string) => {
  const parts = full.split(" ");
  return parts.length <= 2 ? full : `${parts[0]} ${parts[parts.length - 2]}`;
};

function SemaforoBadge({ value }: { value: Semaforo }) {
  const s = SEMAFORO_STYLE[value];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

interface KpiCardProps {
  eyebrow: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "warn" | "bad";
}

function KpiCard({ eyebrow, value, detail, tone = "default" }: KpiCardProps) {
  const toneClass =
    tone === "good"
      ? "border-l-emerald-500"
      : tone === "warn"
      ? "border-l-amber-500"
      : tone === "bad"
      ? "border-l-rose-500"
      : "border-l-slate-300";
  return (
    <div
      className={`rounded-lg border border-slate-200 border-l-4 ${toneClass} bg-white px-4 py-3 shadow-sm`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{eyebrow}</p>
      <p className="mt-1 truncate text-xl font-bold text-slate-900" title={value}>
        {value}
      </p>
      {detail && <p className="mt-0.5 truncate text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ============================================================================
 * 5. GRÁFICO DE RANKING (barras horizontales)
 * ========================================================================== */

interface RankRow {
  name: string;
  fullName: string;
  value: number;
  diff: number; // diferencia vs promedio
  pct: number; // % variación vs promedio
  z: number;
  semaforo: Semaforo;
  rank: number;
}

function RankTooltip({ active, payload }: { active?: boolean; payload?: { payload: RankRow }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{d.fullName}</p>
      <p className="mt-1 text-slate-600">
        Valor: <span className="font-semibold text-slate-900">{d.value} h</span> · Ranking #{d.rank}
      </p>
      <p className="text-slate-600">
        Vs. promedio:{" "}
        <span className={d.diff >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
          {d.diff >= 0 ? "+" : ""}
          {d.diff} h ({d.pct >= 0 ? "+" : ""}
          {d.pct}%)
        </span>
      </p>
      <p className="text-slate-600">
        z-score: {d.z} · <SemaforoBadge value={d.semaforo} />
      </p>
    </div>
  );
}

function RankChart({ rows, mean }: { rows: RankRow[]; mean: number }) {
  const height = Math.max(220, rows.length * 34);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fontSize: 11, fill: "#334155" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<RankTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <ReferenceLine
          x={mean}
          stroke="#6366f1"
          strokeDasharray="4 4"
          label={{ value: `μ ${mean}`, position: "top", fontSize: 10, fill: "#6366f1" }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.fullName} fill={BAR_COLOR[r.semaforo]} />
          ))}
          <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ============================================================================
 * 6. SECCIÓN POR MÉTRICA: gráfico + semáforo + top/bottom + stats + insights
 * ========================================================================== */

const INSIGHT_ICON: Record<Insight["type"], string> = {
  atipico: "◆",
  concentracion: "▲",
  brecha: "↔",
  riesgo: "⚠",
  mejora: "→",
};

function TopBottomTable({ title, rows, tone }: { title: string; rows: RankRow[]; tone: "top" | "bottom" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <p
        className={`border-b border-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wider ${
          tone === "top" ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {title}
      </p>
      <ul className="divide-y divide-slate-100 text-sm">
        {rows.map((r) => (
          <li key={r.fullName} className="flex items-center justify-between gap-2 px-3 py-1.5">
            <span className="truncate text-slate-700" title={r.fullName}>
              {r.name}
            </span>
            <span className="shrink-0 tabular-nums text-slate-900 font-semibold">{r.value} h</span>
            <span
              className={`shrink-0 tabular-nums text-xs font-medium ${
                r.diff >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {r.diff >= 0 ? "+" : ""}
              {r.diff}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-50 px-2.5 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function MetricSection({ metric, profesores }: { metric: MetricDef; profesores: Profesor[] }) {
  const { rows, stats } = useMemo(() => {
    const scoped = profesores.filter((p) => !(p.perfil === "Sabatico" && metric.key !== "cargaTotal"));
    const values = scoped.map((p) => p[metric.key]);
    const stats = computeStats(values);
    const rows: RankRow[] = scoped
      .map((p) => {
        const value = p[metric.key];
        const diff = round1(value - stats.mean);
        return {
          name: shortName(p.profesor),
          fullName: p.profesor,
          value,
          diff,
          pct: stats.mean !== 0 ? round1((diff / stats.mean) * 100) : 0,
          z: zScore(value, stats),
          semaforo: classify(value, stats),
          rank: 0,
        };
      })
      .sort((a, b) => b.value - a.value)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return { rows, stats };
  }, [metric, profesores]);

  const insights = useMemo(() => buildInsights(rows, stats, metric), [rows, stats, metric]);

  if (rows.length === 0) return null;

  const verdes = rows.filter((r) => r.semaforo === "VERDE");
  const amarillos = rows.filter((r) => r.semaforo === "AMARILLO");
  const rojos = rows.filter((r) => r.semaforo === "ROJO");

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Encabezado */}
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">{metric.label}</h2>
        <p className="text-xs text-slate-500">{metric.description}</p>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-3">
        {/* Ranking */}
        <div className="lg:col-span-2">
          <RankChart rows={rows} mean={stats.mean} />
          <p className="mt-2 text-[11px] text-slate-400">
            Umbrales automáticos · {methodologyLabel(stats)}
          </p>
        </div>

        {/* Estadísticas */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Promedio" value={stats.mean} />
            <StatChip label="Mediana" value={stats.median} />
            <StatChip label="Desv. est." value={stats.std} />
            <StatChip label="Máximo" value={stats.max} />
            <StatChip label="Mínimo" value={stats.min} />
            <StatChip label="CV %" value={stats.cv} />
          </div>
          <TopBottomTable title="Top 5 profesores" rows={rows.slice(0, 5)} tone="top" />
          <TopBottomTable title="Bottom 5 profesores" rows={rows.slice(-5).reverse()} tone="bottom" />
        </div>
      </div>

      {/* Semáforo ejecutivo */}
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Semáforo ejecutivo
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { list: verdes, sem: "VERDE" as Semaforo, desc: "Por encima del umbral superior" },
            { list: amarillos, sem: "AMARILLO" as Semaforo, desc: "Cercano al promedio — seguimiento" },
            { list: rojos, sem: "ROJO" as Semaforo, desc: "Bajo el umbral inferior — intervención" },
          ].map(({ list, sem, desc }) => (
            <div key={sem} className={`rounded-lg p-3 ${SEMAFORO_STYLE[sem].bg}`}>
              <div className="flex items-center justify-between">
                <SemaforoBadge value={sem} />
                <span className={`text-sm font-bold ${SEMAFORO_STYLE[sem].text}`}>{list.length}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{desc}</p>
              <p className={`mt-1.5 text-xs leading-relaxed ${SEMAFORO_STYLE[sem].text}`}>
                {list.length > 0 ? list.map((r) => r.name).join(" · ") : "Sin profesores en esta franja"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Insights automáticos
          </p>
          <ul className="space-y-1.5">
            {insights.map((ins, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-slate-400" aria-hidden>
                  {INSIGHT_ICON[ins.type]}
                </span>
                {ins.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ============================================================================
 * 7. MOTOR DE REGLAS — LINEAMIENTOS INSTITUCIONALES
 * Las alertas se basan en el cumplimiento de los lineamientos de asignación
 * docente 2025-2 (comunicado de la dirección de Escuela + Decálogo del decano),
 * no en umbrales puramente estadísticos.
 * ========================================================================== */

/**
 * Parámetros derivados del documento de lineamientos. Todos son configurables:
 * - capacidadTC: 1 tiempo completo semestral = 880 h (el documento define
 *   jefatura de pregrado = 220 h = 1/4 TC).
 * - periodos: 1 si el archivo refleja un semestre; 2 si consolida el año.
 *   El archivo "2026 Unificado" se asume SEMESTRAL (ajustar si es anual).
 * - minHorasDimension: unidad mínima institucional reconocible en el documento
 *   (coordinación de línea / jefatura de posgrado = 64 h). Se usa como proxy
 *   verificable de la "dedicación mínima en cada dimensión".
 * - horasCursoDD: curso típico ≈ 48 h de docencia directa (3 créditos × 16 sem).
 * - cursosMinimosPromedio: Decálogo #6 — promedio superior a 2 cursos/semestre.
 */
export const LINEAMIENTOS_CONFIG = {
  capacidadTC: 880,
  periodos: 1,
  minHorasDimension: 64,
  horasCursoDD: 48,
  cursosMinimosPromedio: 2,
  umbralSobrecargaCritica: 1.25, // > 125% de la capacidad
  umbralSubcarga: 0.9, // < 90% de la capacidad
  toleranciaConsistencia: 5, // h de diferencia admisible en las sumas
};

export type SeveridadAlerta = "CRITICA" | "MODERADA" | "INFO";

export interface Incumplimiento {
  reglaId: string; // referencia corta al lineamiento
  regla: string; // texto del lineamiento
  detalle: string; // qué se observó en los datos
  severidad: SeveridadAlerta;
}

/** Evalúa a un profesor contra los lineamientos verificables con los datos disponibles */
export function evaluarLineamientos(p: Profesor): Incumplimiento[] {
  const cfg = LINEAMIENTOS_CONFIG;
  const out: Incumplimiento[] = [];

  if (p.perfil === "Sabatico") {
    return [
      {
        reglaId: "SAB",
        regla: "Situación especial",
        detalle: "Profesor en año sabático: exento de la evaluación de lineamientos en este periodo.",
        severidad: "INFO",
      },
    ];
  }

  /* Decálogo #1 — actividades en las tres dimensiones, con dedicación mínima */
  const dims: { key: MetricKey; nombre: string }[] = [
    { key: "docenciaTotal", nombre: "Docencia e innovación educativa" },
    { key: "investigacionHoras", nombre: "Investigación" },
    { key: "gestionHoras", nombre: "Administración académica y proyección social" },
  ];
  dims.forEach((d) => {
    const horas = p[d.key];
    if (horas === 0) {
      out.push({
        reglaId: "D1",
        regla: "Decálogo #1: el plan debe incluir actividades en las tres dimensiones",
        detalle: `Sin horas asignadas en ${d.nombre}.`,
        severidad: "CRITICA",
      });
    } else if (horas < cfg.minHorasDimension * cfg.periodos) {
      out.push({
        reglaId: "MIN",
        regla: "Dedicación mínima en cada dimensión (pilar del plan por objetivos)",
        detalle: `${d.nombre}: ${horas} h, por debajo del mínimo de referencia (${
          cfg.minHorasDimension * cfg.periodos
        } h, equivalente a una coordinación de línea).`,
        severidad: "MODERADA",
      });
    }
  });

  /* Decálogo #6 — actividad docente ideal: promedio superior a 2 cursos/semestre */
  const horasDocenteMinimas = cfg.horasCursoDD * cfg.cursosMinimosPromedio * cfg.periodos;
  if (p.docenciaHoras < horasDocenteMinimas) {
    const cursosEquiv = round1(p.docenciaHoras / (cfg.horasCursoDD * cfg.periodos));
    out.push({
      reglaId: "D6",
      regla: "Decálogo #6: la actividad docente ideal supera un promedio de 2 cursos por semestre",
      detalle: `Docencia directa de ${p.docenciaHoras} h ≈ ${cursosEquiv} curso(s) equivalente(s); la referencia es ${horasDocenteMinimas} h (${cfg.cursosMinimosPromedio} cursos de ${cfg.horasCursoDD} h).`,
      severidad: p.docenciaHoras < horasDocenteMinimas / 2 ? "CRITICA" : "MODERADA",
    });
  }

  /* Decálogo #8 y #9 — realismo de las horas y carga extra vs. disponibilidad */
  const capacidad = cfg.capacidadTC * cfg.periodos;
  const ratio = p.cargaTotal / capacidad;
  if (ratio > cfg.umbralSobrecargaCritica) {
    out.push({
      reglaId: "D9",
      regla: "Decálogo #8/#9: las horas deben ser realistas y la carga extra no puede contradecir la disponibilidad",
      detalle: `Carga total de ${p.cargaTotal} h = ${Math.round(ratio * 100)}% de la capacidad de un TC (${capacidad} h). Sobrecarga que requiere aprobación de dirección de área y decanatura (Decálogo #10).`,
      severidad: "CRITICA",
    });
  } else if (ratio > 1) {
    out.push({
      reglaId: "D9",
      regla: "Decálogo #9: la carga extra no puede contradecir la disponibilidad normal",
      detalle: `Carga total de ${p.cargaTotal} h = ${Math.round(ratio * 100)}% de la capacidad TC (${capacidad} h). Verificar que la carga extra esté aprobada.`,
      severidad: "MODERADA",
    });
  } else if (ratio < cfg.umbralSubcarga) {
    out.push({
      reglaId: "D8",
      regla: "Decálogo #8: las horas deben guardar proporcionalidad y realismo con la dedicación",
      detalle: `Carga total de ${p.cargaTotal} h = ${Math.round(ratio * 100)}% de la capacidad TC (${capacidad} h). Dedicación por debajo del 90%: revisar completitud del plan.`,
      severidad: "MODERADA",
    });
  }

  /* Decálogo #7 — resultados verificables: consistencia aritmética del registro */
  const suma = p.docenciaTotal + p.investigacionHoras + p.gestionHoras;
  if (Math.abs(suma - p.cargaTotal) > cfg.toleranciaConsistencia) {
    out.push({
      reglaId: "D7",
      regla: "Decálogo #7: actividades, productos y resultados verificables",
      detalle: `La suma de dimensiones (${suma} h) no coincide con la carga total registrada (${p.cargaTotal} h). Diferencia de ${p.cargaTotal - suma} h sin actividades identificables.`,
      severidad: "INFO",
    });
  }

  return out;
}

export interface CumplimientoRow {
  profesor: Profesor;
  incumplimientos: Incumplimiento[];
  criticas: number;
  moderadas: number;
  /** % de reglas verificables cumplidas (D1×3, MIN, D6, D8/D9, D7) */
  cumplimiento: number;
}

const REGLAS_VERIFICABLES = 6; // 3 dimensiones (D1/MIN) + D6 + D8/D9 + D7

export function buildCumplimiento(profesores: Profesor[]): CumplimientoRow[] {
  return profesores
    .map((p) => {
      const incumplimientos = evaluarLineamientos(p);
      const criticas = incumplimientos.filter((i) => i.severidad === "CRITICA").length;
      const moderadas = incumplimientos.filter((i) => i.severidad === "MODERADA").length;
      const fallas = incumplimientos.filter((i) => i.severidad !== "INFO").length;
      return {
        profesor: p,
        incumplimientos,
        criticas,
        moderadas,
        cumplimiento:
          p.perfil === "Sabatico"
            ? 100
            : Math.round(Math.max(0, (REGLAS_VERIFICABLES - fallas) / REGLAS_VERIFICABLES) * 100),
      };
    })
    .sort((a, b) => b.criticas - a.criticas || b.moderadas - a.moderadas || a.cumplimiento - b.cumplimiento);
}

const SEVERIDAD_STYLE: Record<SeveridadAlerta, { chip: string; label: string }> = {
  CRITICA: { chip: "bg-rose-50 text-rose-700", label: "Crítica" },
  MODERADA: { chip: "bg-amber-50 text-amber-700", label: "Moderada" },
  INFO: { chip: "bg-slate-100 text-slate-600", label: "Informativa" },
};

function AlertsPanel({ rows }: { rows: CumplimientoRow[] }) {
  const cfg = LINEAMIENTOS_CONFIG;
  const conAlertas = rows.filter((r) => r.incumplimientos.length > 0);
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Panel ejecutivo de alertas — Cumplimiento de lineamientos
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Cada alerta referencia el lineamiento institucional incumplido (comunicado de asignación
          docente y Decálogo de la decanatura). Parámetros: TC = {cfg.capacidadTC * cfg.periodos} h,
          mínimo por dimensión = {cfg.minHorasDimension * cfg.periodos} h, referencia docente ={" "}
          {cfg.horasCursoDD * cfg.cursosMinimosPromedio * cfg.periodos} h ({cfg.cursosMinimosPromedio}{" "}
          cursos/semestre). Lineamientos no verificables con estos datos (relación DD:DI 1:1.5–1:3,
          jefaturas y coordinaciones, participación en iniciativas de Escuela, impacto en 2+
          programas, generación de ingresos) requieren el detalle de actividades del pre-ZEUS.
        </p>
      </header>
      {conAlertas.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">
          Todos los profesores del grupo filtrado cumplen los lineamientos verificables.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {conAlertas.map((r) => (
            <li key={r.profesor.profesor} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{r.profesor.profesor}</p>
                <span className="text-xs text-slate-500">{r.profesor.perfil}</span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                    r.cumplimiento >= 80
                      ? "bg-emerald-50 text-emerald-700"
                      : r.cumplimiento >= 50
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                  title="Porcentaje de lineamientos verificables cumplidos"
                >
                  {r.cumplimiento}% cumplimiento
                </span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {r.incumplimientos.map((inc, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERIDAD_STYLE[inc.severidad].chip}`}
                    >
                      {SEVERIDAD_STYLE[inc.severidad].label} · {inc.reglaId}
                    </span>
                    <span className="text-slate-700">{inc.detalle}</span>
                    <span className="basis-full text-[11px] text-slate-400">{inc.regla}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================================================================
 * 8. COMPARATIVO GLOBAL — GRÁFICAS DE ESTRELLA (RADAR)
 * Perfil integral del quehacer profesoral en tres dimensiones:
 * Docencia, Investigación y Gestión / proyección social.
 * ========================================================================== */

/** Paleta de colores distinguibles, uno por profesor (se asigna por índice) */
const PROF_PALETTE = [
  "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
  "#0d9488", "#b91c1c", "#9333ea", "#ca8a04", "#1d4ed8",
  "#be185d",
];

export const DIMENSIONS: { key: MetricKey; label: string }[] = [
  { key: "docenciaTotal", label: "Docencia" },
  { key: "investigacionHoras", label: "Investigación" },
  { key: "gestionHoras", label: "Gestión / Proyección" },
];

export interface IntegralRow {
  profesor: Profesor;
  color: string;
  /** valores normalizados 0–100 por dimensión (relativo al máximo del grupo) */
  norm: Record<MetricKey, number>;
  cobertura: number; // promedio de las 3 dimensiones normalizadas
  equilibrio: number; // 100 · (1 − CV entre dimensiones), acotado a [0, 100]
  integralidad: number; // media geométrica de cobertura y equilibrio
}

/**
 * Normaliza cada dimensión al máximo del grupo (0–100) para que las tres
 * escalas sean comparables en el radar, y calcula el índice de integralidad:
 *   cobertura   = qué tanto abarca el profesor las tres dimensiones
 *   equilibrio  = qué tan pareja es su dedicación entre dimensiones
 *   integralidad = √(cobertura · equilibrio)
 */
export function buildIntegralRows(profesores: Profesor[]): IntegralRow[] {
  const activos = profesores.filter((p) => p.perfil !== "Sabatico");
  const maxByDim = {} as Record<MetricKey, number>;
  DIMENSIONS.forEach((d) => {
    maxByDim[d.key] = Math.max(...activos.map((p) => p[d.key]), 1);
  });
  return activos.map((p, i) => {
    const norm = {} as Record<MetricKey, number>;
    DIMENSIONS.forEach((d) => {
      norm[d.key] = round1((p[d.key] / maxByDim[d.key]) * 100);
    });
    const vals = DIMENSIONS.map((d) => norm[d.key]);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    const cobertura = round1(mean);
    const equilibrio = mean > 0 ? round1(Math.max(0, 1 - std / mean) * 100) : 0;
    const integralidad = round1(Math.sqrt(cobertura * equilibrio));
    return { profesor: p, color: PROF_PALETTE[i % PROF_PALETTE.length], norm, cobertura, equilibrio, integralidad };
  });
}

function RadarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((e) => (
          <li key={e.name} className="flex items-center gap-1.5 text-slate-700">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} aria-hidden />
            {e.name}: <span className="font-semibold tabular-nums">{e.value}</span> / 100
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Radar comparativo con selección de profesores (colores por profesor) */
function ComparativeRadar({ rows, selected }: { rows: IntegralRow[]; selected: string[] }) {
  const active = rows.filter((r) => selected.includes(r.profesor.profesor));
  const data = DIMENSIONS.map((d) => {
    const point: Record<string, string | number> = { dimension: d.label };
    active.forEach((r) => {
      point[shortName(r.profesor.profesor)] = r.norm[d.key];
    });
    return point;
  });
  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickCount={5} />
        <Tooltip content={<RadarTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {active.map((r) => (
          <Radar
            key={r.profesor.profesor}
            name={shortName(r.profesor.profesor)}
            dataKey={shortName(r.profesor.profesor)}
            stroke={r.color}
            fill={r.color}
            fillOpacity={0.12}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** Mini-radar individual para la vista de comparación en cuadrícula */
function MiniRadar({ row }: { row: IntegralRow }) {
  const data = DIMENSIONS.map((d) => ({ dimension: d.label.split(" ")[0], value: row.norm[d.key] }));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-slate-800" title={row.profesor.profesor}>
          {shortName(row.profesor.profesor)}
        </p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white tabular-nums"
          style={{ backgroundColor: row.color }}
          title="Índice de integralidad (0–100)"
        >
          {row.integralidad}
        </span>
      </div>
      <p className="text-[10px] text-slate-400">{row.profesor.perfil}</p>
      <ResponsiveContainer width="100%" height={150}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#eef2f7" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: "#64748b" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke={row.color}
            fill={row.color}
            fillOpacity={0.25}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Sección completa: radar comparativo + cuadrícula + ranking de integralidad */
function IntegralSection({ profesores }: { profesores: Profesor[] }) {
  const rows = useMemo(() => buildIntegralRows(profesores), [profesores]);
  const ranked = useMemo(() => [...rows].sort((a, b) => b.integralidad - a.integralidad), [rows]);

  /* Selección por defecto: los 5 profesores más integrales del grupo filtrado */
  const [selected, setSelected] = useState<string[] | null>(null);
  const effectiveSelected = useMemo(() => {
    const names = rows.map((r) => r.profesor.profesor);
    const base = selected?.filter((n) => names.includes(n)) ?? [];
    if (base.length > 0) return base;
    return ranked.slice(0, 5).map((r) => r.profesor.profesor);
  }, [selected, rows, ranked]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const cur = prev ?? effectiveSelected;
      return cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name];
    });
  };

  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Comparativo global — Perfil integral del quehacer profesoral
        </h2>
        <p className="text-xs text-slate-500">
          Radar de las tres dimensiones (Docencia, Investigación, Gestión / proyección social),
          normalizadas 0–100 frente al máximo del grupo filtrado. Un polígono amplio y regular
          indica un perfil integral; un polígono puntiagudo indica especialización.
        </p>
      </header>

      {/* Selector de profesores */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
        {rows.map((r) => {
          const isOn = effectiveSelected.includes(r.profesor.profesor);
          return (
            <button
              key={r.profesor.profesor}
              onClick={() => toggle(r.profesor.profesor)}
              aria-pressed={isOn}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isOn
                  ? "border-transparent text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              style={isOn ? { backgroundColor: r.color } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isOn ? "rgba(255,255,255,0.9)" : r.color }}
                aria-hidden
              />
              {shortName(r.profesor.profesor)}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        {/* Radar superpuesto */}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            Comparación superpuesta ({effectiveSelected.length} seleccionados)
          </p>
          <ComparativeRadar rows={rows} selected={effectiveSelected} />
          <p className="text-[11px] text-slate-400">
            Toca los nombres para agregar o quitar profesores del radar. Escala común 0–100 por dimensión.
          </p>
        </div>

        {/* Ranking de integralidad */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Ranking de integralidad
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Profesor</th>
                  <th className="px-3 py-2 text-right">Cobertura</th>
                  <th className="px-3 py-2 text-right">Equilibrio</th>
                  <th className="px-3 py-2 text-right">Integralidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranked.map((r, i) => (
                  <tr key={r.profesor.profesor} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 tabular-nums text-slate-500">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1.5 font-medium text-slate-800">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
                        {shortName(r.profesor.profesor)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">{r.cobertura}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">{r.equilibrio}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-bold text-slate-900">{r.integralidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Cobertura: promedio de las 3 dimensiones normalizadas. Equilibrio: 100 · (1 − CV entre
            dimensiones). Integralidad: √(cobertura · equilibrio). Sabáticos excluidos.
          </p>
        </div>
      </div>

      {/* Cuadrícula de mini-radares */}
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Perfil individual de cada profesor
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {ranked.map((r) => (
            <MiniRadar key={r.profesor.profesor} row={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * 8a. PÁGINA DE ANÁLISIS INDIVIDUAL POR PROFESOR
 * ========================================================================== */

const DIM_ORDER: Dimension[] = ["docencia", "innovacion", "investigacion", "gestion", "otros"];

/** Tarjeta compacta de total (horas) para la cabecera de la página individual. */
function TotalCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

/**
 * Página de análisis de un solo profesor: tabla de horas por ítem y por
 * semestre (S1/S2), con sumatoria por semestre y el % de tiempo que representa
 * cada actividad; y, en la parte inferior, los mismos datos de forma gráfica
 * (torta por dimensión + barras S1/S2). Si los datos cargados no traen detalle
 * por actividad, cae a un resumen por las 4 dimensiones agregadas.
 */
function ProfesorDetailPage({ profesor, onBack }: { profesor: Profesor; onBack: () => void }) {
  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
  const r1 = (v: number) => Math.round(v * 10) / 10;

  const hasSemestral = !!(profesor.actividades && profesor.actividades.length);

  const actividades: Actividad[] = hasSemestral
    ? profesor.actividades!
    : (
        [
          { componente: "Docencia", actividad: "Docencia directa", hrsS1: profesor.docenciaHoras, hrsS2: 0 },
          { componente: "Innovación", actividad: "Innovación docente", hrsS1: profesor.innovacionHoras, hrsS2: 0 },
          { componente: "Investigación", actividad: "Investigación", hrsS1: profesor.investigacionHoras, hrsS2: 0 },
          { componente: "Gestión", actividad: "Gestión y proyección", hrsS1: profesor.gestionHoras, hrsS2: 0 },
        ] as Actividad[]
      ).filter((a) => a.hrsS1 > 0);

  const totalS1 = r1(sum(actividades.map((a) => a.hrsS1)));
  const totalS2 = r1(sum(actividades.map((a) => a.hrsS2)));
  const grand = r1(totalS1 + totalS2);
  const pct = (h: number) => (grand ? r1((h / grand) * 100) : 0);

  const groups = DIM_ORDER.map((dim) => ({
    dim,
    meta: DIMENSION_META[dim],
    items: actividades.filter((a) => componenteToDimension(a.componente) === dim),
  })).filter((g) => g.items.length);

  const byDim = groups.map((g) => {
    const s1 = r1(sum(g.items.map((i) => i.hrsS1)));
    const s2 = r1(sum(g.items.map((i) => i.hrsS2)));
    return { label: g.meta.label, color: g.meta.color, s1, s2, total: r1(s1 + s2) };
  });

  const pieData = byDim.map((d) => ({ name: d.label, value: d.total, color: d.color }));
  const barData = byDim.map((d) => ({ name: d.label, S1: d.s1, S2: d.s2, color: d.color }));

  const backButton = (
    <button
      onClick={onBack}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      ← Volver al resumen
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
          {profesor.categoria} · Perfil {profesor.perfil}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900">{profesor.profesor}</h2>
        <p className="text-sm text-slate-500">
          Horas por actividad y semestre · {actividades.length} actividades reportadas
        </p>
      </div>

      {/* Totales por semestre */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TotalCard label="Horas semestre 1" value={`${totalS1} h`} sub={grand ? `${pct(totalS1)}% del total` : undefined} />
        <TotalCard label="Horas semestre 2" value={`${totalS2} h`} sub={grand ? `${pct(totalS2)}% del total` : undefined} />
        <TotalCard label="Carga total anual" value={`${grand} h`} sub="S1 + S2" color="#0f172a" />
      </div>

      {grand === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
          No hay horas por actividad para este profesor
          {profesor.cargaTotal > 0 && (
            <> (carga registrada: {profesor.cargaTotal} h, posiblemente en sabático o licencia).</>
          )}
        </div>
      ) : (
        <>
          {/* Tabla de actividades */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">Detalle por actividad</h3>
              <p className="text-xs text-slate-500">
                {hasSemestral
                  ? "Horas dedicadas a cada actividad en cada semestre y su participación en la carga total."
                  : "Los datos cargados no incluyen desglose por semestre ni por ítem; se muestra el resumen por dimensión. Carga un CSV consolidado a nivel de actividad para ver el detalle S1/S2."}
              </p>
            </header>
            <div className="overflow-x-auto">
              {hasSemestral ? (
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2">Actividad</th>
                      <th className="px-4 py-2 text-right">Hrs S1</th>
                      <th className="px-4 py-2 text-right">Hrs S2</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.flatMap((g) => {
                      const gs1 = r1(sum(g.items.map((i) => i.hrsS1)));
                      const gs2 = r1(sum(g.items.map((i) => i.hrsS2)));
                      const gt = r1(gs1 + gs2);
                      const rows = [
                        <tr key={`h-${g.dim}`} className="bg-slate-50">
                          <td className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider" colSpan={5}>
                            <span className="inline-flex items-center gap-1.5" style={{ color: g.meta.color }}>
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.meta.color }} aria-hidden />
                              {g.meta.label}
                            </span>
                          </td>
                        </tr>,
                      ];
                      g.items.forEach((item, idx) => {
                        const t = r1(item.hrsS1 + item.hrsS2);
                        rows.push(
                          <tr key={`${g.dim}-${idx}`} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-1.5 text-slate-700">{item.actividad || "—"}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-slate-600">{r1(item.hrsS1)}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-slate-600">{r1(item.hrsS2)}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums font-medium text-slate-800">{t}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-slate-500">{pct(t)}%</td>
                          </tr>
                        );
                      });
                      rows.push(
                        <tr key={`s-${g.dim}`} className="border-b border-slate-100 font-semibold text-slate-700">
                          <td className="px-4 py-1.5 text-right text-xs uppercase tracking-wider text-slate-400">Subtotal {g.meta.label}</td>
                          <td className="px-4 py-1.5 text-right tabular-nums">{gs1}</td>
                          <td className="px-4 py-1.5 text-right tabular-nums">{gs2}</td>
                          <td className="px-4 py-1.5 text-right tabular-nums">{gt}</td>
                          <td className="px-4 py-1.5 text-right tabular-nums">{pct(gt)}%</td>
                        </tr>
                      );
                      return rows;
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right tabular-nums">{totalS1}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{totalS2}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{grand}</td>
                      <td className="px-4 py-2 text-right tabular-nums">100%</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2">Dimensión</th>
                      <th className="px-4 py-2 text-right">Horas</th>
                      <th className="px-4 py-2 text-right">% del total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byDim.map((d) => (
                      <tr key={d.label} className="hover:bg-slate-50">
                        <td className="px-4 py-1.5">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
                            {d.label}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums font-medium text-slate-800">{d.total}</td>
                        <td className="px-4 py-1.5 text-right tabular-nums text-slate-500">{pct(d.total)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right tabular-nums">{grand}</td>
                      <td className="px-4 py-2 text-right tabular-nums">100%</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </section>

          {/* Gráficos: a qué dedica el tiempo el profesor */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Distribución del tiempo por dimensión</h3>
              <p className="mb-2 text-xs text-slate-500">Participación de cada dimensión en la carga total.</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${r1(Number(v))} h`, "Horas"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Horas por dimensión y semestre</h3>
              <p className="mb-2 text-xs text-slate-500">
                {hasSemestral ? "Comparación de S1 y S2 en cada dimensión." : "Horas por dimensión (sin desglose por semestre)."}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip formatter={(v) => `${r1(Number(v))} h`} />
                  {hasSemestral && <Legend />}
                  <Bar dataKey="S1" name="Semestre 1" fill="#2563eb" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  {hasSemestral && <Bar dataKey="S2" name="Semestre 2" fill="#93c5fd" radius={[3, 3, 0, 0]} isAnimationActive={false} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div>{backButton}</div>
        </>
      )}
    </div>
  );
}

/* ============================================================================
 * 8b. EXPLICACIÓN DEL Z-SCORE
 * ========================================================================== */

/** Fila de la tabla de interpretación de valores de z-score. */
function ZRow({ range, tone, label, detail }: { range: string; tone: string; label: string; detail: string }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs font-semibold text-slate-700">{range}</td>
      <td className="py-2 pr-4">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${tone}`} />
      </td>
      <td className="py-2 pr-4 text-sm font-medium text-slate-800">{label}</td>
      <td className="py-2 text-sm text-slate-500">{detail}</td>
    </tr>
  );
}

/**
 * Sección educativa fija al final del dashboard: explica qué es el z-score,
 * cómo se calcula con la fórmula exacta que usa esta app, con qué datos, y
 * cómo interpretarlo. No depende de los filtros — es documentación estática.
 */
function ZScoreExplainer() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">¿Qué es el z-score? (parámetro de equilibrio)</h2>
        <p className="text-xs text-slate-500">
          El indicador que usa este dashboard para decir qué tan "equilibrada" está la carga de un
          profesor frente al resto del grupo.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 px-5 py-5 lg:grid-cols-2">
        {/* Columna izquierda: definición + fórmula */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">1. Qué mide</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              El <strong>z-score</strong> (o puntuación estándar) indica{" "}
              <strong>a cuántas desviaciones estándar de distancia</strong> está el valor de un
              profesor respecto al <strong>promedio del grupo</strong> que se está analizando (el
              grupo filtrado, no siempre todos los profesores). No mide el valor en sí (horas), sino
              su <em>posición relativa</em>: si está por encima, por debajo, o en la media del grupo.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">2. Fórmula</h3>
            <div className="mt-2 rounded-lg bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
              z = (valor − media del grupo) / desviación estándar del grupo
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>
                <strong>valor</strong>: la métrica del profesor (p. ej. sus horas de investigación).
              </li>
              <li>
                <strong>media del grupo</strong>: promedio de esa métrica entre todos los profesores
                del grupo filtrado actualmente visible.
              </li>
              <li>
                <strong>desviación estándar</strong>: qué tan dispersos están los valores del grupo
                alrededor de esa media (poca dispersión → números parecidos entre profesores; mucha
                dispersión → números muy distintos).
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">3. Parámetros que usa este dashboard</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-relaxed text-slate-600">
              <li>
                La media y la desviación estándar <strong>se recalculan cada vez que cambian los
                filtros</strong>: el z-score de un profesor puede cambiar si filtras por categoría o
                perfil, porque cambia el grupo de comparación.
              </li>
              <li>
                Los profesores en perfil <strong>"Sabático"</strong> se excluyen del cálculo de
                promedio y desviación (no compiten en carga con quienes están activos), aunque sí
                aparecen en los totales de carga.
              </li>
              <li>
                El <strong>"z-score" que ves en las tarjetas de "Mejor global" / "Desempeño más
                bajo"</strong> es un puntaje combinado: el promedio de los z-scores individuales de{" "}
                <strong>Docencia total, Investigación y Gestión académica</strong> (no incluye
                Innovación ni Carga total por separado, para no contar horas dos veces).
              </li>
            </ul>
          </div>
        </div>

        {/* Columna derecha: interpretación + por qué "equilibrio" */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">4. Cómo leer el número</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <ZRow range="z = 0" tone="bg-slate-400" label="Exactamente el promedio" detail="Igual que el profesor típico del grupo." />
                  <ZRow range="z > 0" tone="bg-emerald-500" label="Por encima del promedio" detail="Cuanto mayor, más se aleja hacia arriba." />
                  <ZRow range="z < 0" tone="bg-rose-500" label="Por debajo del promedio" detail="Cuanto menor (más negativo), más se aleja hacia abajo." />
                  <ZRow range="|z| ≈ 1" tone="bg-amber-400" label="Diferencia moderada" detail="~1 desviación estándar de distancia del grupo." />
                  <ZRow range="|z| ≥ 2" tone="bg-rose-600" label="Caso atípico" detail="Muy alejado del resto: vale la pena revisarlo." />
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">5. Por qué es un "parámetro de equilibrio"</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Un solo z-score dice si un profesor destaca o queda corto en <em>una</em> métrica. El{" "}
              <strong>puntaje global</strong> de este dashboard promedia los z-scores de las tres
              dimensiones (docencia, investigación, gestión): un profesor con puntaje global cercano
              a 0 no necesariamente tiene poca carga — puede tener una carga{" "}
              <strong>equilibrada y cercana al promedio en todas las dimensiones</strong>. En cambio,
              alguien con z-scores muy altos en una dimensión y muy bajos en otra puede tener el mismo
              promedio, pero un perfil <strong>desequilibrado</strong> (por eso el radar de
              "Perfil integral" arriba complementa esta lectura: un polígono regular es equilibrado
              aunque su z-score global sea moderado).
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <h3 className="text-sm font-bold text-amber-900">Límites a tener en cuenta</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-relaxed text-amber-900">
              <li>Es un valor <strong>relativo al grupo</strong>: no compara contra un estándar fijo ni entre distintos semestres o filtros.</li>
              <li>Es sensible a <strong>valores atípicos</strong> (un profesor con carga extrema puede desplazar la media y la desviación de todo el grupo).</li>
              <li>Asume una distribución razonablemente simétrica; por eso los <strong>semáforos</strong> de cada métrica (🟢🟡🔴) usan percentiles en vez de z-score cuando la distribución está muy sesgada.</li>
              <li>Con grupos muy pequeños (pocos profesores filtrados) el z-score es menos confiable.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * 9. APP PRINCIPAL: filtros globales + KPIs + secciones
 * ========================================================================== */

export default function TeacherPerformanceDashboard() {
  /* Filtros detectados automáticamente según columnas disponibles.
     El CSV no contiene Fecha, Grupo, Asignatura, Sede ni Programa,
     por lo que esos filtros se omiten. Disponibles: Profesor,
     Categoría profesoral y Perfil principal. */
  const [fProfesor, setFProfesor] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fPerfil, setFPerfil] = useState("");

  /* Fuente de datos: el dashboard no trae datos reales embebidos. Al
     abrirlo, pide seleccionar una carpeta local con los .csv de profesores
     (o, alternativamente, cargar el dataset de ejemplo). */
  const [professors, setProfessors] = useState<Profesor[] | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loadError, setLoadError] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  /* Vista activa: "resumen" (dashboard comparativo) o el nombre de un profesor
     para ver su página de análisis individual. */
  const [view, setView] = useState("resumen");

  const resetFilters = () => {
    setFProfesor("");
    setFCategoria("");
    setFPerfil("");
  };

  const openFolderPicker = () => folderInputRef.current?.click();

  const handleFolderChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setLoadStatus("loading");
    setLoadError("");

    const allFiles = Array.from(fileList);
    const csvFiles = allFiles.filter((f) => f.name.toLowerCase().endsWith(".csv"));
    const mdFiles = allFiles.filter((f) => f.name.toLowerCase().endsWith(".md"));
    const xlsxFiles = allFiles.filter((f) => /\.(xlsx|xlsm|xls)$/i.test(f.name));
    if (csvFiles.length === 0 && mdFiles.length === 0 && xlsxFiles.length === 0) {
      setLoadStatus("error");
      setLoadError("La carpeta seleccionada no contiene archivos .xlsx, .csv ni .md con datos de profesores.");
      e.target.value = "";
      return;
    }

    try {
      const csvTexts = await Promise.all(csvFiles.map((f) => f.text()));
      const actRows: ActRow[] = [];
      const aggProfs: Profesor[] = [];
      csvTexts.forEach((t) => {
        const rows = parseCSV(t);
        if (rows.length >= 1 && csvHeaderIsActividad(rows[0])) {
          actRows.push(...parseActividadRows(t));
        } else {
          aggProfs.push(...parseProfesoresCSV(t));
        }
      });
      const fromCsv = [...aggProfs, ...buildProfesoresFromActRows(actRows)];

      const mdParsed = await Promise.all(
        mdFiles.map(async (f) => {
          const text = await f.text();
          const fallbackName = f.name.replace(/\.md$/i, "").replace(/[_-]+/g, " ").trim();
          return parseProfesorMarkdown(text, fallbackName);
        })
      );
      const fromMd = mdParsed.filter((p): p is Profesor => p !== null);

      // .xlsx: lector de Excel cargado de forma diferida desde el CDN de SheetJS.
      let fromXlsx: Profesor[] = [];
      let xlsxReaderFailed = false;
      if (xlsxFiles.length) {
        try {
          const XLSX: any = await import(/* @vite-ignore */ SHEETJS_URL);
          const xlsxActRows: ActRow[] = [];
          for (const f of xlsxFiles) {
            try {
              const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: "array" });
              xlsxActRows.push(...xlsxWorkbookToActRows(wb, XLSX, nameFromFilename(f.name)));
            } catch {
              /* archivo .xlsx ilegible: se omite */
            }
          }
          fromXlsx = buildProfesoresFromActRows(xlsxActRows);
        } catch {
          xlsxReaderFailed = true;
        }
      }

      const parsed = dedupeByProfesor([...fromCsv, ...fromXlsx, ...fromMd]);
      if (parsed.length === 0) {
        setLoadStatus("error");
        setLoadError(
          xlsxReaderFailed
            ? "No se pudo cargar el lector de Excel (¿sin conexión a internet?). Inténtalo con conexión o convierte los .xlsx a .csv."
            : "No se encontraron datos válidos en los archivos de esa carpeta."
        );
        e.target.value = "";
        return;
      }
      const first = (csvFiles[0] ?? xlsxFiles[0] ?? mdFiles[0]) as File & { webkitRelativePath?: string };
      const folder = first.webkitRelativePath?.split("/")[0] || "Carpeta local";
      setProfessors(parsed);
      setSourceLabel(folder);
      setLoadStatus("idle");
      setView("resumen");
      resetFilters();
    } catch {
      setLoadStatus("error");
      setLoadError("No se pudieron leer los archivos seleccionados.");
    } finally {
      e.target.value = "";
    }
  };

  const useSampleData = () => {
    setProfessors(SAMPLE_DATA);
    setSourceLabel("Datos de ejemplo");
    setLoadStatus("idle");
    setLoadError("");
    setView("resumen");
    resetFilters();
  };

  const DATA = professors ?? [];
  const activeProfesor = view !== "resumen" ? DATA.find((p) => p.profesor === view) ?? null : null;

  const filtered = useMemo(
    () =>
      DATA.filter(
        (p) =>
          (!fProfesor || p.profesor === fProfesor) &&
          (!fCategoria || p.categoria === fCategoria) &&
          (!fPerfil || p.perfil === fPerfil)
      ),
    [DATA, fProfesor, fCategoria, fPerfil]
  );

  /* Estadísticas por métrica sobre el grupo filtrado (excluyendo sabáticos
     de las métricas de desempeño, no de carga total) */
  const statsByMetric = useMemo(() => {
    const activos = filtered.filter((p) => p.perfil !== "Sabatico");
    const out = {} as Record<MetricKey, Stats>;
    METRICS.forEach((m) => {
      const scoped = m.key === "cargaTotal" ? filtered : activos;
      out[m.key] = computeStats(scoped.map((p) => p[m.key]));
    });
    return out;
  }, [filtered]);

  /* Cumplimiento de lineamientos institucionales (motor de reglas) */
  const cumplimientoRows = useMemo(() => buildCumplimiento(filtered), [filtered]);

  /* KPIs */
  const kpis = useMemo(() => {
    const activos = filtered.filter((p) => p.perfil !== "Sabatico");
    const scored = activos.map((p) => ({ p, score: globalScore(p, statsByMetric) }));
    const best = scored.length ? scored.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    const worst = scored.length ? scored.reduce((a, b) => (b.score < a.score ? b : a)) : null;

    /* Alertas basadas en el cumplimiento de los lineamientos, no en estadística */
    const criticas = cumplimientoRows.reduce((s, r) => s + r.criticas, 0);
    const moderadas = cumplimientoRows.reduce((s, r) => s + r.moderadas, 0);

    const maxCv = METRICS.reduce((a, b) =>
      statsByMetric[b.key].cv > statsByMetric[a.key].cv ? b : a
    );
    const avgStd = round1(
      METRICS.reduce((s, m) => s + statsByMetric[m.key].std, 0) / METRICS.length
    );

    return {
      total: filtered.length,
      promedioCarga: statsByMetric.cargaTotal.mean,
      best,
      worst,
      criticas,
      moderadas,
      maxCv,
      avgStd,
    };
  }, [filtered, statsByMetric, cumplimientoRows]);

  const clearFilters = () => {
    setFProfesor("");
    setFCategoria("");
    setFPerfil("");
  };
  const hasFilters = fProfesor || fCategoria || fPerfil;

  /* Input de carpeta, siempre montado (oculto) para poder reabrirlo tanto
     desde la pantalla inicial como desde el botón "Cambiar carpeta". */
  const folderInput = (
    <input
      ref={folderInputRef}
      type="file"
      className="hidden"
      onChange={handleFolderChange}
      {...DIRECTORY_INPUT_PROPS}
    />
  );

  if (!professors) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 font-sans text-slate-900">
        {folderInput}
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Asignaciones académicas · 2026
          </p>
          <h1 className="mt-1 text-2xl font-bold">Desempeño docente</h1>
          <p className="mt-3 text-sm text-slate-600">
            Selecciona la carpeta local donde están los reportes de los profesores (.xlsx tal como
            los exporta el sistema, o .csv/.md): docencia, investigación, gestión e innovación.
          </p>

          <button
            onClick={openFolderPicker}
            disabled={loadStatus === "loading"}
            className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          >
            {loadStatus === "loading" ? "Leyendo archivos…" : "Seleccionar carpeta"}
          </button>

          {loadStatus === "error" && (
            <p className="mt-3 text-sm font-medium text-rose-600">{loadError}</p>
          )}

          <button
            onClick={useSampleData}
            className="mt-3 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Usar datos de ejemplo
          </button>

          <p className="mt-4 text-xs text-slate-400">
            Los archivos se leen directamente en tu navegador; no se suben a ningún servidor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {folderInput}
      {/* Encabezado */}
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-4 px-5 py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Asignaciones académicas · 2026
            </p>
            <h1 className="mt-1 text-2xl font-bold">Desempeño docente</h1>
            <p className="mt-1 text-sm text-slate-300">
              Comparación de carga en docencia, investigación, gestión e innovación · {DATA.length} profesores
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={openFolderPicker}
              disabled={loadStatus === "loading"}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              {loadStatus === "loading" ? "Leyendo archivos…" : "Cambiar carpeta"}
            </button>
            <p className="text-[11px] text-slate-400">Fuente: {sourceLabel}</p>
            {loadStatus === "error" && (
              <p className="max-w-[240px] text-right text-[11px] font-medium text-rose-400">
                {loadError}
              </p>
            )}
          </div>
        </div>

        {/* Pestañas: resumen general + una por profesor */}
        <div className="mx-auto max-w-7xl px-5">
          <nav className="flex flex-wrap gap-1.5 pb-3" aria-label="Secciones">
            <button
              onClick={() => setView("resumen")}
              aria-current={view === "resumen"}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                view === "resumen" ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Resumen general
            </button>
            {DATA.map((p) => (
              <button
                key={p.profesor}
                onClick={() => setView(p.profesor)}
                aria-current={view === p.profesor}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  view === p.profesor ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {shortName(p.profesor)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        {activeProfesor ? (
          <ProfesorDetailPage profesor={activeProfesor} onBack={() => setView("resumen")} />
        ) : (
        <>
        {/* Filtros */}
        <section className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <FilterSelect
            label="Profesor"
            value={fProfesor}
            options={[...new Set(DATA.map((p) => p.profesor))].sort()}
            onChange={setFProfesor}
          />
          <FilterSelect
            label="Categoría profesoral"
            value={fCategoria}
            options={[...new Set(DATA.map((p) => p.categoria))].sort()}
            onChange={setFCategoria}
          />
          <FilterSelect
            label="Perfil principal"
            value={fPerfil}
            options={[...new Set(DATA.map((p) => p.perfil))].sort()}
            onChange={setFPerfil}
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Limpiar filtros
            </button>
          )}
          <p className="ml-auto text-xs text-slate-500">
            {filtered.length} de {DATA.length} profesores en el análisis
          </p>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <KpiCard eyebrow="Profesores" value={String(kpis.total)} detail="En el grupo filtrado" />
          <KpiCard
            eyebrow="Carga promedio"
            value={`${kpis.promedioCarga} h`}
            detail="Carga total anual"
          />
          <KpiCard
            eyebrow="Mejor global"
            value={kpis.best ? shortName(kpis.best.p.profesor) : "—"}
            detail={kpis.best ? `z-score ${kpis.best.score}` : undefined}
            tone="good"
          />
          <KpiCard
            eyebrow="Desempeño más bajo"
            value={kpis.worst ? shortName(kpis.worst.p.profesor) : "—"}
            detail={kpis.worst ? `z-score ${kpis.worst.score}` : undefined}
            tone="bad"
          />
          <KpiCard eyebrow="Alertas críticas" value={String(kpis.criticas)} detail="Incumplimientos graves de lineamientos" tone="bad" />
          <KpiCard eyebrow="Alertas moderadas" value={String(kpis.moderadas)} detail="Desviaciones moderadas de lineamientos" tone="warn" />
          <KpiCard
            eyebrow="Mayor variación"
            value={kpis.maxCv.shortLabel}
            detail={`CV ${statsByMetric[kpis.maxCv.key].cv}%`}
            tone="warn"
          />
          <KpiCard eyebrow="Desviación promedio" value={`${kpis.avgStd} h`} detail="σ media entre métricas" />
        </section>

        {/* Panel de alertas */}
        <AlertsPanel rows={cumplimientoRows} />

        {/* Comparativo global: radar de integralidad */}
        <IntegralSection profesores={filtered} />

        {/* Secciones por métrica */}
        {METRICS.map((m) => (
          <MetricSection key={m.key} metric={m} profesores={filtered} />
        ))}

        {/* Explicación del z-score */}
        <ZScoreExplainer />

        <footer className="pb-6 pt-2 text-center text-[11px] text-slate-400">
          Alertas basadas en los lineamientos de asignación docente y el Decálogo de la decanatura ·
          Semáforos de los gráficos calculados estadísticamente sobre el grupo filtrado (media ± 0.5σ
          o percentiles P33/P66 según asimetría) · Fuente: {sourceLabel}
        </footer>
        </>
        )}
      </main>
    </div>
  );
}
