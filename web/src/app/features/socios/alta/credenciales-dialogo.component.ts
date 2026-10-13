import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';

import { TextosSociosService } from '../socios.i18n';
import { SocioCreado } from '../socios.service';

type Campo = 'clientId' | 'clientSecret' | 'apiKey';

@Component({
  selector: 'app-credenciales-dialogo',
  template: `
    @let t = textos.t();
    <dialog #dialogo aria-labelledby="credenciales-titulo" aria-describedby="credenciales-aviso"
            (cancel)="cancelar($event)" data-testid="credenciales">
      <h3 id="credenciales-titulo">{{ t.credencialesTitulo }}</h3>
      <p id="credenciales-aviso" class="nota nota--alerta">{{ t.credencialesAviso }}</p>
      @for (campo of campos; track campo) {
        <div class="credencial">
          <label [for]="'cred-' + campo">{{ etiqueta(campo) }}</label>
          <input class="inp" [id]="'cred-' + campo" [value]="credenciales()[campo]" readonly
                 autocomplete="off" spellcheck="false" (focus)="seleccionar($event)" />
          <button class="btn btn--secundario" type="button" (click)="copiar(campo)"
                  [attr.aria-label]="t.copiarValor(etiqueta(campo))">{{ t.copiar }}</button>
        </div>
      }
      <p class="sr-only" role="status" aria-live="polite">{{ aviso() }}</p>
      <label class="confirmar">
        <input type="checkbox" [checked]="guardadas()" (change)="guardadas.set(!guardadas())" />
        {{ t.confirmoGuardado }}
      </label>
      <button class="btn btn--primario" type="button" [disabled]="!guardadas()" (click)="cerrar()">
        {{ t.cerrarCredenciales }}</button>
    </dialog>
  `,
  styleUrl: '../socios.scss',
})
export class CredencialesDialogoComponent {
  readonly textos = inject(TextosSociosService);
  readonly credenciales = input.required<SocioCreado>();
  readonly cerrado = output<void>();

  readonly campos: Campo[] = ['clientId', 'clientSecret', 'apiKey'];
  readonly guardadas = signal(false);
  readonly aviso = signal('');
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const dialogo = this.dialogo().nativeElement;
      if (!dialogo.open) {
        dialogo.showModal();
      }
    });
  }

  etiqueta(campo: Campo): string {
    const t = this.textos.t();
    return { clientId: t.clientId, clientSecret: t.clientSecret, apiKey: t.apiKey }[campo];
  }

  seleccionar(evento: FocusEvent): void {
    (evento.target as HTMLInputElement).select();
  }

  async copiar(campo: Campo): Promise<void> {
    const t = this.textos.t();
    try {
      await navigator.clipboard.writeText(this.credenciales()[campo]);
      this.aviso.set(t.copiado(this.etiqueta(campo)));
    } catch {
      this.aviso.set(t.noCopiado);
    }
  }

  cancelar(evento: Event): void {
    // Escape no cierra hasta confirmar que se guardaron.
    if (!this.guardadas()) {
      evento.preventDefault();
    }
  }

  cerrar(): void {
    if (!this.guardadas()) {
      return;
    }
    this.dialogo().nativeElement.close();
    this.cerrado.emit();
  }
}
