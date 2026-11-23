import { Component, inject } from '@angular/core';

import { TextosPortalService } from '../../core/i18n/portal.i18n';

@Component({
  selector: 'app-sin-acceso',
  template: `
    <section class="card">
      <h2>{{ textos().sinAccesoTitulo }}</h2>
      <p>{{ textos().sinAccesoTexto }}</p>
    </section>
  `,
  styles: `:host { display: block; max-width: 640px; margin: 48px auto; padding: 0 16px; } h2 { color: var(--sv-azul-oscuro); }`,
})
export class SinAccesoComponent {
  readonly textos = inject(TextosPortalService).t;
}
