import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTemplate } from '../src/evaluate-template.js';
import { validateVariables, extractVariables } from '../server/template-variables.js';

test('inyecta variables adicionales en objetos y en plantillas anteriores', () => {
  const variables = { logo: 'data:image/png;base64,abc', header: { titulo: 'Factura' }, items: [1, 2] };
  for (const code of ['{ content: [header.titulo, { image: logo }], footer: () => items.length };', 'const dd = { content: [header.titulo, { image: logo }], footer: () => items.length };']) {
    const result = evaluateTemplate(code, {}, null, null, variables);
    assert.deepEqual(result.content, ['Factura', { image: variables.logo }]);
    assert.equal(result.footer(), 2);
  }
  assert.deepEqual(extractVariables({ ...variables, name: 'Factura', code: '{}', data: {}, revision: 'a', id: 'b', dirty: true, variablesText: '{}' }), variables);
});

test('rechaza variables inválidas y nombres reservados antes de ejecutar', () => {
  for (const value of [null, [], 'texto', { data: {} }, { numero: 1 }, { 'mi-logo': '' }, { const: 1 }, { 'x) {} //': 2 }, JSON.parse('{"__proto__": {}}')]) {
    assert.throws(() => validateVariables(value));
  }
});

test('objeto nuevo con datos, ayudantes y funciones', () => {
  const result = evaluateTemplate('{ content: [numero(data.total)], footer: () => fecha() };', { total: 7 }, n => String(n), () => 'Hoy');
  assert.deepEqual(result.content, ['7']);
  assert.equal(result.footer(), 'Hoy');
});

test('borradores anteriores con declaraciones y dd', () => {
  for (const declaration of ['', 'const ', 'let ', 'var ']) {
    const result = evaluateTemplate(`// Borrador\nconst titulo = data.titulo;\n${declaration}dd = { content: [titulo] };`, { titulo: 'Hola' });
    assert.deepEqual(result, { content: ['Hola'] });
  }
  assert.equal(Object.hasOwn(globalThis, 'dd'), false);
});

test('errores durante ejecución no vuelven a ejecutar la plantilla', () => {
  let calls = 0;
  assert.throws(() => evaluateTemplate('{ content: [numero()] }', {}, () => { calls++; throw new SyntaxError('runtime'); }), /runtime/);
  assert.equal(calls, 1);
  assert.throws(() => evaluateTemplate('const titulo = "sin documento";', {}), /objeto PDFMake/);
  assert.throws(() => evaluateTemplate('{ content: [ }', {}), SyntaxError);
});
