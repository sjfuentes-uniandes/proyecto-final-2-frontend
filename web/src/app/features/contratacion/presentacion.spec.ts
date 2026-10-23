import { TEXTOS_CONTRATACION } from './contratacion.i18n';
import { ReglaEvaluada } from './contratacion.modelo';
import {
  COMUNICACION_APROBADA,
  COMUNICACION_RECHAZADA,
  COMUNICACION_REVISION,
  COMUNICACION_VENCIDA,
  DECISION_RESERVADA,
  DECISION_REVISION,
  REGLAS_S01,
} from './contratacion.testing';
import {
  Formatos,
  claseTono,
  codigoCotizacion,
  condicion,
  diaLocal,
  duracion,
  incumplidasPrimero,
  insigniaRegla,
  insigniaResultado,
  insigniaSiguientePaso,
  rutaAceptacion,
  textoCondicion,
  textoDescriptor,
  textoSiguientePaso,
  tonoEnCola,
  valorCaso,
} from './presentacion';

const t = TEXTOS_CONTRATACION['es-CO'];
const f: Formatos = {
  monto: (valor) => `$ ${Number(valor).toLocaleString('es-CO')}`,
  decimal: (valor) => valor.replace('.', ','),
  nivel: (nivel) => ({ BAJO: 'Bajo', MEDIO: 'Medio', ALTO: 'Alto' })[nivel],
};
const regla = (codigo: string, cambios: Partial<ReglaEvaluada> = {}): ReglaEvaluada => ({
  ...REGLAS_S01.find((r) => r.codigo === codigo)!,
  ...cambios,
});

describe('Presentación de la suscripción (funciones puras)', () => {
  it('insignia del resultado de la decisión', () => {
    expect(insigniaResultado(t, 'APROBADA')).toEqual({ texto: 'Aceptado', tono: 'exito' });
    expect(insigniaResultado(t, 'RECHAZADA')).toEqual({ texto: 'Rechazado', tono: 'peligro' });
    expect(insigniaResultado(t, 'REVISION_REQUERIDA')).toEqual({ texto: 'En revisión', tono: 'alerta' });
  });

  it('insignia de cada regla: Cumple, Excluyente, Excede, Por debajo, No cumple y Sin dato', () => {
    expect(insigniaRegla(t, regla('SUS-001')).texto).toBe('Cumple');
    expect(insigniaRegla(t, regla('SUS-001', { resultado: 'NO_CUMPLE' }))).toEqual({ texto: 'Excluyente', tono: 'peligro' });
    expect(insigniaRegla(t, regla('SUS-004', { resultado: 'NO_CUMPLE' }))).toEqual({ texto: 'Excede', tono: 'peligro' });
    expect(insigniaRegla(t, regla('SUS-011', { resultado: 'NO_CUMPLE' }))).toEqual({ texto: 'Por debajo', tono: 'alerta' });
    expect(insigniaRegla(t, regla('SUS-007', { resultado: 'NO_CUMPLE' }))).toEqual({ texto: 'No cumple', tono: 'alerta' });
    expect(insigniaRegla(t, regla('SUS-007', { resultado: 'NO_EVALUABLE' }))).toEqual({ texto: 'Sin dato', tono: 'neutro' });
  });

  it('condición legible de cada regla de la semilla y de una desconocida', () => {
    expect(REGLAS_S01.map((r) => condicion(t, f, r))).toEqual([
      'Edad entre 18 y 65 años',
      'Suma asegurada dentro del límite automático',
      'Nivel de riesgo no clasificado como alto',
      'Confianza del perfil por encima de 0,70',
      'Sin antecedentes en listas restrictivas',
      'Plazo del crédito dentro del máximo del producto',
    ]);
    expect(condicion(t, f, regla('SUS-001', { valor: '18' }))).toBe('SUS-001');
    expect(condicion(t, f, regla('SUS-900', { codigo: 'SUS-900', descripcion: 'regla.nueva' }))).toBe('SUS-900');
    expect(condicion(t, f, regla('SUS-011', { valor: ['0.80'] }))).toBe('Confianza del perfil por encima de 0,80');
  });

  it('valor del caso en la unidad de cada campo', () => {
    expect(REGLAS_S01.map((r) => valorCaso(t, f, r, 'COP'))).toEqual([
      '36 años',
      '$ 180.000.000',
      'Bajo',
      '0,92',
      'Sin coincidencias',
      '180 meses',
    ]);
    const revision = DECISION_REVISION.reglasEvaluadas;
    expect(valorCaso(t, f, revision.find((r) => r.codigo === 'SUS-004')!, 'COP')).toBe('$ 620.000.000 · límite $ 500.000.000');
    expect(valorCaso(t, f, regla('SUS-015', { valorCaso: '2' }), 'COP')).toBe('2 coincidencias');
    expect(valorCaso(t, f, regla('SUS-007', { valorCaso: 'OTRO' }), 'COP')).toBe('OTRO');
    expect(valorCaso(t, f, regla('SUS-007', { valorCaso: null, resultado: 'NO_EVALUABLE' }), 'COP')).toBe('Sin dato');
    const reservada = DECISION_RESERVADA.reglasEvaluadas.find((r) => r.codigo === 'SUS-015')!;
    expect(valorCaso(t, f, reservada, 'COP')).toBe('Reservado');
    expect(valorCaso(t, f, regla('SUS-001', { campo: 'otro' as never, valorCaso: 'x' }), 'COP')).toBe('x');
  });

  it('las reglas que no se cumplen van primero, cada grupo por orden (E04)', () => {
    const ordenadas = incumplidasPrimero(DECISION_REVISION.reglasEvaluadas).map((r) => r.codigo);
    expect(ordenadas).toEqual(['SUS-004', 'SUS-011', 'SUS-001', 'SUS-007', 'SUS-015', 'SUS-019']);
  });

  it('duración en cola', () => {
    expect(duracion(48)).toBe('48 m');
    expect(duracion(134)).toBe('2 h 14 m');
    expect(duracion(542)).toBe('9 h 02 m');
    expect(duracion(-3)).toBe('0 m');
  });

  it('tono del tiempo en cola frente al compromiso de 8 h (CF-S2-06)', () => {
    expect(tonoEnCola(48, 8)).toBe('exito');
    expect(tonoEnCola(239, 8)).toBe('exito');
    expect(tonoEnCola(240, 8)).toBe('alerta');
    expect(tonoEnCola(480, 8)).toBe('alerta');
    expect(tonoEnCola(481, 8)).toBe('peligro');
  });

  it('código visible de la cotización (CF-S2-10)', () => {
    expect(codigoCotizacion('3f2a9b1c-0000-4000-a000-000000000001')).toBe('COT-3F2A9B1C');
    expect(codigoCotizacion('3f2a9b1c-0000-4000-a000-000000000001', 'COT-2026-88214')).toBe('COT-2026-88214');
  });

  it('el día del usuario en su zona horaria', () => {
    const { desde, hasta } = diaLocal(new Date(2026, 9, 22, 15, 30));
    expect([desde.getDate(), desde.getHours(), desde.getMinutes()]).toEqual([22, 0, 0]);
    expect(hasta.getTime() - desde.getTime()).toBe(24 * 3600 * 1000);
  });

  it('clase global de la insignia por tono', () => {
    expect(['exito', 'alerta', 'peligro', 'neutro'].map((t) => claseTono(t as Parameters<typeof claseTono>[0]))).toEqual([
      'tag tag--ok',
      'tag tag--alerta',
      'tag tag--error',
      'tag tag--info',
    ]);
  });
});

