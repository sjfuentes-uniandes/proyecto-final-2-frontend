import { Component } from '@angular/core';

@Component({
  selector: 'app-sin-acceso',
  template: `
    <section class="card">
      <h2>Acceso restringido</h2>
      <p>Tu usuario no pertenece al grupo que usa esta sección. Solicita el acceso a un administrador del portal.</p>
    </section>
  `,
  styles: `:host { display: block; max-width: 640px; margin: 48px auto; padding: 0 16px; } h2 { color: var(--sv-azul-oscuro); }`,
})
export class SinAccesoComponent {}
