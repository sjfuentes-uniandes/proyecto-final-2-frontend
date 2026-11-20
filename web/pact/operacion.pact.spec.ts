import { MatchersV3 } from '@pact-foundation/pact';
import { expect, test } from '@playwright/test';

import { Capacidad, Escalado } from '../src/app/features/operacion/tablero/capacidad.model';
import { CAPACIDAD, CAPACIDAD_SIN_ESCALADO } from '../src/app/features/operacion/tablero/tablero.testing';
import { ACEPTA_JSON, nuevoPacto } from './pacto';

const { eachLike, equal, integer, like, regex } = MatchersV3;

/**
 * Pact consumidor del tablero operativo (HU-W08): GET /operacion/capacidad. Solo lo que el
 * proveedor promete: el 200 con un escalado terminado y el 200 sin escalado ni dato de tareas. El
 * 503 SERVICIO_NO_DISPONIBLE y los fallos de red van en las unitarias del servicio y del componente.
 * La 8.7 implementa estos estados en la verificación de bff-web.
 */
const pacto = nuevoPacto();

const ESTADO_CON_ESCALADO = 'la capacidad de cotizacion tiene un escalado terminado en la ventana';
const ESTADO_SIN_ESCALADO = 'la capacidad de cotizacion no tiene escalados ni dato de tareas en la ventana';

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const instante = (ejemplo: string) => regex(INSTANTE, ejemplo);

function escalado(e: Escalado) {
  return {
    inicio: instante(e.inicio),
    fin: instante(e.fin as string),
    duracion_s: integer(e.duracion_s as number),
    descripcion: like(e.descripcion),
    estado: like(e.estado),
  };
}

/** Sin null en los matchers: Pact no expresa «null o número»; cada interacción fija uno de los dos casos. */
function capacidad(c: Capacidad) {
  return {
    ambiente: like(c.ambiente),
    servicio: equal(c.servicio),
    ventana_min: integer(c.ventana_min),
    cotizaciones_por_minuto: eachLike({
      instante: instante(c.cotizaciones_por_minuto[0].instante),
      valor: integer(c.cotizaciones_por_minuto[0].valor),
    }),
    tareas_activas: c.tareas_activas === null ? null : integer(c.tareas_activas),
    minimo: integer(c.minimo),
    maximo: integer(c.maximo),
    ultimo_escalado: c.ultimo_escalado === null ? null : escalado(c.ultimo_escalado),
  };
}

async function leer(url: string): Promise<Capacidad> {
  const respuesta = await fetch(`${url}/operacion/capacidad`, { headers: ACEPTA_JSON });
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as Capacidad;
}

test('operación consulta la capacidad de cotizacion con un escalado en la ventana', async () => {
  await pacto
    .addInteraction()
    .given(ESTADO_CON_ESCALADO)
    .uponReceiving('la consulta de la capacidad de cotizacion con un escalado terminado')
    .withRequest('GET', '/operacion/capacidad', (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(200, (respuesta) => respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(capacidad(CAPACIDAD)))
    .executeTest(async (servidor) => {
      const cuerpo = await leer(servidor.url);
      expect(cuerpo.servicio).toBe('cotizacion');
      expect(cuerpo.cotizaciones_por_minuto.length).toBeGreaterThan(0);
      expect(typeof cuerpo.tareas_activas).toBe('number');
      expect(cuerpo.ultimo_escalado?.fin).toMatch(INSTANTE);
      expect(typeof cuerpo.ultimo_escalado?.duracion_s).toBe('number');
    });
});

test('operación consulta la capacidad de cotizacion sin escalados ni dato de tareas', async () => {
  await pacto
    .addInteraction()
    .given(ESTADO_SIN_ESCALADO)
    .uponReceiving('la consulta de la capacidad de cotizacion sin escalados ni dato de tareas')
    .withRequest('GET', '/operacion/capacidad', (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(200, (respuesta) =>
      respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(capacidad(CAPACIDAD_SIN_ESCALADO)),
    )
    .executeTest(async (servidor) => {
      const cuerpo = await leer(servidor.url);
      expect(cuerpo.tareas_activas).toBeNull();
      expect(cuerpo.ultimo_escalado).toBeNull();
      expect(cuerpo.cotizaciones_por_minuto.length).toBeGreaterThan(0);
    });
});
