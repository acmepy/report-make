import{n as e}from"./rolldown-runtime-Bh1tDfsg.js";import{i as t,n,r,t as i}from"./codemirror-CCrc_tIV.js";import{t as a}from"./pdfmake-bv7Ij9ry.js";import{t as o}from"./pdfmake-fonts-Cfh1-GXb.js";import{t as s}from"./vendor-B0OaCWiV.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var c=`0.0.4`,l=e(a(),1),u=e(o(),1),d=e(s(),1);function f(e,t=`YYYY-MM-DD`){return(0,d.default)(e).format(t)}function p(e){return typeof e==`string`&&(e=m(e)),new Intl.NumberFormat(`es-PY`,{useGrouping:!0}).format(e).trim().replaceAll(`,`,`.`)}function m(e){return+e.replaceAll(`.`,``).replaceAll(`,`,``)}var h=window.matchMedia(`(prefers-color-scheme: dark)`).matches;console.log(`Report Make - version ${c}`),document.getElementById(`app-version`).textContent=`v${c}`,l.default.vfs=u.default,l.default.addVirtualFileSystem(u.default);var g=`{
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
}`,_=C(S,750),v=new t({doc:localStorage.getItem(`pdfmake-code`)||g,extensions:[n,i(),...h?[r]:[],t.updateListener.of(e=>{e.docChanged&&(localStorage.setItem(`pdfmake-code`,e.state.doc.toString()),_())})],parent:document.querySelector(`#editor`)}),y=document.querySelector(`#viewer`),b=document.querySelector(`#btnGenerar`),x=0;async function S(){let e=++x;try{let t=v.state.doc.toString(),n=Function(`numero`,`fecha`,`${t} return dd;`)(p,f),r=await l.default.createPdf(n).getDataUrl();e===x&&(y.src=r)}catch(e){console.error(e)}}function C(e,t=750){let n;return(...r)=>{clearTimeout(n),n=setTimeout(()=>e(...r),t)}}b.addEventListener(`click`,S),S();