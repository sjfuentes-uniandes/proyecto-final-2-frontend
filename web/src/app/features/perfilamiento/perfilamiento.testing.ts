import { Factor, FuenteLinaje, PerfilRespuesta } from './perfilamiento.modelo';

/** Datos sintéticos de las pruebas web: las respuestas de bff-web para C01 y C03 (01 §3.5). */
export const BASE_PERFILES = 'https://api/web/v1/perfiles';
export const PERFIL_ID = '00000000-0000-4000-a000-000000000001';

const factor = (codigo: string, fuente: string, peso: number, contribucion: number, direccion: Factor['direccion']): Factor => ({
  codigo, fuente, peso, estado: 'EVALUADO', contribucion, direccion, motivo: null,
});

export const PERFIL_C01: PerfilRespuesta = {
  id: PERFIL_ID,
  clienteId: '00000000-0000-4000-8000-000000000001',
  productoId: 'vida-hipotecario',
  estado: 'CALCULADO',
  nivelRiesgo: 'BAJO',
  puntaje: 75.9,
  confianza: 0.92,
  factores: [
    factor('PUNTUALIDAD_PAGOS', 'FA_HISTORIAL_PAGOS_12M', 0.3, 0.9, 'REDUCE_RIESGO'),
    factor('ANTIGUEDAD_PRODUCTOS', 'FA_PRODUCTOS_VIGENTES', 0.2, 0.8, 'REDUCE_RIESGO'),
    factor('RELACION_CUOTA_INGRESO', 'FA_INGRESOS_AGREGADOS', 0.18, 0.8, 'REDUCE_RIESGO'),
    factor('EDAD_PLAZO', 'DECLARADO', 0.15, 0.5, 'NEUTRO'),
    factor('CONCENTRACION_DEUDA', 'FA_PRODUCTOS_VIGENTES', 0.1, 0.4, 'AUMENTA_LEVEMENTE'),
    factor('LISTAS_RESTRICTIVAS', 'DA_REGISTROS_PUBLICOS', 0.07, 1, 'REDUCE_RIESGO'),
  ],
  ajustes: [],
  datosRequeridos: [],
  accionSugerida: null,
  consentimiento: { decision: 'PERMITIDO', causa: null, vigenteHasta: '2027-10-01T00:00:00Z' },
  fuentes: [
    { fuente: 'FA_PRODUCTOS_VIGENTES', tipo: 'FINANZAS_ABIERTAS', estado: 'CONSULTADA', versionFuente: '3.1', confianza: 0.95,
      consultadaEn: '2026-10-15T15:00:00.100Z', duracionMs: 52 },
    { fuente: 'FA_HISTORIAL_PAGOS_12M', tipo: 'FINANZAS_ABIERTAS', estado: 'CONSULTADA', versionFuente: '3.1', confianza: 0.91,
      consultadaEn: '2026-10-15T15:00:00.150Z', duracionMs: 50 },
    { fuente: 'FA_INGRESOS_AGREGADOS', tipo: 'FINANZAS_ABIERTAS', estado: 'CONSULTADA', versionFuente: '3.1', confianza: 0.93,
      consultadaEn: '2026-10-15T15:00:00.200Z', duracionMs: 51 },
    { fuente: 'DA_REGISTROS_PUBLICOS', tipo: 'DATOS_ABIERTOS', estado: 'CONSULTADA', versionFuente: '1.8', confianza: 0.88,
      consultadaEn: '2026-10-15T15:00:00.250Z', duracionMs: 50 },
  ],
  fuentesConsultadas: 4,
  fuentesDeclaradas: 4,
  versionModelo: '2026.10.1',
  calculadoEn: '2026-10-15T15:00:00.312Z',
  duracionMs: 312,
  presupuestoMs: 400,
  perfilAnteriorId: null,
};

/** C03: el historial no trae `lateCount`; no hay clasificación (AC3). */
export const PERFIL_C03: PerfilRespuesta = {
  ...PERFIL_C01,
  id: '00000000-0000-4000-a000-000000000003',
  clienteId: '00000000-0000-4000-8000-000000000003',
  estado: 'INFORMACION_INSUFICIENTE',
  nivelRiesgo: null,
  puntaje: null,
  factores: [],
  datosRequeridos: [{ campo: 'moras_12m', fuente: 'FA_HISTORIAL_PAGOS_12M', motivo: 'NO_DISPONIBLE_EN_FUENTE' }],
};

