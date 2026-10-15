/** Reglas de presentación de D02, puras (W11-P18): colores, valoraciones y barras. */
import { TextosPerfilamiento } from './perfilamiento.i18n';
import { Direccion, EstadoPerfil, Factor, NivelRiesgo, PerfilRespuesta } from './perfilamiento.modelo';

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
