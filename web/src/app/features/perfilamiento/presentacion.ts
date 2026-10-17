/** Reglas de presentación de D02, puras (W11-P18): colores, valoraciones y barras. */
import { TextosPerfilamiento } from './perfilamiento.i18n';
import {
  CausaConsentimiento,
  Direccion,
  EstadoFuente,
  EstadoPerfil,
  Factor,
  Fuente,
  NivelRiesgo,
  PerfilRespuesta,
} from './perfilamiento.modelo';

/** Tono visual de los tokens --sv-*: verde, naranja, rojo o gris. */
export type Tono = 'ok' | 'alerta' | 'error' | 'neutro';

const TONO_NIVEL: Record<NivelRiesgo, Tono> = { BAJO: 'ok', MEDIO: 'alerta', ALTO: 'error' };
const TONO_DIRECCION: Record<Direccion, Tono> = {
  REDUCE_RIESGO: 'ok',
  NEUTRO: 'alerta',
  AUMENTA_LEVEMENTE: 'alerta',
  AUMENTA_RIESGO: 'error',
};

export function claseNivel(estado: EstadoPerfil, nivel: NivelRiesgo | null): Tono {
  return estado === 'INFORMACION_INSUFICIENTE' || nivel === null ? 'neutro' : TONO_NIVEL[nivel];
}

/** La valoración de D02: la dirección del factor o NO_EVALUADO si no tuvo datos. */
export function etiquetaValoracion(factor: Factor): Direccion | 'NO_EVALUADO' {
  return factor.estado === 'NO_EVALUADO' || factor.direccion === null ? 'NO_EVALUADO' : factor.direccion;
}

export function claseValoracion(factor: Factor): Tono {
  const valoracion = etiquetaValoracion(factor);
  return valoracion === 'NO_EVALUADO' ? 'neutro' : TONO_DIRECCION[valoracion];
}

/** Contribución en 0–100 para la barra (role="meter"); vacía si el factor no se evaluó. */
export function porcentajeBarra(factor: Factor): number {
  if (factor.estado === 'NO_EVALUADO' || factor.contribucion === null) {
    return 0;
  }
  return Math.round(Math.min(Math.max(factor.contribucion, 0), 1) * 100);
}

/** Verde si se respetó el presupuesto del perfilamiento; naranja si se superó. */
export function claseTiempo(duracionMs: number, presupuestoMs: number): Tono {
  return duracionMs <= presupuestoMs ? 'ok' : 'alerta';
}

export function textoFuentes(t: TextosPerfilamiento, perfil: Pick<PerfilRespuesta, 'fuentesConsultadas' | 'fuentesDeclaradas'>): string {
  return t.fuentesDisponibles(perfil.fuentesConsultadas, perfil.fuentesDeclaradas);
}

const TONO_FUENTE: Record<EstadoFuente, Tono> = {
  CONSULTADA: 'ok',
  NO_AUTORIZADA: 'neutro',
  NO_CONSULTADA: 'neutro',
  TIEMPO_AGOTADO: 'alerta',
  NO_DISPONIBLE: 'error',
  RESPUESTA_INVALIDA: 'error',
};

/** Insignia del estado de una fuente en la tabla de linaje (W10-P13). */
export function claseEstadoFuente(estado: EstadoFuente): Tono {
  return TONO_FUENTE[estado];
}

/** D03/DT-05: el cliente no autorizó sus datos financieros y hay que pedirle el consentimiento. */
export function sinConsentimiento(perfil: Pick<PerfilRespuesta, 'accionSugerida'>): boolean {
  return perfil.accionSugerida === 'COMPLETAR_CONSENTIMIENTO';
}

const CAUSAS: readonly CausaConsentimiento[] = ['REVOCADO', 'VENCIDO', 'SIN_CONSENTIMIENTO'];

/** La causa del rechazo si tiene texto para el asesor (W10-P14); otra causa no se muestra. */
export function motivoConsentimiento(causa: string | null | undefined): CausaConsentimiento | null {
  return CAUSAS.find((c) => c === causa) ?? null;
}

/** Estados de una fuente que se consultó y no entregó datos (HU-W12): se puede recalcular cuando se restablezca. */
const SIN_RESPUESTA: readonly EstadoFuente[] = ['TIEMPO_AGOTADO', 'NO_DISPONIBLE', 'RESPUESTA_INVALIDA'];

/** Las fuentes que no respondieron a tiempo o no estuvieron disponibles, en el orden del perfil (W12-P10). */
export function fuentesSinRespuesta(perfil: Pick<PerfilRespuesta, 'fuentes'>): Fuente[] {
  return perfil.fuentes.filter((f) => SIN_RESPUESTA.includes(f.estado)).map((f) => f.fuente);
}

// --- D05 limitado (W12-P11): comparación del perfil anterior con el recalculado ----------------

export type ConceptoComparacion = 'FUENTES' | 'CONFIANZA' | 'NIVEL' | 'ESTADO';
export type Cambio = 'COMPLETO' | 'SIN_CAMBIO' | 'PARCIAL' | 'MEJORO' | 'EMPEORO' | 'CLASIFICADO';

/** Una fila de "Comparación antes y después": el cambio (null → "—") y, para la confianza, la diferencia. */
export interface FilaComparacion {
  concepto: ConceptoComparacion;
  cambio: Cambio | null;
  diferencia: number | null;
  tono: Tono;
}

