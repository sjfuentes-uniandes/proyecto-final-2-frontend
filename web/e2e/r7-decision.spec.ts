import { Page, Route, expect, test } from '@playwright/test';

import { DetalleSiniestro } from '../src/app/features/siniestros/siniestros.modelo';
import { SolicitudDecision } from '../src/app/features/siniestros/siniestros.decision.modelo';
import {
  CATALOGOS_DECISION,
  DETALLE_APROBADO,
  DETALLE_COMPLETO,
  RESULTADO_APROBACION,
  SINIESTRO_EVA01,
  errorB2,
} from '../src/app/features/siniestros/siniestros.testing';
import { ANALISTA, API, prepararPortal, violacionesGraves } from './soporte/portal';

/**
 * E2E-W20-R7 · Decisión del analista sobre un siniestro (HU-W20) con la API simulada, en es-CO y en-US:
 * aprobar (panel de H03 → liquidación → diálogo H06 con teclado), rechazar (H07, con «Confirmar el
 * rechazo» deshabilitado sin los textos), solicitar soporte (H05) y la transición inválida (409), con
 * axe en cada pantalla. El BFF simulado lleva el estado del caso: cada decisión lo cambia y el detalle
 * que se recarga lo refleja. Las tabletas y los tres navegadores los cubren los proyectos de
 * playwright.config.ts. El E2E contra INT está en `tests/e2e/test_hu_w20_r7_decision.py` (backend).
 */

type Idioma = 'es-CO' | 'en-US';

const TEXTOS = {
  'es-CO': {
    cabecera: 'Siniestro 88-2026-0442',
    aprobar: 'Aprobar y ordenar el pago',
    solicitar: 'Solicitar el soporte faltante',
    rechazar: 'Rechazar el siniestro',
    reclamado: 'Valor reclamado',
    deducible: 'Deducible aplicable',
    indemnizar: 'Valor a indemnizar',
    justificacion: /Justificación de la decisión/,
    revisar: 'Revisa los datos de la liquidación antes de aprobar.',
    dialogo: 'Confirmar la aprobación',
    confirmar: 'Confirmar y ordenar el pago',
    cancelar: 'Cancelar',
    avisoAprobado: 'Siniestro aprobado. La referencia de pago es IND-88-2026-0442-01.',
    estadoAprobado: 'Aprobado',
    liquidacion: 'Liquidación',
    pagoEnCurso: 'Pago de la indemnización · En curso',
    decisionCompletada: 'Decisión · Completado',
    tituloSoporte: 'Solicitar soporte faltante',
    enviarSolicitud: 'Enviar la solicitud',
    interruptor: 'certificado de reparación',
    mensajeCliente: 'Texto que recibirá en la aplicación',
    avisoSoporte: /Soporte solicitado\. El cliente tiene hasta el 19\/11\/2026/,
    estadoFaltaSoporte: 'Falta soporte',
    tituloRechazo: 'Rechazar el siniestro',
    causal: 'Causal contractual',
    causalElegida: 'Póliza no vigente',
    explicacion: /Explicación para el cliente/,
    confirmarRechazo: 'Confirmar el rechazo',
    avisoRechazado: 'Siniestro rechazado. La decisión quedó registrada con su causal y su justificación.',
    estadoRechazado: 'Rechazado',
    transicion: 'ya no admite esta decisión',
    noRegistro: 'No se registró la decisión',
  },
  'en-US': {
    cabecera: 'Claim 88-2026-0442',
    aprobar: 'Approve and order the payment',
    solicitar: 'Request the missing document',
    rechazar: 'Reject the claim',
    reclamado: 'Claimed amount',
    deducible: 'Applicable deductible',
    indemnizar: 'Amount to indemnify',
    justificacion: /Reason for the decision/,
    revisar: 'Check the settlement data before approving.',
    dialogo: 'Confirm the approval',
    confirmar: 'Confirm and order the payment',
    cancelar: 'Cancel',
    avisoAprobado: 'Claim approved. The payment reference is IND-88-2026-0442-01.',
    estadoAprobado: 'Approved',
    liquidacion: 'Settlement',
    pagoEnCurso: 'Indemnity payment · In progress',
    decisionCompletada: 'Decision · Completed',
    tituloSoporte: 'Request the missing documents',
    enviarSolicitud: 'Send the request',
    interruptor: 'repair certificate',
    mensajeCliente: 'Text they will receive in the app',
    avisoSoporte: /Documents requested\. The customer has until 11\/19\/2026/,
    estadoFaltaSoporte: 'Support missing',
    tituloRechazo: 'Reject the claim',
    causal: 'Contractual ground',
    causalElegida: 'Policy not in force',
    explicacion: /Explanation for the customer/,
    confirmarRechazo: 'Confirm the rejection',
    avisoRechazado: 'Claim rejected. The decision was recorded with its ground and its reason.',
    estadoRechazado: 'Declined',
    transicion: 'no longer accepts this decision',
    noRegistro: 'The decision was not recorded',
  },
} as const;

