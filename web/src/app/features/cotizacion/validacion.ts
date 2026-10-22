import { CondicionesProducto } from './cotizacion.modelo';

/** Los datos del formulario que las reglas del producto limitan (mockup "Revisa los datos"). */
export interface DatosAValidar {
  fechaNacimiento: string;
  sumaAsegurada: number | null;
  plazoCreditoMeses: number;
}

export type CampoLimitado = 'fechaNacimiento' | 'sumaAsegurada' | 'plazoCreditoMeses';

/** Un límite incumplido; en `fechaNacimiento` el límite es la edad (años cumplidos hoy). */
export interface MotivoLimite {
  campo: CampoLimitado;
  tipo: 'minimo' | 'maximo';
  limite: number;
}

/** Años cumplidos en `hoy` (AAAA-MM-DD), como los calcula cotizacion (DT-27). */
export function edadCumplida(nacimiento: string, hoy: string): number {
  const [an, mn, dn] = nacimiento.split('-').map(Number);
  const [ah, mh, dh] = hoy.split('-').map(Number);
  return ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
}

function fuera(valor: number, minimo: number, maximo: number): 'minimo' | 'maximo' | null {
  if (valor < minimo) {
    return 'minimo';
  }
  return valor > maximo ? 'maximo' : null;
}

/**
 * Los límites de las reglas vigentes que incumplen los datos; vacío si todo está dentro.
 * Es una ayuda para el asesor: cotizacion vuelve a validar y responde DATOS_FUERA_DE_RANGO.
 */
export function fueraDeLimites(datos: DatosAValidar, condiciones: CondicionesProducto, hoy: string): MotivoLimite[] {
  const { limites } = condiciones;
  const motivos: MotivoLimite[] = [];
  if (datos.sumaAsegurada !== null) {
    const minimo = Number(limites.sumaAsegurada.minimo);
    const maximo = Number(limites.sumaAsegurada.maximo);
    const tipo = fuera(datos.sumaAsegurada, minimo, maximo);
    if (tipo) {
      motivos.push({ campo: 'sumaAsegurada', tipo, limite: tipo === 'minimo' ? minimo : maximo });
    }
  }
  if (datos.fechaNacimiento) {
    const minimo = Number(limites.edad.minimo);
    const maximo = Number(limites.edad.maximo);
    const tipo = fuera(edadCumplida(datos.fechaNacimiento, hoy), minimo, maximo);
    if (tipo) {
      motivos.push({ campo: 'fechaNacimiento', tipo, limite: tipo === 'minimo' ? minimo : maximo });
    }
  }
  const minimo = Number(limites.plazoCreditoMeses.minimo);
  const maximo = Number(limites.plazoCreditoMeses.maximo);
  const tipo = fuera(datos.plazoCreditoMeses, minimo, maximo);
  if (tipo) {
    motivos.push({ campo: 'plazoCreditoMeses', tipo, limite: tipo === 'minimo' ? minimo : maximo });
  }
  return motivos;
}
