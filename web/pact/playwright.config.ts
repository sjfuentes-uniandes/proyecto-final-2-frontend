import { defineConfig } from '@playwright/test';

/**
 * Pact consumidor del portal (HU-W14, W14-F01): corre en Node con el runner de Playwright, sin
 * navegador ni Karma. Genera web/pacts/portal-web-bff-web.json, que la verificación del proveedor
 * (bff-web) copia al backend. Un solo worker: todas las interacciones escriben el mismo pacto.
 */
process.env['PACT_DO_NOT_TRACK'] ??= 'true';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.pact.spec.ts',
  globalSetup: './preparar.ts',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  reporter: 'list',
  outputDir: '../test-results/pact',
});
