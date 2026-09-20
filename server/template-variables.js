const fields = new Set(['name', 'code', 'data', 'id', 'revision', 'dirty', 'dataText', 'variablesText']);
const reserved = new Set(('numero fecha dd arguments eval undefined NaN Infinity window document globalThis Function fetch XMLHttpRequest WebSocket localStorage sessionStorage indexedDB navigator location __proto__ constructor prototype await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield').split(' '));

export function validateVariables(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Variables debe ser un objeto JSON.');
  for (const key of Object.keys(value)) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) || fields.has(key) || reserved.has(key)) {
      throw new Error(`Nombre de variable no permitido: ${key}`);
    }
  }
  return value;
}

export function extractVariables(record) {
  return validateVariables(Object.fromEntries(Object.entries(record).filter(([key]) => !fields.has(key))));
}
