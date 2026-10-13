import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { mensajeError } from '../socios.errores';
import { TextosSociosService } from '../socios.i18n';
import { CANALES, CanalVenta, PERMISOS, PLANES, Permiso, Plan, Socio, SocioCreado, SociosService } from '../socios.service';
import { CredencialesDialogoComponent } from './credenciales-dialogo.component';

type Paso = 1 | 2 | 3;

/** Socios › Alta de socio en tres pasos (mockups B03-B05) y socio activado (B06). */
@Component({
  selector: 'app-socio-alta',
  imports: [ReactiveFormsModule, RouterLink, CredencialesDialogoComponent],
  templateUrl: './socio-alta.component.html',
  styleUrl: '../socios.scss',
})
export class SocioAltaComponent {
  private readonly servicio = inject(SociosService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly textos = inject(TextosSociosService);

  readonly canales = CANALES;
  readonly planes = PLANES;
  readonly permisos = PERMISOS;

  readonly formulario = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    canal: this.fb.control<CanalVenta | ''>('', Validators.required),
    plan: this.fb.control<Plan | ''>('', Validators.required),
    // HU-W01: ningún permiso viene preseleccionado.
    permisos: this.fb.group(Object.fromEntries(PERMISOS.map((p) => [p, false])) as Record<Permiso, boolean>),
  });

  readonly paso = signal<Paso>(1);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly intentoPermisos = signal(false);
  /** Respuesta del alta con secreto: vive solo en memoria hasta cerrar el diálogo. */
  readonly credenciales = signal<SocioCreado | null>(null);
  readonly activado = signal<Socio | null>(null);

  private readonly titulo = viewChild<ElementRef<HTMLElement>>('tituloPaso');

  seleccionados(): Permiso[] {
    const valores = this.formulario.controls.permisos.getRawValue();
    return PERMISOS.filter((p) => valores[p]);
  }

  siguiente(): void {
    const paso = this.paso();
    const controles = paso === 1 ? [this.formulario.controls.nombre, this.formulario.controls.canal] : [this.formulario.controls.plan];
    controles.forEach((c) => c.markAsTouched());
    if (paso === 2) {
      this.intentoPermisos.set(true);
    }
    const nombre = this.formulario.controls.nombre;
    nombre.setValue(nombre.value.trim());
    if (controles.some((c) => c.invalid) || (paso === 2 && this.seleccionados().length === 0)) {
      return;
    }
    this.irA((paso + 1) as Paso);
  }

  irA(paso: Paso): void {
    this.paso.set(paso);
    this.error.set(null);
    // Mueve el foco al encabezado del paso para lectores de pantalla y teclado.
    setTimeout(() => this.titulo()?.nativeElement.focus());
  }

  activar(): void {
    const { nombre, canal, plan } = this.formulario.getRawValue();
    const permisos = this.seleccionados();
    if (!canal || !plan || permisos.length === 0 || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.servicio.crear({ nombre, canal, plan, permisos }).subscribe({
      next: (creado) => {
        this.enviando.set(false);
        this.credenciales.set(creado);
        this.activado.set({
          id: creado.id, nombre: creado.nombre, canal: creado.canal, plan: creado.plan, permisos: creado.permisos,
          estado: creado.estado, clientId: creado.clientId, creado: creado.creado, desactivado: creado.desactivado,
        });
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(mensajeError(this.textos.t(), e));
      },
    });
  }

  ocultarCredenciales(): void {
    // Se descarta el secreto: no queda en memoria, estado de navegación ni almacenamiento.
    this.credenciales.set(null);
    this.formulario.reset();
  }

  subtitulo(): string {
    const t = this.textos.t();
    return `${t.pasoDe(this.paso())} · ${[t.paso1Sub, t.paso2Sub, t.paso3Sub][this.paso() - 1]}`;
  }
}
