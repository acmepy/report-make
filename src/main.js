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

import pdfMake from "pdfMake/build/pdfMake.js";
import * as vfs from "pdfmake/build/vfs_fonts.js";
pdfMake.vfs = vfs.default;
pdfMake.addVirtualFileSystem(vfs.default);

import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";

import { fecha, numero } from "./formatters.js";

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
  doc: localStorage.getItem("pdfmake-code") || ejemplo,
  extensions: [
    basicSetup,
    javascript(),
    ...(isDark ? [oneDark] : []),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        localStorage.setItem("pdfmake-code", update.state.doc.toString());
        generarPdfDebounced();
      }
    }),
  ],
  parent: document.querySelector("#editor"),
});

const viewer = document.querySelector("#viewer");
const btnGenerar = document.querySelector("#btnGenerar");
const workspace = document.querySelector("#workspace");
const workspaceDivider = document.querySelector("#workspace-divider");

function setEditorWidth(clientX) {
  const bounds = workspace.getBoundingClientRect();
  const dividerWidth = workspaceDivider.getBoundingClientRect().width;
  const minEditorWidth = 220;
  const minViewerWidth = 320;
  const maxEditorWidth = bounds.width - dividerWidth - minViewerWidth;
  const editorWidth = Math.min(
    Math.max(clientX - bounds.left, minEditorWidth),
    maxEditorWidth,
  );
  const editorPercentage = (editorWidth / bounds.width) * 100;

  workspace.style.setProperty("--editor-width", `${editorPercentage}%`);
  workspaceDivider.setAttribute("aria-valuenow", editorPercentage.toFixed(0));
}

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

  try {
    let codigo = editor.state.doc.toString();
    if (codigo.at(-1) != ";") codigo += ";";
    console.log("Generando PDF con código:", codigo);
    const docDefinition = new Function(
      "numero",
      "fecha",
      `${codigo} return dd;`,
    )(numero, fecha);

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

generarPdf();
