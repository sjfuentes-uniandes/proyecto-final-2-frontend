import { ms, segundos } from '../trazas/formato';
import { Alerta, Severidad } from './alerta.model';

const NUMERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const GIB = 1024 ** 3;

export const SEVERIDADES: Record<Severidad, { etiqueta: string; clase: string }> = {
  critica: { etiqueta: 'Crítica', clase: 'tag--error' },
  advertencia: { etiqueta: 'Advertencia', clase: 'tag--alerta' },
  informativa: { etiqueta: 'Informativa', clase: 'tag--info' },
};

const ACCIONES: Record<Alerta['enlace']['tipo'], string> = {
  traza: 'Ver traza',
  socio: 'Ver socio',
  cola: 'Ver cola',
  tablero: 'Ver tablero',
};

/** Valor con su unidad, como en el mockup: "1,42 s", "225 ms", "0,7 %", "3". */
export function valor(numero: number | null, unidad: string): string {
  if (numero === null) {
    return '—';
  }
  switch (unidad) {
    case 'ms':
      return numero >= 1000 ? segundos(numero) : ms(numero);
    case '%':
      return `${NUMERO.format(numero)} %`;
    case 'proporcion':
      return `${NUMERO.format(numero * 100)} %`;
    case 's':
      return `${NUMERO.format(numero)} s`;
    case 'bytes':
      return `${NUMERO.format(numero / GIB)} GiB`;
    default:
      return NUMERO.format(numero);
  }
}

export function hace(desde: string, ahora: Date): string {
  const minutos = Math.max(0, Math.floor((ahora.getTime() - new Date(desde).getTime()) / 60000));
  if (minutos < 60) {
    return `${minutos} min`;
  }
  return minutos < 1440 ? `${Math.floor(minutos / 60)} h` : `${Math.floor(minutos / 1440)} d`;
}

export function resumenAbiertas(abiertas: Alerta[]): string {
  if (abiertas.length === 0) {
    return 'Sin alertas activas';
  }
  const criticas = abiertas.filter((a) => a.severidad === 'critica').length;
  const activas = `${abiertas.length} ${abiertas.length === 1 ? 'activa' : 'activas'}`;
  const detalle = criticas === 0 ? 'ninguna crítica' : `${criticas} ${criticas === 1 ? 'crítica' : 'críticas'}`;
  return `${activas} · ${detalle}`;
}

export function accion(alerta: Alerta): string {
  return ACCIONES[alerta.enlace.tipo];
}