const SEVERIDAD: Record<NivelRiesgo, number> = { BAJO: 1, MEDIO: 2, ALTO: 3 };
const TONO_CAMBIO: Record<Cambio, Tono> = {
  COMPLETO: 'ok', SIN_CAMBIO: 'neutro', PARCIAL: 'alerta', MEJORO: 'ok', EMPEORO: 'error', CLASIFICADO: 'ok',
};

/** El nivel que se muestra: un perfil insuficiente no tiene clasificación. */
export function nivelMostrado(perfil: Pick<PerfilRespuesta, 'estado' | 'nivelRiesgo'>): NivelRiesgo | null {
  return perfil.estado === 'INFORMACION_INSUFICIENTE' ? null : perfil.nivelRiesgo;
}

function cambioFuentes(anterior: PerfilRespuesta, actual: PerfilRespuesta): Cambio {
  if (actual.fuentesConsultadas === actual.fuentesDeclaradas) {
    return 'COMPLETO';
  }
  return actual.fuentesConsultadas === anterior.fuentesConsultadas ? 'SIN_CAMBIO' : 'PARCIAL';
}

function cambioNivel(anterior: NivelRiesgo | null, actual: NivelRiesgo | null): Cambio | null {
  if (anterior === null) {
    return actual === null ? 'SIN_CAMBIO' : 'CLASIFICADO';
  }
  if (actual === null) {
    return null;
  }
  const delta = SEVERIDAD[actual] - SEVERIDAD[anterior];
  return delta < 0 ? 'MEJORO' : delta > 0 ? 'EMPEORO' : 'SIN_CAMBIO';
}

const conTono = (concepto: ConceptoComparacion, cambio: Cambio | null): FilaComparacion => ({
  concepto, cambio, diferencia: null, tono: cambio === null ? 'neutro' : TONO_CAMBIO[cambio],
});

/** Filas de la tabla de D05, sin prima ni vigencia de la oferta (S2). */
export function filasComparacion(anterior: PerfilRespuesta, actual: PerfilRespuesta): FilaComparacion[] {
  // Redondeo a 2 decimales: la diferencia de dos confianzas no debe mostrar errores de coma flotante.
  const diferencia = Math.round((actual.confianza - anterior.confianza) * 100) / 100;
  return [
    conTono('FUENTES', cambioFuentes(anterior, actual)),
    { concepto: 'CONFIANZA', cambio: null, diferencia, tono: diferencia > 0 ? 'ok' : diferencia < 0 ? 'error' : 'neutro' },
    conTono('NIVEL', cambioNivel(nivelMostrado(anterior), nivelMostrado(actual))),
    conTono('ESTADO', null),
  ];
}

/** Insignia del estado de un perfil en D05: "Provisional", "En firme" o "Insuficiente". */
export function claseEstadoPerfil(estado: EstadoPerfil): Tono {
  return estado === 'CALCULADO' ? 'ok' : estado === 'DEGRADADO' ? 'alerta' : 'neutro';
}

/** Las fuentes que no respondieron en el perfil anterior y sí en el actual. */
export function fuentesRestablecidas(anterior: PerfilRespuesta, actual: PerfilRespuesta): Fuente[] {
  const consultadas = new Set(actual.fuentes.filter((f) => f.estado === 'CONSULTADA').map((f) => f.fuente));
  return fuentesSinRespuesta(anterior).filter((f) => consultadas.has(f));
}

export type TipoEvento = 'FUENTE_SIN_RESPUESTA' | 'PERFIL_PROVISIONAL' | 'PERFIL_INSUFICIENTE' | 'PERFIL_ANTERIOR' | 'PERFIL_RECALCULADO';

/** Un evento del panel "Qué pasó": cuándo ocurrió y, según el tipo, la fuente o la confianza. */
export interface EventoLinea {
  tipo: TipoEvento;
  en: string;
  fuente: Fuente | null;
  confianza: number | null;
  tono: Tono;
}

/** "Qué pasó": fuentes sin respuesta, el perfil anterior y el recalculado; sin eventos de circuito ni aviso. */
export function lineaTiempo(anterior: PerfilRespuesta, actual: PerfilRespuesta): EventoLinea[] {
  const sinRespuesta = fuentesSinRespuesta(anterior).map(
    (fuente): EventoLinea => ({ tipo: 'FUENTE_SIN_RESPUESTA', en: anterior.calculadoEn, fuente, confianza: null, tono: 'error' }),
  );
  const previo: EventoLinea =
    anterior.estado === 'INFORMACION_INSUFICIENTE'
      ? { tipo: 'PERFIL_INSUFICIENTE', en: anterior.calculadoEn, fuente: null, confianza: null, tono: 'alerta' }
      : {
          tipo: anterior.estado === 'DEGRADADO' ? 'PERFIL_PROVISIONAL' : 'PERFIL_ANTERIOR',
          en: anterior.calculadoEn,
          fuente: null,
          confianza: anterior.confianza,
          tono: anterior.estado === 'DEGRADADO' ? 'alerta' : 'ok',
        };
  const recalculado: EventoLinea = {
    tipo: 'PERFIL_RECALCULADO', en: actual.calculadoEn, fuente: null, confianza: actual.confianza, tono: claseEstadoPerfil(actual.estado),
  };
  return [...sinRespuesta, previo, recalculado];
}
