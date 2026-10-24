import { MatchersV3 } from '@pact-foundation/pact';
import { expect, test } from '@playwright/test';

import { Comunicacion, DecisionSuscripcion, ReglaEvaluada } from '../src/app/features/contratacion/contratacion.modelo';
import {
  DECISION_APROBADA,
  DECISION_RECHAZADA,
  DECISION_RESERVADA,
  DECISION_REVISION,
} from '../src/app/features/contratacion/contratacion.testing';
import { ACEPTA_JSON, nuevoPacto } from './pacto';

const { boolean, eachLike, equal, integer, like, regex, uuid } = MatchersV3;

/**
 * Pact consumidor de contratación (HU-W14, W14-F06): lo que el portal necesita de
 * GET /v1/suscripciones/{decisionId} de bff-web para comunicar la decisión. La `comunicacion` se
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
