import { MatchersV3 } from '@pact-foundation/pact';
import { expect, test } from '@playwright/test';

import {
  BANDEJA_MIA,
  CATALOGOS_DECISION,
  DETALLE_COMPLETO,
  ENLACE_FOTO,
  EVIDENCIA_FOTO_1,
  RESULTADO_APROBACION,
  SINIESTRO_EVA01,
} from '../src/app/features/siniestros/siniestros.testing';
import { CatalogosDecision, ResultadoDecision, SolicitudDecision } from '../src/app/features/siniestros/siniestros.decision.modelo';
import { BandejaSiniestros, DetalleSiniestro, EnlaceEvidencia } from '../src/app/features/siniestros/siniestros.modelo';
import { ACEPTA_JSON, nuevoPacto } from './pacto';

const { boolean, decimal, eachLike, equal, integer, like, regex, uuid } = MatchersV3;

/**
 * Pact consumidor de los siniestros del analista (HU-W19): GET /v1/siniestros (la bandeja con el
 * nombre del cliente), GET /v1/siniestros/{siniestroId} (el detalle con la verificación de cobertura,
 * la coherencia, las evidencias, el trámite y el historial) y sus 404 y 403, y POST
 * …/evidencias/{evidenciaId}/enlace (la URL prefirmada) con su 404 EVIDENCIA_NO_DISPONIBLE.
 *
 * Los enumerados se comparan exactos (con ellos el portal arma insignias y textos) y los textos libres
 * por tipo. Pact no expresa «null o texto»: lo que W19 devuelve siempre en null (`liquidacion`,
 * `evento`, `pago`, `justificacion` y los campos sin dato del historial) se pacta en null; cuando W20,
 * W22 o W23 los llenen, esas historias amplían este pacto. El portal manda el `Authorization` de la
 * sesión y API Gateway lo traduce en los encabezados del grupo: el verificador del proveedor envía los
 * de un usuario del grupo `analistas-siniestros`.
 *
 * HU-W20 amplía el pacto con GET …/catalogos-decision, las tres decisiones de POST …/{id}/decision
 * (aprobar, rechazar y solicitar soporte) y su 409 TRANSICION_NO_PERMITIDA. El detalle suma
 * `valorReclamado` (null hasta que M01 lo llene), `referenciaPagoPrevista` y `plazoSoporteVenceEn`
 * (null fuera de FALTA_SOPORTE). El resultado de una decisión trae null en `referenciaPago` o en
 * `plazoSoporteVenceEn` según el caso (R-53): cada decisión es su propia interacción, con su estado del
 * proveedor, y en cada una el campo que no aplica se pacta en null, igual que los demás.
 */
const pacto = nuevoPacto();

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ESTADOS = /^(REPORTADO|EN_EVALUACION|APROBADO|RECHAZADO|FALTA_SOPORTE)$/;
const ORIGENES = /^(MOVIL|PORTAL|PARAMETRICO)$/;
const PRIORIDADES = /^(ALTA|MEDIA|BAJA)$/;
const instante = (ejemplo: string) => regex(INSTANTE, ejemplo);
const fecha = (ejemplo: string) => regex(FECHA, ejemplo);
const enumerado = (valores: string[], ejemplo: string) => regex(new RegExp(`^(${valores.join('|')})$`), ejemplo);

const CODIGO_SINIESTRO = /^88-\d{4}-\d{4,}$/;
const NUMERO_POLIZA = /^\d{3}-\d{4}-\d{6}$/;

function resumen(s: BandejaSiniestros['items'][number]) {
  return {
    id: uuid(s.id),
    codigo: regex(CODIGO_SINIESTRO, s.codigo),
    polizaId: uuid(s.polizaId),
    polizaNumero: regex(NUMERO_POLIZA, s.polizaNumero),
    clienteId: uuid(s.clienteId),
    ramo: like(s.ramo),
    origen: regex(ORIGENES, s.origen),
    estado: regex(ESTADOS, s.estado),
    prioridad: regex(PRIORIDADES, s.prioridad),
    reportadoEn: instante(s.reportadoEn),
    analistaId: uuid(s.analistaId as string),
    tiempoRestanteMin: integer(s.tiempoRestanteMin),
    relojPausado: boolean(s.relojPausado),
    // Sin null: Pact no expresa «null o texto»; el portal trata null como «Cliente no disponible» (CF-S3-09).
    clienteNombre: like(s.clienteNombre as string),
  };
}

