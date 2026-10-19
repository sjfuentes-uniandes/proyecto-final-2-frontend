// @ts-check
// ESLint solo para la feature de consentimientos (ADR 0008, PR 3.8). No bloqueante: no corre en test:ci, en el build
// ni en la CI; se ejecuta con `npm run lint:consentimientos`. El resto del proyecto queda fuera aunque se corra `eslint .`.
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

import sinLiteralesEnPlantillas from './eslint/sin-literales-en-plantillas.mjs';

const FEATURE = 'src/app/features/consentimientos';
const solventa = { rules: { 'sin-literales-en-plantillas': sinLiteralesEnPlantillas } };

export default tseslint.config(
  { ignores: ['**/*', '!**/', `!${FEATURE}/**/*`] },
  {
    files: [`${FEATURE}/**/*.ts`],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
  },
  {
    files: [`${FEATURE}/**/*.html`],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    plugins: { solventa },
    rules: { 'solventa/sin-literales-en-plantillas': 'error' },
  },
);