interface DecisionRecibida {
  clave: string | null;
  cuerpo: SolicitudDecision;
}

interface Bff {
  decisiones: DecisionRecibida[];
  detalles: number;
}

const URL_DETALLE = `**${API}/siniestros/${SINIESTRO_EVA01}`;

/**
 * Simula bff-web con el estado del caso: cada decisión lo cambia y el siguiente GET lo devuelve.
 * `conflicto`: otra persona ya decidió, así que la decisión responde 409 y el caso queda APROBADO.
 */
async function simularBff(page: Page, opciones: { conflicto?: boolean } = {}): Promise<Bff> {
  const bff: Bff = { decisiones: [], detalles: 0 };
  let actual: DetalleSiniestro = DETALLE_COMPLETO;
  await page.route(URL_DETALLE, (r) => {
    bff.detalles += 1;
    return r.fulfill({ json: actual });
  });
  await page.route(`**${API}/siniestros/catalogos-decision`, (r) => r.fulfill({ json: CATALOGOS_DECISION }));
  await page.route(`**${API}/siniestros/${SINIESTRO_EVA01}/decision`, (r: Route) => {
    const cuerpo = r.request().postDataJSON() as SolicitudDecision;
    bff.decisiones.push({ clave: r.request().headers()['idempotency-key'] ?? null, cuerpo });
    if (opciones.conflicto) {
      actual = DETALLE_APROBADO;
      return r.fulfill({ status: 409, json: { ...errorB2('TRANSICION_NO_PERMITIDA', 'ya decidido', 'corr-e2e-409'), detalles: { estadoActual: 'APROBADO' } } });
    }
    const base = { siniestroId: SINIESTRO_EVA01, decisionId: RESULTADO_APROBACION.decisionId, registradaEn: '2026-11-19T15:00:00Z' };
    if (cuerpo.tipo === 'APROBAR') {
      actual = DETALLE_APROBADO;
      return r.fulfill({ json: { ...base, estadoNuevo: 'APROBADO', referenciaPago: 'IND-88-2026-0442-01', plazoSoporteVenceEn: null } });
    }
    if (cuerpo.tipo === 'RECHAZAR') {
      actual = { ...DETALLE_COMPLETO, estado: 'RECHAZADO' };
      return r.fulfill({ json: { ...base, estadoNuevo: 'RECHAZADO', referenciaPago: null, plazoSoporteVenceEn: null } });
    }
    actual = { ...DETALLE_COMPLETO, estado: 'FALTA_SOPORTE', relojPausado: true, plazoSoporteVenceEn: '2026-11-19T15:00:00Z' };
    return r.fulfill({ json: { ...base, estadoNuevo: 'FALTA_SOPORTE', referenciaPago: null, plazoSoporteVenceEn: '2026-11-19T15:00:00Z' } });
  });
  return bff;
}

