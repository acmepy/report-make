import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureGlobalErrors } from '../src/global-errors.js';

test('muestra errores asíncronos y rechazos sin suprimir la consola del navegador', () => {
  const target = new EventTarget();
  const messages = [];
  const stop = captureGlobalErrors(target, error => messages.push(error));
  const error = new Error('incorrect data check');
  function emit(type, properties) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, properties);
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  }
  emit('error', { error });
  assert.equal(messages[0], error);
  assert.match(messages[0].stack, /incorrect data check/);
  emit('error', { message: 'Error externo', filename: 'pdfmake.js', lineno: 20, colno: 3 });
  assert.equal(messages[1], 'Error externo\n    at pdfmake.js:20:3');
  emit('unhandledrejection', { reason: error });
  emit('unhandledrejection', { reason: 'Imagen inválida' });
  emit('unhandledrejection', { reason: undefined });
  assert.equal(messages[2], error);
  assert.equal(messages[3], 'Imagen inválida');
  assert.match(messages[4], /sin motivo/);
  emit('error', {});
  assert.equal(messages.length, 5);
  stop();
  emit('error', { error });
  assert.equal(messages.length, 5);
});
