import {
  filasEvento,
  formatearEntero,
  formatearMedicion,
  horaMinuto,
  indicadoresParametricos,
  insigniaPagoActivado,
  porcentajeConsumidores,
  ritmoPresentado,
  textoConsumidores,
  textoDisparador,
  textoRegla,
} from './parametricos.presentacion';
import { TEXTOS_SINIESTROS } from './siniestros.i18n';
import { EVENTO_LLUVIA, RESUMEN_PARAMETRICOS } from './siniestros.testing';

const es = TEXTOS_SINIESTROS['es-CO'];
const en = TEXTOS_SINIESTROS['en-US'];

describe('presentación de los siniestros paramétricos (H09, HU-W22)', () => {
  it('formatea enteros y mediciones con el idioma, a lo sumo con tres decimales', () => {
    expect(formatearEntero('es-CO', 612480)).toBe('612.480');
    expect(formatearEntero('en-US', 612480)).toBe('612,480');
    expect(formatearMedicion('es-CO', '123.500')).toBe('123,5');
    expect(formatearMedicion('en-US', '120')).toBe('120');
    expect(formatearMedicion('es-CO', 'no-numero')).toBe('no-numero');
  });

  it('la hora y el minuto salen con dos dígitos en 24 h de la zona pedida', () => {
    expect(horaMinuto('es-CO', '2026-11-05T14:05:00Z', 'UTC')).toBe('14:05');
    expect(horaMinuto('en-US', '2026-11-05T09:05:00Z', 'America/Bogota')).toBe('04:05');
  });

  describe('indicadores', () => {
    it('muestra los cinco del mockup con el detalle de cola y la cola de descarte por revisar', () => {
      const i = indicadoresParametricos(es, 'es-CO', RESUMEN_PARAMETRICOS);
      expect(i.map((x) => [x.etiqueta, x.valor, x.detalle, x.tono])).toEqual([
        ['Eventos recibidos', '612.480', 'Procesados y duplicados', 'base'],
        ['Eventos procesados', '611.904', '576 mensajes en cola', 'ok'],
        ['Pagos activados', '18.204', 'Superaron el umbral', 'base'],
        ['Pagos duplicados', '576', 'Consumo idempotente', 'base'],
        ['Cola de descarte', '3', 'Requieren revisión', 'alerta'],
      ]);
    });

    it('sin mensajes en la cola de descarte es verde; con una sola fuente caída dice «No disponible», no cero', () => {
      const vacia = indicadoresParametricos(es, 'es-CO', { ...RESUMEN_PARAMETRICOS, enDlq: 0 });
      expect(vacia[4]).toEqual({ etiqueta: 'Cola de descarte', valor: '0', detalle: 'Ninguno por revisar', tono: 'ok' });
      const sinDato = indicadoresParametricos(es, 'es-CO', {
        ...RESUMEN_PARAMETRICOS,
        enDlq: null,
        cola: { profundidad: null, consumidoresActivos: null, consumidoresMaximos: null },
      });
      expect(sinDato[4]).toEqual({ etiqueta: 'Cola de descarte', valor: 'No disponible', detalle: 'No disponible', tono: 'neutro' });
      expect(sinDato[1].detalle).toBe('Cola no disponible');
    });

    it('en inglés usa el singular y los textos de en-US', () => {
      const una = indicadoresParametricos(en, 'en-US', { ...RESUMEN_PARAMETRICOS, cola: { ...RESUMEN_PARAMETRICOS.cola, profundidad: 1 } });
      expect(una[1].detalle).toBe('1 message queued');
      expect(indicadoresParametricos(en, 'en-US', RESUMEN_PARAMETRICOS)[0].etiqueta).toBe('Events received');
    });
  });

  describe('ritmo de procesamiento', () => {
    it('una barra por minuto, proporcional al máximo, y un resumen con ese máximo', () => {
      const ritmo = ritmoPresentado(es, 'es-CO', RESUMEN_PARAMETRICOS.ritmoPorMinuto);
      expect(ritmo.barras.length).toBe(15);
      expect(ritmo.barras[14].altura).toBe(100);
      expect(ritmo.barras[6].altura).toBe(47);
      expect(ritmo.resumen).toBe('Eventos procesados por minuto en los últimos 15 minutos. El máximo fue 1.500.');
      expect(ritmo.barras[14].etiqueta).toMatch(/^\d{2}:\d{2}: 1\.500$/);
    });

    it('sin eventos deja las barras en su altura mínima y lo dice', () => {
      const ritmo = ritmoPresentado(
        es,
        'es-CO',
        RESUMEN_PARAMETRICOS.ritmoPorMinuto.map((m) => ({ ...m, procesados: 0 })),
      );
      expect(new Set(ritmo.barras.map((b) => b.altura))).toEqual(new Set([4]));
      expect(ritmo.resumen).toBe('Ningún evento se procesó en los últimos 15 minutos.');
    });
  });

  describe('consumidores', () => {
    it('«24 de 30»; sin máximo solo los activos; sin métrica, «No disponible»', () => {
      expect(textoConsumidores(es, 'es-CO', 24, 30)).toBe('24 de 30');
      expect(textoConsumidores(en, 'en-US', 24, 30)).toBe('24 of 30');
      expect(textoConsumidores(es, 'es-CO', 24, null)).toBe('24');
      expect(textoConsumidores(es, 'es-CO', null, 30)).toBe('No disponible');
    });

    it('el avance solo existe si se conocen los dos números y el máximo es positivo', () => {
      expect(porcentajeConsumidores(24, 30)).toBe(80);
      expect(porcentajeConsumidores(40, 30)).toBe(100);
      expect(porcentajeConsumidores(24, null)).toBeNull();
      expect(porcentajeConsumidores(null, 30)).toBeNull();
      expect(porcentajeConsumidores(1, 0)).toBeNull();
    });
  });

  describe('últimos pagos', () => {
    it('el disparador dice la medición y el umbral con su unidad', () => {
      const d = RESUMEN_PARAMETRICOS.ultimosPagos[0].disparador;
      expect(textoDisparador(es, 'es-CO', d)).toBe('Lluvia acumulada: 123,5 mm (umbral 120 mm)');
      expect(textoDisparador(en, 'en-US', d)).toBe('Accumulated rainfall: 123.5 mm (threshold 120 mm)');
      expect(textoDisparador(es, 'es-CO', { ...d, tipoEvento: 'TERREMOTO' })).toBe('TERREMOTO: 123,5 mm (umbral 120 mm)');
    });

    it('la insignia del pago lleva texto y tono, y «Estado no disponible» si siniestros no respondió', () => {
      expect(insigniaPagoActivado(es, 'CONFIRMADO')).toEqual({ texto: 'Pagado', tono: 'exito' });
      expect(insigniaPagoActivado(es, 'PENDIENTE')).toEqual({ texto: 'Pago pendiente', tono: 'info' });
      expect(insigniaPagoActivado(es, 'RECHAZADO')).toEqual({ texto: 'Pago por gestionar', tono: 'alerta' });
      expect(insigniaPagoActivado(es, 'SIN_PAGO')).toEqual({ texto: 'Sin pago', tono: 'neutro' });
      expect(insigniaPagoActivado(es, null)).toEqual({ texto: 'Estado no disponible', tono: 'neutro' });
    });
  });

  describe('evento y regla aplicada', () => {
    it('traduce la regla conocida y muestra por su código una nueva', () => {
      expect(textoRegla(es, 'VALOR_IGUAL_O_SUPERIOR_AL_UMBRAL')).toBe('Paga cuando el valor observado es igual o superior al umbral');
      expect(textoRegla(en, 'VALOR_IGUAL_O_SUPERIOR_AL_UMBRAL')).toBe('Pays when the observed value is equal to or above the threshold');
      expect(textoRegla(es, 'REGLA_NUEVA')).toBe('Regla REGLA_NUEVA');
    });

    it('las filas del bloque: tipo, fuente, zona, instante, medición, umbral, regla con versión y origen', () => {
      expect(filasEvento(es, 'es-CO', EVENTO_LLUVIA).map((f) => [f.etiqueta, f.valor])).toEqual([
        ['Tipo de evento', 'Lluvia acumulada'],
        ['Fuente', 'IDEAM-SIM'],
        ['Zona', 'ZONA-NORTE'],
        ['Observado', jasmine.stringMatching(/^05\/11\/2026 · \d{2}:\d{2}$/) as unknown as string],
        ['Valor observado', '123,5 mm'],
        ['Umbral contratado', '120 mm'],
        ['Regla aplicada', 'Paga cuando el valor observado es igual o superior al umbral · versión v1'],
        ['Evento de origen', 'EVT-2026-0913'],
      ]);
    });
  });
});
