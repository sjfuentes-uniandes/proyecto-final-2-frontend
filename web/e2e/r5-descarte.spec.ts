import { expect, test } from '@playwright/test';

import {
  EVENTO_FORMATO_ID,
  LISTADO,
  LISTADO_VACIO,
  MENSAJE_FORMATO_ID,
  detalle,
  resolucion,
} from '../src/app/features/siniestros/parametricos/descarte/descarte.fixtures';
import { ASESOR, UsuarioE2E, prepararPortal, simular, violacionesGraves } from './soporte/portal';

/**
 * E2E-W24-R5 · Cola de descarte de los eventos paramétricos (H10 y H11) con la API simulada: listado
 * con causa, intentos y póliza, reproceso de seleccionados, corrección y descarte, estado vacío,
 * acceso por grupo y axe (sin violaciones críticas ni serias) en es-CO y en-US.
 */

const ANALISTA: UsuarioE2E = {
  sub: 'sub-analista-e2e',
  nombre: 'Analista Sintética',
  grupos: ['analistas-siniestros'],
};
const RUTA = '/siniestros/parametricos/descarte';
const API_DESCARTES = '/siniestros/parametricos/descartes';

test.describe('H10 Cola de descarte', () => {
  test('lista los eventos y pasa axe', async ({ page }, testInfo) => {
    await prepararPortal(page, ANALISTA);
    await simular(page, API_DESCARTES, LISTADO);
    await page.goto(RUTA);
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: 'Eventos en cola de descarte',
      }),
    ).toBeVisible();
    await expect(page.getByText('3 mensajes agotaron sus reintentos')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: EVENTO_FORMATO_ID })).toContainText('5 de 5');
    await expect(page.getByText('14 días')).toBeVisible();
    expect(await violacionesGraves(page, testInfo, 'h10-es')).toEqual([]);
  });

  test('reprocesa los seleccionados', async ({ page }) => {
    await prepararPortal(page, ANALISTA);
    await simular(page, API_DESCARTES, LISTADO);
    let cuerpo: unknown = null;
    await page.route(`**/web/v1${API_DESCARTES}/reproceso`, async (ruta) => {
      cuerpo = ruta.request().postDataJSON();
      await ruta.fulfill({
        json: {
          resultados: [
            {
              messageId: MENSAJE_FORMATO_ID,
              resolucion: resolucion({
                accion: 'REPROCESADO',
                corregido: null,
              }),
            },
          ],
        },
      });
    });
    await page.goto(RUTA);
    await page
      .getByRole('checkbox', {
        name: `Seleccionar el evento ${EVENTO_FORMATO_ID}`,
      })
      .check();
    await page.getByRole('button', { name: 'Reprocesar seleccionados (1)' }).click();
    await expect(page.getByText('1 evento volvió a la cola de procesamiento')).toBeVisible();
    expect(cuerpo).toEqual({ messageIds: [MENSAJE_FORMATO_ID] });
  });

  test('sin eventos muestra el estado vacío', async ({ page }) => {
    await prepararPortal(page, ANALISTA);
    await simular(page, API_DESCARTES, LISTADO_VACIO);
    await page.goto(RUTA);
    await expect(page.getByText('No hay eventos en la cola de descarte')).toBeVisible();
  });

  test('en inglés pasa axe', async ({ page }, testInfo) => {
    await prepararPortal(page, ANALISTA);
    await page.addInitScript(() => window.localStorage.setItem('solventa.idioma', 'en-US'));
    await simular(page, API_DESCARTES, LISTADO);
    await page.goto(RUTA);
    expect(await violacionesGraves(page, testInfo, 'h10-en')).toEqual([]);
  });

  test('un asesor no entra', async ({ page }) => {
    await prepararPortal(page, ASESOR);
    await page.goto(RUTA);
    await expect(page).toHaveURL(/\/sin-acceso$/);
  });
});

test.describe('H11 Reproceso', () => {
  test('corrige y reprocesa, y pasa axe', async ({ page }, testInfo) => {
    await prepararPortal(page, ANALISTA);
    await simular(page, API_DESCARTES, LISTADO);
    await simular(page, `${API_DESCARTES}/${MENSAJE_FORMATO_ID}`, detalle());
    let cuerpo: unknown = null;
    await page.route(`**/web/v1${API_DESCARTES}/${MENSAJE_FORMATO_ID}/correccion`, async (ruta) => {
      cuerpo = ruta.request().postDataJSON();
      await ruta.fulfill({ json: resolucion() });
    });
    await page.goto(RUTA);
    await page.getByRole('link', { name: `Revisar el evento ${EVENTO_FORMATO_ID}` }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Reprocesar el evento' })).toBeVisible();
    await expect(page.getByText('precipitacionMm: 142,7')).toBeVisible();
    expect(await violacionesGraves(page, testInfo, 'h11-es')).toEqual([]);
    await page.getByLabel('Campo a corregir').selectOption('precipitacionMm');
    await page.getByLabel('Valor corregido').fill('142.7');
    await page.getByRole('button', { name: 'Corregir y reprocesar' }).click();
    await expect(page.getByText('El original y la corrección quedaron en la auditoría')).toBeVisible();
    expect(cuerpo).toEqual({ cambios: { precipitacionMm: 142.7 } });
  });

  test('descarta con motivo', async ({ page }) => {
    await prepararPortal(page, ANALISTA);
    await simular(page, `${API_DESCARTES}/${MENSAJE_FORMATO_ID}`, detalle());
    await simular(page, `${API_DESCARTES}/${MENSAJE_FORMATO_ID}/descarte`, resolucion({ accion: 'DESCARTADO', corregido: null }));
    await page.goto(`${RUTA}/${MENSAJE_FORMATO_ID}`);
    await page.getByRole('button', { name: 'Descartar definitivamente' }).click();
    await page.getByLabel('Motivo del descarte').fill('Evento duplicado del proveedor');
    await page.getByRole('button', { name: 'Confirmar el descarte' }).click();
    await expect(page.getByText('se descartó definitivamente')).toBeVisible();
  });
});
