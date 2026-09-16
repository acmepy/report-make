import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTemplate } from '../src/evaluate-template.js';

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
