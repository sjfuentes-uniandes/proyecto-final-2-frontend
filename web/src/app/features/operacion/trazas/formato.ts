/** Formatos es-CO del mockup: "1.026 ms", "1,28 s". */
export function ms(valor: number): string {
  return `${String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ms`;
}

export function segundos(valorMs: number): string {
  return `${(valorMs / 1000).toFixed(2).replace('.', ',')} s`;
}

export function idCorto(id: string | null, largo = 10): string {
  if (!id) {
    return '—';
  }
  return id.length > largo + 2 ? `${id.slice(0, largo)}…` : id;
}

export function porcentaje(fraccion: number): string {
  return `${Math.min(Math.max(fraccion, 0), 1) * 100}%`;
}
