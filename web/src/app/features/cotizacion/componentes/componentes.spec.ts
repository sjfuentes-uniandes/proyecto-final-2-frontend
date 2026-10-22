import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';

import { violacionesA11y } from '../../../testing';
import { CONDICIONES } from '../cotizacion.testing';
import { CoberturasProductoComponent } from './coberturas-producto/coberturas-producto.component';
import { CotizacionCargandoComponent } from './cotizacion-cargando/cotizacion-cargando.component';
import { ResumenValidacionComponent } from './resumen-validacion/resumen-validacion.component';

describe('Componentes de la cotización (HU-W03)', () => {
  describe('Coberturas del producto (mockup "Nueva cotización")', () => {
    let fixture: ComponentFixture<CoberturasProductoComponent>;
    const html = () => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(CoberturasProductoComponent);
      fixture.componentRef.setInput('condiciones', CONDICIONES);
      fixture.detectChanges();
    });

    it('las obligatorias van marcadas y las opcionales tienen un interruptor', async () => {
      const filas = Array.from(html().querySelectorAll('.coberturas li'));
      const celdas = (f: Element) => Array.from(f.children).map((c) => c.textContent?.trim()).join(' ').trim();
      expect(filas.map(celdas)).toEqual([
        'Muerte por cualquier causa Obligatoria',
        'Incapacidad total y permanente Obligatoria',
        'Enfermedades graves',
        'Auxilio funerario',
      ]);
      expect(html().querySelectorAll('input[role=switch]').length).toBe(2);
      expect(html().querySelector('.nota')?.textContent).toContain('por país y por versión');
      expect(await violacionesA11y(html())).toEqual([]);
    });

    it('el interruptor agrega y quita la cobertura opcional', () => {
      const interruptor = html().querySelector<HTMLInputElement>('#cobertura-ENFERMEDADES_GRAVES')!;
      interruptor.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.seleccionadas()).toEqual(['ENFERMEDADES_GRAVES']);
      expect(interruptor.getAttribute('aria-checked')).toBe('true');
      interruptor.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.seleccionadas()).toEqual([]);
    });

    it('mientras carga o si falla lo anuncia sin interruptores', () => {
      fixture.componentRef.setInput('condiciones', null);
      fixture.componentRef.setInput('cargando', true);
      fixture.detectChanges();
      expect(html().querySelector('[role=status]')?.textContent).toContain('Cargando las condiciones');
      fixture.componentRef.setInput('cargando', false);
      fixture.componentRef.setInput('fallo', true);
      fixture.detectChanges();
      expect(html().querySelector('[role=status]')?.textContent).toContain('No pudimos cargar');
      expect(html().querySelectorAll('input[role=switch]').length).toBe(0);
    });
  });

  describe('Resumen de la validación (mockup "Revisa los datos")', () => {
    it('cuenta revisados, correctos y con error, con la versión de las reglas', () => {
      const fixture = TestBed.createComponent(ResumenValidacionComponent);
      fixture.componentRef.setInput('revisados', 6);
      fixture.componentRef.setInput('conError', 2);
      fixture.componentRef.setInput('versionReglas', '2026.09.1');
      fixture.detectChanges();
      const html = fixture.nativeElement as HTMLElement;
      const valores = Array.from(html.querySelectorAll('dd')).map((dd) => dd.textContent?.trim());
      expect(valores).toEqual(['6', '4', '2', 'Catálogo 2026.09.1']);
      expect(html.querySelector('.valido')).toBeNull();
      fixture.componentRef.setInput('conError', 0);
      fixture.componentRef.setInput('versionReglas', null);
      fixture.detectChanges();
      expect(html.querySelector('.valido')?.textContent).toContain('cumplen las reglas');
      expect(html.querySelectorAll('dd')[3].textContent?.trim()).toBe('—');
    });
  });

  describe('Calculando tu oferta (mockup 3, en curso)', () => {
    it('muestra los pasos en curso y el presupuesto consumido en vivo', fakeAsync(() => {
      const fixture = TestBed.createComponent(CotizacionCargandoComponent);
      fixture.componentRef.setInput('presupuestoMs', 250);
      fixture.detectChanges();
      const html = fixture.nativeElement as HTMLElement;
      const pasos = Array.from(html.querySelectorAll('.linea li')).map((li) => li.className);
      expect(pasos).toEqual(['hecho', 'en-curso', 'en-curso', 'pendiente', 'pendiente']);
      expect(html.querySelector('h2')?.textContent).toBe('Calculando tu oferta');
      expect(html.querySelectorAll('.pasos-cotizacion .hecho').length).toBe(1);
      tick(100);
      fixture.detectChanges();
      expect(html.querySelector('[role=progressbar]')?.getAttribute('aria-valuemax')).toBe('100');
      fixture.componentRef.setInput('conPerfil', true);
      fixture.detectChanges();
      expect(html.querySelectorAll('.linea li').length).toBe(6);
      expect(html.querySelectorAll('.pasos-cotizacion .hecho').length).toBe(2);
      discardPeriodicTasks();
    }));
  });
});
