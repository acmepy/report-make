export function templateId(name) {
  const id = String(name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!id || id.length > 128 || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(id)) {
    throw new Error('El nombre debe generar un archivo válido de hasta 128 caracteres.');
  }
  return id;
}

export function nameTaken(name, records, excludeId) {
  const id = templateId(name);
  return records.some(record => {
    if (record.id === excludeId) return false;
    if (record.id.toLowerCase() === id) return true;
    try { return templateId(record.name) === id; } catch { return false; }
  });
}

export function copyName(name, records) {
  let candidate = `${name} (copia)`;
  let number = 2;
  while (nameTaken(candidate, records)) candidate = `${name} (copia ${number++})`;
  return candidate;
}
