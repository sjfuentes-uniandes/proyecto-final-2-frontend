import { insigniaEstado, digitosDeNumeroInvalido, etiquetaEstado, haceCuanto, numeroValido, propagacionMs, textoPropagacion } from './presentacion';
import { TEXTOS_CONSULTA } from './consulta.i18n';
import { ESTADOS_VIGENCIA } from './consulta.modelo';

const es = TEXTOS_CONSULTA['es-CO'];
const en = TEXTOS_CONSULTA['en-US'];

describe('Presentación de la consulta (HU-W18)', () => {
  it('estado → chip con texto y tono', () => {
    expect(insigniaEstado(es, 'VIGENTE')).toEqual({ texto: 'Vigente', tono: 'exito' });
    expect(insigniaEstado(es, 'POR_VENCER')).toEqual({ texto: 'Por vencer', tono: 'alerta' });
    expect(insigniaEstado(es, 'VENCIDA')).toEqual({ texto: 'Vencida', tono: 'peligro' });
    expect(insigniaEstado(es, 'NO_INICIADA')).toEqual({ texto: 'No iniciada', tono: 'neutro' });
    expect(insigniaEstado(en, 'POR_VENCER').texto).toBe('Expiring soon');
  });

  it('NO_INICIADA en el detalle dice cuándo inicia', () => {
    expect(insigniaEstado(es, 'NO_INICIADA', '2 nov 2026').texto).toBe('Inicia el 2 nov 2026');
    expect(insigniaEstado(en, 'NO_INICIADA', 'Nov 2, 2026').texto).toBe('Starts on Nov 2, 2026');
  });

  it('cada estado tiene una etiqueta distinta para el filtro', () => {
    const etiquetas = ESTADOS_VIGENCIA.map((e) => etiquetaEstado(es, e));
    expect(new Set(etiquetas).size).toBe(ESTADOS_VIGENCIA.length);
  });

  it('valida el formato 000-0000-000000 y cuenta los dígitos', () => {
    expect(numeroValido('202-6001-000001')).toBeTrue();
    for (const malo of ['2026001000001', '202-6001-00001', '202-6001-0000011', 'abc-6001-000001', '']) {
      expect(numeroValido(malo)).withContext(malo).toBeFalse();
    }
    expect(digitosDeNumeroInvalido('202-6001-00001')).toBe(12);
    expect(digitosDeNumeroInvalido('2026001000001')).toBe(13);
    expect(digitosDeNumeroInvalido('202-6001-000001')).toBeNull();
  });

  describe('propagación', () => {
    const emitida = '2026-10-31T15:29:55.000Z';

    it('menos de 1 s', () => {
      const ms = propagacionMs(emitida, '2026-10-31T15:29:55.400Z');
      expect(ms).toBe(400);
      expect(textoPropagacion(es, ms!)).toBe('menos de 1 s');
      expect(textoPropagacion(en, ms!)).toBe('less than 1 s');
    });

    it('segundos', () => {
      const ms = propagacionMs(emitida, '2026-10-31T15:30:00.000Z');
      expect(ms).toBe(5000);
      expect(textoPropagacion(es, ms!)).toBe('5 segundos');
      expect(textoPropagacion(es, 1000)).toBe('1 segundo');
      expect(textoPropagacion(en, 1400)).toBe('1 second');
    });

    it('negativa o inválida: se oculta', () => {
      expect(propagacionMs(emitida, '2026-10-31T15:29:50.000Z')).toBeNull();
      expect(propagacionMs(emitida, 'no es fecha')).toBeNull();
    });

    it('la nota usa el desfase', () => {
      expect(es.notaDesfase('5 segundos')).toContain('5 segundos después de la emisión');
    });
  });

  describe('hace X', () => {
    const ahora = new Date('2026-10-31T16:00:00Z');

    it('elige la unidad más grande', () => {
      expect(haceCuanto('2026-10-31T15:59:30Z', ahora, 'es-CO')).toBe('hace 30 segundos');
      expect(haceCuanto('2026-10-31T15:55:00Z', ahora, 'es-CO')).toBe('hace 5 minutos');
      expect(haceCuanto('2026-10-31T13:00:00Z', ahora, 'es-CO')).toBe('hace 3 horas');
      expect(haceCuanto('2026-10-29T16:00:00Z', ahora, 'es-CO')).toBe('anteayer');
    });

    it('en en-US', () => {
      expect(haceCuanto('2026-10-31T15:55:00Z', ahora, 'en-US')).toBe('5 minutes ago');
      expect(haceCuanto('2026-10-31T16:00:00Z', ahora, 'en-US')).toBe('now');
    });

    it('el actualizado compone el texto', () => {
      expect(es.actualizadoHace('hace 5 minutos')).toBe('Actualizado hace 5 minutos');
      expect(en.actualizadoHace('5 minutes ago')).toBe('Updated 5 minutes ago');
    });
  });
});
