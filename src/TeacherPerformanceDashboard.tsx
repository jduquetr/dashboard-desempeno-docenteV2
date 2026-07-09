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
} from "recharts";

/* ============================================================================
 * 1. TIPOS Y DATOS
 * ========================================================================== */

export type Semaforo = "VERDE" | "AMARILLO" | "ROJO" | "NA";

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

/* ============================================================================
 * 1b. CARGA DE DATOS DESDE UNA CARPETA LOCAL (.csv)
 * ----------------------------------------------------------------------------
 * El dashboard no trae datos reales embebidos: al abrirlo, pide seleccionar
 * una carpeta local que contenga uno o más archivos .csv con la información
 * de los profesores. Los encabezados esperados coinciden con los campos de
 * `Profesor`, con alias comunes en español; los campos totales/perfil se
 * calculan automáticamente si el archivo no los trae.
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

/** Une los profesores de varios .csv de la carpeta; si un nombre se repite, gana la última fila leída. */
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

    const csvFiles = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (csvFiles.length === 0) {
      setLoadStatus("error");
      setLoadError("La carpeta seleccionada no contiene archivos .csv con datos de profesores.");
      e.target.value = "";
      return;
    }

    try {
      const texts = await Promise.all(csvFiles.map((f) => f.text()));
      const parsed = dedupeByProfesor(texts.flatMap((t) => parseProfesoresCSV(t)));
      if (parsed.length === 0) {
        setLoadStatus("error");
        setLoadError("No se encontraron filas válidas en los archivos .csv de esa carpeta.");
        e.target.value = "";
        return;
      }
      const first = csvFiles[0] as File & { webkitRelativePath?: string };
      const folder = first.webkitRelativePath?.split("/")[0] || "Carpeta local";
      setProfessors(parsed);
      setSourceLabel(folder);
      setLoadStatus("idle");
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
    resetFilters();
  };

  const DATA = professors ?? [];

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
            Selecciona la carpeta local donde están los archivos .csv con la información de los
            profesores (docencia, investigación, gestión e innovación).
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
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-6">
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

        <footer className="pb-6 pt-2 text-center text-[11px] text-slate-400">
          Alertas basadas en los lineamientos de asignación docente y el Decálogo de la decanatura ·
          Semáforos de los gráficos calculados estadísticamente sobre el grupo filtrado (media ± 0.5σ
          o percentiles P33/P66 según asimetría) · Fuente: {sourceLabel}
        </footer>
      </main>
    </div>
  );
}
