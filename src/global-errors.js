// Uncaught asynchronous errors do not necessarily call console.error.
export function captureGlobalErrors(target, report) {
  const onError = (event) => {
    if (!event.error && !event.message) return;
    const source = event.filename
      ? `\n    at ${event.filename}:${event.lineno || 0}:${event.colno || 0}`
      : '';
    report(event.error ?? `${event.message}${source}`);
  };
  const onRejection = (event) => {
    report(event.reason ?? 'Promesa rechazada sin motivo disponible');
  };
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
