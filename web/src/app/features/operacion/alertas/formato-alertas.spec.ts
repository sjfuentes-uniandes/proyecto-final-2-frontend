import { Alerta } from './alerta.model';
import { AHORA, PANEL } from './alertas.testing';
import { accion, hace, resumenAbiertas, valor } from './formato-alertas';

describe('formato de alertas', () => {
  it('formatea cada unidad como el mockup', () => {
    expect(valor(1420, 'ms')).toBe('1,42 s');
    expect(valor(225, 'ms')).toBe('225 ms');
    expect(valor(0.7, '%')).toBe('0,7 %');
    expect(valor(99.93, '%')).toBe('99,93 %');
    expect(valor(0.051, 'proporcion')).toBe('5,1 %');
    expect(valor(420, 's')).toBe('420 s');
    expect(valor(1610612736, 'bytes')).toBe('1,5 GiB');
    expect(valor(3, 'mensajes')).toBe('3');
    expect(valor(null, 'ms')).toBe('—');
  });

  it('indica hace cuánto se abrió', () => {
    expect(hace('2026-10-14T14:42:00Z', AHORA)).toBe('18 min');
    expect(hace('2026-10-14T12:00:00Z', AHORA)).toBe('3 h');
    expect(hace('2026-10-12T14:00:00Z', AHORA)).toBe('2 d');
    expect(hace('2026-10-14T15:05:00Z', AHORA)).toBe('0 min');
  });

  it('resume las alertas activas y las críticas', () => {
    const critica: Alerta = { ...PANEL.abiertas[0], severidad: 'critica' };
    expect(resumenAbiertas(PANEL.abiertas)).toBe('3 activas · ninguna crítica');
    expect(resumenAbiertas([critica])).toBe('1 activa · 1 crítica');
    expect(resumenAbiertas([critica, critica])).toBe('2 activas · 2 críticas');
    expect(resumenAbiertas([])).toBe('Sin alertas activas');
  });

  it('nombra la acción de cada enlace', () => {
    expect(PANEL.abiertas.map(accion)).toEqual(['Ver traza', 'Ver socio', 'Ver cola']);
    expect(accion({ ...PANEL.abiertas[0], enlace: { tipo: 'tablero', url: 'https://x', socio_id: null, min_ms: null } })).toBe('Ver tablero');
  });
});
