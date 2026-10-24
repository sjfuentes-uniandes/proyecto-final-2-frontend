import { rmSync } from 'node:fs';

import { ARCHIVO_PACTO } from './pacto';

/** Cada corrida parte de cero: una interacción que ya no existe no queda en el pacto. */
export default function preparar(): void {
  rmSync(ARCHIVO_PACTO, { force: true });
}
