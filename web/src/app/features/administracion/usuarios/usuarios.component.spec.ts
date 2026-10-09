import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigService } from '../../../core/config/app-config';
import { UsuariosComponent } from './usuarios.component';

const GRUPOS = [
  { nombre: 'administradores', descripcion: 'Crea usuarios' },
  { nombre: 'administradores-socios', descripcion: 'Gestiona socios' },
  { nombre: 'operacion', descripcion: 'Consulta tableros' },
];
const USUARIOS = [
  { email: 'ana@solventa.co', nombre: 'Ana', estado: 'CONFIRMED', habilitado: true, creado: '2026-10-09T15:00:00Z', grupos: ['administradores'] },
  { email: 'luis@solventa.co', nombre: null, estado: 'FORCE_CHANGE_PASSWORD', habilitado: true, creado: null, grupos: [] },
];

describe('UsuariosComponent', () => {
  let fixture: ComponentFixture<UsuariosComponent>;
  let http: HttpTestingController;
  const base = 'https://api/v1/web/backoffice';
  const html = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UsuariosComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/v1' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UsuariosComponent);
    fixture.detectChanges();
    http.expectOne(`${base}/grupos`).flush(GRUPOS);
    http.expectOne(`${base}/usuarios`).flush(USUARIOS);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista usuarios con grupos y estado legible', () => {
    const filas = Array.from(html().querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim()),
    );
    expect(filas).toEqual([
      ['ana@solventa.co', 'Ana', 'administradores', 'Activo', '09/10/2026'],
      ['luis@solventa.co', '—', '—', 'Pendiente de primer ingreso', ''],
    ]);
    // "operacion" viene marcado por defecto.
    expect(fixture.componentInstance.seleccionados()).toEqual(['operacion']);
  });

  it('crea el usuario con los grupos elegidos y refresca la lista', () => {
    const c = fixture.componentInstance;
    c.formulario.patchValue({ email: ' Nuevo@Solventa.co ', nombre: ' Nuevo Usuario ' });
    c.formulario.controls.grupos.at(0).setValue(true);
    c.crear();
    const req = http.expectOne(`${base}/usuarios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'nuevo@solventa.co', nombre: 'Nuevo Usuario', grupos: ['administradores', 'operacion'] });
    req.flush({ ...USUARIOS[1], email: 'nuevo@solventa.co' });
    http.expectOne(`${base}/usuarios`).flush(USUARIOS);
    fixture.detectChanges();
    expect(html().querySelector('[data-testid=creado]')?.textContent).toContain('nuevo@solventa.co');
  });

  it('exige al menos un grupo y datos válidos', () => {
    const c = fixture.componentInstance;
    c.formulario.patchValue({ email: 'x@solventa.co', nombre: 'Xavier' });
    c.formulario.controls.grupos.at(2).setValue(false);
    c.crear();
    http.expectNone(`${base}/usuarios`);
    expect(c.error()).toBe('Selecciona al menos un grupo.');
  });

  it('muestra el conflicto cuando el correo ya existe', () => {
    const c = fixture.componentInstance;
    c.formulario.patchValue({ email: 'ana@solventa.co', nombre: 'Ana' });
    c.crear();
    http.expectOne(`${base}/usuarios`).flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
    expect(c.error()).toBe('Ya existe un usuario con ese correo.');
  });
});
