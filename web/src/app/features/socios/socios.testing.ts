import axe from 'axe-core';

import { Socio, SocioCreado } from './socios.service';

export const BASE = 'https://api/v1/web/socios';

export const SOCIO: Socio = {
  id: 'SOC-000161', nombre: 'Fintech Caribe S.A.S.', canal: 'plataforma_digital', plan: 'basico',
  permisos: ['consultar', 'cotizar'], estado: 'activo', clientId: '3n2kq4v0cliente', creado: '2026-10-12T10:00:00Z', desactivado: null,
};

export const SUSPENDIDO: Socio = {
  ...SOCIO, id: 'SOC-000109', nombre: 'Comercio Pacífico', estado: 'desactivado', clientId: 'cliente-109',
  desactivado: '2026-10-11T09:00:00Z',
};

export const CREADO: SocioCreado = { ...SOCIO, clientSecret: 'secreto-mostrado-una-vez', apiKey: 'api-key-mostrada-una-vez' };

/** axe-core sobre el componente (WCAG 2.1 A/AA); devuelve las reglas incumplidas con sus nodos. */
export async function violacionesA11y(elemento: Element): Promise<string[]> {
  const resultado = await axe.run(elemento, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    // La página completa (landmarks, h1) la arma el shell; aquí se revisa el componente.
    rules: { region: { enabled: false }, 'page-has-heading-one': { enabled: false }, 'landmark-one-main': { enabled: false } },
  });
  return resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}
