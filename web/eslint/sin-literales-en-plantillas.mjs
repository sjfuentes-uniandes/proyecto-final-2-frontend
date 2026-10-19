// Regla propia "cero cadenas literales" (04 §i18n): el texto visible de una plantilla sale de los *.i18n.ts.
// Señala, en plantillas externas o en línea:
//   - texto con letras entre etiquetas (<h1>Hola</h1>);
//   - atributos visibles o anunciados con letras (aria-label="Cerrar", title, placeholder, alt…);
//   - literales entre comillas con letras dentro de {{ }} o de un enlace a esos atributos ([attr.aria-label]="'Cerrar'").
// Es léxica: no ve texto armado en el TypeScript del componente ni separadores sin letras.

const LETRA = /\p{L}/u;
const LITERAL_CON_LETRAS = /(['"`])(?:(?!\1)[^\\]|\\.)*\p{L}(?:(?!\1)[^\\]|\\.)*\1/u;
const ATRIBUTOS_VISIBLES = new Set([
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'alt',
  'label',
  'placeholder',
  'title',
]);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Prohíbe textos literales visibles en las plantillas: van en el archivo *.i18n.ts de la feature.' },
    schema: [],
    messages: {
      texto: 'Texto literal en la plantilla: muévelo al archivo *.i18n.ts de la feature.',
      atributo: 'Texto literal en el atributo "{{nombre}}": muévelo al archivo *.i18n.ts de la feature.',
    },
  },
  create(context) {
    const servicios = context.sourceCode.parserServices;
    if (typeof servicios?.convertNodeSourceSpanToLoc !== 'function') return {};
    const ubicacion = (nodo) => servicios.convertNodeSourceSpanToLoc(nodo.sourceSpan);
    const fuente = (ast) => ast?.source ?? '';

    return {
      Text(nodo) {
        if (LETRA.test(nodo.value)) context.report({ loc: ubicacion(nodo), messageId: 'texto' });
      },
      BoundText(nodo) {
        if (LITERAL_CON_LETRAS.test(fuente(nodo.value))) context.report({ loc: ubicacion(nodo), messageId: 'texto' });
      },
      TextAttribute(nodo) {
        if (ATRIBUTOS_VISIBLES.has(nodo.name) && LETRA.test(nodo.value)) {
          context.report({ loc: ubicacion(nodo), messageId: 'atributo', data: { nombre: nodo.name } });
        }
      },
      BoundAttribute(nodo) {
        if (ATRIBUTOS_VISIBLES.has(nodo.name) && LITERAL_CON_LETRAS.test(fuente(nodo.value))) {
          context.report({ loc: ubicacion(nodo), messageId: 'atributo', data: { nombre: nodo.name } });
        }
      },
    };
  },
};