function bandeja(b: BandejaSiniestros) {
  return {
    items: eachLike(resumen(b.items[2])),
    siguienteCursor: equal(null),
    total: integer(b.total),
  };
}

const ubicacion = (u: { descripcion: string | null; lat: number | null; lon: number | null }) => ({
  descripcion: equal(u.descripcion),
  lat: decimal(u.lat as number),
  lon: decimal(u.lon as number),
});

function detalle(d: DetalleSiniestro) {
  const p = d.poliza;
  const c = d.coherencia;
  const v = d.polizaVista!;
  const evidencia = d.evidencias[0];
  const paso = d.tramite[2];
  const historial = d.historial[2];
  return {
    ...resumen(d),
    causa: like(d.causa),
    fechaEvento: instante(d.fechaEvento),
    ubicacionDeclarada: {
      descripcion: like(d.ubicacionDeclarada.descripcion as string),
      lat: decimal(d.ubicacionDeclarada.lat as number),
      lon: decimal(d.ubicacionDeclarada.lon as number),
    },
    poliza: {
      numero: regex(NUMERO_POLIZA, p.numero),
      ramo: like(p.ramo),
      vigencia: { desde: fecha(p.vigencia.desde), hasta: fecha(p.vigencia.hasta) },
      amparos: eachLike({
        codigo: like(p.amparos[0].codigo),
        nombre: like(p.amparos[0].nombre),
        sumaAsegurada: regex(/^\d+(\.\d+)?$/, p.amparos[0].sumaAsegurada),
      }),
      moneda: regex(/^[A-Z]{3}$/, p.moneda),
      carenciaDias: integer(p.carenciaDias),
      plazoAvisoDias: integer(p.plazoAvisoDias),
      primasAlDia: boolean(p.primasAlDia),
      beneficiario: { beneficiarioRef: like(p.beneficiario.beneficiarioRef), cuentaMascarada: like(p.beneficiario.cuentaMascarada) },
    },
    verificacionCobertura: eachLike({
      codigo: enumerado(['VIGENCIA', 'AMPARO', 'CARENCIA', 'PLAZO_AVISO', 'PRIMAS', 'SOPORTES'], 'VIGENCIA'),
      resultado: enumerado(['CUMPLE', 'NO_CUMPLE', 'PARCIAL', 'NO_EVALUABLE'], 'CUMPLE'),
      detalle: like({ fechaEvento: '2026-11-04' }),
    }),
    coherencia: {
      fechaDeclarada: instante(c.fechaDeclarada),
      primeraCaptura: instante(c.primeraCaptura as string),
      diferenciaMin: integer(c.diferenciaMin as number),
      ubicacionCoincide: boolean(c.ubicacionCoincide as boolean),
      archivosAlterados: integer(c.archivosAlterados),
      resultado: enumerado(['COHERENTE', 'INCONSISTENTE', 'NO_EVALUABLE'], c.resultado),
    },
    // La evidencia nunca trae la clave del objeto ni una URL: el enlace se pide aparte.
    evidencias: eachLike({
      id: uuid(evidencia.id),
      nombreArchivo: like(evidencia.nombreArchivo),
      tipo: enumerado(['FOTOGRAFIA', 'VIDEO', 'SOPORTE'], evidencia.tipo),
      capturadaEn: instante(evidencia.capturadaEn as string),
      ubicacion: ubicacion(evidencia.ubicacion!),
      integridad: enumerado(['VERIFICADA', 'ALTERADA', 'NO_VERIFICABLE', 'NO_DISPONIBLE'], evidencia.integridad),
    }),
    soportesPendientes: eachLike({
      tipo: enumerado(
        ['DOCUMENTO_IDENTIDAD', 'FACTURA_COMPRA', 'CERTIFICADO_REPARACION', 'COTIZACION_REPUESTOS', 'DENUNCIA_AUTORIDAD', 'PERITAJE'],
        d.soportesPendientes[0].tipo,
      ),
      estado: enumerado(['FALTA', 'SOLICITADO'], d.soportesPendientes[0].estado),
    }),
    tramite: eachLike({
      paso: enumerado(['RECIBIDO', 'EVIDENCIAS_VALIDADAS', 'EN_EVALUACION', 'DECISION', 'PAGO_INDEMNIZACION'], paso.paso),
      estado: enumerado(['COMPLETADO', 'ACTUAL', 'PENDIENTE'], paso.estado),
      ocurridoEn: instante(paso.ocurridoEn as string),
      actorNombre: like(paso.actorNombre as string),
    }),
    historial: eachLike({
      id: uuid(historial.id),
      accion: regex(/^[A-Z_]{3,40}$/, historial.accion),
      estadoAnterior: regex(ESTADOS, historial.estadoAnterior as string),
      estadoNuevo: regex(ESTADOS, historial.estadoNuevo as string),
      actorId: like(historial.actorId as string),
      actorRol: like(historial.actorRol as string),
      actorNombre: like(historial.actorNombre as string),
      justificacion: equal(null),
      ocurridoEn: instante(historial.ocurridoEn),
    }),
    liquidacion: equal(null),
    evento: equal(null),
    pago: equal(null),
    // HU-W20: aún sin reclamado (lo llena M01), con la referencia de pago prevista y sin plazo de soporte.
    valorReclamado: equal(null),
    referenciaPagoPrevista: regex(/^IND-88-\d{4}-\d{4,}-01$/, d.referenciaPagoPrevista),
    plazoSoporteVenceEn: equal(null),
    polizaVista: {
      polizaId: uuid(v.polizaId),
      numero: regex(NUMERO_POLIZA, v.numero),
      estado: like(v.estado),
      ramo: like(v.ramo),
      productoNombre: like(v.productoNombre),
      vigencia: { desde: fecha(v.vigencia.desde), hasta: fecha(v.vigencia.hasta) },
      vigente: boolean(v.vigente),
      sumaAsegurada: regex(/^-?\d+(\.\d+)?$/, v.sumaAsegurada),
      moneda: regex(/^[A-Z]{3}$/, v.moneda),
    },
  };
}

