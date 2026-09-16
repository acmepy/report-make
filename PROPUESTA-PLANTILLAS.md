# Propuesta: plantillas locales con middleware Express

Estado: diseño acordado para una futura implementación. Este documento no implica que las funcionalidades descritas ya estén implementadas.

## Objetivo

Integrar report-make como complemento de un proyecto Node.js con Express. El proyecto anfitrión proporciona una carpeta física de plantillas; report-make permite seleccionarlas, editarlas, previsualizarlas y guardar los cambios en el servidor.

La edición se realiza sobre copias en `localStorage`, con persistencia explícita en el servidor.

## Integración en el proyecto anfitrión

El paquete expondrá una función `reportMake(options)` que devuelve un router de Express. El middleware servirá tanto la interfaz compilada como los endpoints de plantillas.

```js
import express from "express";
import path from "node:path";
import { reportMake } from "report-make";

const app = express();

app.use("/report", reportMake({
  templatesDir: path.resolve("./report-templates"),
}));

app.listen(3000);
```

También se podrá montar en la raíz o en otra ruta:

```js
app.use(reportMake(options));
app.use("/herramientas/reportes", reportMake(options));
```

La única opción de almacenamiento necesaria en este diseño es `templatesDir`. No se requiere `baseUrl`: la ruta pública se define al montar el router en Express. La interfaz resolverá sus recursos y llamadas según esa ruta, sin asumir `/report` como prefijo fijo.

Las opciones pueden importarse desde un archivo de configuración del proyecto anfitrión. No se necesita un mecanismo adicional de descubrimiento de configuración.

La autenticación podrá incorporarse antes del middleware:

```js
app.use("/report", requireAdmin, reportMake(options));
```

## Responsabilidades del servidor

El navegador no accede directamente al disco del servidor. El middleware es el agente que lista, lee y escribe las plantillas de la carpeta configurada.

Rutas propuestas, ilustradas con el montaje en `/report`:

| Método y ruta | Función |
| --- | --- |
| `GET /report/` | Servir el editor y el visor PDF. |
| `GET /report/assets/...` | Servir los recursos de la interfaz. |
| `GET /report/api/templates` | Descargar la lista completa de plantillas, con código, datos de prueba y revisión. |
| `GET /report/api/templates/:id` | Leer una plantilla individual, si se necesita. |
| `PUT /report/api/templates/:id` | Crear o actualizar la plantilla seleccionada, comprobando su revisión o que el identificador sea nuevo. |
| `DELETE /report/api/templates/:id` | Eliminar la plantilla seleccionada del servidor, comprobando su revisión. |

El formato definitivo de las respuestas y errores se concretará al implementar. Las operaciones de archivos quedarán limitadas a `templatesDir`, validando los identificadores para impedir accesos fuera de esa carpeta.

El campo `code` contendrá la expresión JavaScript del objeto de definición del documento, sin la asignación `dd =`, por ejemplo `{ content: ['Hola'] };`. Se admitirá el punto y coma final; el editor lo normalizará al evaluar la expresión como objeto. No se tratará como JSON, para permitir expresiones y funciones de JavaScript.

Cada plantilla incluirá además un campo `data` con datos de prueba serializables como JSON. Estos datos estarán disponibles como `data` al evaluar `code`, junto con los ayudantes `numero` y `fecha`. Por ejemplo, `{ content: [data.saludo] };` utilizará el saludo de los datos de prueba.

El código seguirá ejecutándose en el navegador para generar la vista previa; el middleware almacenará el código y los datos de prueba sin ejecutar su contenido. Este formato requerirá adaptar el evaluador actual, que espera una asignación a `dd`.

## Flujo de trabajo local y sincronización

1. Al abrir el editor, recuperar las copias y borradores existentes en `localStorage`.
2. Descargar todas las plantillas desde el middleware y actualizar las copias locales que no tengan cambios pendientes.
3. Editar el código y los datos de prueba de la plantilla seleccionada y conservar automáticamente sus cambios en `localStorage`.
4. Mantener la previsualización automática y el botón **Generar PDF**.
5. Al pulsar **Guardar en servidor**, enviar únicamente la plantilla seleccionada y actualizar su revisión local después de confirmar el guardado.
6. Al pulsar **Descargar del servidor**, volver a consultar el conjunto de plantillas y reconciliarlo con las copias locales.

El guardado automático local no implica escritura automática en el servidor. Si falla una descarga o un envío, se conservarán los borradores para reintentar. Sin conexión se podrá trabajar con las plantillas que ya estén disponibles localmente.

El almacenamiento local se separará por la ruta de montaje, dentro del origen del navegador, para evitar mezclar instancias como `/report` y `/otro-report`.

## Revisiones y cambios pendientes

Cada plantilla tendrá un identificador estable, nombre, código (`code`), datos de prueba (`data`) y revisión o hash del contenido del servidor. Localmente se conservará también el estado de cambios pendientes. La revisión abarcará tanto el código como los datos de prueba; modificar cualquiera de ellos marcará la plantilla como pendiente de envío.

Ejemplo orientativo de los datos recibidos:

```json
{
  "id": "factura",
  "name": "Factura",
  "code": "{ content: ['Hola'] };",
  "data": {
    "saludo": "Hola"
  },
  "revision": "hash-del-contenido"
}
```

El código y los datos de prueba se descargarán, guardarán localmente y enviarán al servidor juntos como una única plantilla.

