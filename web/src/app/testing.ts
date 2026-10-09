import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthProveedor, PasoIngreso } from './core/auth/auth-proveedor';
import { SesionService } from './core/auth/sesion.service';
import { PoolCognito } from './core/config/app-config';
import { Traza } from './features/operacion/trazas/traza.model';

/** JWT sin firma con los claims dados (solo para pruebas de interfaz). */
export function tokenPrueba(claims: Record<string, unknown>): string {
  const b64 = (valor: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(valor))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(claims)}.`;
}

/** Cognito simulado: entrega en orden los pasos o errores de `resultados`. */
export class AuthFalso extends AuthProveedor {
  token: string | null = null;
  pool?: PoolCognito;
  resultados: (PasoIngreso | Error)[] = [];
  llamadas: string[] = [];
  claimsAlIngresar: Record<string, unknown> = { name: 'Ana Pérez', 'cognito:groups': ['operacion'] };

  configurar(pool: PoolCognito): void {
    this.pool = pool;
  }

  async ingresar(usuario: string, clave: string): Promise<PasoIngreso> {
    this.llamadas.push(`ingresar:${usuario}:${clave}`);
    return this.siguiente();
  }

  async confirmar(respuesta: string): Promise<PasoIngreso> {
    this.llamadas.push(`confirmar:${respuesta}`);
    return this.siguiente();
  }

  async idToken(): Promise<string | null> {
    return this.token;
  }

  async salir(): Promise<void> {
    this.llamadas.push('salir');
    this.token = null;
  }

  async recuperar(usuario: string): Promise<void> {
    this.llamadas.push(`recuperar:${usuario}`);
    this.lanzarSiHayError();
  }

  async confirmarRecuperacion(usuario: string, codigo: string, clave: string): Promise<void> {
    this.llamadas.push(`confirmarRecuperacion:${usuario}:${codigo}:${clave}`);
    this.lanzarSiHayError();
  }

  private siguiente(): PasoIngreso {
    const resultado = this.resultados.shift() ?? { tipo: 'listo' };
    if (resultado instanceof Error) {
      throw resultado;
    }
    if (resultado.tipo === 'listo') {
      this.token = tokenPrueba(this.claimsAlIngresar);
    }
    return resultado;
  }

  private lanzarSiHayError(): void {
    const resultado = this.resultados[0];
    if (resultado instanceof Error) {
      this.resultados.shift();
      throw resultado;
    }
  }
}

export function proveerAuthFalso(): Provider[] {
  return [AuthFalso, { provide: AuthProveedor, useExisting: AuthFalso }];
}

/** Deja una sesión iniciada con esos claims (requiere proveerAuthFalso()). */
export async function iniciarSesion(claims: Record<string, unknown>): Promise<void> {
  TestBed.inject(AuthFalso).token = tokenPrueba(claims);
  await TestBed.inject(SesionService).token();
}

export const TRAZA: Traza = {
  correlation_id: '7f3a91c2e8b4471d',
  trace_ids: ['1-6a2b3c4d-0123456789abcdef01234567'],
  inicio: '2026-10-08T15:00:00Z',
  duracion_total_ms: 1280,
  umbral_ms: 1500,
  resultado: 'Correcto',
  tramos: [
    { servicio: 'api-socios', operacion: 'solicitar_cotizacion', externo: false, inicio_ms: 0, duracion_ms: 1280,
      propio_ms: 160, participacion: 1, estado: 'Correcto', destacado: false },
    { servicio: 'cotizacion', operacion: 'perfilamiento', externo: false, inicio_ms: 54, duracion_ms: 1026,
      propio_ms: 418, participacion: 0.8016, estado: 'Correcto', destacado: true },
    { servicio: 'simulador-aliados', operacion: 'externo', externo: true, inicio_ms: 304, duracion_ms: 304,
      propio_ms: 304, participacion: 0.2375, estado: 'Error', destacado: true },
  ],
  interpretacion: 'El paso más costoso es cotizacion · perfilamiento con 418 ms.',
  contexto: { canal: 'Socios', servicio_entrada: 'api-socios', servicios_internos: 2, servicios_externos: 1, ambiente: 'int' },
};
