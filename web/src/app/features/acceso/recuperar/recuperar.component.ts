import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MotivoError } from '../../../core/auth/auth-proveedor';
import { SesionService } from '../../../core/auth/sesion.service';
import { TextosPortalService } from '../../../core/i18n/portal.i18n';
import { MENSAJES, PATRON_CODIGO, POLITICA_CLAVE, motivo } from '../mensajes';

/** Recuperar el acceso por correo: Cognito envía un código al correo verificado. */
@Component({
  selector: 'app-recuperar',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth">
      <section class="card auth__card">
        <h2>{{ t().recuperarTitulo }}</h2>
        @if (error(); as causa) {
          <p class="alerta alerta--error" role="alert"><span aria-hidden="true">⚠</span><span>{{ t()[mensajes[causa]] }}</span></p>
        }
        @switch (paso()) {
          @case ('solicitar') {
            <p class="auth__sub">{{ t().recuperarSub }}</p>
            <form [formGroup]="solicitud" (ngSubmit)="solicitar()" novalidate>
              <label class="fld">
                <span>{{ t().correoCorporativo }}</span>
                <input class="inp" formControlName="usuario" type="email" autocomplete="username" />
              </label>
              <button class="btn btn--primario btn--bloque" type="submit" [disabled]="enviando()">{{ t().enviarCodigo }}</button>
            </form>
          }
          @case ('confirmar') {
            <!-- Mismo texto exista o no la cuenta (prevent_user_existence_errors). -->
            <p class="auth__sub" data-testid="enviado">{{ t().codigoEnviado(solicitud.getRawValue().usuario) }}</p>
            <form [formGroup]="confirmacion" (ngSubmit)="confirmar()" novalidate>
              <label class="fld">
                <span>{{ t().codigoRecibido }}</span>
                <input class="inp" formControlName="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code" />
              </label>
              <label class="fld">
                <span>{{ t().nuevaClave }}</span>
                <input class="inp" formControlName="clave" type="password" autocomplete="new-password" />
                <small class="fld__ayuda">{{ t().politicaClave }}</small>
              </label>
              <button class="btn btn--primario btn--bloque" type="submit" [disabled]="enviando()">{{ t().cambiarClave }}</button>
            </form>
          }
          @case ('listo') {
            <p class="alerta alerta--ok" role="status">{{ t().claveCambiada }}</p>
          }
        }
        <a class="auth__enlace" routerLink="/ingresar">{{ t().volverIngreso }}</a>
      </section>
    </div>
  `,
})
export class RecuperarComponent {
  private readonly sesion = inject(SesionService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly solicitud = this.fb.group({ usuario: ['', [Validators.required, Validators.email]] });
  readonly confirmacion = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(PATRON_CODIGO)]],
    clave: ['', [Validators.required, Validators.pattern(POLITICA_CLAVE)]],
  });
  readonly paso = signal<'solicitar' | 'confirmar' | 'listo'>('solicitar');
  readonly enviando = signal(false);
  readonly error = signal<MotivoError | null>(null);
  readonly mensajes = MENSAJES;
  readonly t = inject(TextosPortalService).t;

  async solicitar(): Promise<void> {
    if (this.solicitud.invalid) {
      this.solicitud.markAllAsTouched();
      return;
    }
    await this.ejecutar(() => this.sesion.recuperar(this.solicitud.getRawValue().usuario), 'confirmar');
  }

  async confirmar(): Promise<void> {
    if (this.confirmacion.invalid) {
      this.confirmacion.markAllAsTouched();
      return;
    }
    const { codigo, clave } = this.confirmacion.getRawValue();
    await this.ejecutar(() => this.sesion.confirmarRecuperacion(this.solicitud.getRawValue().usuario, codigo, clave), 'listo');
  }

  private async ejecutar(accion: () => Promise<void>, siguiente: 'confirmar' | 'listo'): Promise<void> {
    this.enviando.set(true);
    this.error.set(null);
    try {
      await accion();
      this.paso.set(siguiente);
    } catch (error) {
      this.error.set(motivo(error));
    } finally {
      this.enviando.set(false);
    }
  }
}
