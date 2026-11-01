/**
 * HU-W17: esperas entre consultas mientras la póliza está EMITIENDO. La tarea emisora de polizas toma
 * las pendientes cada segundo y la meta de la emisión es de unos 1,5 s, así que se empieza en 1 s y se
 * dobla hasta llegar, a los 30 s, al ciclo en que la tarea reintenta un fallo (`emision_reintento_s`);
 * desde ahí, una consulta por ciclo. Suman 5 minutos (unos diez reintentos): una emisión que sigue sin
 * terminar es un fallo sostenido de la firma o de S3, que polizas mide como error a la hora y vigila su
 * alarma. Después, el asesor consulta con «Actualizar». Sin Angular: las E2E lo importan desde Node.
 */
export const ESPERAS_SONDEO_EMISION_MS: readonly number[] = [
  1_000,
  1_000,
  2_000,
  4_000,
  8_000,
  14_000,
  ...Array<number>(9).fill(30_000),
];
export const TOPE_SONDEO_EMISION_MS = 5 * 60_000;
