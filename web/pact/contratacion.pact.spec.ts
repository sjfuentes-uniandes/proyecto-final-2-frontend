import { MatchersV3 } from '@pact-foundation/pact';
import { expect, test } from '@playwright/test';

import {
  Aceptacion,
  Comunicacion,
  DecisionSuscripcion,
  ReglaEvaluada,
  SolicitudAceptacion,
} from '../src/app/features/contratacion/contratacion.modelo';
import {
  ACEPTACION,
  DECISION_APROBADA,
  DECISION_RECHAZADA,
  DECISION_RESERVADA,
  DECISION_REVISION,
  SOLICITUD_ACEPTACION,
} from '../src/app/features/contratacion/contratacion.testing';
import { ACEPTA_JSON, nuevoPacto } from './pacto';

const { boolean, eachLike, equal, integer, like, regex, uuid } = MatchersV3;

/**
 * Pact consumidor de contratación. HU-W14 (W14-F06): lo que el portal necesita de
 * GET /v1/suscripciones/{decisionId} de bff-web para comunicar la decisión. HU-W15 (W15-F07): el
 * registro de la aceptación (POST /v1/cotizaciones/{cotizacionId}/aceptacion), al final del archivo. La `comunicacion` se
 * compara exacta (es con lo único que el portal decide qué mostrar); el resto de la decisión, por
 * tipo. Los estados del proveedor llevan el caso sintético (S01, S02, S04, S06) para que bff-web los
 * reproduzca con polizas y clientes simulados (fase C).
 */
const pacto = nuevoPacto();
/** Instante ISO 8601 en UTC o con desfase; bff-web puede incluir fracciones de segundo. */
const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const instante = (ejemplo: string) => regex(INSTANTE, ejemplo);

/**
 * Sin `valor` ni `valorCaso`: `eachLike` exige a todas las reglas el tipo de la primera, y `valor` es
 * texto o lista según el operador y `valorCaso` es null en una regla reservada para el asesor
 * (DS2-07). La tabla de reglas es de HU-W13; este pacto es sobre la comunicación.
 */
function regla(ejemplo: ReglaEvaluada) {
  return {
    codigo: regex(/^SUS-\d{3}$/, ejemplo.codigo),
    orden: integer(ejemplo.orden),
    tipo: like(ejemplo.tipo),
    descripcion: like(ejemplo.descripcion),
    campo: like(ejemplo.campo),
    operador: like(ejemplo.operador),
    resultado: like(ejemplo.resultado),
    visibilidad: like(ejemplo.visibilidad),
    reservada: boolean(ejemplo.reservada),
  };
}

/** Exacta: condición, contratación, siguiente paso, motivo, alternativas y plazo. */
function comunicacion(c: Comunicacion) {
  return {
    condicion: equal(c.condicion),
    admiteContratacion: equal(c.admiteContratacion),
    siguientePaso: equal(c.siguientePaso),
    vigenteHasta: c.vigenteHasta === null ? null : instante(c.vigenteHasta),
    motivoCliente: c.motivoCliente === null ? null : equal(c.motivoCliente),
    alternativas: equal(c.alternativas),
    plazoRespuestaHoras: c.plazoRespuestaHoras === null ? null : equal(c.plazoRespuestaHoras),
  };
}

/**
 * Sin `ofertaId`, `cotizacionCodigo` ni `clienteNombre`: pueden ser null o texto (W04 los llena; el
 * nombre depende de clientes, R-31) y Pact no puede expresar «null o texto». El portal no usa el
 * primero y trata los otros dos como opcionales.
 */
function decision(d: DecisionSuscripcion) {
  return {
    id: uuid(d.id),
    codigo: regex(/^DEC-\d{4}-\d{6}$/, d.codigo),
    cotizacionId: uuid(d.cotizacionId),
    clienteId: uuid(d.clienteId),
    productoId: like(d.productoId),
    resultado: equal(d.resultado),
    tipo: equal(d.tipo),
    reglasEvaluadas: eachLike(regla(d.reglasEvaluadas[0])),
    reglaDeterminante: d.reglaDeterminante === null ? null : like(d.reglaDeterminante),
    motivos: d.motivos.length ? equal(d.motivos) : [],
    versionReglas: like(d.versionReglas),
    hashReglas: like(d.hashReglas),
    condiciones: like(d.condiciones),
    contexto: like(d.contexto),
    admiteExcepcion: equal(false),
    decididaEn: instante(d.decididaEn),
    duracionMs: integer(d.duracionMs),
    comunicacion: comunicacion(d.comunicacion as Comunicacion),
  };
}

