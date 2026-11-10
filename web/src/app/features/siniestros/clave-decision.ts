/**
 * La `Idempotency-Key` de una decisión que se envía desde una página (H05 y H07). La misma clave
 * sirve para reintentar **el mismo cuerpo** (un fallo de red, un doble clic); si el analista cambia
 * algo, el cuerpo es otro y la clave anterior daría 422 `IDEMPOTENCIA_CONFLICTO`, así que se genera
 * una nueva. La clave solo vive en memoria.
 */
export class ClaveDeDecision {
  private cuerpo: string | null = null;
  private clave: string | null = null;

  para(cuerpo: unknown): string {
    const texto = JSON.stringify(cuerpo);
    if (this.clave === null || this.cuerpo !== texto) {
      this.clave = crypto.randomUUID();
      this.cuerpo = texto;
    }
    return this.clave;
  }
}