function enlace(e: EnlaceEvidencia) {
  return {
    url: like(e.url),
    expiraEn: instante(e.expiraEn),
    tipoContenido: like(e.tipoContenido),
  };
}

const error = (codigo: string) => ({
  codigo: equal(codigo),
  mensaje: like('Mensaje'),
  correlationId: like('corr-pact'),
  detalles: {},
});

const RUTA_DETALLE = `/v1/siniestros/${SINIESTRO_EVA01}`;
const RUTA_ENLACE = `${RUTA_DETALLE}/evidencias/${EVIDENCIA_FOTO_1}/enlace`;

test('el analista consulta su bandeja con el nombre del cliente', async () => {
  await pacto
    .addInteraction()
    .given('el analista tiene siniestros asignados')
    .uponReceiving('la consulta de «Mi bandeja»')
    .withRequest('GET', '/v1/siniestros', (pedido) => pedido.headers(ACEPTA_JSON).query({ bandeja: 'MIA', limite: '10' }))
    .willRespondWith(200, (respuesta) => respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(bandeja(BANDEJA_MIA)))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}/v1/siniestros?bandeja=MIA&limite=10`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as BandejaSiniestros;
      expect(cuerpo.items.length).toBeGreaterThan(0);
      expect(cuerpo.items[0].estado).toMatch(ESTADOS);
      expect(cuerpo.siguienteCursor).toBeNull();
    });
});

test('el analista abre el detalle de un siniestro', async () => {
  await pacto
    .addInteraction()
    .given('existe el siniestro con sus evidencias', { siniestroId: SINIESTRO_EVA01 })
    .uponReceiving('la consulta del detalle de un siniestro')
    .withRequest('GET', RUTA_DETALLE, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(200, (respuesta) => respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(detalle(DETALLE_COMPLETO)))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}${RUTA_DETALLE}`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as DetalleSiniestro;
      expect(cuerpo.verificacionCobertura.length).toBeGreaterThan(0);
      expect(cuerpo.evidencias[0].integridad).toMatch(/^(VERIFICADA|ALTERADA|NO_VERIFICABLE|NO_DISPONIBLE)$/);
      // Ninguna evidencia trae la clave del objeto ni una URL.
      expect(JSON.stringify(cuerpo.evidencias)).not.toMatch(/claveObjeto|https?:/);
      expect(cuerpo.liquidacion).toBeNull();
    });
});

