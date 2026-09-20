import express from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { templateId, nameTaken } from './template-name.js';
import { extractVariables } from './template-variables.js';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const queues = new Map();
const fail = (status, message) => Object.assign(new Error(message), { status });

export function reportMake({ templatesDir } = {}) {
  if (!templatesDir) throw new TypeError('templatesDir es obligatorio');
  const directory = path.resolve(templatesDir);
  const ready = fs.mkdir(directory, { recursive: true }).then(() => fs.realpath(directory));
  const router = express.Router();
  router.use(express.json({ limit: '2mb' }));

  function validate(value) {
    if (!value || typeof value.name !== 'string' || !value.name.trim() ||
        typeof value.code !== 'string' || !Object.hasOwn(value, 'data')) {
      throw fail(400, 'Se requieren name, code y data');
    }
    let variables;
    try { variables = extractVariables(value); } catch (error) { throw fail(400, error.message); }
    return { ...variables, name: value.name.trim(), code: value.code, data: value.data };
  }
  async function location(id) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id)) throw fail(400, 'Identificador inválido');
    const filename = path.join(await ready, `${id}.json`);
    try {
      const stat = await fs.lstat(filename);
      if (!stat.isFile() || stat.isSymbolicLink()) throw fail(400, 'Archivo no permitido');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return filename;
  }
  async function read(id) {
    try {
      const raw = await fs.readFile(await location(id), 'utf8');
      return { id, ...validate(JSON.parse(raw)), revision: createHash('sha256').update(raw).digest('hex') };
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async function locked(id, work) {
    const key = await ready;
    const previous = queues.get(key) || Promise.resolve();
    const next = previous.catch(() => {}).then(work);
    queues.set(key, next);
    try { return await next; } finally { if (queues.get(key) === next) queues.delete(key); }
  }
  router.get('/api/templates', async (req, res, next) => {
    try {
      const entries = await fs.readdir(await ready, { withFileTypes: true });
      const records = await Promise.all(entries.filter(e => e.isFile() && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}\.json$/.test(e.name)).map(e => read(e.name.slice(0, -5))));
      res.set('Cache-Control', 'no-store').json(records.filter(Boolean));
    } catch (error) { next(error); }
  });
  router.get('/api/templates/:id', async (req, res, next) => {
    try {
      const record = await read(req.params.id);
      if (!record) throw fail(404, 'Plantilla no encontrada');
      res.set('Cache-Control', 'no-store').json(record);
    } catch (error) { next(error); }
  });
  for (const method of ['put', 'delete']) router[method]('/api/templates/:id', async (req, res, next) => {
    try {
      await locked(req.params.id, async () => {
        const filename = await location(req.params.id);
        const current = await read(req.params.id);
        if ((current?.revision ?? null) !== (req.body?.revision ?? null)) throw fail(409, 'La plantilla cambió o fue eliminada. Descarga para resolver el conflicto.');
        if (method === 'delete') {
          if (!current) throw fail(404, 'Plantilla no encontrada');
          await fs.unlink(filename);
          res.status(204).end();
        } else {
          const value = validate(req.body);
          // Existing IDs stay stable. New files must use the normalized name.
          let normalized;
          try { normalized = templateId(value.name); } catch (error) { throw fail(400, error.message); }
          if (!current && normalized !== req.params.id) throw fail(400, `El identificador debe ser ${normalized}`);
          const entries = await fs.readdir(await ready, { withFileTypes: true });
          const others = await Promise.all(entries.filter(e => e.isFile() && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}\.json$/.test(e.name)).map(e => read(e.name.slice(0, -5))));
          if (nameTaken(value.name, others.filter(Boolean), current?.id)) throw fail(409, 'Ya existe una plantilla con ese nombre o nombre de archivo. Elige otro nombre.');
          const raw = JSON.stringify(value, null, 2) + '\n';
          const targetId = current && value.name !== current.name ? normalized : req.params.id;
          if (current && targetId !== req.params.id) {
            const target = await location(targetId);
            try { await fs.writeFile(target, raw, { flag: 'wx' }); }
            catch (error) { if (error.code === 'EEXIST') throw fail(409, 'El archivo de destino ya existe'); throw error; }
            try { await fs.unlink(filename); }
            catch (error) { await fs.unlink(target); throw error; }
          } else if (!current) {
            try { await fs.writeFile(filename, raw, { flag: 'wx' }); }
            catch (error) { if (error.code === 'EEXIST') throw fail(409, 'El identificador ya existe'); throw error; }
          } else {
            const temp = path.join(await ready, `.${randomUUID()}.tmp`);
            try {
              await fs.writeFile(temp, raw, { flag: 'wx' });
              await fs.rename(temp, filename);
            } finally { await fs.unlink(temp).catch(() => {}); }
          }
          res.status(current ? 200 : 201).json(await read(targetId));
        }
      });
    } catch (error) { next(error); }
  });
  router.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  router.get('/', (req, res, next) => {
    if (!req.originalUrl.split('?')[0].endsWith('/')) {
      const [pathname, query] = req.originalUrl.split('?');
      return res.redirect(308, `${pathname}/${query ? `?${query}` : ''}`);
    }
    next();
  });
  router.use(express.static(dist));
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo acceder a las plantillas del servidor' });
  });
  return router;
}