describe('Presentación de la comunicación (HU-W14, funciones puras)', () => {
  const fecha = (instante: string) => `<${instante}>`;

  it('la condición de aseguramiento en palabras del cliente', () => {
    expect(textoCondicion(t, 'APROBADA_SIN_AJUSTES')).toBe('Aceptado sin ajustes');
    expect(textoCondicion(t, 'NO_ASEGURABLE')).toBe('No podemos asegurar esta solicitud con este producto');
    expect(textoCondicion(t, 'EN_REVISION')).toBe('En revisión');
  });

  it('insignia del siguiente paso: revisión, vencida o ninguna', () => {
    expect(insigniaSiguientePaso(t, COMUNICACION_REVISION)).toEqual({ texto: 'En revisión', tono: 'alerta' });
    expect(insigniaSiguientePaso(t, COMUNICACION_VENCIDA)).toEqual({ texto: 'Oferta vencida', tono: 'peligro' });
    expect(insigniaSiguientePaso(t, COMUNICACION_APROBADA)).toBeNull();
    expect(insigniaSiguientePaso(t, COMUNICACION_RECHAZADA)).toBeNull();
  });

  it('texto del siguiente paso con la vigencia o el plazo', () => {
    expect(textoSiguientePaso(t, COMUNICACION_APROBADA, fecha)).toBe(
      'Puedes continuar a la aceptación. La oferta está vigente hasta el <2026-10-26T14:00:00Z>.',
    );
    expect(textoSiguientePaso(t, COMUNICACION_VENCIDA, fecha)).toBe(
      'La oferta venció el <2026-10-26T14:00:00Z>. Para continuar, haz una nueva cotización.',
    );
    expect(textoSiguientePaso(t, COMUNICACION_RECHAZADA, fecha)).toBe('Puedes cotizar uno de los productos alternativos.');
    expect(textoSiguientePaso(t, COMUNICACION_REVISION, fecha)).toContain('hasta 8 horas');
    expect(textoSiguientePaso(t, { ...COMUNICACION_REVISION, plazoRespuestaHoras: null }, fecha)).toContain('Aún no tienes cobertura');
  });

  it('descriptor de la alternativa', () => {
    expect(textoDescriptor(t, { codigo: 'EDAD_MAXIMA', valor: '80' })).toBe('hasta 80 años');
    expect(textoDescriptor(t, { codigo: 'SIN_LIMITE_EDAD', valor: null })).toBe('sin límite de edad');
    expect(textoDescriptor(t, { codigo: 'EDAD_MAXIMA', valor: null })).toBe('sin límite de edad');
  });

  it('la ruta de la aceptación de HU-W15 (DS2-21)', () => {
    expect(rutaAceptacion('abc')).toEqual(['/contratacion', 'cotizaciones', 'abc', 'aceptacion']);
  });
});
