/** Contrato de clientes e identidad del bff-web (HU-W30): `ClienteDto`, `SolicitudAltaCliente` y `EstadoIdentidad`. */
export type EstadoIdentidad = 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO';

/** Documentos de persona natural que ofrece la pantalla; el backend acepta 2 o 3 letras mayúsculas. */
export type TipoDocumento = 'CC' | 'CE' | 'PA';
export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = ['CC', 'CE', 'PA'];

export interface SolicitudCliente {
  tipoDocumento: string;
  numeroDocumento: string;
  nombreCompleto: string;
  /** Fecha ISO (AAAA-MM-DD), no futura. */
  fechaNacimiento: string;
}

/** Sin PII ni motivo de rechazo. */
export interface ClienteDto {
  clienteId: string;
  estado: EstadoIdentidad;
  verificadoEn: string | null;
  proveedor: string | null;
  referencia: string | null;
}