const CASOS: { caso: string; descripcion: string; decision: DecisionSuscripcion }[] = [
  { caso: 'S01', descripcion: 'una decisión aprobada con la oferta vigente', decision: DECISION_APROBADA },
  { caso: 'S02', descripcion: 'una decisión rechazada por edad (SUS-001)', decision: DECISION_RECHAZADA },
  { caso: 'S04', descripcion: 'una decisión rechazada por una regla reservada (SUS-015), vista por un asesor', decision: { ...DECISION_RESERVADA, id: '00000000-0000-4000-e000-000000000004' } },
  { caso: 'S06', descripcion: 'una decisión en revisión por la suma asegurada', decision: { ...DECISION_REVISION, motivos: ['SUMA_REQUIERE_REVISION'] } },
];

for (const { caso, descripcion, decision: d } of CASOS) {
  test(`${caso}: ${descripcion} trae su comunicación`, async () => {
    await pacto
      .addInteraction()
      .given('existe la decisión de suscripción', { decisionId: d.id, caso })
      .uponReceiving(`la consulta de ${descripcion}`)
      .withRequest('GET', `/v1/suscripciones/${d.id}`, (pedido) => pedido.headers(ACEPTA_JSON))
      .willRespondWith(200, (respuesta) => respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(decision(d)))
      .executeTest(async (servidor) => {
        const respuesta = await fetch(`${servidor.url}/v1/suscripciones/${d.id}`, { headers: ACEPTA_JSON });
        expect(respuesta.status).toBe(200);
        const cuerpo = (await respuesta.json()) as DecisionSuscripcion;
        // Lo que usa el portal para decidir qué mostrar.
        expect(cuerpo.comunicacion).toEqual(d.comunicacion);
        expect(JSON.stringify(cuerpo.comunicacion)).not.toMatch(/SUS-\d{3}/);
      });
  });
}

