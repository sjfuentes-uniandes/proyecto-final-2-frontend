/**
 * HU-W16: esperas entre consultas mientras el recaudo está PENDIENTE. Cortas al principio, porque el
 * adaptador de pagos resuelve el caso normal en segundos, y luego una por minuto. Suman 8 minutos: la
 * conciliación de dinero toma los pendientes con 5 minutos de antigüedad y corre cada 2 (ADR 0013,
 * decisión 5), más un minuto de margen. Después, el asesor consulta con «Actualizar». Sin Angular: las
 * E2E lo importan desde Node.
 */
export const ESPERAS_SONDEO_MS: readonly number[] = [2_000, 4_000, 8_000, 16_000, 30_000, ...Array<number>(7).fill(60_000)];
export const TOPE_SONDEO_MS = 8 * 60_000;
