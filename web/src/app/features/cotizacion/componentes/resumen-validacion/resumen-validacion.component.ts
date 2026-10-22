import { Component, computed, inject, input } from '@angular/core';

import { TextosCotizacionService } from '../../cotizacion.i18n';

/** Mockup "Revisa los datos antes de continuar": resumen de la validación contra las reglas vigentes. */
@Component({
  selector: 'app-resumen-validacion',
  template: `
    @let t = textos.t();
    <section class="card" aria-labelledby="titulo-validacion">
      <h3 id="titulo-validacion">{{ t.resumenValidacion }}</h3>
      <dl class="kv">
        <div><dt>{{ t.camposRevisados }}</dt><dd>{{ revisados() }}</dd></div>
        <div><dt>{{ t.correctos }}</dt><dd class="ok">{{ correctos() }}</dd></div>
        <div><dt>{{ t.conError }}</dt><dd [class.error]="conError() > 0">{{ conError() }}</dd></div>
        <div><dt>{{ t.reglasAplicadas }}</dt><dd>{{ versionReglas() ? t.catalogoVersion(versionReglas()!) : '—' }}</dd></div>
      </dl>
      @if (conError() === 0) {
        <p class="valido" role="status">{{ t.datosValidos }}</p>
      }
    </section>
  `,
  styles: `
    h3 { margin: 0 0 6px; font-size: 15px; color: var(--sv-azul-oscuro); }
    .kv .error { color: var(--sv-error); }
    .valido { margin: 8px 0 0; font-size: 13px; color: #00663f; font-weight: 600; }
  `,
})
export class ResumenValidacionComponent {
  readonly revisados = input.required<number>();
  readonly conError = input.required<number>();
  readonly versionReglas = input<string | null>(null);

  readonly textos = inject(TextosCotizacionService);
  readonly correctos = computed(() => this.revisados() - this.conError());
}
