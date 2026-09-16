// Compile first, then execute once: runtime errors must not trigger a retry.
export function evaluateTemplate(code, data, numero, fecha) {
  const expression = code.trim().replace(/;+\s*$/, '');
  let evaluate;
  try {
    evaluate = new Function('data', 'numero', 'fecha', `return (\n${expression}\n);`);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    // Older templates contain statements followed by a declaration/assignment to dd.
    evaluate = new Function('data', 'numero', 'fecha', `
      let dd;
      return (function () {
        ${code}
        ;return typeof dd === 'undefined' ? undefined : dd;
      })();
    `);
  }
  const definition = evaluate(data, numero, fecha);
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new Error('La plantilla debe devolver un objeto PDFMake. Usa { content: [...] } o, en el formato anterior, asigna el documento a dd.');
  }
  return definition;
}
