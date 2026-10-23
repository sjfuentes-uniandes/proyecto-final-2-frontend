import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { Alternativa } from '../../contratacion.modelo';
import { ALTERNATIVAS } from '../../contratacion.testing';
import { AlternativasComponent } from './alternativas.component';

describe('AlternativasComponent (E03, HU-W14)', () => {
  let fixture: ComponentFixture<AlternativasComponent>;
  const html = () => fixture.nativeElement as HTMLElement;
  const filas = () =>
    Array.from(html().querySelectorAll('.kv > div')).map((fila) => [
      fila.querySelector('dt')?.textContent?.trim(),
      fila.querySelector('dd')?.textContent?.trim(),
    ]);
  const enlaces = () => Array.from(html().querySelectorAll<HTMLAnchorElement>('a'));

  function montar(alternativas: Alternativa[] = ALTERNATIVAS): void {
    TestBed.configureTestingModule({ imports: [AlternativasComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(AlternativasComponent);
    fixture.componentRef.setInput('alternativas', alternativas);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('lista las alternativas con su descriptor y solo ofrece cotizar (AC2: sin contratación)', async () => {
    montar();
    expect(html().querySelector('h3')?.textContent?.trim()).toBe('Alternativas disponibles');
    expect(filas()).toEqual([
      ['Vida sénior', 'hasta 80 años'],
      ['Protección de pagos', 'sin límite de edad'],
      ['Auxilio funerario', 'hasta 85 años'],
    ]);
    expect(enlaces().map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Cotizar una alternativa', '/perfilamiento/nuevo'],
    ]);
    expect(html().textContent).not.toContain('aceptación');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('sin alternativas (catálogo no disponible) lo dice y mantiene la opción de cotizar', async () => {
    montar([]);
    expect(html().querySelector('.kv')).toBeNull();
    expect(html().querySelector('.vacio')?.textContent?.trim()).toContain('Por ahora no hay alternativas para mostrar');
    expect(enlaces().length).toBe(1);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('un producto desconocido se muestra con su id', () => {
    montar([{ productoId: 'producto-nuevo', descriptor: { codigo: 'SIN_LIMITE_EDAD', valor: null } }]);
    expect(filas()).toEqual([['producto-nuevo', 'sin límite de edad']]);
  });

  it('cambia a en-US y a pseudo', () => {
    montar();
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(filas()).toEqual([
      ['Senior life', 'up to age 80'],
      ['Payment protection', 'no age limit'],
      ['Funeral assistance', 'up to age 85'],
    ]);
    expect(enlaces()[0].textContent?.trim()).toBe('Get a quote for an alternative');
    TestBed.inject(IdiomaService).cambiar('pseudo');
    fixture.detectChanges();
    expect(filas()[0][0]).not.toBe('Vida sénior');
  });
});
