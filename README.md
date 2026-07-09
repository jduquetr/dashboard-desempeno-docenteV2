# Dashboard ejecutivo — Desempeño docente 2026

Dashboard de comparación profesoral (docencia, investigación, gestión e innovación)
con alertas basadas en los lineamientos institucionales de asignación docente.

Stack: Vite + React 18 + TypeScript + Tailwind CSS + Recharts.

## Desplegar en Vercel

**Opción A — Desde GitHub (recomendada):**
1. Sube esta carpeta a un repositorio de GitHub.
2. En https://vercel.com/new importa el repositorio.
3. Vercel detecta Vite automáticamente (framework, build y salida ya están en `vercel.json`). Haz clic en Deploy.

**Opción B — Vercel CLI (sin GitHub):**
```bash
npm install -g vercel
cd dashboard-desempeno-docente
npm install
vercel          # despliegue de prueba
vercel --prod   # despliegue a producción
```

## Desarrollo local
```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # verifica tipos y genera dist/
```

## Configuración de lineamientos
Los umbrales de las alertas están en `src/TeacherPerformanceDashboard.tsx`,
constante `LINEAMIENTOS_CONFIG`:
- `capacidadTC: 880` — 1 TC semestral (220 h = 1/4 TC según el comunicado).
- `periodos: 1` — cambiar a `2` si el archivo consolida el año completo.
- `minHorasDimension: 64` — dedicación mínima de referencia por dimensión.
- `horasCursoDD: 48` y `cursosMinimosPromedio: 2` — Decálogo #6.

## Actualizar los datos
Los datos del CSV están embebidos en la constante `DATA` del mismo archivo.
Para un nuevo periodo, reemplaza las filas o conecta una API/CSV externo.
