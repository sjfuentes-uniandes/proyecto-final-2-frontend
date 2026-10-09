import { Injectable, computed, inject, signal } from '@angular/core';

import { ConfigService } from '../config/app-config';
import { AuthProveedor, ErrorAutenticacion, PasoIngreso } from './auth-proveedor';

export interface Claims {
  sub?: string;
  name?: string;
  email?: string;
  exp?: number;
  'cognito:groups'?: string[];
}

export function decodificar(token: string | null): Claims | null {
  const payload = token?.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const binario = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Claims;
  } catch {
    return null;
  }
}

/**
 * Sesión del portal de gestión (pool de Cognito del back-office). Los grupos solo
 * deciden qué se muestra; la autorización real la aplican API Gateway y el BFF.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly proveedor = inject(AuthProveedor);
  private readonly config = inject(ConfigService);
  private readonly actuales = signal<Claims | null>(null);

  readonly claims = this.actuales.asReadonly();
  readonly nombre = computed(() => this.actuales()?.name ?? this.actuales()?.email ?? '');
  readonly iniciales = computed(() =>
    this.nombre().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?',
  );

  get configurada(): boolean {
    return !!this.config.valor.cognito?.backoffice?.userPoolId;
  }

  /** Al arrancar: configura Cognito y recupera la sesión de la pestaña, si existe. */
  async iniciar(): Promise<void> {
    const pool = this.config.valor.cognito?.backoffice;
    if (!pool?.userPoolId) {
      return;
    }
    this.proveedor.configurar(pool);
    await this.token();
  }

  autenticado(): boolean {
    const exp = this.actuales()?.exp;
    return !!this.actuales() && (!exp || exp * 1000 > Date.now());
  }

  tieneGrupo(grupo: string): boolean {
    return this.autenticado() && (this.actuales()?.['cognito:groups']?.includes(grupo) ?? false);
  }

  /** ID token vigente para la API (lo renueva si venció). */
  async token(): Promise<string | null> {
    const token = await this.proveedor.idToken();
    this.actuales.set(decodificar(token));
    return token;
  }

  async ingresar(usuario: string, clave: string): Promise<PasoIngreso> {
    if (!this.configurada) {
      throw new ErrorAutenticacion('sin-configurar');
    }
    return this.alTerminar(await this.proveedor.ingresar(usuario.trim().toLowerCase(), clave));
  }

  async confirmar(respuesta: string): Promise<PasoIngreso> {
    return this.alTerminar(await this.proveedor.confirmar(respuesta));
  }

  async salir(): Promise<void> {
    await this.proveedor.salir();
    this.actuales.set(null);
  }

  recuperar(usuario: string): Promise<void> {
    return this.proveedor.recuperar(usuario.trim().toLowerCase());
  }

  confirmarRecuperacion(usuario: string, codigo: string, clave: string): Promise<void> {
    return this.proveedor.confirmarRecuperacion(usuario.trim().toLowerCase(), codigo.trim(), clave);
  }

  private async alTerminar(paso: PasoIngreso): Promise<PasoIngreso> {
    if (paso.tipo === 'listo') {
      await this.token();
    }
    return paso;
  }
}
