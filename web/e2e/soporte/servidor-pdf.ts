import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';

import { test as base } from '@playwright/test';

/**
 * S3 local de las E2E de la descarga (HU-W17, 17.12c): un servidor HTTP real en 127.0.0.1 que responde
 * el PDF sintético como adjunto. En WebKit, Playwright no emite `download` cuando el adjunto lo responde
 * `route.fulfill` (microsoft/playwright#9267); con un servidor real, sí, en los tres motores.
 */

export const PDF_SINTETICO = Buffer.from('%PDF-1.4\n% sintetico\n');
export const SHA256_PDF_SINTETICO = createHash('sha256').update(PDF_SINTETICO).digest('hex');

export interface PeticionPdf {
  ruta: string;
  consulta: string;
}

export interface ServidorPdf {
  /** `http://127.0.0.1:<puerto>`, sin barra final. */
  origen: string;
  /** Cada petición recibida, en orden. */
  peticiones: PeticionPdf[];
  /** La misma ruta y consulta de `urlPrefirmada` (sintética), servidas desde este origen. */
  imitar(urlPrefirmada: string): string;
}

/** `servidorPdf`: se levanta en el puerto 0 al pedirlo y se cierra al terminar la prueba, aunque falle. */
export const test = base.extend<{ servidorPdf: ServidorPdf }>({
  servidorPdf: async ({}, use) => {
    const peticiones: PeticionPdf[] = [];
    const servidor = createServer((pedido, respuesta) => {
      const url = new URL(pedido.url ?? '/', 'http://127.0.0.1');
      peticiones.push({ ruta: url.pathname, consulta: url.search });
      const numero = url.pathname.split('/').pop()?.replace(/\.pdf$/, '') ?? '';
      respuesta.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${numero}.pdf"`,
        'Content-Length': PDF_SINTETICO.length,
      });
      respuesta.end(PDF_SINTETICO);
    });
    await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
    const origen = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    try {
      await use({
        origen,
        peticiones,
        imitar: (urlPrefirmada) => {
          const { pathname, search } = new URL(urlPrefirmada);
          return `${origen}${pathname}${search}`;
        },
      });
    } finally {
      servidor.closeAllConnections();
      await new Promise<void>((cerrado) => servidor.close(() => cerrado()));
    }
  },
});

export { expect } from '@playwright/test';
