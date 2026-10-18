import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../core/config/app-config';
import { ConsentimientosService } from './consentimientos.service';
import { BASE_CONSENTIMIENTOS, CLIENTE_ID, HISTORIAL_REVOCADO, LISTA, REVOCADO, URL_HISTORIAL_REVOCADO } from './consentimientos.testing';

describe('ConsentimientosService (bff-web, solo lectura)', () => {
  let servicio: ConsentimientosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    servicio = TestBed.inject(ConsentimientosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los consentimientos del cliente con GET y entrega el cuerpo tal cual', () => {
    let recibido: unknown;
    servicio.listar(CLIENTE_ID).subscribe((lista) => (recibido = lista));
    const solicitud = http.expectOne(BASE_CONSENTIMIENTOS);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(LISTA);
    expect(recibido).toEqual(LISTA);
  });

  it('pide el historial de un consentimiento con GET', () => {
    let recibido: unknown;
    servicio.historial(CLIENTE_ID, REVOCADO.consentimientoId).subscribe((h) => (recibido = h));
    const solicitud = http.expectOne(URL_HISTORIAL_REVOCADO);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(HISTORIAL_REVOCADO);
    expect(recibido).toEqual(HISTORIAL_REVOCADO);
  });

  it('codifica los identificadores en la ruta', () => {
    servicio.listar('a/b').subscribe();
    servicio.historial('a b', 'c?d').subscribe();
    http.expectOne('https://api/web/v1/clientes/a%2Fb/consentimientos').flush([]);
    http.expectOne('https://api/web/v1/clientes/a%20b/consentimientos/c%3Fd/historial').flush(HISTORIAL_REVOCADO);
  });

  it('no expone operaciones de escritura (ADR 0002)', () => {
    // `base` es el armado privado de la URL.
    const metodos = Object.getOwnPropertyNames(ConsentimientosService.prototype).filter((m) => !['constructor', 'base'].includes(m));
    expect(metodos.sort()).toEqual(['historial', 'listar']);
  });
});
