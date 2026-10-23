import { resolve } from 'node:path';

import { PactV4 } from '@pact-foundation/pact';

/** El portal (consumidor) frente a bff-web (proveedor). Las rutas son las del BFF, sin el /web de API Gateway. */
export const CONSUMIDOR = 'portal-web';
export const PROVEEDOR = 'bff-web';
export const DIRECTORIO_PACTOS = resolve(__dirname, '..', 'pacts');
export const ARCHIVO_PACTO = resolve(DIRECTORIO_PACTOS, `${CONSUMIDOR}-${PROVEEDOR}.json`);

export function nuevoPacto(): PactV4 {
  return new PactV4({ consumer: CONSUMIDOR, provider: PROVEEDOR, dir: DIRECTORIO_PACTOS, logLevel: 'warn' });
}

/** Lo que pide el portal: JSON, como HttpClient. */
export const ACEPTA_JSON = { Accept: 'application/json' };
