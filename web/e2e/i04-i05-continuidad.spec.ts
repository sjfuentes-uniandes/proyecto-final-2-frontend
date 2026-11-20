import { Page, expect, test } from '@playwright/test';

import { CONTINUIDAD, CONTINUIDAD_SANA, INFORME } from '../src/app/features/operacion/continuidad/continuidad.testing';
import { UsuarioE2E, prepararPortal, violacionesGraves } from './soporte/portal';

/**
 * E2E-W29 · Operación › Continuidad (I04) y Conciliación (I05) con bff-web simulado: estado por
 * zona, recorridos y cronología del incidente; el informe de reconciliar.py y su exportación;
 * menú, acceso por grupo y axe (sin violaciones críticas ni serias) en es-CO y en-US.
 */
const OPERADOR: UsuarioE2E = { sub: 'sub-operacion-e2e', nombre: 'Operación Sintética', grupos: ['operacion'] };

async function simularContinuidad(page: Page, cuerpo: unknown = CONTINUIDAD, estado = 200): Promise<void> {
  await page.route(/\/web\/operacion\/continuidad\?horas=\d+$/, (r) => r.fulfill({ status: estado, json: cuerpo, headers: { 'X-Correlation-Id': 'corr-e2e' } }));
}

async function simularConciliacion(page: Page, cuerpo: unknown = INFORME, estado = 200): Promise<void> {
  await page.route('**/web/operacion/continuidad/conciliacion', (r) => r.fulfill({ status: estado, json: cuerpo }));
}

test.describe('I04 Continuidad Multi-zona', () => {
  test('muestra el incidente por zona y pasa axe en es-CO y en-US', async ({ page }, testInfo) => {
    await prepararPortal(page, OPERADOR);
    await simularContinuidad(page);
    await page.goto('/operacion/continuidad');

    await expect(page.getByRole('heading', { level: 2, name: 'Continuidad del servicio' })).toBeVisible();
    await expect(page.getByText('Operando en una zona')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Una zona de disponibilidad dejó de responder.');
    const zonas = page.getByTestId('zonas');
    await expect(zonas.getByRole('row', { name: /us-east-1a/ })).toContainText('No disponible');
    await expect(zonas.getByRole('row', { name: /us-east-1b/ })).toContainText('12 de 12');
    await expect(zonas.getByRole('row', { name: /Base de datos principal/ })).toContainText('Réplica sincrónica promovida');
    await expect(page.getByTestId('recorridos')).toContainText('Siniestros paramétricos');
    await expect(page.getByTestId('cronologia').getByRole('listitem')).toHaveCount(5);
    await expect(page.getByTestId('indicadores')).toContainText('38 s');
    expect(await violacionesGraves(page, testInfo, 'i04-es')).toEqual([]);

    await page.evaluate(() => localStorage.setItem('solventa.idioma', 'en-US'));
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: 'Service continuity' })).toBeVisible();
    await expect(page.getByText('Running in one zone')).toBeVisible();
    expect(await violacionesGraves(page, testInfo, 'i04-en')).toEqual([]);
  });

  test('el menú de Operación abre Continuidad y la ventana se puede cambiar', async ({ page }) => {
    await prepararPortal(page, OPERADOR);
    await simularContinuidad(page, CONTINUIDAD_SANA);
    await page.route('**/web/operacion/alertas', (r) => r.fulfill({ status: 502, json: { detail: 'x' } }));
    await page.goto('/operacion/alertas');
    await page.getByRole('link', { name: /Continuidad/ }).click();
    await expect(page).toHaveURL(/\/operacion\/continuidad$/);
    await expect(page.getByText('Operando en dos zonas')).toBeVisible();

    const pedido = page.waitForRequest(/\/web\/operacion\/continuidad\?horas=24$/);
    await page.getByLabel('Ventana de la cronología').selectOption('24');
    await pedido;
    await expect(page.getByTestId('subtitulo')).toHaveText('Sin incidentes en las últimas 24 h');
  });

  test('sin CloudWatch muestra el error con el código de seguimiento', async ({ page }) => {
    await prepararPortal(page, OPERADOR);
    await simularContinuidad(page, { detail: 'x' }, 502);
    await page.goto('/operacion/continuidad');
    await expect(page.getByRole('alert')).toContainText('No fue posible leer el estado del ambiente en CloudWatch');
    await expect(page.getByRole('alert')).toContainText('corr-e2e');
  });

  test('un usuario sin el grupo operacion no entra', async ({ page }) => {
    await prepararPortal(page, { sub: 'sub-asesor-e2e', nombre: 'Asesor', grupos: ['asesores'] });
    await simularContinuidad(page);
    await page.goto('/operacion/continuidad');
    await expect(page.getByRole('heading', { level: 2, name: 'Continuidad del servicio' })).toHaveCount(0);
  });
});

test.describe('I05 Conciliación', () => {
  test('muestra el informe, lo exporta igual y pasa axe en es-CO y en-US', async ({ page }, testInfo) => {
    await prepararPortal(page, OPERADOR);
    await simularContinuidad(page);
    await simularConciliacion(page);
    await page.goto('/operacion/continuidad');
    await page.getByRole('link', { name: 'Ver conciliación' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Conciliación del incidente EXPabc123' })).toBeVisible();
    await expect(page.getByTestId('estado')).toHaveText('Sin diferencias');
    await expect(page.getByTestId('verificaciones').getByRole('row')).toHaveCount(12);
    await expect(page.getByTestId('cierre')).toContainText('38 s');

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar informe' }).click();
    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toBe('conciliacion-EXPabc123.json');
    const ruta = await archivo.path();
    const { readFile } = await import('node:fs/promises');
    expect(JSON.parse(await readFile(ruta, 'utf-8'))).toEqual(INFORME);
    expect(await violacionesGraves(page, testInfo, 'i05-es')).toEqual([]);

    await page.evaluate(() => localStorage.setItem('solventa.idioma', 'en-US'));
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: 'Incident reconciliation EXPabc123' })).toBeVisible();
    expect(await violacionesGraves(page, testInfo, 'i05-en')).toEqual([]);
  });

  test('sin informe publicado muestra el estado vacío y vuelve a continuidad', async ({ page }) => {
    await prepararPortal(page, OPERADOR);
    await simularContinuidad(page, CONTINUIDAD_SANA);
    await simularConciliacion(page, { detail: 'x' }, 404);
    await page.goto('/operacion/continuidad/conciliacion');
    await expect(page.getByTestId('sin-informe')).toHaveText('Todavía no hay un informe de conciliación publicado en este ambiente.');
    await page.getByRole('link', { name: 'Volver a continuidad' }).click();
    await expect(page).toHaveURL(/\/operacion\/continuidad$/);
  });
});
