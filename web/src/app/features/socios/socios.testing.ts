import axe from 'axe-core';

import { Consumo, LimitesPlan, Socio, SocioCreado } from './socios.service';

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

export const PLANES: LimitesPlan[] = [
  { plan: 'basico', limitePorSegundo: 5, rafaga: 10, cuota: 1000, periodo: 'DAY' },
  { plan: 'estandar', limitePorSegundo: 50, rafaga: 100, cuota: 50000, periodo: 'DAY' },
  { plan: 'prueba', limitePorSegundo: 1, rafaga: 2, cuota: 5, periodo: 'DAY' },
];

export function consumo(usado: number, plan: LimitesPlan = PLANES[0], limitadas: number | null = 0): Consumo {
  const restante = Math.max(0, plan.cuota - usado);
  const porcentaje = Math.min(100, Math.floor((usado * 100) / plan.cuota));
  return {
    socioId: SOCIO.id, limites: plan, usado, restante, porcentaje, limitadas,
    estado: restante === 0 ? 'agotada' : porcentaje >= 80 ? 'cerca_del_limite' : 'normal',
    ventana: { inicio: '2026-10-13', fin: '2026-10-13', reinicio: '2026-10-14T00:00:00Z' },
  };
}

export async function violacionesA11y(elemento: Element): Promise<string[]> {
  const resultado = await axe.run(elemento, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    // La página completa la arma el shell.
    rules: { region: { enabled: false }, 'page-has-heading-one': { enabled: false }, 'landmark-one-main': { enabled: false } },
  });
  return resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}
