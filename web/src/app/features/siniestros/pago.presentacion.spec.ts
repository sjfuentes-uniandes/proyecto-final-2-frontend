import { clienteAvisado, filasTrazabilidad, formatearTiempoTotal, insigniaPago, minutosTotales, textoMotivoPago, tieneDatosDePasarela, variantePago } from './pago.presentacion';
import { TEXTOS_SINIESTROS } from './siniestros.i18n';
import { PAGO_CONFIRMADO, PAGO_PENDIENTE, PAGO_RECHAZADO } from './siniestros.testing';

const es = TEXTOS_SINIESTROS['es-CO'];
const en = TEXTOS_SINIESTROS['en-US'];

describe('Presentación del pago (H08, HU-W23)', () => {
  it('la variante sale del resultado de dinero; sin resultado, el pago está pendiente (nunca rechazado)', () => {
    expect(variantePago(PAGO_CONFIRMADO)).toBe('CONFIRMADO');
    expect(variantePago(PAGO_RECHAZADO)).toBe('RECHAZADO');
    expect(variantePago(PAGO_PENDIENTE)).toBe('PENDIENTE');
    expect(variantePago({ ...PAGO_PENDIENTE, indemnizacion: { ...PAGO_CONFIRMADO.indemnizacion!, estado: 'PENDIENTE' } })).toBe('PENDIENTE');
  });

  it('solo hay datos de la pasarela si dinero ya publicó un resultado', () => {
    expect(tieneDatosDePasarela(PAGO_CONFIRMADO)).toBeTrue();
    expect(tieneDatosDePasarela(PAGO_PENDIENTE)).toBeFalse();
  });

  it('la insignia dice «Pagado», «Pago por gestionar» o «Pago pendiente» con su tono', () => {
    expect(insigniaPago(es, 'CONFIRMADO')).toEqual({ texto: 'Pagado', tono: 'exito' });
    expect(insigniaPago(es, 'RECHAZADO')).toEqual({ texto: 'Pago por gestionar', tono: 'alerta' });
    expect(insigniaPago(en, 'PENDIENTE')).toEqual({ texto: 'Payment pending', tono: 'info' });
  });

  it('traduce el motivo por código y muestra un código nuevo sin inventar su significado', () => {
    expect(textoMotivoPago(es, 'BENEFICIARIO_NO_HABILITADO')).toBe('El beneficiario no está habilitado en la pasarela');
    expect(textoMotivoPago(en, 'BENEFICIARIO_NO_HABILITADO')).toBe('The beneficiary is not enabled at the gateway');
    expect(textoMotivoPago(es, 'MOTIVO_NO_INFORMADO')).toBe('La pasarela no informó el motivo');
    expect(textoMotivoPago(es, null)).toBe('La pasarela no informó el motivo');
    expect(textoMotivoPago(es, 'FONDOS_INSUFICIENTES')).toBe('Motivo FONDOS_INSUFICIENTES');
  });

  it('el tiempo total va del reporte a la confirmación y se muestra en horas y minutos', () => {
    expect(minutosTotales('2026-11-05T01:00:00Z', '2026-11-05T18:12:00Z')).toBe(1032);
    expect(minutosTotales('2026-11-05T01:00:00Z', null)).toBeNull();
    expect(minutosTotales('2026-11-05T01:00:00Z', 'no-es-fecha')).toBeNull();
    expect(minutosTotales('2026-11-05T01:00:00Z', '2026-11-05T00:00:00Z')).toBe(0);
    expect(formatearTiempoTotal(es, 1032)).toBe('17 h 12 m');
    expect(formatearTiempoTotal(es, 59)).toBe('0 h 59 m');
    expect(formatearTiempoTotal(es, 2885)).toBe('48 h 5 m');
  });

  it('la trazabilidad sale del historial, en orden, con la referencia, el valor o el motivo', () => {
    const filas = filasTrazabilidad(es, 'es-CO', PAGO_CONFIRMADO);
    expect(filas.map((f) => f.rotulo)).toEqual(['Reportado', 'Evidencias validadas', 'Asignado a un analista', 'Aprobado', 'Pago confirmado por la pasarela']);
    expect(filas[3].detalle).toMatch(/· Referencia IND-88-2026-0442-01$/);
    expect(filas[2].detalle).toMatch(/· Luis Mora$/);
    expect(filas[4].detalle).toMatch(/· \$\s?2\.500\.000$/);
    const rechazadas = filasTrazabilidad(es, 'es-CO', PAGO_RECHAZADO);
    expect(rechazadas.at(-1)?.rotulo).toBe('Pago rechazado por la pasarela');
    expect(rechazadas.at(-1)?.detalle).toMatch(/· El beneficiario no está habilitado en la pasarela$/);
  });

  it('una entrada fuera de orden se ordena por fecha y no se inventa «Aviso enviado al cliente»', () => {
    const invertido = { ...PAGO_CONFIRMADO, historial: [...PAGO_CONFIRMADO.historial].reverse() };
    expect(filasTrazabilidad(es, 'es-CO', invertido).map((f) => f.rotulo)[0]).toBe('Reportado');
    expect(filasTrazabilidad(es, 'es-CO', PAGO_CONFIRMADO).map((f) => f.rotulo)).not.toContain('Aviso enviado al cliente');
    expect(clienteAvisado(PAGO_CONFIRMADO)).toBeFalse();
  });

  it('«Aviso enviado al cliente» aparece solo si el historial lo trae', () => {
    const aviso = {
      ...PAGO_CONFIRMADO,
      historial: [...PAGO_CONFIRMADO.historial, { ...PAGO_CONFIRMADO.historial[0], id: 'x', accion: 'CLIENTE_NOTIFICADO', ocurridoEn: '2026-11-05T18:13:00Z' }],
    };
    expect(clienteAvisado(aviso)).toBeTrue();
    expect(filasTrazabilidad(en, 'en-US', aviso).at(-1)?.rotulo).toBe('Notice sent to the customer');
  });

  it('sin valor a indemnizar en la liquidación usa el monto de la indemnización', () => {
    const sinValor = { ...PAGO_CONFIRMADO, liquidacion: { ...PAGO_CONFIRMADO.liquidacion, valorIndemnizar: null } };
    expect(filasTrazabilidad(es, 'es-CO', sinValor).at(-1)?.detalle).toMatch(/2\.500\.000/);
    const sinNada = { ...sinValor, indemnizacion: { ...PAGO_CONFIRMADO.indemnizacion!, monto: '0' } };
    expect(filasTrazabilidad(es, 'es-CO', sinNada).length).toBe(5);
  });
});
