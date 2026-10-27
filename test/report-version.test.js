import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import express from 'express';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { reportMake } from '../server/index.js';
import { extractVariables, validateVariables } from '../server/template-variables.js';

test('versiones automáticas basadas exclusivamente en code', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'report-version-'));
  const server = express().use('/report', reportMake({ templatesDir: directory })).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}/report/api/templates`;
  async function save(id, body, expected = 200) {
    const response = await fetch(`${base}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, expected);
    return response.json();
  }
  const code = '{ content: [data.saludo] };';
  const originalHash = createHash('sha256').update(code).digest('hex');
  let record = await save('factura', { name: 'Factura', code, data: {}, logo: 'imagen', reportVersion: 999, templateHash: 'falso' }, 201);
  assert.equal(record.reportVersion, 1);
  assert.equal(record.templateHash, originalHash);
  const firstRevision = record.revision;
  record = await save(record.id, { ...record, data: { saludo: 'Hola' }, logo: 'otra imagen', reportVersion: 800, templateHash: 'inventado' });
  assert.equal(record.reportVersion, 1);
  assert.equal(record.templateHash, originalHash);
  assert.notEqual(record.revision, firstRevision);
  record = await save(record.id, { ...record, name: 'Factura nueva' });
  assert.equal(record.id, 'factura-nueva');
  assert.equal(record.reportVersion, 1);
  const beforeChange = record;
  record = await save(record.id, { ...record, code: code + '\n ' });
  assert.equal(record.reportVersion, 2);
  assert.notEqual(record.templateHash, originalHash);
  await save(record.id, { ...beforeChange, code: 'otro' }, 409);
  assert.equal((await (await fetch(`${base}/${record.id}`)).json()).reportVersion, 2);
  record = await save(record.id, { ...record, code });
  assert.equal(record.reportVersion, 3);
  assert.equal(record.templateHash, originalHash);
  record = await save(record.id, record);
  assert.equal(record.reportVersion, 3);
  const copied = await save('copia', { ...record, name: 'Copia', revision: null }, 201);
  assert.equal(copied.reportVersion, 1);
  assert.equal(copied.templateHash, originalHash);
  const disk = JSON.parse(await readFile(path.join(directory, `${record.id}.json`), 'utf8'));
  assert.equal(disk.reportVersion, 3);
  assert.equal(disk.templateHash, originalHash);
  assert.deepEqual(extractVariables(record), { logo: 'otra imagen' });
  assert.throws(() => validateVariables({ reportVersion: 1 }));
  assert.throws(() => validateVariables({ templateHash: 'x' }));

  // Reading old files adds metadata to the response without rewriting the file.
  const old = JSON.stringify({ name: 'Anterior', code, data: {} });
  await writeFile(path.join(directory, 'anterior.json'), old);
  let legacy = await (await fetch(`${base}/anterior`)).json();
  assert.equal(legacy.reportVersion, 1);
  assert.equal(legacy.templateHash, originalHash);
  assert.equal(await readFile(path.join(directory, 'anterior.json'), 'utf8'), old);
  legacy = await save('anterior', legacy);
  assert.equal(legacy.reportVersion, 1);
  const list = await (await fetch(base)).json();
  assert.equal(list.find(r => r.id === record.id).reportVersion, 3);
});
