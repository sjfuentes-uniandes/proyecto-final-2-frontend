import {
  aCentavos,
  diaDelEvento,
  diaEnColombia,
  diasDeVencida,
  claseTono,
  diferenciaSemanal,
  fechaCorta,
  fechaDia,
  fechaHora,
  filaVerificacion,
  formatearCoordenadas,
  formatearDuracion,
  insigniaCoherencia,
  insigniaEstado,
  insigniaIntegridad,
  insigniaPrioridad,
  insigniaVerificacion,
  errorDeducible,
  errorValorIndemnizar,
  errorValorReclamado,
  montoParaCampo,
  normalizarMonto,
  rotuloPaso,
  sumaAseguradaDelAmparo,
  textoAccion,
  textoCanal,
  textoCausal,
  textoErrorMonto,
  textoOrigen,
  tiempoRestante,
  ultimosDigitos,
} from './presentacion';
import { TEXTOS_SINIESTROS } from './siniestros.i18n';
import { VerificacionCobertura } from './siniestros.modelo';

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

describe('Presentación de los siniestros: fechas, trámite y verificación (H01 y H03)', () => {
  // La zona del usuario se fija a UTC para que las pruebas no dependan de la máquina.
  const ISO = '2026-09-11T16:31:00Z';

  it('fechaCorta: «11/09 16:31» (día/mes en es-CO y mes/día en en-US)', () => {
    expect(fechaCorta('es-CO', ISO, 'UTC')).toBe('11/09 16:31');
    expect(fechaCorta('en-US', ISO, 'UTC')).toBe('09/11 16:31');
  });

  it('fechaHora: «11/09/2026 · 16:31» y la medianoche como 00:00', () => {
    expect(fechaHora('es-CO', ISO, 'UTC')).toBe('11/09/2026 · 16:31');
    expect(fechaHora('en-US', ISO, 'UTC')).toBe('09/11/2026 · 16:31');
    expect(fechaHora('es-CO', '2026-09-11T00:05:00Z', 'UTC')).toBe('11/09/2026 · 00:05');
  });

  it('las fechas respetan la zona del usuario', () => {
    expect(fechaHora('es-CO', ISO, 'America/Bogota')).toBe('11/09/2026 · 11:31');
  });

  it('fechaDia no cambia de día por la zona horaria', () => {
    expect(fechaDia('es-CO', '2026-11-04')).toBe('04/11/2026');
    expect(fechaDia('en-US', '2026-11-04')).toBe('11/04/2026');
  });

  it('rotuloPaso: «Recibido» dice por dónde llegó el reporte', () => {
    expect(rotuloPaso(es, 'RECIBIDO', 'MOVIL')).toBe('Recibido desde el móvil');
    expect(rotuloPaso(es, 'RECIBIDO', 'PORTAL')).toBe('Recibido desde el portal web');
    expect(rotuloPaso(es, 'RECIBIDO', 'PARAMETRICO')).toBe('Detectado por un evento paramétrico');
    expect(rotuloPaso(es, 'EVIDENCIAS_VALIDADAS', 'MOVIL')).toBe('Evidencias validadas');
    expect(rotuloPaso(es, 'EN_EVALUACION', 'MOVIL')).toBe('En evaluación');
    expect(rotuloPaso(es, 'DECISION', 'MOVIL')).toBe('Decisión');
    expect(rotuloPaso(es, 'PAGO_INDEMNIZACION', 'MOVIL')).toBe('Pago de la indemnización');
  });

  describe('filaVerificacion (mockup H03)', () => {
    const amparos = [{ codigo: 'DANO_ACCIDENTAL', nombre: 'Daño accidental', sumaAsegurada: '3000000.00' }];
    const fila = (codigo: VerificacionCobertura['codigo'], resultado: VerificacionCobertura['resultado'], detalle: Record<string, string>, t = es, locale = 'es-CO') =>
      filaVerificacion(t, locale, { codigo, resultado, detalle }, amparos);

    it('las seis del caso cumplido, con el dato que las sustenta', () => {
      const casos = [
        fila('VIGENCIA', 'CUMPLE', { fechaEvento: '2026-09-11', desde: '2026-05-09', hasta: '2027-05-09' }),
        fila('AMPARO', 'CUMPLE', { amparo: 'DANO_ACCIDENTAL' }),
        fila('CARENCIA', 'CUMPLE', { diasDesdeInicio: '179', carenciaDias: '30' }),
        fila('PLAZO_AVISO', 'CUMPLE', { minutosDesdeEvento: '41', plazoAvisoDias: '30' }),
        fila('PRIMAS', 'CUMPLE', { primasAlDia: 'true' }),
        fila('SOPORTES', 'PARCIAL', { presentes: '2', requeridos: '3' }),
      ];
      expect(casos.map((c) => [c.etiqueta, c.resultado, c.insignia.texto])).toEqual([
        ['Póliza vigente en la fecha del evento', '11/09/2026 · vigente', 'Cumple'],
        ['Evento cubierto por el amparo contratado', 'Daño accidental · incluido', 'Cumple'],
        ['Fuera del período de carencia', '179 días desde el inicio · carencia de 30 días', 'Cumple'],
        ['Dentro del plazo de aviso', '41 minutos después del evento', 'Cumple'],
        ['Primas al día', 'Sin mora', 'Cumple'],
        ['Soportes completos', '2 de 3 documentos', 'Parcial'],
      ]);
    });

    it('cuando no cumple dice por qué', () => {
      expect(fila('VIGENCIA', 'NO_CUMPLE', { fechaEvento: '2026-10-20', desde: '2025-05-09', hasta: '2026-05-09' }).resultado).toBe(
        '20/10/2026 · fuera de la vigencia (09/05/2025 a 09/05/2026)',
      );
      expect(fila('AMPARO', 'NO_CUMPLE', { amparo: 'ROBO' }).resultado).toBe('ROBO · no incluido');
      expect(fila('PRIMAS', 'NO_CUMPLE', { primasAlDia: 'false' }).resultado).toBe('Con mora');
      expect(fila('PLAZO_AVISO', 'NO_CUMPLE', { minutosDesdeEvento: '2880', plazoAvisoDias: '1' }).resultado).toBe('2 días después del evento');
      expect(fila('SOPORTES', 'NO_CUMPLE', { presentes: '0', requeridos: '3' }).insignia).toEqual({ texto: 'No cumple', tono: 'peligro' });
    });

    it('un resultado sin dato dice «Sin dato»', () => {
      for (const codigo of ['VIGENCIA', 'AMPARO', 'CARENCIA', 'PLAZO_AVISO', 'PRIMAS', 'SOPORTES'] as const) {
        const f = fila(codigo, 'NO_EVALUABLE', {});
        expect(f.resultado).withContext(codigo).toBe('Sin dato');
        expect(f.insignia.texto).toBe('No evaluable');
      }
    });

    it('un amparo sin nombre conocido se muestra por su código', () => {
      expect(filaVerificacion(es, 'es-CO', { codigo: 'AMPARO', resultado: 'CUMPLE', detalle: { amparo: 'PERDIDA_EQUIPAJE' } }).resultado).toBe(
        'PERDIDA_EQUIPAJE · incluido',
      );
    });

    it('un parámetro numérico dañado cuenta como cero', () => {
      expect(fila('SOPORTES', 'PARCIAL', { presentes: 'x' }).resultado).toBe('0 de 0 documentos');
    });

    it('habla inglés en en-US', () => {
      expect(fila('VIGENCIA', 'CUMPLE', { fechaEvento: '2026-09-11' }, en, 'en-US').resultado).toBe('09/11/2026 · in force');
      expect(fila('PLAZO_AVISO', 'CUMPLE', { minutosDesdeEvento: '41' }, en, 'en-US').resultado).toBe('41 minutes after the event');
    });
  });

  it('diferenciaSemanal y claseTono', () => {
    expect(diferenciaSemanal(37, 28)).toBe(9);
    expect(diferenciaSemanal(2, 5)).toBe(-3);
    expect([claseTono('exito'), claseTono('alerta'), claseTono('peligro'), claseTono('info'), claseTono('neutro')]).toEqual([
      'tag tag--ok',
      'tag tag--alerta',
      'tag tag--error',
      'tag tag--info',
      'tag tag--neutro',
    ]);
  });

  describe('Decisión del analista (HU-W20): montos como texto decimal', () => {
    it('normalizarMonto lee el formato del idioma y devuelve texto decimal sin coma flotante', () => {
      expect(normalizarMonto('es-CO', '2.850.000')).toBe('2850000');
      expect(normalizarMonto('es-CO', '$ 2.850.000,5')).toBe('2850000.5');
      expect(normalizarMonto('es-CO', '2850000,50')).toBe('2850000.50');
      expect(normalizarMonto('en-US', '2,850,000.25')).toBe('2850000.25');
      expect(normalizarMonto('en-US', '0.50')).toBe('0.50');
      expect(normalizarMonto('es-CO', '007')).toBe('7');
    });

    it('rechaza lo que podría leerse mal: el punto de miles solo agrupa de tres en tres', () => {
      expect(normalizarMonto('es-CO', '2850000.50')).toBeNull();
      expect(normalizarMonto('es-CO', '2.85')).toBeNull();
      expect(normalizarMonto('en-US', '2850000,50')).toBeNull();
      expect(normalizarMonto('es-CO', '1,234')).toBeNull();
      expect(normalizarMonto('es-CO', '1,23')).toBe('1.23');
      expect(normalizarMonto('es-CO', '1,234,5')).toBeNull();
    });

    it('rechaza texto vacío, letras, signos y más de dos decimales', () => {
      for (const texto of ['', ' ', 'abc', '-5', '12a', '1.5.5', '10,123']) {
        expect(normalizarMonto('es-CO', texto)).withContext(texto).toBeNull();
      }
    });

    it('aCentavos compara sin redondeos de coma flotante', () => {
      expect(aCentavos('2850000')).toBe(285000000n);
      expect(aCentavos('0.1') + aCentavos('0.2')).toBe(aCentavos('0.3'));
      expect(aCentavos('9007199254740993.99')).toBe(900719925474099399n);
    });

    it('montoParaCampo escribe el monto con el formato del idioma', () => {
      expect(montoParaCampo('es-CO', '2850000')).toBe('2.850.000');
      expect(montoParaCampo('es-CO', '2850000.50')).toBe('2.850.000,50');
      expect(montoParaCampo('en-US', '2850000.50')).toBe('2,850,000.50');
      expect(montoParaCampo('es-CO', '350.00')).toBe('350');
      expect(montoParaCampo('es-CO', '999')).toBe('999');
    });

    it('el valor que se escribe y se vuelve a leer es el mismo en los dos idiomas', () => {
      for (const locale of ['es-CO', 'en-US']) {
        expect(normalizarMonto(locale, montoParaCampo(locale, '1234567.89'))).toBe('1234567.89');
      }
    });
  });

  describe('Decisión del analista (HU-W20): validadores de la liquidación', () => {
    const RECLAMADO = '2.850.000';
    const SUMA = '3000000.00';

    it('errorValorReclamado: obligatorio, formato y mayor que cero', () => {
      expect(errorValorReclamado('es-CO', '')).toBe('obligatorio');
      expect(errorValorReclamado('es-CO', 'mucho')).toBe('formato');
      expect(errorValorReclamado('es-CO', '0')).toBe('mayorACero');
      expect(errorValorReclamado('es-CO', '2.850.000')).toBeNull();
    });

    it('errorDeducible: puede ser cero, no puede superar el reclamado', () => {
      expect(errorDeducible('es-CO', '', RECLAMADO)).toBe('obligatorio');
      expect(errorDeducible('es-CO', 'x', RECLAMADO)).toBe('formato');
      expect(errorDeducible('es-CO', '0', RECLAMADO)).toBeNull();
      expect(errorDeducible('es-CO', '2.850.000', RECLAMADO)).toBeNull();
      expect(errorDeducible('es-CO', '2.850.001', RECLAMADO)).toBe('superaReclamado');
    });

    it('errorDeducible no se queja del tope si el valor reclamado aún no es válido', () => {
      expect(errorDeducible('es-CO', '350.000', '')).toBeNull();
    });

    it('errorValorIndemnizar: 0, igual al reclamado y suma asegurada + 1', () => {
      expect(errorValorIndemnizar('es-CO', '', RECLAMADO, SUMA)).toBe('obligatorio');
      expect(errorValorIndemnizar('es-CO', 'x', RECLAMADO, SUMA)).toBe('formato');
      expect(errorValorIndemnizar('es-CO', '0', RECLAMADO, SUMA)).toBe('mayorACero');
      expect(errorValorIndemnizar('es-CO', '0,01', RECLAMADO, SUMA)).toBeNull();
      expect(errorValorIndemnizar('es-CO', '2.850.000', RECLAMADO, SUMA)).toBeNull();
      expect(errorValorIndemnizar('es-CO', '2.850.000,01', RECLAMADO, SUMA)).toBe('superaReclamado');
    });

    it('errorValorIndemnizar respeta la suma asegurada del amparo reclamado (R-05)', () => {
      expect(errorValorIndemnizar('es-CO', '3.000.000', '5.000.000', SUMA)).toBeNull();
      expect(errorValorIndemnizar('es-CO', '3.000.000,01', '5.000.000', SUMA)).toBe('superaSuma');
      expect(errorValorIndemnizar('es-CO', '4.000.000', '5.000.000', null)).toBeNull();
    });

    it('textoErrorMonto traduce cada error y el tope lleva la suma asegurada', () => {
      expect(textoErrorMonto(es, 'obligatorio', '')).toBe(es.liqErrObligatorio);
      expect(textoErrorMonto(es, 'formato', '')).toBe(es.liqErrFormato);
      expect(textoErrorMonto(es, 'mayorACero', '')).toBe(es.liqErrMayorACero);
      expect(textoErrorMonto(es, 'superaReclamado', '')).toBe(es.liqErrSuperaReclamado);
      expect(textoErrorMonto(en, 'superaSuma', '$3,000,000')).toBe('It cannot exceed the sum insured for the cover ($3,000,000).');
    });

    it('sumaAseguradaDelAmparo busca el amparo por la causa del siniestro', () => {
      const amparos = [{ codigo: 'DANO_ACCIDENTAL', nombre: 'Daño accidental', sumaAsegurada: '3000000.00' }];
      expect(sumaAseguradaDelAmparo('DANO_ACCIDENTAL', amparos)).toBe('3000000.00');
      expect(sumaAseguradaDelAmparo('ROBO', amparos)).toBeNull();
    });
  });

  describe('Decisión del analista (HU-W20): textos del catálogo', () => {
    it('traduce cada causal y cada canal', () => {
      expect(textoCausal(es, 'POLIZA_NO_VIGENTE')).toBe('Póliza no vigente');
      expect(textoCausal(es, 'EVENTO_NO_CUBIERTO')).toBe('Evento no cubierto');
      expect(textoCausal(es, 'PERIODO_DE_CARENCIA')).toBe('Periodo de carencia');
      expect(textoCausal(es, 'AVISO_EXTEMPORANEO')).toBe('Aviso extemporáneo');
      expect(textoCausal(es, 'PRIMAS_EN_MORA')).toBe('Primas en mora');
      expect(textoCausal(en, 'EVIDENCIA_INCONSISTENTE')).toBe('Inconsistent evidence');
      expect(textoCausal(en, 'EXCLUSION_CONTRACTUAL')).toBe('Contractual exclusion');
      expect(textoCanal(es, 'PUSH_Y_CORREO')).toBe('Notificación push y correo');
      expect(textoCanal(es, 'PUSH')).toBe('Notificación push');
      expect(textoCanal(en, 'CORREO')).toBe('Email');
    });

    it('traduce las acciones del historial que escribe la decisión', () => {
      expect(textoAccion(es, 'APROBADO')).toBe('Aprobado');
      expect(textoAccion(es, 'RECHAZADO')).toBe('Rechazado');
      expect(textoAccion(es, 'SOPORTE_SOLICITADO')).toBe('Soporte solicitado');
      expect(textoAccion(en, 'PLAZO_SOPORTE_VENCIDO')).toBe('Document deadline expired');
    });

    it('ultimosDigitos deja los cuatro últimos de la cuenta enmascarada', () => {
      expect(ultimosDigitos('****1004')).toBe('1004');
      expect(ultimosDigitos('•••• 4417')).toBe('4417');
      expect(ultimosDigitos('12')).toBe('12');
    });
  });

  describe('Rechazo (HU-W20, H07): día del evento y póliza vencida', () => {
    it('diaEnColombia cuenta el día en UTC−5, no en UTC', () => {
      expect(diaEnColombia('2026-11-05T00:19:00Z')).toBe('2026-11-04');
      expect(diaEnColombia('2026-11-05T05:00:00Z')).toBe('2026-11-05');
    });

    it('diaDelEvento usa el de la verificación de vigencia y, si no hay, el del instante', () => {
      const vigencia: VerificacionCobertura = { codigo: 'VIGENCIA', resultado: 'NO_CUMPLE', detalle: { fechaEvento: '2026-09-06' } };
      expect(diaDelEvento('2026-11-05T00:19:00Z', [vigencia])).toBe('2026-09-06');
      expect(diaDelEvento('2026-11-05T00:19:00Z', [])).toBe('2026-11-04');
      expect(diaDelEvento('2026-11-05T00:19:00Z', [{ codigo: 'VIGENCIA', resultado: 'NO_EVALUABLE', detalle: {} }])).toBe('2026-11-04');
    });

    it('diasDeVencida: 33 días de agosto a septiembre; 0 si estaba vigente, el último día o la fecha no se lee', () => {
      expect(diasDeVencida('2026-09-06', '2026-08-04')).toBe(33);
      expect(diasDeVencida('2026-08-04', '2026-08-04')).toBe(0);
      expect(diasDeVencida('2026-07-01', '2026-08-04')).toBe(0);
      expect(diasDeVencida('no-es-fecha', '2026-08-04')).toBe(0);
    });
  });
});
