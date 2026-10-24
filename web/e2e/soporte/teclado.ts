import { Page } from '@playwright/test';

/** Ayudantes de teclado de las E2E (HU-W14, reutilizados por HU-W15). */

/**
 * Tab (o Shift+Tab) hasta que el foco esté en el elemento; falla si no llega en `maximo` pasos. En
 * WebKit para macOS, como en Safari, Tab no recorre botones ni enlaces por omisión: se usa Opción+Tab.
 */
export async function tabularHasta(page: Page, selector: string, atras = false, maximo = 20): Promise<void> {
  const webkit = page.context().browser()?.browserType().name() === 'webkit';
  const tecla = `${webkit ? 'Alt+' : ''}${atras ? 'Shift+' : ''}Tab`;
  for (let i = 0; i < maximo; i++) {
    if (await page.locator(selector).evaluate((e) => e === document.activeElement)) {
      return;
    }
    await page.keyboard.press(tecla);
  }
  throw new Error(`El foco no llegó a ${selector} con ${tecla}`);
}

export async function focoVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const activo = document.activeElement as HTMLElement | null;
    if (!activo) {
      return false;
    }
    const estilo = getComputedStyle(activo);
    return estilo.outlineStyle !== 'none' || estilo.boxShadow !== 'none';
  });
}
