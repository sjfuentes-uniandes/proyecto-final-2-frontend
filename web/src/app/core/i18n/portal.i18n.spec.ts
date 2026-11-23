import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { pseudo } from '../../features/perfilamiento/perfilamiento.i18n';
import { IdiomaService } from './idioma.service';
import { TEXTOS_PORTAL, TITULOS_EN, TextosPortalService } from './portal.i18n';
import { TituloLocalizado } from './titulo-localizado';

describe('Textos transversales del portal (es-CO, en-US y pseudo-localización)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS_PORTAL['es-CO']).sort();
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS_PORTAL[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        const k = clave as keyof (typeof TEXTOS_PORTAL)['es-CO'];
        expect(typeof TEXTOS_PORTAL[idioma][k]).withContext(clave).toBe(typeof TEXTOS_PORTAL['es-CO'][k]);
      }
    }
  });

  it('en-US traduce los textos visibles', () => {
    const iguales = Object.keys(TEXTOS_PORTAL['es-CO']).filter((clave) => {
      const k = clave as keyof (typeof TEXTOS_PORTAL)['es-CO'];
      return typeof TEXTOS_PORTAL['es-CO'][k] === 'string' && TEXTOS_PORTAL['es-CO'][k] === TEXTOS_PORTAL['en-US'][k];
    });
    // "Error" se escribe igual en los dos idiomas.
    expect(iguales.sort()).toEqual(['estadoError']);
  });

  it('la pseudo-localización marca también los textos con valores', () => {
    expect(TEXTOS_PORTAL.pseudo.salir).toBe(pseudo('Salir'));
    expect(TEXTOS_PORTAL.pseudo.resumenAbiertas(2, 1)).toMatch(/^⟦2 áctívás · 1 crítícá·+⟧$/);
  });

  it('el servicio sigue el idioma elegido', () => {
    const textos = TestBed.inject(TextosPortalService);
    const idioma = TestBed.inject(IdiomaService);
    idioma.cambiar('en-US');
    expect(textos.t().salir).toBe('Sign out');
    expect(textos.t().serviciosInternosExternos(1, 2)).toBe('1 internal, 2 external');
    idioma.cambiar('es-CO');
    expect(textos.t().serviciosInternosExternos(1, 2)).toBe('1 interno, 2 externos');
  });

  it('todos los títulos de las rutas tienen traducción al inglés', () => {
    const router = TestBed.inject(Router);
    const titulos: string[] = [];
    const recorrer = (rutas = router.config): void => {
      for (const ruta of rutas) {
        if (typeof ruta.title === 'string') {
          titulos.push(ruta.title);
        }
        recorrer(ruta.children ?? []);
      }
    };
    recorrer();
    // Las rutas perezosas no están en router.config: se cubren con el título de cada parte.
    const titulo = TestBed.inject(TituloLocalizado);
    TestBed.inject(IdiomaService).cambiar('en-US');
    for (const parte of Object.keys(TITULOS_EN)) {
      expect(titulo.traducir(`${parte} · Solventa`)).toBe(`${TITULOS_EN[parte]} · Solventa`);
    }
    for (const t of titulos) {
      for (const parte of t.split(' · ')) {
        expect(TITULOS_EN[parte]).withContext(t).toBeDefined();
      }
    }
  });
});
