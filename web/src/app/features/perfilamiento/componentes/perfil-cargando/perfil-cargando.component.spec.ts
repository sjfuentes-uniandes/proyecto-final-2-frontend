import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { PerfilCargandoComponent } from './perfil-cargando.component';

describe('PerfilCargandoComponent (D01 simplificado, W12-P09)', () => {
  let fixture: ComponentFixture<PerfilCargandoComponent>;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  function montar(idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({ imports: [PerfilCargandoComponent] });
    TestBed.inject(IdiomaService).cambiar(idioma);
    fixture = TestBed.createComponent(PerfilCargandoComponent);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('muestra título, subtítulo, migas y el paso 2 activo', () => {
    montar();
    expect(texto('nav.crumb')).toBe('Inicio › Contratación › Perfilamiento');
    expect(texto('h2')).toBe('Calculando el perfil de riesgo');
    expect(texto('header .sub')).toBe('Consultando las fuentes autorizadas en paralelo');
    const pasos = Array.from(html().querySelectorAll('.pasos li'));
    expect(pasos.map((li) => li.textContent?.trim())).toEqual(['1 · Producto y cliente', '2 · Perfilamiento', '3 · Oferta']);
    expect(pasos[0].classList).toContain('hecho');
    expect(pasos[1].getAttribute('aria-current')).toBe('step');
  });

  it('las cuatro tarjetas son esqueletos ocultos a los lectores de pantalla', () => {
    montar();
    const metricas = html().querySelector('.metricas');
    expect(metricas?.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(html().querySelectorAll('.tarjeta .etiqueta')).map((e) => e.textContent?.trim())).toEqual([
      'Nivel de riesgo', 'Confianza del perfil', 'Tiempo de cálculo', 'Ajuste sobre la tarifa base',
    ]);
    expect(html().querySelectorAll('.tarjeta .bloque').length).toBe(8);
  });

  it('anuncia el cálculo en una región viva', () => {
    montar();
    const anuncio = html().querySelector('[role=status]');
    expect(anuncio?.getAttribute('aria-live')).toBe('polite');
    expect(anuncio?.textContent?.trim()).toBe('Calculando el perfil de riesgo');
  });

  it('no tiene tabla de progreso por fuente ni panel de presupuesto (DT-23)', () => {
    montar();
    expect(html().querySelector('table')).toBeNull();
    expect(html().textContent).not.toContain('Presupuesto');
  });

  it('se traduce a en-US', () => {
    montar('en-US');
    expect(texto('h2')).toBe('Calculating the risk profile');
    expect(texto('header .sub')).toBe('Querying the authorized sources in parallel');
  });

  it('WT-W12-02 · sin violaciones de accesibilidad', async () => {
    montar();
    expect(await violacionesA11y(html())).toEqual([]);
  });
});