/**
 * Evidencia visual de cierre (docs/sprint_3/evidencias/hu-w20/capturas): solo con E2E_CAPTURAS=<carpeta>
 * y en el escritorio de Chromium; sin la variable no hace nada.
 */
async function capturar(page: Page, nombre: string, idioma: Idioma, proyecto: string): Promise<void> {
  const carpeta = process.env['E2E_CAPTURAS'];
  if (carpeta && proyecto === 'chromium-escritorio') {
    await page.screenshot({ path: `${carpeta}/${nombre}-${idioma}.png`, fullPage: true });
  }
}

const abrir = (page: Page, ruta: string, idioma: Idioma) => page.goto(`${ruta}?idioma=${idioma}`);

/** Los textos para el cliente (dato sensible) no pueden salir por la consola del navegador. */
function vigilarConsola(page: Page): string[] {
  const consola: string[] = [];
  page.on('console', (mensaje) => consola.push(mensaje.text()));
  return consola;
}

for (const idioma of ['es-CO', 'en-US'] as const) {
  const t = TEXTOS[idioma];

  test.describe(`R7 decisión · ${idioma}`, () => {
    test(`aprobar: liquidación, confirmación con teclado y detalle con «Decisión» completada · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page);
      const consola = vigilarConsola(page);
      await abrir(page, `/siniestros/${SINIESTRO_EVA01}/evaluacion`, idioma);

      // H03: el panel de decisión y la liquidación solo aparecen para el analista asignado.
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${t.cabecera}`) })).toBeVisible();
      await expect(page.getByRole('link', { name: t.solicitar })).toBeVisible();
      await expect(page.getByRole('link', { name: t.rechazar })).toBeVisible();
      await capturar(page, 'h03-evaluacion-decision', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-evaluacion-decision-${idioma}`)).toEqual([]);

      // Sin datos: se muestran los errores y no se abre el diálogo.
      const aprobar = page.getByRole('button', { name: t.aprobar });
      await aprobar.click();
      await expect(page.getByRole('alert').filter({ hasText: t.revisar })).toBeVisible();
      await expect(page.getByLabel(t.reclamado)).toBeFocused();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await violacionesGraves(page, testInfo, `axe-liquidacion-errores-${idioma}`)).toEqual([]);

      // Llenar con el teclado: los montos se escriben con el formato del idioma y se reescriben al salir.
      await page.getByLabel(t.reclamado).fill('2850000');
      await page.getByLabel(t.deducible).fill('350000');
      await page.getByLabel(t.indemnizar).fill('2500000');
      await page.getByLabel(t.justificacion).fill('Daño accidental verificado con evidencia fotográfica');
      await expect(page.getByLabel(t.reclamado)).toHaveValue(idioma === 'es-CO' ? '2.850.000' : '2,850,000');
      await capturar(page, 'h03-liquidacion', idioma, proyecto);

      await aprobar.focus();
      await page.keyboard.press('Enter');

      // H06: diálogo modal con foco atrapado; Escape cierra y devuelve el foco.
      const dialogo = page.getByRole('dialog', { name: t.dialogo });
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toContainText(/2[.,]500[.,]000/);
      await expect(dialogo).toContainText('IND-88-2026-0442-01');
      await expect(dialogo).toContainText('Natalia González Ruiz');
      await capturar(page, 'h06-confirmar-aprobacion', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-confirmar-aprobacion-${idioma}`)).toEqual([]);
      // El resto de la página queda inerte: el foco recorre el diálogo (o sale a la ventana, nunca al fondo).
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog[open]'))).toBe(true);
      }
      await expect(aprobar).not.toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      await expect(aprobar).toBeFocused();
      expect(bff.decisiones).toHaveLength(0);

      // Confirmar con doble clic: una sola decisión, con una Idempotency-Key y el cuerpo esperado.
      await aprobar.click();
      await expect(dialogo).toBeVisible();
      await dialogo.getByRole('button', { name: t.confirmar }).dblclick();
      await expect(page.getByRole('status').filter({ hasText: t.avisoAprobado })).toBeVisible();
      expect(bff.decisiones).toHaveLength(1);
      expect(bff.decisiones[0].clave).toMatch(/^[0-9a-f-]{36}$/);
      expect(bff.decisiones[0].cuerpo).toEqual({
        tipo: 'APROBAR',
        justificacion: 'Daño accidental verificado con evidencia fotográfica',
        liquidacion: { valorReclamado: '2850000', deducible: '350000', valorIndemnizar: '2500000', moneda: 'COP' },
      });

      // El detalle recargado: estado, liquidación aprobada, «Decisión» completada y pago pendiente.
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(t.estadoAprobado) })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: t.liquidacion })).toBeVisible();
      await expect(page.locator('app-linea-tiempo-tramite')).toContainText(t.decisionCompletada);
      await expect(page.locator('app-linea-tiempo-tramite')).toContainText(t.pagoEnCurso);
      await expect(page.getByRole('button', { name: t.aprobar })).toHaveCount(0);
      await capturar(page, 'h03-aprobado', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-aprobado-${idioma}`)).toEqual([]);
      expect(consola.join('\n')).not.toContain('evidencia fotográfica');
    });

    test(`solicitar soporte (H05): documentos, mensaje, canal y plazo, y el caso queda en espera · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page);
      const consola = vigilarConsola(page);
      await abrir(page, `/siniestros/${SINIESTRO_EVA01}/evaluacion`, idioma);

      await page.getByRole('link', { name: t.solicitar }).click();
      await expect(page).toHaveURL(new RegExp(`/siniestros/${SINIESTRO_EVA01}/solicitar-soporte`));
      await expect(page.getByRole('heading', { level: 2, name: t.tituloSoporte })).toBeVisible();
      const interruptor = page.getByRole('switch', { name: t.interruptor });
      await expect(interruptor).toBeChecked();
      await expect(page.getByLabel(t.mensajeCliente)).not.toHaveValue('');
      await capturar(page, 'h05-solicitar-soporte', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-solicitar-soporte-${idioma}`)).toEqual([]);

      // Sin justificación no se envía.
      await page.getByRole('button', { name: t.enviarSolicitud }).click();
      await expect(page.locator('.fld__error')).toHaveCount(1);
      expect(bff.decisiones).toHaveLength(0);
      expect(await violacionesGraves(page, testInfo, `axe-solicitar-soporte-errores-${idioma}`)).toEqual([]);

      // El interruptor se maneja con el teclado.
      await interruptor.focus();
      await page.keyboard.press('Space');
      await expect(interruptor).not.toBeChecked();
      await page.keyboard.press('Space');
      await expect(interruptor).toBeChecked();

      await page.getByLabel(idioma === 'es-CO' ? /Justificación de la decisión/ : /Reason for the decision/).fill('Falta el certificado del taller');
      await page.getByRole('button', { name: t.enviarSolicitud }).click();

      await expect(page).toHaveURL(new RegExp(`/siniestros/${SINIESTRO_EVA01}/evaluacion`));
      await expect(page.getByRole('status').filter({ hasText: t.avisoSoporte })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(t.estadoFaltaSoporte) })).toBeVisible();
      expect(bff.decisiones).toHaveLength(1);
      expect(bff.decisiones[0].cuerpo).toMatchObject({ tipo: 'SOLICITAR_SOPORTE', documentos: ['CERTIFICADO_REPARACION'], canal: 'PUSH_Y_CORREO', plazoDiasHabiles: 10 });
      await expect(page.getByRole('button', { name: t.aprobar })).toHaveCount(0);
      await capturar(page, 'h03-falta-soporte', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-falta-soporte-${idioma}`)).toEqual([]);
      expect(consola.join('\n')).not.toContain('Falta el certificado del taller');
    });

    test(`rechazar (H07): «Confirmar el rechazo» se habilita solo con causal, explicación y justificación · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page);
      const consola = vigilarConsola(page);
      await abrir(page, `/siniestros/${SINIESTRO_EVA01}/evaluacion`, idioma);

      await page.getByRole('link', { name: t.rechazar }).click();
      await expect(page).toHaveURL(new RegExp(`/siniestros/${SINIESTRO_EVA01}/rechazar`));
      await expect(page.getByRole('heading', { level: 2, name: t.tituloRechazo })).toBeVisible();
      const confirmar = page.getByRole('button', { name: t.confirmarRechazo });
      await expect(confirmar).toBeDisabled();
      await capturar(page, 'h07-rechazo', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-rechazo-${idioma}`)).toEqual([]);

      await page.getByLabel(t.causal).selectOption({ label: t.causalElegida });
      await expect(confirmar).toBeDisabled();
      await page.getByLabel(t.explicacion).fill('Tu póliza no estaba vigente en la fecha del evento.');
      await expect(confirmar).toBeDisabled();
      await page.getByLabel(t.justificacion).fill('La póliza estaba vencida al evento');
      await expect(confirmar).toBeEnabled();
      await capturar(page, 'h07-rechazo-listo', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-rechazo-listo-${idioma}`)).toEqual([]);

      await confirmar.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/siniestros/${SINIESTRO_EVA01}/evaluacion`));
      await expect(page.getByRole('status').filter({ hasText: t.avisoRechazado })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(t.estadoRechazado) })).toBeVisible();
      expect(bff.decisiones).toHaveLength(1);
      expect(bff.decisiones[0].cuerpo).toEqual({
        tipo: 'RECHAZAR',
        justificacion: 'La póliza estaba vencida al evento',
        causal: 'POLIZA_NO_VIGENTE',
        explicacionCliente: 'Tu póliza no estaba vigente en la fecha del evento.',
      });
      // La explicación al cliente no se muestra otra vez ni sale por la consola.
      await expect(page.locator('body')).not.toContainText('Tu póliza no estaba vigente');
      expect(consola.join('\n')).not.toContain('Tu póliza no estaba vigente');
    });

    test(`transición inválida: un 409 muestra el error, recarga el detalle y retira el panel · ${idioma}`, async ({ page }, testInfo) => {
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page, { conflicto: true });
      await abrir(page, `/siniestros/${SINIESTRO_EVA01}/evaluacion`, idioma);

      await page.getByLabel(t.reclamado).fill('2850000');
      await page.getByLabel(t.deducible).fill('350000');
      await page.getByLabel(t.indemnizar).fill('2500000');
      await page.getByLabel(t.justificacion).fill('Verificado');
      await page.getByRole('button', { name: t.aprobar }).click();
      await page.getByRole('dialog', { name: t.dialogo }).getByRole('button', { name: t.confirmar }).click();

      const alerta = page.getByRole('alert').filter({ hasText: t.noRegistro });
      await expect(alerta).toContainText(t.transicion);
      await expect(alerta).toContainText('corr-e2e-409');
      await expect(alerta).not.toContainText('ya decidido');
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(t.estadoAprobado) })).toBeVisible();
      await expect(page.getByRole('button', { name: t.aprobar })).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(bff.decisiones).toHaveLength(1);
      expect(bff.detalles).toBeGreaterThanOrEqual(2);
      await capturar(page, 'h03-transicion-invalida', idioma, testInfo.project.name);
      expect(await violacionesGraves(page, testInfo, `axe-transicion-invalida-${idioma}`)).toEqual([]);
    });

    test(`H05 y H07 abiertos por su dirección con otro analista no dejan decidir · ${idioma}`, async ({ page }) => {
      await prepararPortal(page, { ...ANALISTA, sub: 'a0a0a0a0-0000-4000-8000-0000000000ff' });
      await simularBff(page);
      for (const pagina of ['solicitar-soporte', 'rechazar']) {
        await abrir(page, `/siniestros/${SINIESTRO_EVA01}/${pagina}`, idioma);
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.locator('form')).toHaveCount(0);
      }
    });
  });
}

