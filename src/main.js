import "./style.css";

const consoleOutput = document.querySelector("#console-output");
const clearConsoleButton = document.querySelector("#btnLimpiarConsola");

function formatConsoleValue(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack || value.message;
  try {
    const formatted = JSON.stringify(value, null, 2);
    return formatted === undefined ? String(value) : formatted;
  } catch {
    return String(value);
  }
}

function installConsolePanel() {
  for (const method of ["log", "info", "warn", "error", "debug"]) {
    const original = console[method].bind(console);
    console[method] = (...values) => {
      original(...values);
      const line = document.createElement("div");
      line.className = `console-${method}`;
      line.textContent = `[${method}] ${values.map(formatConsoleValue).join(" ")}`;
      consoleOutput.append(line);
      if (consoleOutput.childElementCount > 500) consoleOutput.firstElementChild.remove();
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };
  }
}

installConsolePanel();
clearConsoleButton.addEventListener("click", () => {
  consoleOutput.replaceChildren();
});

import { oneDark } from "@codemirror/theme-one-dark";
const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

import { version } from "./version.js";
console.log(`Report Make - version ${version}`);
document.getElementById("app-version").textContent = `v${version}`;

import pdfMake from "pdfmake/build/pdfmake.js";
import * as vfs from "pdfmake/build/vfs_fonts.js";
pdfMake.vfs = vfs.default;
pdfMake.addVirtualFileSystem(vfs.default);

import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";

import { fecha, numero } from "./formatters.js";
import { setupTemplates } from './templates.js';
import { evaluateTemplate } from './evaluate-template.js';
let templates;
let loadingDocuments = false;

const ejemplo = `dd = {
  content: [
    { text: 'Reporte de prueba', style: 'header' },
    'Este PDF fue generado offline con pdfmake y CodeMirror.'
  ],
  styles: {
    header: {
      fontSize: 18,
      bold: true,
      margin: [0, 0, 0, 10]
    }
  }
}`;

const generarPdfDebounced = debounce(generarPdf, 750);

const editor = new EditorView({
  doc: '',
  extensions: [
    basicSetup,
    javascript(),
    ...(isDark ? [oneDark] : []),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !loadingDocuments) {
        templates?.changed();
        generarPdfDebounced();
      }
    }),
  ],
  parent: document.querySelector("#editor"),
});

const dataEditor = new EditorView({
  doc: '{}',
  extensions: [basicSetup, javascript(), ...(isDark ? [oneDark] : []), EditorView.updateListener.of(update => {
    if (update.docChanged) updateJsonButton(update.state.doc.toString());
    if (update.docChanged && !loadingDocuments) { templates?.changed(); generarPdfDebounced(); }
  })],
  parent: document.querySelector('#data-editor'),
});
function updateJsonButton(code) {
  document.querySelector('#format-json').textContent = /[\r\n]/.test(code.trim())
    ? 'Comprimir JSON' : 'Formatear JSON';
}
updateJsonButton(dataEditor.state.doc.toString());
document.querySelector('#format-json').addEventListener('click', () => {
  try {
    const original = dataEditor.state.doc.toString();
    const compress = /[\r\n]/.test(original.trim());
    const formatted = JSON.stringify(JSON.parse(original), null, compress ? undefined : 2);
    if (formatted !== original) {
      dataEditor.dispatch({
        changes: { from: 0, to: dataEditor.state.doc.length, insert: formatted },
        userEvent: 'input.format',
      });
    }
    dataEditor.focus();
  } catch (error) {
    console.error(`No se pudo cambiar el formato del JSON: ${error.message}`);
    alert(`El JSON contiene un error. No se modificaron los datos.\n\n${error.message}`);
  }
});

for (const name of ['code', 'data']) document.querySelector(`#${name}-tab`).addEventListener('click', () => {
  document.querySelector('#editor').hidden = name !== 'code';
  document.querySelector('#data-editor').hidden = name !== 'data';
  document.querySelector('#format-json').hidden = name !== 'data';
  document.querySelector('#code-tab').setAttribute('aria-pressed', String(name === 'code'));
  document.querySelector('#data-tab').setAttribute('aria-pressed', String(name === 'data'));
  (name === 'code' ? editor : dataEditor).requestMeasure();
});

const viewer = document.querySelector("#viewer");
const btnGenerar = document.querySelector("#btnGenerar");
const workspace = document.querySelector("#workspace");
const workspaceDivider = document.querySelector("#workspace-divider");
const consoleDivider = document.querySelector("#console-divider");
const previewColumn = document.querySelector("#preview-column");

const layoutKey = `report-make:layout:v1:${location.pathname.replace(/\/$/, '')}`;
let layout = { editorWidth: 45, consoleHeight: 180 };
try {
  const saved = JSON.parse(localStorage.getItem(layoutKey) || 'null');
  if (Number.isFinite(saved?.editorWidth) && saved.editorWidth > 0 && saved.editorWidth < 100) layout.editorWidth = saved.editorWidth;
  if (Number.isFinite(saved?.consoleHeight) && saved.consoleHeight >= 96) layout.consoleHeight = saved.consoleHeight;
} catch (error) { console.warn('No se pudo recuperar el tamaño de los paneles:', error.message); }

