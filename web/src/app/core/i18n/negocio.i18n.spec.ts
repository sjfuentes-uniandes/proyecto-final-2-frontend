import { TestBed } from '@angular/core/testing';

import { IdiomaService } from './idioma.service';
import { COBERTURAS_EN, EXCLUSIONES_EN, TextosNegocioService } from './negocio.i18n';

describe('Nombres del catálogo de negocio (coberturas, exclusiones, ramos y productos)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('en es-CO muestra el nombre que entrega el backend', () => {
    const negocio = TestBed.inject(TextosNegocioService);
    expect(negocio.cobertura('MUERTE', 'Muerte por cualquier causa')).toBe('Muerte por cualquier causa');
    expect(negocio.ramo('VIDA_HIPOTECARIO')).toBe('VIDA_HIPOTECARIO');
  });

  it('en en-US traduce por código y, sin código, por el nombre en español', () => {
    const negocio = TestBed.inject(TextosNegocioService);
    TestBed.inject(IdiomaService).cambiar('en-US');
    expect(negocio.cobertura('MUERTE', 'Muerte por cualquier causa')).toBe('Death from any cause');
    expect(negocio.cobertura('ENFERMEDADES_GRAVES', 'Enfermedades graves')).toBe('Critical illness');
    expect(negocio.cobertura('OTRO_CODIGO', 'Auxilio funerario')).toBe('Funeral benefit');
    expect(negocio.exclusion('SUICIDIO_PRIMER_ANIO', 'x')).toBe(EXCLUSIONES_EN['SUICIDIO_PRIMER_ANIO']);
    expect(negocio.ramo('VIDA_HIPOTECARIO')).toBe('Mortgage life');
    expect(negocio.producto('vida-hipotecario', 'Vida deudor hipotecario')).toBe('Mortgage borrower life');
    expect(negocio.nombre('Vida QA C01 - auxilio funerario vencido')).toBe('Vida QA C01 - auxilio funerario vencido');
  });

  it('la pseudo-localización marca solo lo que tiene traducción', () => {
    const negocio = TestBed.inject(TextosNegocioService);
    TestBed.inject(IdiomaService).cambiar('pseudo');
    expect(negocio.cobertura('MUERTE', 'Muerte por cualquier causa')).toMatch(/^⟦/);
    expect(negocio.nombre('Producto QA sin traducción')).toBe('Producto QA sin traducción');
  });

  it('cada cobertura del catálogo tiene traducción', () => {
    for (const codigo of ['MUERTE', 'INCAPACIDAD_TOTAL_PERMANENTE', 'ENFERMEDADES_GRAVES', 'AUXILIO_FUNERARIO', 'LLUVIA_ACUMULADA']) {
      expect(COBERTURAS_EN[codigo]).withContext(codigo).toBeTruthy();
    }
  });
});
