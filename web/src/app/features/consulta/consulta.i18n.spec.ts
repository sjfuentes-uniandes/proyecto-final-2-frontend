import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { TEXTOS_CONSULTA, TextosConsulta, TextosConsultaService, fechaSinHora } from './consulta.i18n';

type Clave = keyof TextosConsulta;

describe('Textos de la consulta (HU-W18: es-CO, en-US y pseudo-localización)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS_CONSULTA['es-CO']).sort() as Clave[];
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS_CONSULTA[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        expect(typeof TEXTOS_CONSULTA[idioma][clave]).withContext(clave).toBe(typeof TEXTOS_CONSULTA['es-CO'][clave]);
      }
    }
  });

  it('en-US traduce todos los textos visibles', () => {
    const iguales = (Object.keys(TEXTOS_CONSULTA['es-CO']) as Clave[]).filter((clave) => {
      const es = TEXTOS_CONSULTA['es-CO'][clave];
      return typeof es === 'string' && es === TEXTOS_CONSULTA['en-US'][clave];
    });
    expect(iguales).toEqual([]);
  });

  it('cada texto con valores produce texto en los tres idiomas', () => {
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      for (const [clave, valor] of Object.entries(TEXTOS_CONSULTA[idioma])) {
        if (typeof valor === 'function') {
          const resultado = (valor as (...args: unknown[]) => string)(2, 3, 4);
          expect(resultado.length).withContext(`${idioma}.${clave}`).toBeGreaterThan(0);
          expect(resultado).withContext(`${idioma}.${clave}`).not.toContain('undefined');
        }
      }
    }
  });

  it('la pseudo-localización alarga los textos', () => {
    expect(TEXTOS_CONSULTA.pseudo.buscar.length).toBeGreaterThan(TEXTOS_CONSULTA['es-CO'].buscar.length);
  });

  describe('fechas sin hora (sin corrimiento de día)', () => {
    it('2026-09-13 es el 13 en es-CO y en en-US', () => {
      // El es-CO de Intl con dateStyle medium da 13/09/2026.
      expect(fechaSinHora('2026-09-13', 'es-CO')).toBe('13/09/2026');
      expect(fechaSinHora('2026-09-13', 'en-US')).toBe('Sep 13, 2026');
    });

    it('no depende de la zona del navegador: new Date("YYYY-MM-DD") sí se corre en zonas al oeste de UTC', () => {
      const instante = new Date('2026-09-13');
      const enZona = (timeZone: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone }).format(instante);
      expect(enZona('America/Bogota')).toBe('Sep 12, 2026');
      expect(enZona('Pacific/Auckland')).toBe('Sep 13, 2026');
      expect(fechaSinHora('2026-09-13', 'en-US')).toBe('Sep 13, 2026');
    });

    it('maneja fin de año y bisiesto, y deja pasar lo que no es una fecha', () => {
      expect(fechaSinHora('2027-01-01', 'en-US')).toBe('Jan 1, 2027');
      expect(fechaSinHora('2028-02-29', 'en-US')).toBe('Feb 29, 2028');
      expect(fechaSinHora('mañana', 'es-CO')).toBe('mañana');
    });
  });

  describe('TextosConsultaService', () => {
    it('sigue el idioma activo y pseudo usa es-CO', () => {
      const idioma = TestBed.inject(IdiomaService);
      const servicio = TestBed.inject(TextosConsultaService);
      expect(servicio.locale()).toBe('es-CO');
      expect(servicio.t().buscar).toBe('Buscar');
      idioma.cambiar('en-US');
      expect(servicio.locale()).toBe('en-US');
      expect(servicio.t().buscar).toBe('Search');
      expect(servicio.fechaSinHora('2026-09-13')).toBe('Sep 13, 2026');
      idioma.cambiar('pseudo');
      expect(servicio.locale()).toBe('es-CO');
    });

    it('reutiliza los formatos de la contratación', () => {
      const servicio = TestBed.inject(TextosConsultaService);
      expect(servicio.monto('1250000.50', 'COP')).toContain('1.250.000,5');
      expect(servicio.decimal('0.92')).toBe('0,92');
      expect(servicio.fechaHora('2026-10-31T15:30:00Z')).toContain('2026');
    });

    it('la periodicidad solo se muestra si es un valor conocido', () => {
      const idioma = TestBed.inject(IdiomaService);
      const servicio = TestBed.inject(TextosConsultaService);
      expect(servicio.periodicidad('MENSUAL')).toBe('mensual');
      expect(servicio.periodicidad('anual')).toBe('anual');
      expect(servicio.periodicidad('QUINCENAL')).toBeNull();
      expect(servicio.periodicidad('constructor')).toBeNull();
      idioma.cambiar('en-US');
      expect(servicio.periodicidad('MENSUAL')).toBe('monthly');
    });
  });
});
