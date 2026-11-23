import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { IdiomaService } from '../../../core/i18n/idioma.service';
import { TextosPortal, TextosPortalService } from '../../../core/i18n/portal.i18n';
import { Grupo, UsuarioBackoffice, UsuariosService } from './usuarios.service';

const ESTADOS: Record<string, { etiqueta: keyof TextosPortal; clase: string }> = {
  CONFIRMED: { etiqueta: 'estadoActivo', clase: 'tag--ok' },
  FORCE_CHANGE_PASSWORD: { etiqueta: 'estadoPrimerIngreso', clase: 'tag--alerta' },
  RESET_REQUIRED: { etiqueta: 'estadoRestablecer', clase: 'tag--alerta' },
};

const ERRORES: Record<number, keyof TextosPortal> = {
  403: 'errorNoAdministrador',
  409: 'errorUsuarioExiste',
  422: 'errorDatosUsuario',
};

/** Administración › Usuarios: alta de usuarios del back-office (sin mockup; sigue el estilo de Operación). */
@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
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
  private readonly idioma = inject(IdiomaService);
  readonly t = inject(TextosPortalService).t;

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
      this.error.set(grupos.length === 0 ? this.t().seleccionaGrupo : null);
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
      return { etiqueta: this.t().estadoDeshabilitado, clase: 'tag--error' };
    }
    const estado = ESTADOS[usuario.estado];
    return estado ? { etiqueta: this.t()[estado.etiqueta] as string, clase: estado.clase } : { etiqueta: usuario.estado, clase: 'tag--alerta' };
  }

  /** Fecha corta en el formato del idioma elegido (12/10/2026 en es-CO, 10/12/2026 en en-US). */
  fecha(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const locale = this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO';
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
  }

  private mensaje(error: HttpErrorResponse): string {
    const clave = ERRORES[error.status];
    return (clave ? this.t()[clave] : this.t().errorDesconocido) as string;
  }
}
