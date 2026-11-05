import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { InsigniaEstadoComponent } from '../../../componentes/insignia-estado/insignia-estado.component';
import { VisorEvidenciaComponent } from '../../../componentes/visor-evidencia/visor-evidencia.component';
import {
  Insignia,
  fechaCorta,
  formatearDuracion,
  insigniaCoherencia,
  insigniaIntegridad,
  textoCargadoDesde,
  textoSoporte,
  textoTipoEvidencia,
  textoUbicacion,
} from '../../../presentacion';
import { TextosSiniestrosService } from '../../../siniestros.i18n';
import { EvidenciaVista } from '../../../siniestros.modelo';
import { DetalleSiniestroEstado } from '../detalle-siniestro.estado';

interface Fila {
  evidencia: EvidenciaVista;
  tipo: string;
  capturado: string;
  ubicacion: string;
  integridad: Insignia;
}

interface Dato {
  etiqueta: string;
  valor: string;
  /** Clase del valor (`exito`, `peligro`) o vacía. */
  tono: string;
}

/**
 * Pestaña «Evidencias» (H04): los archivos con su integridad, la coherencia con lo declarado, los
 * soportes pendientes y una vista previa. **El enlace de cada archivo se pide solo al pulsar «Ver»**
 * (o su vista previa): el detalle nunca trae una URL. Un objeto ausente no bloquea nada: sale
 * «No disponible» y el visor lo confirma.
 */
@Component({
  selector: 'app-pestana-evidencias',
  imports: [RouterLink, InsigniaEstadoComponent, VisorEvidenciaComponent],
  templateUrl: './evidencias.component.html',
  styleUrls: ['../../../siniestros.scss', './evidencias.component.scss'],
})
export class EvidenciasComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);

  /** La evidencia abierta en el visor y el botón que la abrió (para devolverle el foco). */
  readonly abierta = signal<EvidenciaVista | null>(null);
  private abridor: HTMLElement | null = null;

  readonly resumen = computed(() => {
    const d = this.estado.detalle();
    const t = this.textos.t();
    return d ? `${t.archivosCargados(d.evidencias.length)} · ${t.cargadosDesde(textoCargadoDesde(t, d.origen))}` : '';
  });

  readonly filas = computed<Fila[]>(() => {
    const t = this.textos.t();
    const locale = this.textos.locale();
    return (this.estado.detalle()?.evidencias ?? []).map((e) => ({
      evidencia: e,
      tipo: textoTipoEvidencia(t, e.tipo),
      capturado: e.capturadaEn ? fechaCorta(locale, e.capturadaEn) : '—',
      ubicacion: textoUbicacion(t, locale, e.ubicacion),
      integridad: insigniaIntegridad(t, e.integridad),
    }));
  });

  readonly coherencia = computed(() => {
    const d = this.estado.detalle();
    if (!d) {
      return null;
    }
    const t = this.textos.t();
    const locale = this.textos.locale();
    const c = d.coherencia;
    const diferencia: Dato = {
      etiqueta: t.cohDiferencia,
      valor: c.diferenciaMin === null ? t.cohSinDato : formatearDuracion(t, c.diferenciaMin),
      tono: c.diferenciaMin === null ? '' : c.diferenciaMin < 0 ? 'peligro' : 'exito',
    };
    const captura: Dato = {
      etiqueta: t.cohUbicacionCaptura,
      valor: c.ubicacionCoincide === null ? t.cohSinDato : c.ubicacionCoincide ? t.cohCoincide : t.cohNoCoincide,
      tono: c.ubicacionCoincide === null ? '' : c.ubicacionCoincide ? 'exito' : 'peligro',
    };
    const datos: Dato[] = [
      { etiqueta: t.cohFechaDeclarada, valor: fechaCorta(locale, c.fechaDeclarada), tono: '' },
      { etiqueta: t.cohPrimeraCaptura, valor: c.primeraCaptura ? fechaCorta(locale, c.primeraCaptura) : t.cohSinDato, tono: '' },
      diferencia,
      { etiqueta: t.cohUbicacionDeclarada, valor: textoUbicacion(t, locale, d.ubicacionDeclarada), tono: '' },
      captura,
      { etiqueta: t.cohArchivosAlterados, valor: c.archivosAlterados === 0 ? t.cohNinguno : String(c.archivosAlterados), tono: c.archivosAlterados === 0 ? 'exito' : 'peligro' },
    ];
    return { insignia: insigniaCoherencia(t, c.resultado), datos };
  });

  readonly pendientes = computed(() => {
    const t = this.textos.t();
    return (this.estado.detalle()?.soportesPendientes ?? []).map((s) => ({
      tipo: s.tipo,
      nombre: textoSoporte(t, s.tipo).replace(/^./, (c) => c.toUpperCase()),
      estado: s.estado === 'FALTA' ? t.soporteFalta : t.soporteSolicitado,
    }));
  });

  ver(evidencia: EvidenciaVista, evento: Event): void {
    this.abridor = evento.currentTarget as HTMLElement;
    this.abierta.set(evidencia);
  }

  /** Cierra el visor (la URL se borra allí) y devuelve el foco al botón que lo abrió. */
  cerrarVisor(): void {
    this.abierta.set(null);
    const abridor = this.abridor;
    this.abridor = null;
    queueMicrotask(() => abridor?.focus());
  }
}
