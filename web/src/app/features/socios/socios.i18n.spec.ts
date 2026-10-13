import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { TEXTOS, TextosSociosService, pseudo } from './socios.i18n';

describe('Textos de Socios (es-CO, en-US y pseudo-localización)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS['es-CO']).sort();
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        const es = TEXTOS['es-CO'][clave as keyof (typeof TEXTOS)['es-CO']];
        expect(typeof TEXTOS[idioma][clave as keyof (typeof TEXTOS)['es-CO']]).withContext(clave).toBe(typeof es);
      }
    }
  });

  it('en-US traduce los textos visibles', () => {
    const iguales = Object.keys(TEXTOS['es-CO']).filter((clave) => {
      const k = clave as keyof (typeof TEXTOS)['es-CO'];
      return typeof TEXTOS['es-CO'][k] === 'string' && TEXTOS['es-CO'][k] === TEXTOS['en-US'][k];
    });
    // Términos técnicos que no se traducen.
    expect(iguales.sort()).toEqual(['apiKey', 'clientId', 'colPlan', 'metodoValor']);
  });

  it('la pseudo-localización acentúa, alarga y enmarca, también en textos con valores', () => {
    expect(pseudo('Socios')).toBe('⟦Sócíós··⟧');
    expect(TEXTOS.pseudo.pasoDe(2)).toMatch(/^⟦Pásó 2 dé 3·+⟧$/);
    expect(TEXTOS.pseudo.seccion.length).toBeGreaterThan(TEXTOS['es-CO'].seccion.length * 1.3);
  });

  it('el servicio sigue el idioma elegido y formatea fechas por locale', () => {
    const textos = TestBed.inject(TextosSociosService);
    const idioma = TestBed.inject(IdiomaService);
    idioma.cambiar('en-US');
    expect(textos.t().suspender).toBe('Suspend partner');
    expect(textos.estado('desactivado')).toBe('Suspended');
    expect(textos.fecha('2026-10-12T10:00:00Z')).toBe('10/12/2026');
    expect(document.documentElement.lang).toBe('en-US');
    idioma.cambiar('es-CO');
    expect(textos.fecha('2026-10-12T10:00:00Z')).toBe('12/10/2026');
    expect(textos.permiso('cotizar')).toEqual(['cotizar', 'solicitar cotizaciones embebidas']);
    idioma.cambiar('pseudo');
    expect(textos.canal('comercio')).toMatch(/^⟦/);
  });
});