Una descarga no sobrescribirá silenciosamente un borrador pendiente. Si la plantilla también cambió en el servidor, se mostrará un conflicto y se permitirá decidir qué versión conservar antes de reemplazar contenido.

El guardado deberá comprobar la revisión de origen para detectar modificaciones concurrentes, incluidas las realizadas directamente sobre el archivo del servidor. No bastará con comprobar conflictos al descargar.

El servidor será el almacenamiento principal de las plantillas compartidas; `localStorage` contendrá las copias de trabajo y los borradores del navegador. Se utilizará para código de volumen reducido, evitando almacenar imágenes o PDFs generados. Los fallos de persistencia local deberán mostrarse sin indicar falsamente que los cambios quedaron guardados.

## Interfaz propuesta

Agregar los controles de plantillas a la barra superior, junto al botón de generación:

```text
PDFMake Offline   [Factura ▾]   [Acciones ▾]   [Generar PDF]   [Guardar en servidor]   [Descargar del servidor]
```

| Control | Comportamiento |
| --- | --- |
| Selector de plantilla | Lista las plantillas locales y carga la seleccionada en el editor. Conserva el borrador de la anterior al cambiar. |
| Acciones → Copiar plantilla | Crea una copia local independiente del código y los datos de prueba actuales, con un nuevo identificador y nombre. |
| Acciones → Eliminar plantilla | Solicita confirmación indicando si se eliminará solamente una copia local nueva o también el archivo del servidor. |
| Generar PDF | Genera la vista previa de la plantilla seleccionada. |
| Guardar en servidor | Envía solamente la plantilla seleccionada. Se deshabilita cuando no hay cambios pendientes o mientras se procesa el envío. |
| Descargar del servidor | Actualiza el conjunto de plantillas. Permite decidir antes de reemplazar cambios locales pendientes. |

Junto al selector se mostrará un estado discreto, por ejemplo:

- **Sincronizado**.
- **Guardado local · pendiente de envío**.
- **Sin conexión**.

Un indicador `●` en las opciones del selector identificará las plantillas con cambios pendientes. Los estados de carga y los errores deberán permitir comprender si una operación terminó correctamente.

Debajo de la barra se mantendrá la distribución existente: editor de código, visor PDF y consola redimensionable bajo el visor. También se conservará el separador entre editor y vista previa. Se incorporará la edición de los datos de prueba de la plantilla seleccionada; su presentación concreta (por ejemplo, una pestaña junto al código) queda por definir.

## Copiar y eliminar plantillas

Como presentación propuesta, las acciones **Copiar plantilla** y **Eliminar plantilla** estarán en un menú **Acciones** junto al selector, para mantener compacta la barra superior.

### Copiar plantilla

La copia tomará el código y los datos de prueba de la versión local actual, incluidos los cambios todavía no enviados. Solicitará un nombre, sugiriendo «Factura (copia)», y generará un identificador nuevo sin reutilizar la revisión del original.

La copia quedará seleccionada y guardada en `localStorage` como **Nueva · pendiente de envío**. Será independiente del original y podrá crearse sin conexión. **Guardar en servidor** creará su archivo; si el identificador ya existe en el servidor, se informará el conflicto sin sobrescribirlo.

### Eliminar plantilla

El comportamiento propuesto distinguirá dos casos:

- **Plantilla nueva que nunca se guardó en el servidor:** después de confirmar, eliminar únicamente su copia local.
- **Plantilla existente en el servidor:** mostrar una confirmación explícita con su nombre y advertir que se eliminarán el archivo del servidor y el borrador local, incluidos los cambios pendientes. Al confirmar, solicitar la eliminación al middleware. Retirar la copia local solo después de confirmar el resultado del servidor.

La eliminación del servidor será una acción explícita separada de **Guardar en servidor**. Si falla o no hay conexión, conservar la plantilla local y mostrar el error; no dejar una eliminación en cola para ejecutarla automáticamente más tarde. Si cambió la revisión del servidor, mostrar un conflicto antes de permitir eliminar esa nueva versión.

Después de eliminar, seleccionar otra plantilla disponible. Si no queda ninguna, mostrar un estado vacío y deshabilitar las acciones que requieren una selección.

En futuras descargas, una plantilla que ya no exista en el servidor se retirará de las copias locales sincronizadas. Si conserva cambios locales pendientes, mantener el borrador e informar que el original fue eliminado; permitir copiarlo a una plantilla nueva o descartarlo. No recrear silenciosamente el archivo eliminado al intentar guardar una edición basada en una revisión anterior.

## Alcance inicial y alternativas consideradas

La primera versión propuesta incluye middleware Express, almacenamiento en carpeta del servidor, descarga inicial completa, copias locales, selección de plantilla, copia de plantillas, eliminación, envío individual y descarga manual.

Durante la evaluación se consideraron la selección de carpetas desde el navegador, una aplicación de escritorio y un proveedor de API externa. El diseño elegido utiliza la carpeta del proyecto anfitrión a través de Express; no necesita una URL externa configurable ni un proveedor API en la primera versión.

La creación de plantillas desde cero y el renombrado de plantillas existentes, el manejo de subcarpetas, los recursos asociados y la resolución visual detallada de conflictos quedan por definir. La creación mediante **Copiar plantilla** sí forma parte del alcance inicial.
