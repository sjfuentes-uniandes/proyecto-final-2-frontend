/** Formatos del mockup: "1.026 ms", "1,28 s" en es-CO; "1,026 ms", "1.28 s" en en-US. */
export function ms(valor: number, locale = 'es-CO'): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(valor))} ms`;
}

export function segundos(valorMs: number, locale = 'es-CO'): string {
  const formato = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formato.format(valorMs / 1000)} s`;
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
