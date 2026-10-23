import AxeBuilder from '@axe-core/playwright';
import { Page, TestInfo } from '@playwright/test';

/**
 * Soporte de las pruebas E2E: sesión sintética, configuración y API simuladas, y axe.
 *
 * La sesión es la que guarda Amplify v6 en sessionStorage (`CognitoIdentityServiceProvider.<cliente>.…`)
 * con tokens JWT sin firma (alg none) y un `exp` lejano: Amplify los decodifica sin verificar la firma
 * y no llama a Cognito mientras no venzan. Solo existe en el navegador de la prueba; la API la simula
 * page.route, así que ningún token sale del equipo. config.json apunta la API al mismo origen
 * (`apiBaseUrl` vacío → `/web`), sin CORS.
 */

export interface UsuarioE2E {
  sub: string;
  nombre: string;
  grupos: string[];
}

export const ASESOR: UsuarioE2E = { sub: 'sub-asesor-e2e', nombre: 'Asesor Sintético', grupos: ['asesores'] };
export const SUSCRIPTOR: UsuarioE2E = { sub: 'sub-suscriptor-e2e', nombre: 'Suscriptora Sintética', grupos: ['suscriptores'] };

const POOL = 'us-east-1_e2e00000';
const CLIENTE = 'cliente-e2e-portal';
const EMISOR = `https://cognito-idp.us-east-1.amazonaws.com/${POOL}`;
/** 2100-01-01: la sesión no vence durante la prueba. */
const EXPIRA = 4_102_444_800;

/** Las rutas del BFF web como las pide el portal (mismo origen). */
export const API = '/web/v1';

function base64Url(valor: unknown): string {
  return Buffer.from(JSON.stringify(valor)).toString('base64url');
}

function jwt(claims: Record<string, unknown>): string {
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(claims)}.`;
}

/** Las claves que Amplify lee de sessionStorage para una sesión iniciada. */
export function clavesSesion(usuario: UsuarioE2E): Record<string, string> {
  const comunes = { sub: usuario.sub, iss: EMISOR, exp: EXPIRA, iat: 1_760_000_000, 'cognito:groups': usuario.grupos };
  const prefijo = `CognitoIdentityServiceProvider.${CLIENTE}`;
  return {
    [`${prefijo}.LastAuthUser`]: usuario.sub,
    [`${prefijo}.${usuario.sub}.idToken`]: jwt({ ...comunes, aud: CLIENTE, token_use: 'id', name: usuario.nombre }),
    [`${prefijo}.${usuario.sub}.accessToken`]: jwt({ ...comunes, client_id: CLIENTE, token_use: 'access' }),
    [`${prefijo}.${usuario.sub}.clockDrift`]: '0',
  };
}

/**
 * Deja el portal listo para navegar con la sesión del usuario: config.json local, la sesión en
 * sessionStorage antes de que arranque Angular y cualquier llamada al BFF no simulada → 404 en
 * formato B2 (las rutas que registre la prueba después tienen prioridad).
 */
export async function prepararPortal(page: Page, usuario: UsuarioE2E): Promise<void> {
  await page.route('**/config.json', (ruta) =>
    ruta.fulfill({
      json: {
        apiBaseUrl: '',
        dashboardUrl: '',
        cognito: {
          region: 'us-east-1',
          backoffice: { userPoolId: POOL, clientId: CLIENTE },
          clientes: { userPoolId: '', clientId: '' },
        },
      },
    }),
  );
  await page.route(`**${API}/**`, (ruta) =>
    ruta.fulfill({
      status: 404,
      json: { codigo: 'RUTA_NO_SIMULADA', mensaje: 'Ruta no simulada en la prueba', correlationId: 'corr-e2e', detalles: {} },
    }),
  );
  await page.addInitScript((claves: Record<string, string>) => {
    for (const [clave, valor] of Object.entries(claves)) {
      window.sessionStorage.setItem(clave, valor);
    }
  }, clavesSesion(usuario));
}

/** Responde una ruta del BFF con el cuerpo dado (y el estado, 200 por omisión). */
export async function simular(page: Page, ruta: string, cuerpo: unknown, estado = 200): Promise<void> {
  await page.route(`**${API}${ruta}`, (r) =>
    r.fulfill({ status: estado, json: cuerpo, headers: { 'X-Correlation-Id': 'corr-e2e' } }),
  );
}

/**
 * axe sobre la página completa (WCAG 2.x A/AA y buenas prácticas, las mismas etiquetas que el
 * helper de Karma). Adjunta el informe al reporte y devuelve solo las violaciones críticas o serias,
 * que son las que bloquean (§12.4).
 */
export async function violacionesGraves(page: Page, testInfo: TestInfo, nombre = 'axe'): Promise<string[]> {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  await testInfo.attach(`${nombre}.json`, { body: JSON.stringify(resultado.violations, null, 2), contentType: 'application/json' });
  return resultado.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}
