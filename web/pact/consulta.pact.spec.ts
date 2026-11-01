import { MatchersV3 } from '@pact-foundation/pact';
import { expect, test } from '@playwright/test';

import { EstadoPoliza, PaginaPolizas, ResumenPoliza } from '../src/app/features/consulta/consulta.modelo';
import { PAGINA_LLENA, estadoPoliza } from '../src/app/features/consulta/consulta.fixtures';
import { ACEPTA_JSON, nuevoPacto } from './pacto';

const { boolean, eachLike, equal, integer, like, regex, uuid } = MatchersV3;

/**
 * Pact consumidor de la consulta de pólizas (HU-W18): GET /v1/polizas (listado), GET
 * /v1/polizas/{polizaId}/estado (detalle) y el 404 POLIZA_NO_ENCONTRADA, que es uniforme (ajena,
 * inexistente o aún no proyectada). El estado se compara exacto: con él el portal arma el chip.
 */
const pacto = nuevoPacto();

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ESTADOS = /^(NO_INICIADA|VIGENTE|POR_VENCER|VENCIDA)$/;
const instante = (ejemplo: string) => regex(INSTANTE, ejemplo);
const fecha = (ejemplo: string) => regex(FECHA, ejemplo);

function resumenPoliza(p: ResumenPoliza) {
  return {
    polizaId: uuid(p.polizaId),
    numero: regex(/^\d{3}-\d{4}-\d{6}$/, p.numero),
    ramo: like(p.ramo),
    producto: like(p.producto),
    prima: regex(/^\d+(\.\d+)?$/, p.prima),
    moneda: regex(/^[A-Z]{3}$/, p.moneda),
    vigenciaHasta: fecha(p.vigenciaHasta),
    estado: regex(ESTADOS, p.estado),
    fechaActualizacion: instante(p.fechaActualizacion),
  };
}

function pagina(p: PaginaPolizas) {
  return {
    items: eachLike(resumenPoliza(p.items[0])),
    total: integer(p.total),
    pagina: integer(p.pagina),
    tamano: integer(p.tamano),
    // Sin null: Pact no puede expresar «null o texto»; el portal trata null como «Sin actualizaciones».
    actualizadoEn: instante(p.actualizadoEn as string),
  };
}

function detalle(p: EstadoPoliza) {
  return {
    polizaId: uuid(p.polizaId),
    numero: regex(/^\d{3}-\d{4}-\d{6}$/, p.numero),
    estado: regex(ESTADOS, p.estado),
    fechaActualizacion: instante(p.fechaActualizacion),
    producto: like(p.producto),
    ramo: like(p.ramo),
    vigencia: { desde: fecha(p.vigencia.desde), hasta: fecha(p.vigencia.hasta) },
    prima: regex(/^\d+(\.\d+)?$/, p.prima),
    sumaAsegurada: regex(/^\d+(\.\d+)?$/, p.sumaAsegurada),
    moneda: regex(/^[A-Z]{3}$/, p.moneda),
    periodicidad: like(p.periodicidad),
    emitidaEn: instante(p.emitidaEn),
    coberturas: eachLike({
      codigo: like(p.coberturas[0].codigo),
      nombre: like(p.coberturas[0].nombre),
      obligatoria: boolean(p.coberturas[0].obligatoria),
    }),
  };
}

test('el asesor consulta el listado de pólizas con sus filtros', async () => {
  await pacto
    .addInteraction()
    .given('existen pólizas proyectadas para el asesor')
    .uponReceiving('la consulta del listado de pólizas vigentes')
    .withRequest('GET', '/v1/polizas', (pedido) => pedido.headers(ACEPTA_JSON).query({ estado: 'VIGENTE', tamano: '20' }))
    .willRespondWith(200, (respuesta) => respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(pagina(PAGINA_LLENA)))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}/v1/polizas?estado=VIGENTE&tamano=20`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as PaginaPolizas;
      expect(cuerpo.items.length).toBeGreaterThan(0);
      expect(cuerpo.items[0].estado).toMatch(ESTADOS);
    });
});

test('el asesor consulta el estado vigente de una póliza', async () => {
  const p = estadoPoliza('VIGENTE');
  await pacto
    .addInteraction()
    .given('existe la póliza proyectada', { polizaId: p.polizaId, estado: 'VIGENTE' })
    .uponReceiving('la consulta del estado de una póliza vigente')
    .withRequest('GET', `/v1/polizas/${p.polizaId}/estado`, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(200, (respuesta) => respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(detalle(p)))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}/v1/polizas/${p.polizaId}/estado`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as EstadoPoliza;
      expect(cuerpo.estado).toBe('VIGENTE');
      expect(cuerpo.fechaActualizacion).toMatch(INSTANTE);
      expect(cuerpo.coberturas.length).toBeGreaterThan(0);
    });
});

test('una póliza ajena, inexistente o aún no proyectada es 404 POLIZA_NO_ENCONTRADA', async () => {
  const id = '00000000-0000-4000-b000-0000000000ff';
  await pacto
    .addInteraction()
    .given('la póliza no existe, es ajena o aún no se proyecta', { polizaId: id })
    .uponReceiving('la consulta del estado de una póliza que no se puede mostrar')
    .withRequest('GET', `/v1/polizas/${id}/estado`, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(404, (respuesta) =>
      respuesta.jsonBody({
        codigo: equal('POLIZA_NO_ENCONTRADA'),
        mensaje: like('La póliza no existe'),
        correlationId: like('corr-pact'),
        detalles: {},
      }),
    )
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}/v1/polizas/${id}/estado`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(404);
      expect((await respuesta.json()).codigo).toBe('POLIZA_NO_ENCONTRADA');
    });
});
