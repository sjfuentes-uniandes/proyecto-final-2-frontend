import { Component, computed, inject } from '@angular/core';

import { TablaVerificacionesComponent } from '../../../componentes/tabla-verificaciones/tabla-verificaciones.component';
import { fechaDia, formatearMonto } from '../../../presentacion';
import { TextosSiniestrosService } from '../../../siniestros.i18n';
import { DetalleSiniestroEstado } from '../detalle-siniestro.estado';

interface Dato {
  etiqueta: string;
  valor: string;
}

/**
 * Pestaña «Cobertura»: las verificaciones en detalle y los datos de la copia de la póliza que se
 * guardó al reportar (no la póliza de hoy). La cuenta del beneficiario llega enmascarada.
 */
@Component({
  selector: 'app-pestana-cobertura',
  imports: [TablaVerificacionesComponent],
  templateUrl: './cobertura.component.html',
  styleUrls: ['../../../siniestros.scss', './cobertura.component.scss'],
})
export class CoberturaComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);

  readonly datos = computed<Dato[]>(() => {
    const p = this.estado.detalle()?.poliza;
    if (!p) {
      return [];
    }
    const t = this.textos.t();
    const locale = this.textos.locale();
    return [
      { etiqueta: t.polNumero, valor: p.numero },
      { etiqueta: t.polRamo, valor: p.ramo },
      { etiqueta: t.polVigencia, valor: t.polVigenciaRango(fechaDia(locale, p.vigencia.desde), fechaDia(locale, p.vigencia.hasta)) },
      { etiqueta: t.polCarencia, valor: t.dias(p.carenciaDias) },
      { etiqueta: t.polPlazoAviso, valor: t.dias(p.plazoAvisoDias) },
      { etiqueta: t.polPrimas, valor: p.primasAlDia ? t.primasAlDia : t.primasEnMora },
      { etiqueta: t.polBeneficiario, valor: p.beneficiario.cuentaMascarada },
    ];
  });

  readonly amparos = computed(() => {
    const p = this.estado.detalle()?.poliza;
    const locale = this.textos.locale();
    return (p?.amparos ?? []).map((a) => ({ codigo: a.codigo, nombre: a.nombre, suma: formatearMonto(locale, a.sumaAsegurada, p?.moneda ?? 'COP') }));
  });
}
