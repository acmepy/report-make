import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templateId, nameTaken, copyName } from '../server/template-name.js';

test('nombres normalizados y sugerencias de copias', () => {
  assert.equal(templateId('  Fáctura   CONTADO  '), 'factura-contado');
  const records = [{ id: 'old-uuid', name: 'Factura' }, { id: 'factura-copia', name: 'Factura (copia)' }];
  assert.equal(nameTaken('FÁCTURA', records), true);
  assert.equal(nameTaken('factura', records, 'old-uuid'), false);
  assert.equal(copyName('Factura', records), 'Factura (copia 2)');
  for (const name of ['...', 'CON', 'a'.repeat(129)]) assert.throws(() => templateId(name));
});
