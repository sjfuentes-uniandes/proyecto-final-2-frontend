import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toDataURL } from 'qrcode';

import { MotivoError, PasoIngreso } from '../../../core/auth/auth-proveedor';
import { SesionService } from '../../../core/auth/sesion.service';
import { MENSAJES, PATRON_CODIGO, POLITICA_CLAVE, motivo } from '../mensajes';

type Paso = 'credenciales' | 'nueva-clave' | 'registrar-totp' | 'codigo-totp';
const CLAVE_INTENTOS = 'solventa.intentos-fallidos';

function coinciden(grupo: AbstractControl): ValidationErrors | null {
  return grupo.get('clave')?.value === grupo.get('confirmacion')?.value ? null : { noCoinciden: true };
}

/** Ingreso al portal de gestión (mockups "Ingreso" y "Error de acceso"). */
@Component({
  selector: 'app-ingresar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './ingresar.component.html',
})
export class IngresarComponent {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly volver = inject(ActivatedRoute).snapshot.queryParamMap.get('volver');
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly credenciales = this.fb.group({
    usuario: ['', [Validators.required, Validators.maxLength(254)]],
    clave: ['', Validators.required],
    codigo: ['', Validators.pattern(PATRON_CODIGO)],
  });
  readonly nuevaClave = this.fb.group(
    { clave: ['', [Validators.required, Validators.pattern(POLITICA_CLAVE)]], confirmacion: ['', Validators.required] },
    { validators: coinciden },
  );
  // Sin [formGroup] el <form> no es de Angular: (ngSubmit) no se dispara y el navegador recarga la página.
  readonly verificacion = this.fb.group({ codigo: ['', [Validators.required, Validators.pattern(PATRON_CODIGO)]] });
  readonly codigo = this.verificacion.controls.codigo;

  readonly paso = signal<Paso>('credenciales');
  readonly enviando = signal(false);
  readonly error = signal<MotivoError | null>(null);
  readonly intentosFallidos = signal(this.leerIntentos());
  readonly credencialesValidadas = signal(false);
  readonly totp = signal<{ qr: string; secreto: string } | null>(null);
  readonly mensajes = MENSAJES;
  /** Estado del mockup "Error de acceso" (A02): sin campo de código y con panel de protección. */
  readonly errorDeAcceso = computed(() => this.paso() === 'credenciales' && (this.error() === 'credenciales' || this.error() === 'bloqueada'));

  async ingresar(): Promise<void> {
    if (this.credenciales.invalid) {
      this.credenciales.markAllAsTouched();
      return;
    }
    const { usuario, clave, codigo } = this.credenciales.getRawValue();
    await this.ejecutar(async () => {
      let paso = await this.sesion.ingresar(usuario, clave);
      this.credencialesValidadas.set(true);
      this.guardarIntentos(0);
      // El mockup pide el código junto con la contraseña: si ya viene, se envía de una vez.
      if (paso.tipo === 'codigo-totp' && codigo) {
        this.paso.set('codigo-totp'); // si el código falla, se reintenta sin repetir la contraseña
        paso = await this.sesion.confirmar(codigo);
      }
      return paso;
    }, true);
  }

  async cambiarClave(): Promise<void> {
    if (this.nuevaClave.invalid) {
      this.nuevaClave.markAllAsTouched();
      return;
    }
    await this.ejecutar(() => this.sesion.confirmar(this.nuevaClave.getRawValue().clave));
  }

  async verificarCodigo(): Promise<void> {
    if (this.codigo.invalid) {
      this.codigo.markAsTouched();
      return;
    }
    await this.ejecutar(() => this.sesion.confirmar(this.codigo.value));
    this.codigo.reset();
  }

  /** Agrupa el secreto en bloques de 4 para copiarlo a mano. */
  secretoLegible(secreto: string): string {
    return secreto.replace(/(.{4})/g, '$1 ').trim();
  }

  private async ejecutar(accion: () => Promise<PasoIngreso>, esCredencial = false): Promise<void> {
    this.enviando.set(true);
    this.error.set(null);
    try {
      await this.avanzar(await accion());
    } catch (error) {
      const causa = motivo(error);
      this.error.set(causa);
      if (causa === 'sesion-vencida') {
        // El reto de Cognito ya no sirve: el ingreso se reinicia desde las credenciales.
        this.paso.set('credenciales');
        this.credenciales.controls.clave.reset();
        this.credenciales.controls.codigo.reset();
      }
      if (esCredencial && !this.credencialesValidadas() && (causa === 'credenciales' || causa === 'bloqueada')) {
        this.guardarIntentos(this.intentosFallidos() + 1);
        this.credenciales.controls.clave.reset();
      }
    } finally {
      this.enviando.set(false);
    }
  }

  private async avanzar(paso: PasoIngreso): Promise<void> {
    switch (paso.tipo) {
      case 'listo':
        await this.router.navigateByUrl(this.volver?.startsWith('/') ? this.volver : '/');
        return;
      case 'registrar-totp':
        this.totp.set({ secreto: paso.secreto, qr: await toDataURL(paso.uri, { margin: 1, width: 176 }) });
        break;
    }
    this.paso.set(paso.tipo);
  }

  private leerIntentos(): number {
    try {
      return Number(sessionStorage.getItem(CLAVE_INTENTOS) ?? 0);
    } catch {
      return 0;
    }
  }

  private guardarIntentos(valor: number): void {
    this.intentosFallidos.set(valor);
    try {
      sessionStorage.setItem(CLAVE_INTENTOS, String(valor));
    } catch {
      // Sin almacenamiento solo se pierde el contador informativo.
    }
  }
}
