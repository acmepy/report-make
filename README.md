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
npm run build
npm start
```

Abrir `http://localhost:3000/report/`. El servidor de ejemplo usa `examples/templates`, donde se incluye una plantilla inicial.

## Integración con Express

Compilar el paquete antes de instalarlo en otro proyecto, por ejemplo mediante `npm install /ruta/a/report-make`.

```js
import express from 'express';
import path from 'node:path';
import { reportMake } from 'report-make';

const app = express();
app.use('/report', reportMake({ templatesDir: path.resolve('./report-templates') }));
app.listen(3000);
```

Se admite cualquier ruta de montaje, incluida la raíz. El middleware crea la carpeta si no existe. Para restringir el acceso, colocar la autenticación del proyecto antes de `reportMake`.

Cada plantilla es un archivo JSON cuyo nombre determina el identificador, por ejemplo `factura.json`:

```json
{
  "name": "Factura",
  "code": "{ content: [data.saludo] };",
  "data": { "saludo": "Hola mundo" }
}
```

Los identificadores admiten letras, números, guiones y guiones bajos (hasta 128 caracteres, comenzando por letra o número). No se recorren subcarpetas. En una carpeta vacía, agregar un primer archivo como el ejemplo para comenzar.

Las plantillas nuevas generan el identificador a partir del nombre: **Factura contado** se guarda como `factura-contado.json`. Se convierten las letras a minúsculas, se eliminan acentos y se reemplazan espacios o signos por guiones. Los nombres equivalentes y las colisiones con archivos existentes se rechazan tanto localmente como en el servidor. Al copiar se sugiere un nombre disponible, como **Factura (copia 2)**. Las plantillas ya guardadas conservan su identificador y archivo; los borradores nuevos anteriores adoptan el identificador basado en el nombre al enviarse por primera vez. No se renombran archivos existentes automáticamente.

Para desarrollar la interfaz ejecutar `npm run dev` junto con `npm start`. Vite reenvía `/api` al servidor de ejemplo en el puerto 3000.

## Compilación

```bash
npm run build
```

Los archivos generados estarán disponibles en la carpeta `dist`.

## Uso

En la pestaña **Código**, escribir el objeto de definición de PDFMake sin asignarlo a `dd`:

```js
{
  content: [
    { text: 'Hola mundo', fontSize: 18 }
  ]
};
```

La vista previa del PDF se actualizará automáticamente después de unos segundos de inactividad en el editor.

La pestaña **Datos de prueba** permite editar JSON, disponible como `data` dentro del código. También están disponibles `numero` y `fecha`.

Por compatibilidad, también se admiten borradores anteriores con declaraciones JavaScript y una asignación o declaración de `dd`. Se conservan sin reescribir su código; las plantillas nuevas pueden usar directamente el objeto.

- Los cambios en ambas pestañas se guardan en IndexedDB mediante `idb-keyval`, separados por ruta de montaje. Los datos inválidos se conservan como borrador, pero deben corregirse para previsualizar o enviar. La interfaz indica cuándo el guardado local sigue pendiente o falla.
- Las preferencias de tamaño de paneles siguen en `localStorage`. No se importan plantillas antiguas de `localStorage`: al iniciar por primera vez se descargan desde el servidor. Las claves anteriores no se eliminan, pero ya no se utilizan.
- **Guardar en servidor**, también `Ctrl+S` o `Cmd+S`, envía la plantilla seleccionada.
- **Descargar del servidor** actualiza la lista y pide confirmación antes de reemplazar borradores. La descarga automática inicial los conserva.
- **Acciones → Copiar plantilla** duplica el código y los datos actuales. El archivo se crea al guardar en servidor.
- **Acciones → Renombrar plantilla** cambia el nombre localmente y marca la plantilla pendiente. **Guardar en servidor** actualiza también el nombre del archivo, conservando el código y los datos. Se rechazan nombres duplicados y revisiones desactualizadas; si falla, se conserva el borrador. Los archivos antiguos mantienen su identificador hasta renombrarlos explícitamente.
- **Acciones → Eliminar plantilla** pide confirmación y elimina el archivo antes de retirar la copia local. Si falla, conserva el borrador.
- Ante un conflicto de revisión, descargar para elegir la versión del servidor o conservar el borrador y copiarlo con otro nombre.

La primera versión está pensada para un único proceso que escriba las plantillas. No ofrece bloqueo distribuido entre procesos ni frente a escrituras externas simultáneas. El código de las plantillas se ejecuta en el navegador y debe proceder de autores de confianza.

Las pruebas de integración se ejecutan con `npm test`, después de compilar.

## Tecnologías

* PDFMake
* CodeMirror
* Vite
