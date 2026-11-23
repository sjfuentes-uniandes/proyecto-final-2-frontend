import { TEXTOS_PORTAL, TextosPortal } from '../../../core/i18n/portal.i18n';
import { ms, segundos } from '../trazas/formato';
import { Alerta, Severidad } from './alerta.model';

const GIB = 1024 ** 3;
const ES = TEXTOS_PORTAL['es-CO'];

export const SEVERIDADES: Record<Severidad, { etiqueta: keyof TextosPortal; clase: string }> = {
  critica: { etiqueta: 'severidadCritica', clase: 'tag--error' },
  advertencia: { etiqueta: 'severidadAdvertencia', clase: 'tag--alerta' },
  informativa: { etiqueta: 'severidadInformativa', clase: 'tag--info' },
};

const ACCIONES: Record<Alerta['enlace']['tipo'], keyof TextosPortal> = {
  traza: 'verTraza',
  socio: 'verSocio',
  cola: 'verCola',
  tablero: 'verTablero',
};

/** Valor con su unidad, como en el mockup: "1,42 s", "225 ms", "0,7 %", "3" (separadores del idioma). */
export function valor(numero: number | null, unidad: string, locale = 'es-CO'): string {
  if (numero === null) {
    return '—';
  }
  const formato = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  switch (unidad) {
    case 'ms':
      return numero >= 1000 ? segundos(numero, locale) : ms(numero, locale);
    case '%':
      return `${formato.format(numero)} %`;
    case 'proporcion':
      return `${formato.format(numero * 100)} %`;
    case 's':
      return `${formato.format(numero)} s`;
    case 'bytes':
      return `${formato.format(numero / GIB)} GiB`;
    default:
      return formato.format(numero);
  }
}

export function hace(desde: string, ahora: Date): string {
  const minutos = Math.max(0, Math.floor((ahora.getTime() - new Date(desde).getTime()) / 60000));
  if (minutos < 60) {
    return `${minutos} min`;
  }
  return minutos < 1440 ? `${Math.floor(minutos / 60)} h` : `${Math.floor(minutos / 1440)} d`;
}

export function resumenAbiertas(abiertas: Alerta[], textos: TextosPortal = ES): string {
  if (abiertas.length === 0) {
    return textos.sinAlertasActivas;
  }
  return textos.resumenAbiertas(abiertas.length, abiertas.filter((a) => a.severidad === 'critica').length);
}

export function accion(alerta: Alerta, textos: TextosPortal = ES): string {
  return textos[ACCIONES[alerta.enlace.tipo]] as string;
}

export function severidad(nivel: Severidad, textos: TextosPortal = ES): { etiqueta: string; clase: string } {
  const { etiqueta, clase } = SEVERIDADES[nivel];
  return { etiqueta: textos[etiqueta] as string, clase };
}
