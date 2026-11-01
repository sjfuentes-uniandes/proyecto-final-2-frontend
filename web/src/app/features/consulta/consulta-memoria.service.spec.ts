import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Claims, SesionService } from '../../core/auth/sesion.service';
import { MemoriaConsultaService, claveListado } from './consulta-memoria.service';
import { PAGINA_LLENA, POLIZA_VIGENTE_ID, estadoPoliza } from './consulta.testing';

describe('MemoriaConsultaService (último dato conocido, solo en memoria)', () => {
  const claims = signal<Claims | null>({ sub: 'asesor-1' });
  let memoria: MemoriaConsultaService;

  beforeEach(() => {
    claims.set({ sub: 'asesor-1' });
    TestBed.configureTestingModule({ providers: [{ provide: SesionService, useValue: { claims } }] });
    memoria = TestBed.inject(MemoriaConsultaService);
    TestBed.flushEffects();
  });

  it('guarda y devuelve el listado por filtros', () => {
    expect(memoria.listado({ estado: 'VIGENTE' })).toBeNull();
    memoria.guardarListado({ estado: 'VIGENTE', pagina: 1 }, PAGINA_LLENA);
    const guardado = memoria.listado({ pagina: 1, estado: 'VIGENTE', ramo: '' });
    expect(guardado?.datos).toEqual(PAGINA_LLENA);
    expect(guardado?.obtenidoEn).toBeTruthy();
    expect(memoria.listado({ estado: 'VENCIDA' })).toBeNull();
  });

  it('guarda y devuelve el detalle por polizaId', () => {
    const poliza = estadoPoliza('VIGENTE');
    expect(memoria.detalle(POLIZA_VIGENTE_ID)).toBeNull();
    memoria.guardarDetalle(poliza);
    expect(memoria.detalle(POLIZA_VIGENTE_ID)?.datos).toEqual(poliza);
  });

  it('la clave no depende del orden ni de los vacíos', () => {
    expect(claveListado({ estado: 'VIGENTE', ramo: 'Vida' })).toBe(claveListado({ ramo: 'Vida', estado: 'VIGENTE', numero: '' }));
  });

  it('se limpia cuando la sesión queda nula', () => {
    memoria.guardarListado({}, PAGINA_LLENA);
    memoria.guardarDetalle(estadoPoliza('VIGENTE'));
    claims.set(null);
    TestBed.flushEffects();
    expect(memoria.listado({})).toBeNull();
    expect(memoria.detalle(POLIZA_VIGENTE_ID)).toBeNull();
  });

  it('se limpia cuando cambia el sub, pero no cuando la sesión se renueva con el mismo', () => {
    memoria.guardarListado({}, PAGINA_LLENA);
    claims.set({ sub: 'asesor-1', exp: 999 });
    TestBed.flushEffects();
    expect(memoria.listado({})).not.toBeNull();

    claims.set({ sub: 'asesor-2' });
    TestBed.flushEffects();
    expect(memoria.listado({})).toBeNull();
  });

  it('con 503 se puede usar lo guardado: no se pierde mientras la sesión sea la misma', () => {
    memoria.guardarDetalle(estadoPoliza('POR_VENCER'));
    TestBed.flushEffects();
    expect(memoria.detalle(estadoPoliza('POR_VENCER').polizaId)?.datos.estado).toBe('POR_VENCER');
  });
});
