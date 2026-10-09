import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MotivoError } from '../../../core/auth/auth-proveedor';
import { SesionService } from '../../../core/auth/sesion.service';
import { MENSAJES, PATRON_CODIGO, POLITICA_CLAVE, motivo } from '../mensajes';

/** Recuperar el acceso por correo: Cognito envía un código al correo verificado. */
@Component({
  selector: 'app-recuperar',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth">
      <section class="card auth__card">
        <h2>Recuperar el acceso</h2>
        @if (error(); as causa) {
          <p class="alerta alerta--error" role="alert"><span aria-hidden="true">⚠</span><span>{{ mensajes[causa] }}</span></p>
        }
        @switch (paso()) {
          @case ('solicitar') {
            <p class="auth__sub">Te enviaremos un código al correo corporativo registrado.</p>
            <form [formGroup]="solicitud" (ngSubmit)="solicitar()" novalidate>
              <label class="fld">
                <span>Correo corporativo</span>
                <input class="inp" formControlName="usuario" type="email" autocomplete="username" />
              </label>
              <button class="btn btn--primario btn--bloque" type="submit" [disabled]="enviando()">Enviar código</button>
            </form>
          }
          @case ('confirmar') {
            <!-- Mismo texto exista o no la cuenta (prevent_user_existence_errors). -->
            <p class="auth__sub" data-testid="enviado">Si la cuenta existe, enviamos un código a {{ solicitud.getRawValue().usuario }}.</p>
            <form [formGroup]="confirmacion" (ngSubmit)="confirmar()" novalidate>
              <label class="fld">
                <span>Código recibido</span>
                <input class="inp" formControlName="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code" />
              </label>
              <label class="fld">
                <span>Nueva contraseña</span>
                <input class="inp" formControlName="clave" type="password" autocomplete="new-password" />
                <small class="fld__ayuda">Mínimo 12 caracteres con mayúsculas, minúsculas, números y símbolos.</small>
              </label>
              <button class="btn btn--primario btn--bloque" type="submit" [disabled]="enviando()">Cambiar contraseña</button>
            </form>
          }
          @case ('listo') {
            <p class="alerta alerta--ok" role="status">La contraseña se cambió. Ya puedes ingresar con ella y tu código de verificación.</p>
          }
        }
        <a class="auth__enlace" routerLink="/ingresar">Volver al ingreso</a>
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
