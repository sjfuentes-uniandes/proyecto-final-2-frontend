import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { mensajeError } from '../socios.errores';
import { TextosSociosService } from '../socios.i18n';
import { CANALES, CanalVenta, LimitesPlan, PERMISOS, Permiso, Plan, Socio, SocioCreado, SociosService } from '../socios.service';
import { CredencialesDialogoComponent } from './credenciales-dialogo.component';

type Paso = 1 | 2 | 3;

@Component({
  selector: 'app-socio-alta',
  imports: [ReactiveFormsModule, RouterLink, CredencialesDialogoComponent],
  templateUrl: './socio-alta.component.html',
  styleUrls: ['../socios.scss', './socio-alta.component.scss'],
})
export class SocioAltaComponent implements OnInit {
  private readonly servicio = inject(SociosService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly textos = inject(TextosSociosService);

  readonly canales = CANALES;
  readonly planes = signal<LimitesPlan[]>([]);
  readonly errorPlanes = signal<string | null>(null);
  readonly permisos = PERMISOS;

  readonly formulario = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    canal: this.fb.control<CanalVenta | ''>('', Validators.required),
    plan: this.fb.control<Plan | ''>('', Validators.required),
    permisos: this.fb.group(Object.fromEntries(PERMISOS.map((p) => [p, false])) as Record<Permiso, boolean>),
  });

  readonly paso = signal<Paso>(1);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly intentoPermisos = signal(false);
  readonly credenciales = signal<SocioCreado | null>(null);
  readonly activado = signal<Socio | null>(null);
  private readonly planSeleccionado = signal<Plan | ''>('');
  readonly limitesElegidos = computed(() => this.planes().find((p) => p.plan === this.planSeleccionado()) ?? null);

  private readonly titulo = viewChild<ElementRef<HTMLElement>>('tituloPaso');

  ngOnInit(): void {
    this.formulario.controls.plan.valueChanges.subscribe((plan) => this.planSeleccionado.set(plan));
    this.servicio.planes().subscribe({
      next: (planes) => this.planes.set(planes),
      error: () => this.errorPlanes.set(this.textos.t().planesNoDisponibles),
    });
  }

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
    // Descarta el secreto.
    this.credenciales.set(null);
    this.formulario.reset();
  }

  subtitulo(): string {
    const t = this.textos.t();
    return `${t.pasoDe(this.paso())} · ${[t.paso1Sub, t.paso2Sub, t.paso3Sub][this.paso() - 1]}`;
  }
}
