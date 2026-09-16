import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTemplateStorage } from '../src/template-storage.js';

test('recupera borradores y separa las rutas de montaje', async () => {
  const storage = createTemplateStorage('/report/');
  const state = { selected: 'factura', records: [{ id: 'factura', name: 'Factura', code: '{ content: [] }', dataText: '{incompleto', dirty: true, revision: 'abc' }] };
  await storage.save(state);
  assert.deepEqual(await createTemplateStorage('/report').load(), state);
  assert.equal(await createTemplateStorage('/otro-report').load(), undefined);
});

test('las escrituras conservan su orden y una copia del estado recibido', async () => {
  const storage = createTemplateStorage('/ordered');
  const state = { records: [], selected: 'primero' };
  const first = storage.save(state);
  state.selected = 'segundo';
  const second = storage.save(state);
  state.selected = 'sin guardar';
  await Promise.all([first, second]);
  assert.equal((await storage.load()).selected, 'segundo');
});

test('guarda datos grandes y permite reintentar tras un fallo de serialización', async () => {
  const storage = createTemplateStorage('/large');
  assert.throws(() => storage.save({ invalid: () => {} }));
  const state = { records: [{ dataText: 'a'.repeat(6 * 1024 * 1024) }] };
  await storage.save(state);
  assert.equal((await storage.load()).records[0].dataText.length, 6 * 1024 * 1024);
});