test('un siniestro que no existe es 404 SINIESTRO_NO_ENCONTRADO', async () => {
  const id = '00000000-0000-4000-b000-0000000000ff';
  await pacto
    .addInteraction()
    .given('no existe el siniestro', { siniestroId: id })
    .uponReceiving('la consulta del detalle de un siniestro que no existe')
    .withRequest('GET', `/v1/siniestros/${id}`, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(404, (respuesta) => respuesta.jsonBody(error('SINIESTRO_NO_ENCONTRADO')))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}/v1/siniestros/${id}`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(404);
      expect((await respuesta.json()).codigo).toBe('SINIESTRO_NO_ENCONTRADO');
    });
});

test('un usuario sin el grupo analistas-siniestros es 403 ROL_NO_AUTORIZADO', async () => {
  await pacto
    .addInteraction()
    .given('el usuario no pertenece al grupo analistas-siniestros')
    .uponReceiving('la consulta del detalle de un siniestro sin el grupo')
    .withRequest('GET', RUTA_DETALLE, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(403, (respuesta) => respuesta.jsonBody(error('ROL_NO_AUTORIZADO')))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}${RUTA_DETALLE}`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(403);
      expect((await respuesta.json()).codigo).toBe('ROL_NO_AUTORIZADO');
    });
});

test('el analista pide la URL de una evidencia', async () => {
  await pacto
    .addInteraction()
    .given('existe la evidencia del siniestro con su archivo', { siniestroId: SINIESTRO_EVA01, evidenciaId: EVIDENCIA_FOTO_1 })
    .uponReceiving('la solicitud del enlace de una evidencia')
    .withRequest('POST', RUTA_ENLACE, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(200, (respuesta) => respuesta.headers({ 'Content-Type': 'application/json' }).jsonBody(enlace(ENLACE_FOTO)))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}${RUTA_ENLACE}`, { method: 'POST', headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as EnlaceEvidencia;
      expect(Object.keys(cuerpo).sort()).toEqual(['expiraEn', 'tipoContenido', 'url']);
    });
});

test('la evidencia cuyo archivo no está en el almacén es 404 EVIDENCIA_NO_DISPONIBLE', async () => {
  await pacto
    .addInteraction()
    .given('la evidencia existe pero su archivo no está disponible', { siniestroId: SINIESTRO_EVA01, evidenciaId: EVIDENCIA_FOTO_1 })
    .uponReceiving('la solicitud del enlace de una evidencia sin archivo')
    .withRequest('POST', RUTA_ENLACE, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(404, (respuesta) => respuesta.jsonBody(error('EVIDENCIA_NO_DISPONIBLE')))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}${RUTA_ENLACE}`, { method: 'POST', headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(404);
      expect((await respuesta.json()).codigo).toBe('EVIDENCIA_NO_DISPONIBLE');
    });
});

// --- HU-W20: la decisión del analista -------------------------------------------------------------

const RUTA_CATALOGOS = '/v1/siniestros/catalogos-decision';
const RUTA_DECISION = `${RUTA_DETALLE}/decision`;
const CLAVE_IDEMPOTENCIA = 'c0c0c0c0-0000-4000-8000-000000000001';
const CLAVE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ENCABEZADOS_DECISION = {
  ...ACEPTA_JSON,
  'Content-Type': 'application/json',
  'Idempotency-Key': regex(CLAVE, CLAVE_IDEMPOTENCIA),
};
const JSON_RESPUESTA = { 'Content-Type': 'application/json' };

function catalogos(c: CatalogosDecision) {
  return {
    causales: eachLike(enumerado(c.causales, c.causales[0])),
    documentos: eachLike(enumerado(c.documentos, c.documentos[0])),
    canales: eachLike(enumerado(c.canales, c.canales[0])),
    plazosDiasHabiles: eachLike(integer(c.plazosDiasHabiles[0])),
  };
}

/** El resultado de una decisión: el estado nuevo exacto (el portal arma su aviso con él). */
function resultado(r: ResultadoDecision, campos: { referenciaPago: unknown; plazoSoporteVenceEn: unknown }) {
  return {
    siniestroId: uuid(r.siniestroId),
    estadoNuevo: equal(r.estadoNuevo),
    decisionId: uuid(r.decisionId),
    referenciaPago: campos.referenciaPago,
    plazoSoporteVenceEn: campos.plazoSoporteVenceEn,
    registradaEn: instante(r.registradaEn),
  };
}

