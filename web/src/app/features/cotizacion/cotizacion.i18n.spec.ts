import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { TEXTOS_COTIZACION, TextosCotizacion, TextosCotizacionService } from './cotizacion.i18n';

type Clave = keyof TextosCotizacion;

describe('Textos de la cotización (HU-W03: es-CO, en-US y pseudo-localización)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS_COTIZACION['es-CO']).sort() as Clave[];
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS_COTIZACION[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        expect(typeof TEXTOS_COTIZACION[idioma][clave]).withContext(clave).toBe(typeof TEXTOS_COTIZACION['es-CO'][clave]);
      }
    }
  });

  it('en-US traduce todos los textos visibles', () => {
    const iguales = (Object.keys(TEXTOS_COTIZACION['es-CO']) as Clave[]).filter((clave) => {
      const es = TEXTOS_COTIZACION['es-CO'][clave];
      return typeof es === 'string' && es === TEXTOS_COTIZACION['en-US'][clave];
    });
    expect(iguales).toEqual([]);
  });

  it('los textos con valores siguen el idioma', () => {
    const es = TEXTOS_COTIZACION['es-CO'];
    const en = TEXTOS_COTIZACION['en-US'];
    expect(es.camposRequierenCorreccion(1)).toBe('1 campo requiere corrección');
    expect(es.camposRequierenCorreccion(3)).toBe('3 campos requieren corrección');
    expect(en.camposRequierenCorreccion(3)).toBe('3 fields need correction');
    expect(es.edadMinima(18)).toBe('El tomador debe tener al menos 18 años al inicio de vigencia');
    expect(es.primaPeriodo('MENSUAL')).toBe('Prima mensual');
    expect(en.primaPeriodo('ANUAL')).toBe('Annual premium');
    expect(TEXTOS_COTIZACION.pseudo.cotizarSinPerfilar).toMatch(/^⟦/);
    expect(TEXTOS_COTIZACION.pseudo.catalogoVersion('2026.09.1')).toMatch(/^⟦.*2026\.09\.1/);
  });

  it('cada texto con valores produce texto en los tres idiomas', () => {
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      for (const [clave, valor] of Object.entries(TEXTOS_COTIZACION[idioma])) {
        if (typeof valor === 'function') {
          const resultado = (valor as (...args: unknown[]) => string)(2, 'x');
          expect(resultado.length).withContext(`${idioma}.${clave}`).toBeGreaterThan(0);
          expect(resultado).withContext(`${idioma}.${clave}`).not.toContain('undefined');
        }
      }
    }
  });

  it('formatea montos en la moneda de la cotización, decimales y nombres de factores', () => {
    const textos = TestBed.inject(TextosCotizacionService);
    const idioma = TestBed.inject(IdiomaService);
    expect(textos.monto('97460', 'COP').replace(/\s/g, ' ')).toBe('$ 97.460');
    expect(textos.monto('-297296', 'COP').replace(/\s/g, ' ')).toBe('-$ 297.296');
    expect(textos.decimal('1.15')).toBe('1,15');
    expect(textos.decimal('2')).toBe('2');
    expect(textos.factor('NIVEL_RIESGO')).toBe('Nivel de riesgo');
    expect(textos.factor('NUEVO_FACTOR')).toBe('NUEVO_FACTOR');
    idioma.cambiar('en-US');
    expect(textos.monto('97460', 'COP').replace(/\s/g, ' ')).toBe('COP 97,460');
    expect(textos.decimal('1.15')).toBe('1.15');
    expect(textos.factor('EDAD')).toBe('Age');
    idioma.cambiar('pseudo');
    expect(textos.factor('PLAZO')).toMatch(/^⟦/);
    expect(textos.locale()).toBe('es-CO');
  });
});
