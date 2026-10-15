// Compuerta de cobertura de la feature de perfilamiento y de los componentes nuevos de shared
// (01 §3.11: 80 % de líneas y 75 % de ramas). Lee el json-summary de karma-coverage.
// Uso: node scripts/cobertura-feature.mjs [ruta del coverage-summary.json]
import { existsSync, readFileSync } from 'node:fs';

const UMBRAL = { lineas: 80, ramas: 75 };
const INCLUIDAS = ['/features/perfilamiento/'];
/** Componentes de shared que cambió HU-W11. */
const UMBRAL_EXTRA = ['/shared/seccion/'];
/** Apoyo de las pruebas, no código de la feature. */
const EXCLUIDAS = [/\.testing\.ts$/, /\.spec\.ts$/];

const ruta = process.argv[2] ?? 'coverage/web/coverage-summary.json';
if (!existsSync(ruta)) {
  console.error(`No existe ${ruta}: corre antes ng test --code-coverage.`);
  process.exit(1);
}

const resumen = JSON.parse(readFileSync(ruta, 'utf8'));
const archivos = Object.entries(resumen).filter(
  ([archivo]) =>
    archivo !== 'total' &&
    [...INCLUIDAS, ...UMBRAL_EXTRA].some((parte) => archivo.includes(parte)) &&
    !EXCLUIDAS.some((patron) => patron.test(archivo)),
);
if (archivos.length === 0) {
  console.log('La feature aún no tiene archivos: no hay cobertura que verificar.');
  process.exit(0);
}

const sumar = (clave) =>
  archivos.reduce((acc, [, datos]) => ({ total: acc.total + datos[clave].total, cubiertas: acc.cubiertas + datos[clave].covered }), {
    total: 0,
    cubiertas: 0,
  });
const porcentaje = ({ total, cubiertas }) => (total === 0 ? 100 : (100 * cubiertas) / total);

const lineas = porcentaje(sumar('lines'));
const ramas = porcentaje(sumar('branches'));
console.log(`perfilamiento (${archivos.length} archivos): líneas ${lineas.toFixed(2)} % (mín. ${UMBRAL.lineas}), ramas ${ramas.toFixed(2)} % (mín. ${UMBRAL.ramas})`);

const fallas = [];
if (lineas < UMBRAL.lineas) fallas.push(`líneas ${lineas.toFixed(2)} % < ${UMBRAL.lineas} %`);
if (ramas < UMBRAL.ramas) fallas.push(`ramas ${ramas.toFixed(2)} % < ${UMBRAL.ramas} %`);
if (fallas.length > 0) {
  console.error(`Cobertura insuficiente: ${fallas.join(', ')}`);
  process.exit(1);
}
