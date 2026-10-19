import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { pseudo } from '../perfilamiento/perfilamiento.i18n';
import { CATALOGO_CONSENTIMIENTOS, TEXTOS, TextosConsentimientos, TextosConsentimientosService } from './consentimientos.i18n';

type Clave = keyof TextosConsentimientos;

describe('Textos de consentimientos (es-CO, en-US y pseudo-localización)', () => {
  let textos: TextosConsentimientosService;
  let idioma: IdiomaService;

  beforeEach(() => {
    textos = TestBed.inject(TextosConsentimientosService);
    idioma = TestBed.inject(IdiomaService);
  });
  afterEach(() => idioma.cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS['es-CO']).sort() as Clave[];
    for (const otro of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS[otro]).sort()).toEqual(claves);
      for (const clave of claves) {
        expect(typeof TEXTOS[otro][clave]).withContext(clave).toBe(typeof TEXTOS['es-CO'][clave]);
      }
    }
  });

  it('en-US traduce todos los textos', () => {
    const iguales = (Object.keys(TEXTOS['es-CO']) as Clave[]).filter((clave) => {
      const es = TEXTOS['es-CO'][clave];
      return typeof es === 'string' && es === TEXTOS['en-US'][clave];
    });
    expect(iguales).toEqual([]);
  });

  it('los textos con valores también se traducen y se pseudo-localizan', () => {
    expect(TEXTOS['es-CO'].cargados(1)).toBe('Se cargó 1 consentimiento.');
    expect(TEXTOS['es-CO'].cargados(3)).toBe('Se cargaron 3 consentimientos.');
    expect(TEXTOS['en-US'].cargados(1)).toBe('1 consent loaded.');
    expect(TEXTOS['en-US'].cargados(3)).toBe('3 consents loaded.');
    expect(TEXTOS.pseudo.cargados(3)).toBe(pseudo('Se cargaron 3 consentimientos.'));
    expect(TEXTOS.pseudo.titulo.length).toBeGreaterThan(TEXTOS['es-CO'].titulo.length * 1.3);
  });

  it('los catálogos tienen las mismas tablas y claves, y en-US los traduce', () => {
    const es = CATALOGO_CONSENTIMIENTOS['es-CO'];
    const en = CATALOGO_CONSENTIMIENTOS['en-US'];
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const tabla of Object.keys(es) as (keyof typeof es)[]) {
      const claves = Object.keys(es[tabla]).sort();
      expect(Object.keys(en[tabla]).sort()).withContext(tabla).toEqual(claves);
      for (const clave of claves) {
        const [textoEs, textoEn] = [es[tabla], en[tabla]].map((t) => (t as Record<string, string>)[clave]);
        expect(textoEn.length).withContext(`${tabla}.${clave}`).toBeGreaterThan(0);
        expect(textoEn).withContext(`${tabla}.${clave}`).not.toBe(textoEs);
      }
    }
  });

  it('nombra estados, hitos, alcances, propósitos e idiomas del texto legal', () => {
    expect(textos.estado('ACTIVO')).toBe('Activo');
    expect(textos.estado('REVOCADO')).toBe('Revocado');
    expect(textos.estado('VENCIDO')).toBe('Vencido');
    expect(textos.tipoHito('OTORGADO')).toBe('Otorgado por el titular');
    expect(textos.alcance('FA_INGRESOS_AGREGADOS')).toBe('Finanzas Abiertas · ingresos agregados, sin movimientos');
    expect(textos.proposito('PERFILAMIENTO_PRECIO')).toBe('Perfilamiento y cálculo de precio');
    expect(textos.idiomaTexto('en-US')).toBe('Inglés (Estados Unidos)');
    idioma.cambiar('en-US');
    expect(textos.estado('VENCIDO')).toBe('Expired');
    expect(textos.alcance('DA_REGISTROS_PUBLICOS')).toBe('Open Data · public government sources');
  });

  it('un código que el servidor agregue después se muestra tal cual, sin romper la pantalla', () => {
    expect(textos.estado('SUSPENDIDO')).toBe('SUSPENDIDO');
    expect(textos.tipoHito('RENOVADO')).toBe('RENOVADO');
    expect(textos.alcance('FA_NUEVO')).toBe('FA_NUEVO');
    expect(textos.proposito('OTRO')).toBe('OTRO');
    expect(textos.idiomaTexto('pt-BR')).toBe('pt-BR');
    expect(textos.alcance('constructor')).toBe('constructor');
  });

  it('pseudo-localiza también los catálogos y los códigos desconocidos', () => {
    idioma.cambiar('pseudo');
    for (const texto of [textos.estado('ACTIVO'), textos.tipoHito('VENCIDO'), textos.alcance('FA_PRODUCTOS_VIGENTES'),
      textos.proposito('PERFILAMIENTO_PRECIO'), textos.idiomaTexto('es-CO'), textos.estado('OTRO')]) {
      expect(texto).toMatch(/^⟦.+⟧$/);
    }
    expect(textos.locale()).toBe('es-CO');
  });

  describe('ADR 0010: las fechas llegan en UTC y se presentan en la zona del usuario', () => {
    it('convierte a la zona pedida, también cuando cambia el día', () => {
      // 03:00 UTC del 1 de octubre es el 30 de septiembre a las 22:00 en Bogotá (UTC−5).
      const bogota = textos.fechaHora('2027-10-01T03:00:00Z', 'America/Bogota');
      expect(bogota).toContain('30/09/2027');
      expect(bogota).toContain('22:00');
      const utc = textos.fechaHora('2027-10-01T03:00:00Z', 'UTC');
      expect(utc).toContain('01/10/2027');
      expect(utc).toContain('03:00');
    });

    it('sin zona usa la del navegador e indica cuál es', () => {
      const instante = new Date('2026-10-15T15:04:00Z');
      const hh = String(instante.getHours()).padStart(2, '0');
      const mm = String(instante.getMinutes()).padStart(2, '0');
      const texto = textos.fechaHora('2026-10-15T15:04:00Z');
      expect(texto).toContain(`${hh}:${mm}`);
      const zona = new Intl.DateTimeFormat('es-CO', { timeZoneName: 'short' })
        .formatToParts(instante)
        .find((p) => p.type === 'timeZoneName')!.value;
      expect(texto).toContain(zona);
    });

    it('en en-US usa el formato del idioma', () => {
      idioma.cambiar('en-US');
      expect(textos.fechaHora('2027-10-01T15:30:00Z', 'UTC')).toContain('10/01/2027');
    });

    it('sin fecha muestra un guion', () => {
      expect(textos.fechaHora(null)).toBe('—');
    });
  });
});
