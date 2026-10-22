// @ts-check
// ESLint solo para las features de consentimientos (ADR 0008, PR 3.8) y contratación (HU-W13). No bloqueante: no corre
// en test:ci, en el build ni en la CI; se ejecuta con `npm run lint:consentimientos` o `npm run lint:contratacion`. El resto
// del proyecto queda fuera aunque se corra `eslint .`.
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

import sinLiteralesEnPlantillas from './eslint/sin-literales-en-plantillas.mjs';

const FEATURES = ['src/app/features/consentimientos', 'src/app/features/contratacion'];
const solventa = { rules: { 'sin-literales-en-plantillas': sinLiteralesEnPlantillas } };

export default tseslint.config(
  { ignores: ['**/*', '!**/', ...FEATURES.map((feature) => `!${feature}/**/*`)] },
  {
    files: FEATURES.map((feature) => `${feature}/**/*.ts`),
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
  },
  {
    files: FEATURES.map((feature) => `${feature}/**/*.html`),
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    plugins: { solventa },
    rules: { 'solventa/sin-literales-en-plantillas': 'error' },
  },
);
