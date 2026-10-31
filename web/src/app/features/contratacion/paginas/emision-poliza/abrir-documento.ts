import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';

/**
 * HU-W17: descarga el PDF en la misma pestaña, navegando a la URL prefirmada: la respuesta de S3 trae
 * `Content-Disposition: attachment`, así que el portal no se descarga ni se reemplaza. Es un token para
 * que las pruebas no naveguen; la página nunca guarda la URL, que vence en 300 s.
 */
export const ABRIR_DOCUMENTO = new InjectionToken<(url: string) => void>('ABRIR_DOCUMENTO', {
  providedIn: 'root',
  factory: () => {
    const ventana = inject(DOCUMENT).defaultView;
    return (url: string) => {
      ventana?.location.assign(url);
    };
  },
});
