import "./style.css";

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

const ejemplo = `{
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
    const url = await pdf.getDataUrl();

    if (currentVersion === versionGen) {
      viewer.src = url;
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
