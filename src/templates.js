import { templateId, nameTaken, copyName } from '../server/template-name.js';
import { createTemplateStorage } from './template-storage.js';
import { extractVariables, validateVariables } from '../server/template-variables.js';

export function setupTemplates({ getCode, getData, getVariables, setDocuments, generate }) {
  const storage = createTemplateStorage(location.pathname);
  const select = document.querySelector('#templates');
  const actions = document.querySelector('#actions');
  const save = document.querySelector('#save');
  const download = document.querySelector('#download');
  const status = document.querySelector('#sync-status');
  let records = [], selected = null, busy = false, message = '', storageError = false;
  let pendingWrites = 0;
  const current = () => records.find(r => r.id === selected);
  async function persist() {
    pendingWrites++;
    render();
    try { await storage.save({ records, selected }); storageError = false; }
    catch (error) { storageError = true; console.error(error); }
    finally { pendingWrites--; render(); }
  }
  function render() {
    select.replaceChildren(...records.map(r => new Option(`${r.dirty ? '● ' : ''}${r.name}`, r.id, false, r.id === selected)));
    if (!records.length) select.add(new Option('Sin plantillas', ''));
    const record = current();
    select.disabled = busy || !records.length;
    actions.disabled = busy || !record;
    save.disabled = busy || !record?.dirty;
    download.disabled = busy;
    document.querySelector('#btnGenerar').disabled = !record;
    document.querySelector('#editing').inert = !record || busy;
    status.textContent = storageError ? 'Error: cambios sin guardar localmente' : pendingWrites ? 'Guardando localmente…' : message || (record?.dirty ? 'Guardado local · pendiente de envío' : record ? 'Sincronizado' : 'Sin plantillas');
  }
  function open(id) {
    selected = id;
    const record = current();
    setDocuments(record?.code || '', record?.dataText || '{}', record?.variablesText ?? JSON.stringify(record ? extractVariables(record) : {}, null, 2));
    persist(); render(); generate();
  }
  async function request(suffix = '', options = {}) {
    const response = await fetch(new URL(`api/templates${suffix}`, location.href), {
      ...options, headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Error del servidor (${response.status})`);
    }
    return response.status === 204 ? null : response.json();
  }
  async function run(work) {
    if (busy) return;
    busy = true; message = 'Procesando…'; render();
    try { await work(); message = ''; }
    catch (error) { message = error.message || 'Sin conexión'; console.error(error); }
    finally { busy = false; persist(); render(); }
  }
  async function refresh(manual = false) {
    await run(async () => {
      const remote = await request();
      if (!Array.isArray(remote)) throw new Error('Respuesta de plantillas inválida');
      const merged = remote.map(r => {
        const local = records.find(l => l.id === r.id);
        if (local?.dirty) {
          if (!manual || !confirm(`«${local.name}» tiene cambios locales. ¿Reemplazarlos por la versión del servidor? Cancelar conserva el borrador.`)) return local;
        }
        return { ...r, dataText: JSON.stringify(r.data, null, 2), variablesText: JSON.stringify(extractVariables(r), null, 2), dirty: false };
      });
      for (const local of records) if (!remote.some(r => r.id === local.id) && local.dirty) {
        if (local.revision && manual && confirm(`«${local.name}» fue eliminada del servidor. ¿Descartar el borrador? Cancelar lo conserva para copiarlo.`)) continue;
        merged.push(local);
      }
      records = merged;
      open(records.some(r => r.id === selected) ? selected : records[0]?.id);
    });
  }
  select.addEventListener('change', () => { message = ''; open(select.value); });
  save.addEventListener('click', () => run(async () => {
    const record = current();
    const data = JSON.parse(record.dataText);
    const variables = validateVariables(JSON.parse(record.variablesText || '{}'));
    const id = record.revision ? record.id : templateId(record.name);
    if (nameTaken(record.name, records, record.id)) throw new Error('Ya existe una plantilla con ese nombre. Copia el borrador con otro nombre.');
    const saved = await request(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ ...variables, name: record.name, code: record.code, data, revision: record.revision }) });
    selected = saved.id;
    Object.assign(record, { id: saved.id, revision: saved.revision, dirty: false });
  }));
  download.addEventListener('click', () => refresh(true));
  actions.addEventListener('change', () => {
    const action = actions.value; actions.value = '';
    const record = current();
    if (!record) return;
    if (action === 'rename') {
      const name = prompt('Nuevo nombre de la plantilla', record.name);
      if (!name?.trim() || name.trim() === record.name) return;
      try {
        templateId(name);
        if (nameTaken(name, records, record.id)) throw new Error('Ya existe una plantilla con ese nombre o archivo.');
      } catch (error) { alert(error.message); return; }
      record.name = name.trim();
      record.dirty = true;
      message = '';
      persist(); render();
      return;
    }
    if (action === 'copy') {
      let suggestion;
      try { suggestion = copyName(record.name, records); } catch (error) { suggestion = 'Plantilla (copia)'; }
      const name = prompt('Nombre de la copia', suggestion);
      if (!name?.trim()) return;
      let id;
      try {
        id = templateId(name);
        if (nameTaken(name, records)) throw new Error('Ya existe una plantilla con ese nombre o nombre de archivo. Elige otro nombre.');
      } catch (error) { alert(error.message); return; }
      const copy = { ...record, id, name: name.trim(), revision: null, dirty: true };
      records.push(copy); message = ''; open(copy.id);
    } else if (action === 'delete' && confirm(`¿Eliminar «${record.name}»${record.revision ? ' del servidor y de este navegador' : ' de este navegador'}? Se perderán sus cambios pendientes.`)) {
      run(async () => {
        if (record.revision) await request(`/${encodeURIComponent(record.id)}`, { method: 'DELETE', body: JSON.stringify({ revision: record.revision }) });
        records = records.filter(r => r.id !== record.id);
        open(records[0]?.id);
      });
    }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (!save.disabled) save.click(); }
  });
  async function initialize() {
    busy = true; message = 'Cargando plantillas locales…'; render();
    try {
      const stored = await storage.load();
      if (stored !== undefined && (!stored || !Array.isArray(stored.records))) throw new Error('Almacenamiento de plantillas inválido');
      records = stored?.records || [];
      selected = stored?.selected;
      open(records.some(r => r.id === selected) ? selected : records[0]?.id);
    } catch (error) {
      message = 'No se pudo abrir IndexedDB. Recarga para reintentar.';
      console.error(error); render(); return;
    }
    busy = false; message = ''; render();
    await refresh();
  }
  initialize();
  window.addEventListener('beforeunload', event => {
    if (pendingWrites || storageError) { event.preventDefault(); event.returnValue = ''; }
  });
  return {
    hasSelection: () => Boolean(current()),
    changed() {
      const record = current();
      if (!record) return;
      record.code = getCode(); record.dataText = getData(); record.variablesText = getVariables(); record.dirty = true;
      message = ''; persist(); render();
    },
  };
}
