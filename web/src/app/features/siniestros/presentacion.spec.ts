import {
  formatearCoordenadas,
  formatearDuracion,
  insigniaCoherencia,
  insigniaEstado,
  insigniaIntegridad,
  insigniaPrioridad,
  insigniaVerificacion,
  textoOrigen,
  tiempoRestante,
} from './presentacion';
import { TEXTOS_SINIESTROS } from './siniestros.i18n';

const es = TEXTOS_SINIESTROS['es-CO'];
const en = TEXTOS_SINIESTROS['en-US'];
const COMPROMISO = 48;

describe('Presentación de los siniestros (HU-W19, mockups H01 a H04)', () => {
  describe('tiempoRestante (verde < 50 % consumido, ámbar entre 50 % y 100 %, rojo vencido)', () => {
    it('verde mientras quede más de la mitad del compromiso (más de 24 h)', () => {
      expect(tiempoRestante(es, 32 * 60, COMPROMISO)).toEqual({ texto: '32 h', tono: 'exito' });
      expect(tiempoRestante(es, 24 * 60 + 1, COMPROMISO).tono).toBe('exito');
    });

    it('ámbar con la mitad o menos y sin vencer', () => {
      expect(tiempoRestante(es, 24 * 60, COMPROMISO).tono).toBe('alerta');
      expect(tiempoRestante(es, 6 * 60, COMPROMISO)).toEqual({ texto: '6 h', tono: 'alerta' });
      expect(tiempoRestante(es, 0, COMPROMISO)).toEqual({ texto: '0 min', tono: 'alerta' });
    });

    it('rojo vencido con «Vencido X h» (mockup: Vencido 2 h y Vencido 9 h)', () => {
      expect(tiempoRestante(es, -120, COMPROMISO)).toEqual({ texto: 'Vencido 2 h', tono: 'peligro' });
      expect(tiempoRestante(es, -9 * 60, COMPROMISO)).toEqual({ texto: 'Vencido 9 h', tono: 'peligro' });
      expect(tiempoRestante(es, -1, COMPROMISO)).toEqual({ texto: 'Vencido 1 min', tono: 'peligro' });
      expect(tiempoRestante(es, -59, COMPROMISO).texto).toBe('Vencido 59 min');
    });

    it('redondea las horas a la más cercana, con mínimo de una', () => {
      expect(tiempoRestante(es, 90, COMPROMISO).texto).toBe('2 h');
      expect(tiempoRestante(es, 60, COMPROMISO).texto).toBe('1 h');
      expect(tiempoRestante(es, 59, COMPROMISO).texto).toBe('59 min');
      expect(tiempoRestante(es, -150, COMPROMISO).texto).toBe('Vencido 3 h');
    });

    it('un compromiso distinto mueve el umbral del verde', () => {
      expect(tiempoRestante(es, 13 * 60, 24).tono).toBe('exito');
      expect(tiempoRestante(es, 12 * 60, 24).tono).toBe('alerta');
    });

    it('con el reloj pausado (falta de soporte) no corre: se muestra neutro', () => {
      expect(tiempoRestante(es, 38 * 60, COMPROMISO, true)).toEqual({ texto: 'En pausa · 38 h', tono: 'neutro' });
      expect(tiempoRestante(es, -5, COMPROMISO, true).texto).toBe('En pausa · 0 min');
    });

    it('habla inglés en en-US', () => {
      expect(tiempoRestante(en, -120, COMPROMISO).texto).toBe('Overdue 2 h');
      expect(tiempoRestante(en, -10, COMPROMISO).texto).toBe('Overdue 10 min');
      expect(tiempoRestante(en, 600, COMPROMISO, true).texto).toBe('Paused · 10 h');
    });
  });

  describe('insignias (texto + color)', () => {
    it('estado del siniestro', () => {
      expect(insigniaEstado(es, 'REPORTADO')).toEqual({ texto: 'Reportado', tono: 'neutro' });
      expect(insigniaEstado(es, 'EN_EVALUACION')).toEqual({ texto: 'En evaluación', tono: 'info' });
      expect(insigniaEstado(es, 'FALTA_SOPORTE')).toEqual({ texto: 'Falta soporte', tono: 'alerta' });
      expect(insigniaEstado(es, 'APROBADO')).toEqual({ texto: 'Aprobado', tono: 'exito' });
      expect(insigniaEstado(es, 'RECHAZADO')).toEqual({ texto: 'Rechazado', tono: 'peligro' });
    });

    it('integridad de la evidencia', () => {
      expect(insigniaIntegridad(es, 'VERIFICADA')).toEqual({ texto: 'Verificada', tono: 'exito' });
      expect(insigniaIntegridad(es, 'ALTERADA')).toEqual({ texto: 'Alterada', tono: 'peligro' });
      expect(insigniaIntegridad(es, 'NO_VERIFICABLE')).toEqual({ texto: 'No verificable', tono: 'neutro' });
      expect(insigniaIntegridad(es, 'NO_DISPONIBLE')).toEqual({ texto: 'No disponible', tono: 'alerta' });
    });

    it('resultado de una verificación de cobertura', () => {
      expect(insigniaVerificacion(es, 'CUMPLE')).toEqual({ texto: 'Cumple', tono: 'exito' });
      expect(insigniaVerificacion(es, 'NO_CUMPLE')).toEqual({ texto: 'No cumple', tono: 'peligro' });
      expect(insigniaVerificacion(es, 'PARCIAL')).toEqual({ texto: 'Parcial', tono: 'alerta' });
      expect(insigniaVerificacion(es, 'NO_EVALUABLE')).toEqual({ texto: 'No evaluable', tono: 'neutro' });
    });

    it('coherencia de la evidencia', () => {
      expect(insigniaCoherencia(es, 'COHERENTE')).toEqual({ texto: 'Coherente', tono: 'exito' });
      expect(insigniaCoherencia(es, 'INCONSISTENTE')).toEqual({ texto: 'Inconsistente', tono: 'peligro' });
      expect(insigniaCoherencia(es, 'NO_EVALUABLE')).toEqual({ texto: 'No evaluable', tono: 'neutro' });
    });

    it('prioridad derivada', () => {
      expect(insigniaPrioridad(es, 'ALTA')).toEqual({ texto: 'Alta', tono: 'peligro' });
      expect(insigniaPrioridad(es, 'MEDIA')).toEqual({ texto: 'Media', tono: 'alerta' });
      expect(insigniaPrioridad(es, 'BAJA')).toEqual({ texto: 'Baja', tono: 'exito' });
    });

    it('origen del reporte', () => {
      expect([textoOrigen(es, 'MOVIL'), textoOrigen(es, 'PORTAL'), textoOrigen(es, 'PARAMETRICO')]).toEqual([
        'Móvil',
        'Portal web',
        'Paramétrico',
      ]);
      expect(textoOrigen(en, 'PORTAL')).toBe('Web portal');
    });
  });

  describe('coordenadas', () => {
    it('con hemisferio y cuatro decimales, según el idioma', () => {
      expect(formatearCoordenadas(es, 'es-CO', 4.6512, -74.056)).toBe('4,6512° N, 74,0560° O');
      expect(formatearCoordenadas(en, 'en-US', 4.6512, -74.056)).toBe('4.6512° N, 74.0560° W');
    });

    it('hemisferios sur y este', () => {
      expect(formatearCoordenadas(es, 'es-CO', -33.5, 151.25)).toBe('33,5000° S, 151,2500° E');
    });

    it('sin coordenadas dice que no hay ubicación', () => {
      expect(formatearCoordenadas(es, 'es-CO', null, null)).toBe('Sin ubicación');
      expect(formatearCoordenadas(es, 'es-CO', 4.6, null)).toBe('Sin ubicación');
    });
  });

  describe('duración', () => {
    it('usa la unidad entera más grande', () => {
      expect(formatearDuracion(es, 41)).toBe('41 minutos');
      expect(formatearDuracion(es, 1)).toBe('1 minuto');
      expect(formatearDuracion(es, 120)).toBe('2 horas');
      expect(formatearDuracion(es, 60)).toBe('1 hora');
      expect(formatearDuracion(es, 90)).toBe('90 minutos');
      expect(formatearDuracion(es, 2880)).toBe('2 días');
      expect(formatearDuracion(es, 1440)).toBe('1 día');
    });

    it('ignora el signo y redondea los minutos', () => {
      expect(formatearDuracion(es, -34)).toBe('34 minutos');
      expect(formatearDuracion(es, 33.6)).toBe('34 minutos');
    });

    it('habla inglés en en-US', () => {
      expect(formatearDuracion(en, 41)).toBe('41 minutes');
      expect(formatearDuracion(en, 60)).toBe('1 hour');
      expect(formatearDuracion(en, 4320)).toBe('3 days');
    });
  });
});
