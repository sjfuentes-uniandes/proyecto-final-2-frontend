import { CondicionesProducto, CotizacionRespuesta } from './cotizacion.modelo';

/** Datos sintéticos de las pruebas web de HU-W03: las respuestas de bff-web para C01 (01 §3.5). */
export const URL_CONDICIONES = 'https://api/web/v1/productos/vida-hipotecario/condiciones';
export const URL_COTIZACIONES = 'https://api/web/v1/cotizaciones';
export const COTIZACION_ID = '00000000-0000-4000-d000-000000000001';

export const CONDICIONES: CondicionesProducto = {
  productoId: 'vida-hipotecario',
  nombre: 'Vida deudor hipotecario',
  ramo: 'VIDA_HIPOTECARIO',
  pais: 'CO',
  moneda: 'COP',
  versionProducto: '2026.09.1',
  versionReglas: '2026.09.1',
  periodicidad: 'MENSUAL',
  vigenteHasta: null,
  coberturas: [
    { codigo: 'MUERTE', nombre: 'Muerte por cualquier causa', obligatoria: true },
    { codigo: 'INCAPACIDAD_TOTAL_PERMANENTE', nombre: 'Incapacidad total y permanente', obligatoria: true },
    { codigo: 'ENFERMEDADES_GRAVES', nombre: 'Enfermedades graves', obligatoria: false },
    { codigo: 'AUXILIO_FUNERARIO', nombre: 'Auxilio funerario', obligatoria: false },
  ],
  limites: {
    sumaAsegurada: { minimo: '10000000', maximo: '1000000000' },
    plazoCreditoMeses: { minimo: '12', maximo: '360' },
    edad: { minimo: '18', maximo: '70' },
  },
};

/** C01 sin perfil con Enfermedades graves: 82.593 + 14.867 = 97.460 COP (prima del backend). */
export const COTIZACION_C01: CotizacionRespuesta = {
  id: COTIZACION_ID,
  clienteId: '00000000-0000-4000-8000-000000000001',
  socioId: null,
  productoId: 'vida-hipotecario',
  versionProducto: '2026.09.1',
  moneda: 'COP',
  periodicidad: 'MENSUAL',
  versionReglas: '2026.09.1',
  perfilId: null,
  estado: 'CALCULADA',
  coberturas: [
    { codigo: 'MUERTE', nombre: 'Muerte por cualquier causa', obligatoria: true },
    { codigo: 'INCAPACIDAD_TOTAL_PERMANENTE', nombre: 'Incapacidad total y permanente', obligatoria: true },
    { codigo: 'ENFERMEDADES_GRAVES', nombre: 'Enfermedades graves', obligatoria: false },
  ],
  entradas: {
    sumaAsegurada: '180000000',
    plazoCreditoMeses: 180,
    edad: 36,
    nivelRiesgo: null,
    coberturasOpcionales: ['ENFERMEDADES_GRAVES'],
  },
  desglose: {
    primaBase: '75600',
    factores: [
      { codigo: 'NIVEL_RIESGO', valor: 'SIN_PERFIL', factor: '1.15' },
      { codigo: 'EDAD', valor: '36', factor: '0.95' },
      { codigo: 'PLAZO', valor: '180', factor: '1.00' },
    ],
    primaAjustada: '82593',
    recargos: [{ cobertura: 'ENFERMEDADES_GRAVES', tasa: '0.18', valor: '14867' }],
    subtotal: '97460',
    ajusteLimite: '0',
    primaTotal: '97460',
  },
  primaTotal: '97460',
  huellaCalculo: 'sha256:5d1c',
  calculadoEn: '2026-10-15T15:00:00Z',
  duracionMs: 155,
  presupuestoMs: 250,
  pasos: [
    { codigo: 'CATALOGO_Y_REGLAS', duracionMs: 11, origen: 'CACHE' },
    { codigo: 'CLIENTE', duracionMs: 78, origen: null },
    { codigo: 'CALCULO_PRIMA', duracionMs: 1, origen: null },
  ],
};
