/**
 * HU-W29: formato de números, duraciones y horas de I04 e I05 (es-CO y en-US). Las horas van en
 * la zona del portal (America/Bogota, como Playwright), no en la del navegador: la cronología se
 * compara con el informe del experimento.
 */
const ZONA = 'America/Bogota';

export function numero(valor: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(valor);
}

export function porcentaje(valor: number, locale: string, decimales = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: decimales }).format(valor);
}

/** 38 → "38 s"; 125 → "2 min 05 s"; 3725 → "1 h 02 min". */
export function duracion(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) {
    return `${s} s`;
  }
  const minutos = Math.floor(s / 60);
  if (minutos < 60) {
    return `${minutos} min ${String(s % 60).padStart(2, '0')} s`;
  }
  return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
}

export function segundosEntre(desde: string, hasta: string | Date): number {
  const fin = typeof hasta === 'string' ? new Date(hasta) : hasta;
  return (fin.getTime() - new Date(desde).getTime()) / 1000;
}

export function hora(instante: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: ZONA }).format(new Date(instante));
}

export function fechaHora(instante: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium', hour12: false, timeZone: ZONA }).format(new Date(instante));
}
