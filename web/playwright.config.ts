import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas E2E del portal (HU-W14, W14-F01) con la API simulada: la sesión de Cognito se inyecta en
 * sessionStorage y config.json y el BFF se interceptan con page.route (e2e/soporte), sin tocar el
 * código de producción ni AWS.
 *
 * Navegadores: Chromium, Firefox y WebKit, en escritorio (1440×900) y tableta (1024×768).
 * `ng serve` se levanta en E2E_PUERTO (4210 por omisión: el 4200 suele estar ocupado en local, R-50).
 * Pact usa su propia configuración (pact/playwright.config.ts).
 */
const PUERTO = Number(process.env['E2E_PUERTO'] ?? 4210);
const URL_BASE = `http://localhost:${PUERTO}`;
const EN_CI = !!process.env['CI'];

const ESCRITORIO = { viewport: { width: 1440, height: 900 } };
const TABLETA = { viewport: { width: 1024, height: 768 } };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: EN_CI,
  retries: EN_CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: URL_BASE,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-escritorio', use: { ...devices['Desktop Chrome'], ...ESCRITORIO } },
    { name: 'chromium-tableta', use: { ...devices['Desktop Chrome'], ...TABLETA } },
    { name: 'firefox-escritorio', use: { ...devices['Desktop Firefox'], ...ESCRITORIO } },
    { name: 'firefox-tableta', use: { ...devices['Desktop Firefox'], ...TABLETA } },
    { name: 'webkit-escritorio', use: { ...devices['Desktop Safari'], ...ESCRITORIO } },
    { name: 'webkit-tableta', use: { ...devices['Desktop Safari'], ...TABLETA } },
  ],
  webServer: {
    command: `npx ng serve --port ${PUERTO} --hmr=false --live-reload=false`,
    url: URL_BASE,
    reuseExistingServer: !EN_CI,
    timeout: 180_000,
  },
});
