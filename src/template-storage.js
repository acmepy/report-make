import { createStore, get, set } from 'idb-keyval';

export function createTemplateStorage(mountPath) {
  const store = createStore('report-make', 'templates');
  const key = mountPath.replace(/\/$/, '') || '/';
  let pending = Promise.resolve();
  return {
    load: () => get(key, store),
    save(state) {
      const snapshot = structuredClone(state);
      const operation = pending.then(() => set(key, snapshot, store));
      pending = operation.catch(() => {});
      return operation;
    },
  };
}
