import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { proveerAuthFalso, violacionesA11y } from '../../../../testing';
import { MemoriaConsultaService } from '../../consulta-memoria.service';
import {
  CORRELATION_ID,
  POLIZA_NO_INICIADA_ID,
  POLIZA_VIGENTE_ID,
  cuerpoError,
  estadoPoliza,
  urlEstado,
} from '../../consulta.testing';
import { DetallePolizaComponent } from './detalle-poliza.component';

@Component({ template: '' })
class ListadoFalsoComponent {}

describe('DetallePolizaComponent (W-02, HU-W18)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const pedido = (id = POLIZA_VIGENTE_ID): TestRequest => http.expectOne(urlEstado(id));
  const alerta = () => html().querySelector('[role="alert"]')?.textContent?.replace(/\s+/g, ' ');
  const boton = (nombre: string) => Array.from(html().querySelectorAll('button, a.btn')).find((b) => b.textContent?.trim() === nombre);

  async function navegar(id = POLIZA_VIGENTE_ID, query = ''): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerAuthFalso(),
        provideRouter([
          { path: 'consulta/polizas', component: ListadoFalsoComponent },
          { path: 'consulta/polizas/:polizaId', component: DetallePolizaComponent },
        ]),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/consulta/polizas/${id}${query}`, DetallePolizaComponent);
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra el título con chip, el subtítulo, los datos, las coberturas y la consulta', async () => {
    await navegar();
    pedido().flush(estadoPoliza('VIGENTE'));
    harness.detectChanges();
    expect(texto('h2')).toBe('Póliza 202-6001-000001 Vigente');
    expect(html().querySelector('h2 .tag')?.className).toBe('tag tag--ok');
    expect(texto('header .sub')).toBe('Vida hipotecario · Vida');
    expect(Array.from(html().querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Datos de la póliza',
      'Coberturas',
      'Consulta de esta póliza',
    ]);
    const datos = Array.from(html().querySelectorAll('#titulo-datos + dl dt')).map((d) => d.textContent);
    expect(datos).toEqual(['Suma asegurada', 'Prima', 'Inicio de vigencia', 'Fin de vigencia', 'Fecha de emisión']);
    expect(texto('#titulo-datos + dl div:nth-child(2) dd')).toContain('mensual');
    expect(Array.from(html().querySelectorAll('tbody tr')).map((r) => r.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Muerte por cualquier causaObligatoria',
      'Incapacidad total y permanenteOpcional',
    ]);
    expect(html().querySelector('caption')?.className).toBe('sr-only');
    expect(texto('#titulo-consulta + dl div:nth-child(2) dd')).toBe('5 segundos');
    expect(texto('.card .nota')).toBe(
      'La vista de consulta rápida se actualizó 5 segundos después de la emisión. Es el desfase esperado del modelo de lectura.',
    );
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('no muestra cliente, canal, cobro ni deducibles', async () => {
    await navegar();
    pedido().flush(estadoPoliza('VIGENTE'));
    harness.detectChanges();
    expect(html().textContent).not.toMatch(/cliente|canal|cobro|deducible|exportar/i);
  });

  it('las fechas sin hora no se corren un día (vigencia 2026-09-14 en es-CO y en-US)', async () => {
    await navegar();
    pedido().flush(estadoPoliza('VIGENTE'));
    harness.detectChanges();
    expect(texto('#titulo-datos + dl div:nth-child(3) dd')).toMatch(/^(14\/09\/2026|14 sept\.? 2026)$/);
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(texto('#titulo-datos + dl div:nth-child(3) dd')).toBe('Sep 14, 2026');
    expect(texto('h2')).toBe('Policy 202-6001-000001 In force');
  });

  it('una periodicidad desconocida no se muestra con la prima', async () => {
    await navegar();
    pedido().flush(estadoPoliza('VIGENTE', { periodicidad: 'QUINQUENAL' }));
    harness.detectChanges();
    expect(texto('#titulo-datos + dl div:nth-child(2) dd')).not.toContain('quinquenal');
    expect(texto('#titulo-datos + dl div:nth-child(2) dd')).not.toContain('QUINQUENAL');
  });

  it('NO_INICIADA muestra «Inicia el {fecha}» en el chip', async () => {
    await navegar(POLIZA_NO_INICIADA_ID);
    pedido(POLIZA_NO_INICIADA_ID).flush(estadoPoliza('NO_INICIADA'));
    harness.detectChanges();
    expect(texto('h2 .tag')).toMatch(/^Inicia el (2\/11\/2026|2 nov\.? 2026)$/);
    expect(html().querySelector('h2 .tag')?.className).toBe('tag tag--info');
  });

  it('propagación: menos de 1 s y desfase negativo oculto', async () => {
    await navegar();
    pedido().flush(estadoPoliza('VIGENTE', { emitidaEn: '2026-10-31T15:29:59.800Z' }));
    harness.detectChanges();
    expect(texto('#titulo-consulta + dl div:nth-child(2) dd')).toBe('menos de 1 s');
  });

  it('un desfase negativo oculta el tiempo de propagación y la nota', async () => {
    await navegar();
    pedido().flush(estadoPoliza('VIGENTE', { emitidaEn: '2026-10-31T15:31:00Z' }));
    harness.detectChanges();
    expect(html().querySelectorAll('#titulo-consulta + dl div').length).toBe(1);
    expect(html().querySelector('.card .nota')).toBeNull();
  });

  it('W-05: mientras carga muestra role=status', async () => {
    await navegar();
    harness.detectChanges();
    expect(html().querySelector('[role="status"]')?.textContent).toContain('Cargando la póliza…');
    pedido().flush(estadoPoliza('VIGENTE'));
  });

  it('404 uniforme: el mismo texto, la referencia y los botones, sin insinuar que existe', async () => {
    await navegar();
    pedido().flush(cuerpoError('POLIZA_NO_ENCONTRADA'), { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(alerta()).toContain('No encontramos esta póliza. Si la emitiste hace unos segundos, vuelve a consultar en breve');
    expect(alerta()).toContain(CORRELATION_ID);
    expect(boton('Reintentar')).toBeDefined();
    expect(boton('Volver al listado')).toBeDefined();
    expect(html().querySelector('h2')).toBeNull();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('el 404 dice lo mismo para cualquier causa (solo cambia la referencia)', async () => {
    const mensajes: (string | undefined)[] = [];
    for (const correlationId of ['a-1', 'b-2']) {
      TestBed.resetTestingModule();
      await navegar();
      pedido().flush({ ...cuerpoError('POLIZA_NO_ENCONTRADA', correlationId), correlationId }, { status: 404, statusText: 'Not Found' });
      harness.detectChanges();
      mensajes.push(html().querySelector('[role="alert"] p')?.textContent?.trim());
    }
    expect(mensajes[0]).toBe(mensajes[1]);
  });

  it('error de red: mensaje y «Reintentar» que vuelve a pedir', async () => {
    await navegar();
    pedido().error(new ProgressEvent('error'), { status: 0 });
    harness.detectChanges();
    expect(alerta()).toContain('No pudimos conectar con el servicio');
    boton('Reintentar')?.dispatchEvent(new Event('click'));
    await harness.fixture.whenStable();
    pedido().flush(estadoPoliza('VIGENTE'));
    harness.detectChanges();
    expect(html().querySelector('[role="alert"]')).toBeNull();
    expect(texto('h2')).toContain('Póliza 202-6001-000001');
  });

  it('503 sin dato previo: aviso y «Reintentar», sin póliza', async () => {
    await navegar();
    pedido().flush(cuerpoError('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    harness.detectChanges();
    expect(alerta()).toContain('Servicio de consulta degradado');
    expect(alerta()).not.toContain('con fecha');
    expect(html().querySelector('h2')).toBeNull();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('503 con dato previo: último estado conocido con su fecha y el aviso', async () => {
    await navegar();
    TestBed.inject(MemoriaConsultaService).guardarDetalle(estadoPoliza('VIGENTE'));
    pedido().flush(cuerpoError('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    harness.detectChanges();
    expect(alerta()).toContain('Servicio de consulta degradado');
    expect(alerta()).toContain('con fecha');
    expect(texto('h2')).toContain('Póliza 202-6001-000001');
    expect(boton('Reintentar ahora')).toBeDefined();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('sin acceso (403): mensaje y volver, sin reintento', async () => {
    await navegar();
    pedido().flush(cuerpoError('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
    harness.detectChanges();
    expect(alerta()).toContain('No tienes acceso a la consulta de pólizas.');
    expect(boton('Reintentar')).toBeUndefined();
    expect(boton('Volver al listado')).toBeDefined();
  });

  it('«Volver al listado» conserva los filtros de la URL', async () => {
    await navegar(POLIZA_VIGENTE_ID, '?ramo=Vida&pagina=2');
    pedido().flush(estadoPoliza('VIGENTE'));
    harness.detectChanges();
    const volver = Array.from(html().querySelectorAll('a')).find((a) => a.textContent?.trim() === 'Volver al listado');
    expect(volver?.getAttribute('href')).toBe('/consulta/polizas?ramo=Vida&pagina=2');
  });

  it('en-US: títulos y tarjetas en inglés', async () => {
    await navegar();
    TestBed.inject(IdiomaService).cambiar('en-US');
    pedido().flush(estadoPoliza('VIGENTE'));
    harness.detectChanges();
    expect(Array.from(html().querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Policy data',
      'Coverages',
      'Inquiry on this policy',
    ]);
    expect(await violacionesA11y(html())).toEqual([]);
  });
});
