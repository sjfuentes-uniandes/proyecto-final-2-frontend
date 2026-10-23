import { expect, test } from '@playwright/test';

import { DECISION_APROBADA, DECISION_APROBADA_ID } from '../src/app/features/contratacion/contratacion.testing';
import { ASESOR, prepararPortal, simular, violacionesGraves } from './soporte/portal';

/**
 * Humo de las herramientas E2E (W14-F01): el portal arranca con la sesión sintética, el guard deja
 * pasar al asesor, la API simulada llega a la página y axe corre sobre la página completa.
 */
test('el asesor abre una decisión de suscripción con la API simulada', async ({ page }, testInfo) => {
  await prepararPortal(page, ASESOR);
  await simular(page, `/suscripciones/${DECISION_APROBADA_ID}`, DECISION_APROBADA);

  await page.goto(`/contratacion/decisiones/${DECISION_APROBADA_ID}`);

  await expect(page).toHaveURL(new RegExp(`/contratacion/decisiones/${DECISION_APROBADA_ID}$`));
  await expect(page.getByRole('heading', { level: 2, name: /Decisión de suscripción/ })).toBeVisible();
  await expect(page.getByText(DECISION_APROBADA.codigo).first()).toBeVisible();
  await expect(page.getByText(ASESOR.nombre).first()).toBeVisible();
  expect(await violacionesGraves(page, testInfo)).toEqual([]);
});

test('sin sesión, el portal lleva a ingresar', async ({ page }) => {
  await page.route('**/config.json', (ruta) => ruta.fulfill({ json: { apiBaseUrl: '' } }));
  await page.goto(`/contratacion/decisiones/${DECISION_APROBADA_ID}`);
  await expect(page).toHaveURL(/\/ingresar/);
});