test('una decisión inexistente es 404 DECISION_NO_ENCONTRADA', async () => {
  const inexistente = '00000000-0000-4000-e000-0000000000ff';
  await pacto
    .addInteraction()
    .given('no existe la decisión de suscripción', { decisionId: inexistente })
    .uponReceiving('la consulta de una decisión de suscripción que no existe')
    .withRequest('GET', `/v1/suscripciones/${inexistente}`, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(404, (respuesta) =>
      respuesta.jsonBody({
        codigo: 'DECISION_NO_ENCONTRADA',
        mensaje: like('La decisión no existe'),
        correlationId: like('corr-pact'),
        detalles: {},
      }),
    )
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}/v1/suscripciones/${inexistente}`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(404);
      expect((await respuesta.json()).codigo).toBe('DECISION_NO_ENCONTRADA');
    });
});

// --- HU-W15 (W15-F07): registro de la aceptación de la oferta --------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CLAVE = '00000000-0000-4000-c000-000000000015';
const COTIZACION_S02 = DECISION_RECHAZADA.cotizacionId;

/**
 * La aceptación que usa el portal (confirmación de F01). Sin `ofertaId`: es null en una decisión
 * anterior a HU-W04 o un UUID, y Pact no puede expresar «null o texto» (R-81). `recaudoHabilitado`,
 * `siguientePaso` y `canal` se comparan exactos: con ellos el portal arma la confirmación.
 */
function aceptacion(a: Aceptacion) {
  return {
    id: uuid(a.id),
    cotizacionId: uuid(a.cotizacionId),
    decisionId: uuid(a.decisionId),
    clienteId: uuid(a.clienteId),
    huellaCalculo: like(a.huellaCalculo),
    versionDeclaraciones: equal(a.versionDeclaraciones),
    declaraciones: equal(a.declaraciones),
    canal: equal(a.canal),
    actorId: like(a.actorId),
    aceptadaEn: instante(a.aceptadaEn),
    huellaEvidencia: regex(/^sha256:[0-9a-f]{64}$/, a.huellaEvidencia),
    recaudoHabilitado: equal(true),
    siguientePaso: equal(a.siguientePaso),
  };
}

/** El cuerpo del POST de F01: el del contrato, con las declaraciones reales. */
function cuerpoAceptacion(solicitud: SolicitudAceptacion) {
  return {
    decisionId: uuid(solicitud.decisionId),
    versionDeclaraciones: equal(solicitud.versionDeclaraciones),
    declaraciones: equal(solicitud.declaraciones),
  };
}

function error(codigo: string, detalles: Record<string, unknown>) {
  return { codigo, mensaje: like('mensaje'), correlationId: like('corr-pact'), detalles };
}

async function aceptar(url: string, cotizacionId: string, solicitud: SolicitudAceptacion): Promise<Response> {
  return fetch(`${url}/v1/cotizaciones/${cotizacionId}/aceptacion`, {
    method: 'POST',
    headers: { ...ACEPTA_JSON, 'Content-Type': 'application/json', 'Idempotency-Key': CLAVE },
    body: JSON.stringify(solicitud),
  });
}

const INCOMPLETA: SolicitudAceptacion = {
  ...SOLICITUD_ACEPTACION,
  declaraciones: { ...SOLICITUD_ACEPTACION.declaraciones, leidoCondiciones: false },
};

const ACEPTACIONES: {
  nombre: string;
  estado: string;
  parametros: Record<string, string>;
  cotizacionId: string;
  solicitud: SolicitudAceptacion;
  status: number;
  cuerpo: ReturnType<typeof aceptacion> | ReturnType<typeof error>;
}[] = [
  {
    nombre: '201: registra la aceptación de una aprobada con la oferta vigente',
    estado: 'existe una decisión aprobada con la oferta vigente',
    parametros: { cotizacionId: ACEPTACION.cotizacionId, decisionId: DECISION_APROBADA.id, caso: 'S01' },
    cotizacionId: ACEPTACION.cotizacionId,
    solicitud: SOLICITUD_ACEPTACION,
    status: 201,
    cuerpo: aceptacion(ACEPTACION),
  },
  {
    nombre: '200: la misma clave devuelve la aceptación existente',
    estado: 'la cotización ya tiene una aceptación con la misma clave',
    parametros: { cotizacionId: ACEPTACION.cotizacionId, decisionId: DECISION_APROBADA.id, idempotencyKey: CLAVE, caso: 'S01' },
    cotizacionId: ACEPTACION.cotizacionId,
    solicitud: SOLICITUD_ACEPTACION,
    status: 200,
    cuerpo: aceptacion(ACEPTACION),
  },
  {
    nombre: '409 OFERTA_VENCIDA: la oferta de la aprobada ya venció',
    estado: 'existe una decisión aprobada con la oferta vencida',
    parametros: { cotizacionId: ACEPTACION.cotizacionId, decisionId: DECISION_APROBADA.id, caso: 'S01' },
    cotizacionId: ACEPTACION.cotizacionId,
    solicitud: SOLICITUD_ACEPTACION,
    status: 409,
    cuerpo: error('OFERTA_VENCIDA', { accion: equal('NUEVA_COTIZACION') }),
  },
  {
    nombre: '409 DECISION_NO_APROBADA: la decisión es un rechazo',
    estado: 'existe una decisión rechazada',
    parametros: { cotizacionId: COTIZACION_S02, decisionId: DECISION_RECHAZADA.id, caso: 'S02' },
    cotizacionId: COTIZACION_S02,
    solicitud: { ...SOLICITUD_ACEPTACION, decisionId: DECISION_RECHAZADA.id },
    status: 409,
    cuerpo: error('DECISION_NO_APROBADA', {}),
  },
  {
    nombre: '422 DECLARACIONES_INCOMPLETAS: falta «He leído las condiciones generales»',
    estado: 'existe una decisión aprobada con la oferta vigente',
    parametros: { cotizacionId: ACEPTACION.cotizacionId, decisionId: DECISION_APROBADA.id, caso: 'S01' },
    cotizacionId: ACEPTACION.cotizacionId,
    solicitud: INCOMPLETA,
    status: 422,
    cuerpo: error('DECLARACIONES_INCOMPLETAS', { campos: equal(['leidoCondiciones']) }),
  },
];

for (const caso of ACEPTACIONES) {
  test(`aceptación · ${caso.nombre}`, async () => {
    await pacto
      .addInteraction()
      .given(caso.estado, caso.parametros)
      .uponReceiving(`la aceptación de la oferta · ${caso.nombre}`)
      .withRequest('POST', `/v1/cotizaciones/${caso.cotizacionId}/aceptacion`, (pedido) =>
        pedido
          // La clave es un UUID: el portal la genera por cotización y la reutiliza en los reintentos.
          .headers({ ...ACEPTA_JSON, 'Content-Type': 'application/json', 'Idempotency-Key': regex(UUID, CLAVE) })
          .jsonBody(cuerpoAceptacion(caso.solicitud)),
      )
      .willRespondWith(caso.status, (respuesta) => respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(caso.cuerpo))
      .executeTest(async (servidor) => {
        const respuesta = await aceptar(servidor.url, caso.cotizacionId, caso.solicitud);
        expect(respuesta.status).toBe(caso.status);
        const cuerpo = (await respuesta.json()) as Record<string, unknown>;
        if (caso.status < 300) {
          expect(cuerpo['recaudoHabilitado']).toBe(true);
          expect(cuerpo['siguientePaso']).toBe('FIRMA');
        } else {
          expect(typeof cuerpo['codigo']).toBe('string');
        }
      });
  });
}