async function decidir(url: string, solicitud: SolicitudDecision): Promise<Response> {
  return fetch(`${url}${RUTA_DECISION}`, {
    method: 'POST',
    headers: { ...ACEPTA_JSON, 'Content-Type': 'application/json', 'Idempotency-Key': CLAVE_IDEMPOTENCIA },
    body: JSON.stringify(solicitud),
  });
}

const APROBAR: SolicitudDecision = {
  tipo: 'APROBAR',
  justificacion: 'Daño accidental verificado con evidencia',
  liquidacion: { valorReclamado: '2850000', deducible: '350000', valorIndemnizar: '2500000', moneda: 'COP' },
};
const RECHAZAR: SolicitudDecision = {
  tipo: 'RECHAZAR',
  justificacion: 'La póliza estaba vencida al evento',
  causal: 'POLIZA_NO_VIGENTE',
  explicacionCliente: 'Tu póliza venció antes del evento.',
};
const SOLICITAR_SOPORTE: SolicitudDecision = {
  tipo: 'SOLICITAR_SOPORTE',
  justificacion: 'Falta el certificado del taller',
  documentos: ['CERTIFICADO_REPARACION'],
  mensajeCliente: 'Necesitamos el certificado de reparación.',
  canal: 'PUSH_Y_CORREO',
  plazoDiasHabiles: 10,
};

/** El cuerpo que espera el proveedor: los enumerados exactos y los textos por tipo. */
function cuerpoAprobar(s: Extract<SolicitudDecision, { tipo: 'APROBAR' }>) {
  const monto = (valor: string) => regex(/^\d+(\.\d+)?$/, valor);
  return {
    tipo: equal('APROBAR'),
    justificacion: like(s.justificacion),
    liquidacion: {
      valorReclamado: monto(s.liquidacion.valorReclamado),
      deducible: monto(s.liquidacion.deducible),
      valorIndemnizar: monto(s.liquidacion.valorIndemnizar),
      moneda: regex(/^[A-Z]{3}$/, s.liquidacion.moneda),
    },
  };
}

test('el analista pide las listas de la decisión: causales, documentos, canales y plazos', async () => {
  await pacto
    .addInteraction()
    .given('el analista puede decidir siniestros')
    .uponReceiving('la consulta de los catálogos de la decisión')
    .withRequest('GET', RUTA_CATALOGOS, (pedido) => pedido.headers(ACEPTA_JSON))
    .willRespondWith(200, (respuesta) => respuesta.headers(JSON_RESPUESTA).jsonBody(catalogos(CATALOGOS_DECISION)))
    .executeTest(async (servidor) => {
      const respuesta = await fetch(`${servidor.url}${RUTA_CATALOGOS}`, { headers: ACEPTA_JSON });
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as CatalogosDecision;
      expect(cuerpo.causales.length).toBeGreaterThan(0);
      expect(cuerpo.plazosDiasHabiles.length).toBeGreaterThan(0);
    });
});

test('el analista aprueba un siniestro EN_EVALUACION y recibe la referencia de pago', async () => {
  const resultadoAprobar = { ...RESULTADO_APROBACION };
  await pacto
    .addInteraction()
    .given('el analista tiene un siniestro EN_EVALUACION asignado', { siniestroId: SINIESTRO_EVA01 })
    .uponReceiving('la aprobación de un siniestro')
    .withRequest('POST', RUTA_DECISION, (pedido) => pedido.headers(ENCABEZADOS_DECISION).jsonBody(cuerpoAprobar(APROBAR as Extract<SolicitudDecision, { tipo: 'APROBAR' }>)))
    .willRespondWith(200, (respuesta) =>
      respuesta.headers(JSON_RESPUESTA).jsonBody(
        resultado(resultadoAprobar, {
          referenciaPago: regex(/^IND-88-\d{4}-\d{4,}-01$/, resultadoAprobar.referenciaPago as string),
          plazoSoporteVenceEn: equal(null),
        }),
      ),
    )
    .executeTest(async (servidor) => {
      const respuesta = await decidir(servidor.url, APROBAR);
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as ResultadoDecision;
      expect(cuerpo.estadoNuevo).toBe('APROBADO');
      expect(cuerpo.referenciaPago).toMatch(/^IND-88-/);
    });
});

