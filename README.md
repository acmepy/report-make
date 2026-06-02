# PDFMake Offline

Pequeña herramienta offline para diseñar y previsualizar reportes PDF utilizando PDFMake.

## Características

* Editor de código con CodeMirror.
* Vista previa automática del PDF.
* Tema claro/oscuro según la configuración del sistema.
* Guardado automático del código en el navegador.
* Sin dependencias de servicios externos.
* Generación local de PDFs utilizando PDFMake.

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run dev
```

Abrir el navegador en la URL indicada por Vite.

## Compilación

```bash
npm run build
```

Los archivos generados estarán disponibles en la carpeta `dist`.

## Uso

Definir una variable `dd` con la estructura de documento de PDFMake:

```js
const dd = {
  content: [
    { text: 'Hola mundo', fontSize: 18 }
  ]
};
```

La vista previa del PDF se actualizará automáticamente después de unos segundos de inactividad en el editor.

## Tecnologías

* PDFMake
* CodeMirror
* Vite
