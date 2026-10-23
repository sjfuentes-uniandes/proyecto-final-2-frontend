import { MatchersV3 } from '@pact-foundation/pact';
import { expect, test } from '@playwright/test';

import { ACEPTA_JSON, nuevoPacto } from './pacto';

const { like } = MatchersV3;

/**
 * Pact consumidor de contratación (HU-W14): lo que el portal espera de bff-web para comunicar la
 * decisión de suscripción. F1 deja la interacción mínima (decisión inexistente); F3 (W14-F06) agrega
 * la aprobada, las rechazadas por SUS-001 y SUS-015 y la revisión, con `comunicacion`.
 */
const pacto = nuevoPacto();
const DECISION_INEXISTENTE = '00000000-0000-4000-e000-0000000000ff';

test('una decisión inexistente es 404 DECISION_NO_ENCONTRADA', async () => {
  await pacto
    .addInteraction()
    .given('no existe la decisión de suscripción', { decisionId: DECISION_INEXISTENTE })
    .uponReceiving('la consulta de una decisión de suscripción que no existe')
    .withRequest('GET', `/v1/suscripciones/${DECISION_INEXISTENTE}`, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(404, (respuesta) =>
      respuesta.jsonBody({
        codigo: 'DECISION_NO_ENCONTRADA',
        mensaje: like('La decisión no existe'),
        correlationId: like('corr-pact'),
        detalles: {},
      }),
    )
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}/v1/suscripciones/${DECISION_INEXISTENTE}`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(404);
      expect((await respuesta.json()).codigo).toBe('DECISION_NO_ENCONTRADA');
    });
});