function saveLayout() {
  try { localStorage.setItem(layoutKey, JSON.stringify(layout)); }
  catch (error) { console.warn('No se pudo guardar el tamaño de los paneles:', error.message); }
}

function setConsoleHeight(clientY, persist = true) {
  const bounds = previewColumn.getBoundingClientRect();
  const dividerHeight = consoleDivider.getBoundingClientRect().height;
  const minConsoleHeight = 96;
  const minViewerHeight = 120;
  const consoleHeight = Math.min(
    Math.max(bounds.bottom - clientY, minConsoleHeight),
    Math.max(minConsoleHeight, bounds.height - dividerHeight - minViewerHeight),
  );

  previewColumn.style.setProperty("--console-height", `${consoleHeight}px`);
  consoleDivider.setAttribute("aria-valuenow", consoleHeight.toFixed(0));
  consoleDivider.setAttribute('aria-valuemax', String(Math.max(minConsoleHeight, bounds.height - dividerHeight - minViewerHeight)));
  if (persist) { layout.consoleHeight = consoleHeight; saveLayout(); }
}

consoleDivider.addEventListener("pointerdown", (event) => {
  consoleDivider.setPointerCapture(event.pointerId);
  setConsoleHeight(event.clientY);
});

consoleDivider.addEventListener("pointermove", (event) => {
  if (consoleDivider.hasPointerCapture(event.pointerId)) {
    setConsoleHeight(event.clientY);
  }
});

consoleDivider.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

  event.preventDefault();
  const panelBounds = document.querySelector("#console-panel").getBoundingClientRect();
  const step = event.shiftKey ? 50 : 10;
  const direction = event.key === "ArrowUp" ? -1 : 1;
  setConsoleHeight(panelBounds.top + direction * step);
});

function setEditorWidth(clientX, persist = true) {
  const bounds = workspace.getBoundingClientRect();
  const dividerWidth = workspaceDivider.getBoundingClientRect().width;
  const minEditorWidth = 220;
  const minViewerWidth = 320;
  if (!bounds.width) return;
  const maxEditorWidth = Math.max(minEditorWidth, bounds.width - dividerWidth - minViewerWidth);
  const editorWidth = Math.min(
    Math.max(clientX - bounds.left, minEditorWidth),
    maxEditorWidth,
  );
  const editorPercentage = (editorWidth / bounds.width) * 100;

  workspace.style.setProperty("--editor-width", `${editorPercentage}%`);
  workspaceDivider.setAttribute("aria-valuenow", editorPercentage.toFixed(0));
  workspaceDivider.setAttribute('aria-valuemin', String(minEditorWidth / bounds.width * 100));
  workspaceDivider.setAttribute('aria-valuemax', String(maxEditorWidth / bounds.width * 100));
  if (persist) { layout.editorWidth = editorPercentage; saveLayout(); }
}

function restoreLayout() {
  const bounds = workspace.getBoundingClientRect();
  setEditorWidth(bounds.left + bounds.width * layout.editorWidth / 100, false);
  setConsoleHeight(previewColumn.getBoundingClientRect().bottom - layout.consoleHeight, false);
}
restoreLayout();
new ResizeObserver(restoreLayout).observe(workspace);

workspaceDivider.addEventListener("pointerdown", (event) => {
  workspaceDivider.setPointerCapture(event.pointerId);
  setEditorWidth(event.clientX);
});

workspaceDivider.addEventListener("pointermove", (event) => {
  if (workspaceDivider.hasPointerCapture(event.pointerId)) {
    setEditorWidth(event.clientX);
  }
});

workspaceDivider.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

  event.preventDefault();
  const bounds = workspace.getBoundingClientRect();
  const currentWidth = workspaceDivider.previousElementSibling.getBoundingClientRect().width;
  const step = event.shiftKey ? 50 : 10;
  const direction = event.key === "ArrowLeft" ? -1 : 1;
  setEditorWidth(bounds.left + currentWidth + direction * step);
});

function getCodigo() {
  return editor.state.doc.toString();
}

let versionGen = 0;
async function generarPdf() {
  const currentVersion = ++versionGen;
  if (!templates?.hasSelection()) {
    if (viewer.dataset.url) URL.revokeObjectURL(viewer.dataset.url);
    delete viewer.dataset.url;
    viewer.removeAttribute('src');
    return;
  }

  try {
    const docDefinition = evaluateTemplate(
      editor.state.doc.toString(),
      JSON.parse(dataEditor.state.doc.toString()),
      numero,
      fecha,
    );

    const pdf = pdfMake.createPdf(docDefinition);
    const blob = await pdf.getBlob();
    const url = URL.createObjectURL(blob);

    if (currentVersion === versionGen) {
      const previousUrl = viewer.dataset.url;
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      viewer.dataset.url = url;
      viewer.src = url;
    } else {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error(error);
  }
}

function debounce(fn, delay = 750) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

btnGenerar.addEventListener("click", generarPdf);

templates = setupTemplates({
  getCode: () => editor.state.doc.toString(),
  getData: () => dataEditor.state.doc.toString(),
  setDocuments(code, data) {
    loadingDocuments = true;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: code } });
    dataEditor.dispatch({ changes: { from: 0, to: dataEditor.state.doc.length, insert: data } });
    loadingDocuments = false;
  },
  generate: generarPdfDebounced,
});