test('el analista rechaza un siniestro con causal y explicación y no recibe referencia de pago', async () => {
  const resultadoRechazar: ResultadoDecision = { ...RESULTADO_APROBACION, estadoNuevo: 'RECHAZADO', referenciaPago: null };
  await pacto
    .addInteraction()
    .given('el analista tiene un siniestro EN_EVALUACION asignado', { siniestroId: SINIESTRO_EVA01 })
    .uponReceiving('el rechazo de un siniestro')
    .withRequest('POST', RUTA_DECISION, (pedido) =>
      pedido.headers(ENCABEZADOS_DECISION).jsonBody({
        tipo: equal('RECHAZAR'),
        justificacion: like(RECHAZAR.justificacion),
        causal: enumerado(CATALOGOS_DECISION.causales, 'POLIZA_NO_VIGENTE'),
        explicacionCliente: like('Tu póliza venció antes del evento.'),
      }),
    )
    .willRespondWith(200, (respuesta) =>
      respuesta.headers(JSON_RESPUESTA).jsonBody(resultado(resultadoRechazar, { referenciaPago: equal(null), plazoSoporteVenceEn: equal(null) })),
    )
    .executeTest(async (servidor) => {
      const respuesta = await decidir(servidor.url, RECHAZAR);
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as ResultadoDecision;
      expect(cuerpo.estadoNuevo).toBe('RECHAZADO');
      expect(cuerpo.referenciaPago).toBeNull();
    });
});

test('el analista solicita soporte y recibe el fin del plazo en días hábiles', async () => {
  const resultadoSoporte: ResultadoDecision = {
    ...RESULTADO_APROBACION,
    estadoNuevo: 'FALTA_SOPORTE',
    referenciaPago: null,
    plazoSoporteVenceEn: '2026-11-19T15:00:00Z',
  };
  await pacto
    .addInteraction()
    .given('el analista tiene un siniestro EN_EVALUACION asignado', { siniestroId: SINIESTRO_EVA01 })
    .uponReceiving('la solicitud de soporte de un siniestro')
    .withRequest('POST', RUTA_DECISION, (pedido) =>
      pedido.headers(ENCABEZADOS_DECISION).jsonBody({
        tipo: equal('SOLICITAR_SOPORTE'),
        justificacion: like(SOLICITAR_SOPORTE.justificacion),
        documentos: eachLike(enumerado(CATALOGOS_DECISION.documentos, 'CERTIFICADO_REPARACION')),
        mensajeCliente: like('Necesitamos el certificado de reparación.'),
        canal: enumerado(CATALOGOS_DECISION.canales, 'PUSH_Y_CORREO'),
        plazoDiasHabiles: integer(10),
      }),
    )
    .willRespondWith(200, (respuesta) =>
      respuesta.headers(JSON_RESPUESTA).jsonBody(
        resultado(resultadoSoporte, { referenciaPago: equal(null), plazoSoporteVenceEn: instante(resultadoSoporte.plazoSoporteVenceEn as string) }),
      ),
    )
    .executeTest(async (servidor) => {
      const respuesta = await decidir(servidor.url, SOLICITAR_SOPORTE);
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as ResultadoDecision;
      expect(cuerpo.estadoNuevo).toBe('FALTA_SOPORTE');
      expect(cuerpo.plazoSoporteVenceEn).toMatch(INSTANTE);
    });
});

test('decidir un siniestro que ya no admite la decisión es 409 TRANSICION_NO_PERMITIDA con el estado vigente', async () => {
  await pacto
    .addInteraction()
    .given('el siniestro ya fue aprobado', { siniestroId: SINIESTRO_EVA01 })
    .uponReceiving('una decisión sobre un siniestro ya decidido')
    .withRequest('POST', RUTA_DECISION, (pedido) => pedido.headers(ENCABEZADOS_DECISION).jsonBody(cuerpoAprobar(APROBAR as Extract<SolicitudDecision, { tipo: 'APROBAR' }>)))
    .willRespondWith(409, (respuesta) =>
      respuesta.jsonBody({
        codigo: equal('TRANSICION_NO_PERMITIDA'),
        mensaje: like('Mensaje'),
        correlationId: like('corr-pact'),
        detalles: { estadoActual: enumerado(['APROBADO', 'RECHAZADO', 'FALTA_SOPORTE', 'REPORTADO', 'EN_EVALUACION'], 'APROBADO') },
      }),
    )
    .executeTest(async (servidor) => {
      const respuesta = await decidir(servidor.url, APROBAR);
      expect(respuesta.status).toBe(409);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('TRANSICION_NO_PERMITIDA');
      expect(cuerpo.detalles.estadoActual).toBe('APROBADO');
    });
});