const sinConsultar = (fuente: FuenteLinaje, estado: FuenteLinaje['estado']): FuenteLinaje => ({
  ...fuente, estado, versionFuente: null, confianza: null, consultadaEn: null, duracionMs: null,
});
const [PRODUCTOS, HISTORIAL, INGRESOS, REGISTROS] = PERFIL_C01.fuentes;

/** C02: consentimiento parcial sin ingresos agregados. */
export const PERFIL_C02: PerfilRespuesta = {
  ...PERFIL_C01,
  id: '00000000-0000-4000-a000-000000000002',
  puntaje: 75,
  confianza: 0.87,
  fuentes: [PRODUCTOS, HISTORIAL, sinConsultar(INGRESOS, 'NO_AUTORIZADA'), REGISTROS],
  fuentesConsultadas: 3,
};

/** C06: Datos Abiertos no respondió a tiempo (perfil degradado). */
export const PERFIL_C06: PerfilRespuesta = {
  ...PERFIL_C01,
  id: '00000000-0000-4000-a000-000000000006',
  estado: 'DEGRADADO',
  puntaje: 74.09,
  confianza: 0.79,
  accionSugerida: 'RECALCULAR',
  fuentes: [PRODUCTOS, HISTORIAL, INGRESOS, sinConsultar(REGISTROS, 'TIEMPO_AGOTADO')],
  fuentesConsultadas: 3,
};

/** C13: el historial de pagos (obligatorio) no respondió a tiempo: insuficiente y se sugiere recalcular. */
export const PERFIL_C13: PerfilRespuesta = {
  ...PERFIL_C03,
  id: '00000000-0000-4000-a000-00000000000d',
  clienteId: '00000000-0000-4000-8000-00000000000d',
  confianza: 0.6,
  accionSugerida: 'RECALCULAR',
  datosRequeridos: [{ campo: 'moras_12m', fuente: 'FA_HISTORIAL_PAGOS_12M', motivo: 'TIEMPO_AGOTADO' }],
  fuentes: [PRODUCTOS, sinConsultar(HISTORIAL, 'TIEMPO_AGOTADO'), INGRESOS, REGISTROS],
  fuentesConsultadas: 3,
};

/** C08: consentimiento revocado; ninguna fuente se invoca (DT-05). */
export const PERFIL_C08: PerfilRespuesta = {
  ...PERFIL_C03,
  id: '00000000-0000-4000-a000-000000000008',
  confianza: 0,
  accionSugerida: 'COMPLETAR_CONSENTIMIENTO',
  consentimiento: { decision: 'RECHAZADO', causa: 'REVOCADO', vigenteHasta: null },
  datosRequeridos: [
    { campo: 'cuota_mensual_obligaciones', fuente: 'FA_PRODUCTOS_VIGENTES', motivo: 'NO_AUTORIZADO' },
    { campo: 'moras_12m', fuente: 'FA_HISTORIAL_PAGOS_12M', motivo: 'NO_AUTORIZADO' },
  ],
  fuentes: PERFIL_C01.fuentes.map((f) => sinConsultar(f, 'NO_AUTORIZADA')),
  fuentesConsultadas: 0,
};

/** C16: sin historial de pagos; las fuentes autorizadas quedan sin consultar (DT-07). */
export const PERFIL_C16: PerfilRespuesta = {
  ...PERFIL_C08,
  id: '00000000-0000-4000-a000-000000000010',
  consentimiento: { decision: 'PERMITIDO_PARCIAL', causa: null, vigenteHasta: '2027-10-01T00:00:00Z' },
  datosRequeridos: [{ campo: 'moras_12m', fuente: 'FA_HISTORIAL_PAGOS_12M', motivo: 'NO_AUTORIZADO' }],
  fuentes: [
    sinConsultar(PRODUCTOS, 'NO_CONSULTADA'), sinConsultar(HISTORIAL, 'NO_AUTORIZADA'),
    sinConsultar(INGRESOS, 'NO_CONSULTADA'), sinConsultar(REGISTROS, 'NO_CONSULTADA'),
  ],
};
