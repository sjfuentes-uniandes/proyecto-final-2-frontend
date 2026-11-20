import { HttpErrorResponse, HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../../core/config/app-config';
import { IdiomaService } from '../../../core/i18n/idioma.service';
import { errorContinuidad } from './continuidad.errores';
import { TEXTOS_CONTINUIDAD, TextosContinuidad, TextosContinuidadService } from './continuidad.i18n';
import { ContinuidadService } from './continuidad.service';
import { CONTINUIDAD, INFORME } from './continuidad.testing';
import { duracion, numero, porcentaje, segundosEntre } from './formato-continuidad';

describe('ContinuidadService (HU-W29)', () => {
  let http: HttpTestingController;
  let servicio: ContinuidadService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.test/v1' });
    http = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(ContinuidadService);
  });

  afterEach(() => http.verify());

  it('pide la continuidad con la ventana en horas', () => {
    let recibido: unknown;
    servicio.continuidad(24).subscribe((c) => (recibido = c));
    const req = http.expectOne('https://api.test/v1/web/operacion/continuidad?horas=24');
    expect(req.request.method).toBe('GET');
    req.flush(CONTINUIDAD);
    expect(recibido).toEqual(CONTINUIDAD);
  });

  it('pide 6 horas por omisión y el informe de conciliación', () => {
    servicio.continuidad().subscribe();
    http.expectOne('https://api.test/v1/web/operacion/continuidad?horas=6').flush(CONTINUIDAD);
    let informe: unknown;
    servicio.conciliacion().subscribe((i) => (informe = i));
    http.expectOne('https://api.test/v1/web/operacion/continuidad/conciliacion').flush(INFORME);
    expect(informe).toEqual(INFORME);
  });
});

describe('errorContinuidad', () => {
  const t = TEXTOS_CONTINUIDAD['es-CO'];
  const error = (status: number, correlationId?: string) =>
    new HttpErrorResponse({ status, headers: correlationId ? new HttpHeaders({ 'X-Correlation-Id': correlationId }) : undefined });

  it('traduce cada estado según la pantalla', () => {
    expect(errorContinuidad(t, error(0), 'continuidad').mensaje).toBe(t.errorRed);
    expect(errorContinuidad(t, error(401), 'continuidad').mensaje).toBe(t.errorNoAutenticado);
    expect(errorContinuidad(t, error(403), 'conciliacion').mensaje).toBe(t.errorSinAcceso);
    expect(errorContinuidad(t, error(502, 'c-1'), 'continuidad')).toEqual({ mensaje: t.errorFuente, correlationId: 'c-1', sinInforme: false });
    expect(errorContinuidad(t, error(502), 'conciliacion').mensaje).toBe(t.errorInforme);
    expect(errorContinuidad(t, error(500), 'continuidad').mensaje).toBe(t.errorGeneral);
    expect(errorContinuidad(t, error(404), 'continuidad').mensaje).toBe(t.errorGeneral);
  });

  it('un 404 de la conciliación es el estado vacío', () => {
    expect(errorContinuidad(t, error(404), 'conciliacion')).toEqual({ mensaje: t.sinInformeConciliacion, correlationId: null, sinInforme: true });
  });
});

describe('formato de continuidad', () => {
  it('duraciones, porcentajes y números', () => {
    expect([duracion(-3), duracion(38), duracion(125), duracion(600), duracion(3725)]).toEqual(['0 s', '38 s', '2 min 05 s', '10 min 00 s', '1 h 02 min']);
    expect([porcentaje(0.86, 'es-CO'), porcentaje(0.86, 'en-US'), porcentaje(0.934, 'es-CO', 2)]).toEqual(['0,9', '0.9', '0,93']);
    expect([numero(1284, 'es-CO'), numero(1284, 'en-US')]).toEqual(['1.284', '1,284']);
    expect(segundosEntre('2026-11-20T14:05:00Z', '2026-11-20T14:05:38Z')).toBe(38);
  });
});

describe('Textos de continuidad (es-CO, en-US y pseudo-localización)', () => {
  type Clave = keyof TextosContinuidad;
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves, del mismo tipo y las mismas subclaves', () => {
    const claves = Object.keys(TEXTOS_CONTINUIDAD['es-CO']).sort() as Clave[];
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS_CONTINUIDAD[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        const es = TEXTOS_CONTINUIDAD['es-CO'][clave];
        const otro = TEXTOS_CONTINUIDAD[idioma][clave];
        expect(typeof otro).withContext(clave).toBe(typeof es);
        if (typeof es === 'object') {
          expect(Object.keys(otro).sort()).withContext(clave).toEqual(Object.keys(es).sort());
        }
      }
    }
  });

  it('en-US traduce todos los textos visibles', () => {
    // El guion de «sin dato» y «No» se escriben igual en los dos idiomas.
    const mismaLetra: Clave[] = ['sinDato', 'no'];
    const iguales = (Object.keys(TEXTOS_CONTINUIDAD['es-CO']) as Clave[]).filter((clave) => {
      const es = TEXTOS_CONTINUIDAD['es-CO'][clave];
      return !mismaLetra.includes(clave) && typeof es === 'string' && es === TEXTOS_CONTINUIDAD['en-US'][clave];
    });
    expect(iguales).toEqual([]);
  });

  it('cada texto con valores produce texto en los tres idiomas y pseudo marca todos', () => {
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      for (const [clave, valor] of Object.entries(TEXTOS_CONTINUIDAD[idioma])) {
        if (typeof valor === 'function') {
          for (const args of [[1, 2], [3, 4]]) {
            const resultado = (valor as (...a: unknown[]) => string)(...args);
            expect(resultado).withContext(`${idioma}.${clave}`).not.toContain('undefined');
          }
        }
        if (idioma === 'pseudo' && typeof valor === 'object') {
          expect(Object.values(valor).every((v) => String(v).startsWith('⟦'))).withContext(clave).toBeTrue();
        }
      }
    }
  });

  it('el servicio sigue el idioma del portal', () => {
    const textos = TestBed.inject(TextosContinuidadService);
    TestBed.inject(IdiomaService).cambiar('en-US');
    expect([textos.t().tituloContinuidad, textos.locale()]).toEqual(['Service continuity', 'en-US']);
    TestBed.inject(IdiomaService).cambiar('pseudo');
    expect(textos.locale()).toBe('es-CO');
    expect(textos.t().tituloContinuidad).toContain('⟦');
  });
});
