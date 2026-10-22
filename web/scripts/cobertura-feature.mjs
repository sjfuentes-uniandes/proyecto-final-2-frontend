// Compuerta de cobertura por feature (01 §3.11: 80 % de líneas y 75 % de ramas). Lee el json-summary de karma-coverage.
// Cada grupo se evalúa por separado: la cobertura de una feature no compensa la de otra.
// Uso: node scripts/cobertura-feature.mjs [ruta del coverage-summary.json]
import { existsSync, readFileSync } from 'node:fs';

const UMBRAL = { lineas: 80, ramas: 75 };
const GRUPOS = [
  /** Perfilamiento y los componentes de shared que cambió HU-W11. */
  { nombre: 'perfilamiento', partes: ['/features/perfilamiento/', '/shared/seccion/'] },
  /** HU-W31 (PR 3.8). */
  { nombre: 'consentimientos', partes: ['/features/consentimientos/'] },
  /** HU-W03: cálculo de la prima (condiciones, validación, cálculo en curso y prima calculada). */
  { nombre: 'cotizacion', partes: ['/features/cotizacion/'] },
];
/** Apoyo de las pruebas, no código de la feature. */
const EXCLUIDAS = [/\.testing\.ts$/, /\.spec\.ts$/];

const ruta = process.argv[2] ?? 'coverage/web/coverage-summary.json';
if (!existsSync(ruta)) {
  console.error(`No existe ${ruta}: corre antes ng test --code-coverage.`);
  process.exit(1);
}

const resumen = JSON.parse(readFileSync(ruta, 'utf8'));
// En Windows karma-coverage escribe las rutas con "\".
const entradas = Object.entries(resumen)
  .filter(([archivo]) => archivo !== 'total')
  .map(([archivo, datos]) => [archivo.replaceAll('\\', '/'), datos]);

const sumar = (archivos, clave) =>
  archivos.reduce((acc, [, datos]) => ({ total: acc.total + datos[clave].total, cubiertas: acc.cubiertas + datos[clave].covered }), {
    total: 0,
    cubiertas: 0,
  });
const porcentaje = ({ total, cubiertas }) => (total === 0 ? 100 : (100 * cubiertas) / total);

const fallas = [];
for (const { nombre, partes } of GRUPOS) {
  const archivos = entradas.filter(
    ([archivo]) => partes.some((parte) => archivo.includes(parte)) && !EXCLUIDAS.some((patron) => patron.test(archivo)),
  );
  if (archivos.length === 0) {
    console.log(`${nombre}: la feature aún no tiene archivos, no hay cobertura que verificar.`);
    continue;
  }
  const lineas = porcentaje(sumar(archivos, 'lines'));
  const ramas = porcentaje(sumar(archivos, 'branches'));
  console.log(`${nombre} (${archivos.length} archivos): líneas ${lineas.toFixed(2)} % (mín. ${UMBRAL.lineas}), ramas ${ramas.toFixed(2)} % (mín. ${UMBRAL.ramas})`);
  if (lineas < UMBRAL.lineas) fallas.push(`${nombre}: líneas ${lineas.toFixed(2)} % < ${UMBRAL.lineas} %`);
  if (ramas < UMBRAL.ramas) fallas.push(`${nombre}: ramas ${ramas.toFixed(2)} % < ${UMBRAL.ramas} %`);
}
if (fallas.length > 0) {
  console.error(`Cobertura insuficiente: ${fallas.join('; ')}`);
  process.exit(1);
}
