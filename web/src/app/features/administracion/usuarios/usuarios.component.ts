import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { Grupo, UsuarioBackoffice, UsuariosService } from './usuarios.service';

const ESTADOS: Record<string, { etiqueta: string; clase: string }> = {
  CONFIRMED: { etiqueta: 'Activo', clase: 'tag--ok' },
  FORCE_CHANGE_PASSWORD: { etiqueta: 'Pendiente de primer ingreso', clase: 'tag--alerta' },
  RESET_REQUIRED: { etiqueta: 'Debe restablecer contraseña', clase: 'tag--alerta' },
};

const ERRORES: Record<number, string> = {
  403: 'Tu usuario no pertenece al grupo de administradores.',
  409: 'Ya existe un usuario con ese correo.',
  422: 'Revisa los datos: correo válido, nombre y al menos un grupo.',
};

/** Administración › Usuarios: alta de usuarios del back-office (sin mockup; sigue el estilo de Operación). */
@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './usuarios.component.html',
  styles: `
    :host { display: flex; flex-direction: column; gap: 10px; }
    h2 { margin: 0 0 4px; font-size: 22px; color: var(--sv-azul-oscuro); }
    .sub { margin: 0 0 6px; font-size: 13px; color: var(--sv-texto-secundario); }
    .fila { display: flex; flex-wrap: wrap; gap: 0 14px; }
    .grupos { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin: 4px 0 14px; padding: 0; border: 0; }
    .grupos legend { margin-bottom: 6px; font-size: 11.5px; font-weight: 600; color: var(--sv-texto-secundario); }
    .grupo { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid var(--sv-borde); border-radius: 6px; font-size: 13px; cursor: pointer; }
    .grupo small { display: block; color: var(--sv-texto-secundario); }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tabla-scroll { overflow-x: auto; }
  `,
})
export class UsuariosComponent implements OnInit {
  private readonly servicio = inject(UsuariosService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    grupos: new FormArray<FormControl<boolean>>([]),
  });

  readonly grupos = signal<Grupo[]>([]);
  readonly usuarios = signal<UsuarioBackoffice[] | null>(null);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly creado = signal<string | null>(null);

  ngOnInit(): void {
    this.servicio.grupos().subscribe({
      next: (grupos) => {
        this.grupos.set(grupos);
        grupos.forEach((g) => this.formulario.controls.grupos.push(this.fb.control(g.nombre === 'operacion')));
      },
      error: (e: HttpErrorResponse) => this.error.set(this.mensaje(e)),
    });
    this.cargar();
  }

  cargar(): void {
    this.servicio.listar().subscribe({
      next: (usuarios) => this.usuarios.set(usuarios),
      error: (e: HttpErrorResponse) => this.error.set(this.mensaje(e)),
    });
  }

  seleccionados(): string[] {
    return this.grupos().filter((_, i) => this.formulario.controls.grupos.at(i)?.value).map((g) => g.nombre);
  }

  crear(): void {
    const { email, nombre } = this.formulario.controls;
    email.setValue(email.value.trim().toLowerCase());
    nombre.setValue(nombre.value.trim());
    const grupos = this.seleccionados();
    if (this.formulario.invalid || grupos.length === 0) {
      this.formulario.markAllAsTouched();
      this.error.set(grupos.length === 0 ? 'Selecciona al menos un grupo.' : null);
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.creado.set(null);
    this.servicio.crear({ email: email.value, nombre: nombre.value, grupos }).subscribe({
      next: (usuario) => {
        this.enviando.set(false);
        this.creado.set(usuario.email);
        this.formulario.reset();
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(this.mensaje(e));
      },
    });
  }

  estado(usuario: UsuarioBackoffice): { etiqueta: string; clase: string } {
    if (!usuario.habilitado) {
      return { etiqueta: 'Deshabilitado', clase: 'tag--error' };
    }
    return ESTADOS[usuario.estado] ?? { etiqueta: usuario.estado, clase: 'tag--alerta' };
  }

  private mensaje(error: HttpErrorResponse): string {
    return ERRORES[error.status] ?? 'No fue posible completar la operación. Inténtalo de nuevo.';
  }
}
