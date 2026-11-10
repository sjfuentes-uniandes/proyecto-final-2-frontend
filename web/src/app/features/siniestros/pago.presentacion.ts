/**
 * Funciones puras de presentación del pago de la indemnización (H08, HU-W23): sin Angular ni E/S.
 * Los textos llegan del catálogo de la feature; aquí solo se decide cuál y con qué valores.
 */
import { Insignia, fechaHora, formatearMonto, textoAccion } from './presentacion';
import { TextosSiniestros } from './siniestros.i18n';
import { ACCION_AVISO_CLIENTE, PagoSiniestroVista } from './siniestros.pago.modelo';

/** Cómo se ve el pago: confirmado, rechazado (pago por gestionar) o pendiente de la pasarela. */
export type VariantePago = 'CONFIRMADO' | 'RECHAZADO' | 'PENDIENTE';

const MINUTOS_POR_HORA = 60;
const MS_POR_MINUTO = 60_000;

/**
 * La variante de la vista. Sin `indemnizacion` (dinero aún no publicó un resultado) el pago está
 * pendiente: nunca se toma la falta de respuesta como rechazo.
 */
export function variantePago(vista: PagoSiniestroVista): VariantePago {
  const estado = vista.indemnizacion?.estado;
  return estado === 'CONFIRMADO' ? 'CONFIRMADO' : estado === 'RECHAZADO' ? 'RECHAZADO' : 'PENDIENTE';
}

/** Hay datos de la pasarela (intentos y duplicados) solo cuando `dinero` ya publicó un resultado. */
export function tieneDatosDePasarela(vista: PagoSiniestroVista): boolean {
  return vista.indemnizacion !== null;
}

export function insigniaPago(t: TextosSiniestros, variante: VariantePago): Insignia {
  switch (variante) {
    case 'CONFIRMADO':
      return { texto: t.pagoInsigniaPagado, tono: 'exito' };
    case 'RECHAZADO':
      return { texto: t.pagoInsigniaPorGestionar, tono: 'alerta' };
    case 'PENDIENTE':
      return { texto: t.pagoInsigniaPendiente, tono: 'info' };
  }
}

/** El motivo del rechazo traducido desde el código de la pasarela; un código nuevo se muestra tal cual. */
export function textoMotivoPago(t: TextosSiniestros, motivo: string | null): string {
  switch (motivo) {
    case null:
    case 'MOTIVO_NO_INFORMADO':
      return t.pagoMotivoNoInformado;
    case 'BENEFICIARIO_NO_HABILITADO':
      return t.pagoMotivoBeneficiarioNoHabilitado;
    default:
      return t.pagoMotivoOtro(motivo);
  }
}

/** Minutos entre el reporte y la confirmación de la pasarela; null si no hay confirmación. */
export function minutosTotales(reportadoEn: string, confirmadaEn: string | null): number | null {
  if (confirmadaEn === null) {
    return null;
  }
  const minutos = (Date.parse(confirmadaEn) - Date.parse(reportadoEn)) / MS_POR_MINUTO;
  return Number.isFinite(minutos) ? Math.max(0, Math.round(minutos)) : null;
}

/** «17 h 12 m»: el tiempo total del trámite en horas y minutos. */
export function formatearTiempoTotal(t: TextosSiniestros, minutos: number): string {
  return t.pagoTiempoTotal(Math.floor(minutos / MINUTOS_POR_HORA), minutos % MINUTOS_POR_HORA);
}

/** Una línea de la «Trazabilidad del trámite». */
export interface FilaTrazabilidad {
  id: string;
  rotulo: string;
  detalle: string;
}

/**
 * La trazabilidad sale solo del historial inmutable del siniestro, de lo más antiguo a lo más reciente.
 * La orden de pago lleva su referencia, la confirmación el valor y el rechazo su motivo; el resto, el
 * nombre de quien lo hizo si lo hay. «Aviso enviado al cliente» aparece solo si el historial lo trae.
 */
export function filasTrazabilidad(t: TextosSiniestros, locale: string, vista: PagoSiniestroVista): FilaTrazabilidad[] {
  const { liquidacion, indemnizacion } = vista;
  const monto = liquidacion.valorIndemnizar ?? indemnizacion?.monto ?? null;
  return [...vista.historial]
    .sort((a, b) => Date.parse(a.ocurridoEn) - Date.parse(b.ocurridoEn))
    .map((entrada) => {
      let extra: string | null = entrada.actorNombre;
      if (entrada.accion === 'APROBADO' && liquidacion.referenciaPago) {
        extra = t.pagoIndReferencia(liquidacion.referenciaPago);
      } else if (entrada.accion === 'PAGO_CONFIRMADO' && monto !== null) {
        extra = formatearMonto(locale, monto, liquidacion.moneda);
      } else if (entrada.accion === 'PAGO_RECHAZADO') {
        extra = textoMotivoPago(t, indemnizacion?.motivo ?? null);
      }
      const fecha = fechaHora(locale, entrada.ocurridoEn);
      return { id: entrada.id, rotulo: textoAccion(t, entrada.accion), detalle: extra ? t.pagoFilaDetalle(fecha, extra) : fecha };
    });
}

/** El historial dice que el cliente recibió el aviso del pago. */
export function clienteAvisado(vista: PagoSiniestroVista): boolean {
  return vista.historial.some((e) => e.accion === ACCION_AVISO_CLIENTE);
}
