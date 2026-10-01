# 11. Correo Electrónico

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

## 11.1 Configuración SMTP

Antes de enviar correos, configura el servidor SMTP en **Configuración → Correo**:

- Servidor (host) y puerto.
- Usuario y contraseña.
- Dirección de correo remitente.
- Conexión segura (SSL/TLS).
- Delay entre envíos (milisegundos) para envíos masivos.

Pulsa **Probar configuración** para verificar que los datos son correctos.

> `[IMAGEN: Formulario de configuración SMTP]`

## 11.2 Envío de correos

Puedes enviar correos desde varios puntos de la aplicación:

- **Desde un alumno:** envía documentos individualmente.
- **Desde una relación:** envía documentos a la empresa o al tutor.
- **Envío masivo:** selecciona múltiples relaciones y envía documentación completa.

El editor de correo incluye:

- Editor de texto enriquecido (TipTap WYSIWYG) con formato (negrita, cursiva, subrayado, listas, colores, alineación, etc.).
- **Selector de plantillas:** al iniciar un envío desde Empresas o Relaciones, se muestra un selector con todas las plantillas disponibles para elegir. La plantilla seleccionada se carga en el editor.
- Adjuntos: sube archivos o selecciona documentos generados por el sistema.
- Autocompletado de contactos.

> `[IMAGEN: Modal de envío de correo con editor y selección de adjuntos]`

## 11.3 Guardado en la carpeta Enviados

El servidor SMTP de EducaMadrid no guarda por sí mismo una copia de los correos que se envían desde aplicaciones externas. Para que los envíos aparezcan en la carpeta **Enviados** de tu webmail, la aplicación guarda automáticamente una copia del mensaje en el servidor mediante **IMAP** justo después de enviarlo.

En **Configuración → Correo → Guardar copia en el servidor (Enviados)** puedes:

- **Activar o desactivar** el guardado de copias. Está activado por defecto.
- Ajustar los datos de conexión IMAP: **servidor**, **puerto**, **carpeta** y **conexión segura SSL/TLS**.

Los valores por defecto son `imap.educa.madrid.org`, puerto `993`, conexión segura activada y carpeta `Sent`. Se reutilizan el usuario y la contraseña configurados para el envío (SMTP).

> El guardado en Enviados es opcional y no bloquea el envío: si la conexión IMAP falla, el correo se envía igualmente y solo se omite la copia en el servidor. En los envíos reales la copia IMAP se hace en segundo plano (no retrasa la entrega) y la conexión se reintenta varias veces con timeouts amplios; el botón **Probar configuración** sí espera al guardado IMAP y muestra si la copia se guardó correctamente.

> El servidor IMAP de EducaMadrid usa un certificado no firmado por una CA pública, por lo que la conexión IMAP se realiza **sin validar la cadena de certificados** (el tráfico sigue cifrado con TLS, ejecutándose el login del usuario con su contraseña SMTP). Si necesitas conexiones IMAP con validación estricta, usa un servidor con certificado válido.

## 11.4 Plantillas de correo

Las plantillas de correo permiten crear mensajes predefinidos reutilizables que incorporan datos dinámicos mediante **marcadores**. Se gestionan desde **Configuración → Correo → Plantillas**.

### 11.4.1 Gestión de plantillas

Desde la sección Plantillas puedes:

- **Crear plantilla personalizada:** pulsa **Nueva Plantilla**, asigna un nombre, una descripción, un color y el ámbito de aplicación (Empresas / Relaciones / Alumnos / Convenios / Todos). Las plantillas creadas por el usuario usan siempre el icono `✏️` (PencilRuler) y pueden editarse y eliminarse libremente.
- **Editar plantilla:** haz clic en una tarjeta o en su icono de lápiz para abrir el editor completo. Las plantillas de sistema (predefinidas) solo pueden visualizarse, no editarse.
- **Eliminar plantilla:** las plantillas personalizadas pueden eliminarse mediante el botón de papelera, con confirmación previa. Las plantillas de sistema no se pueden eliminar.
- **Filtrar por ámbito:** usa los filtros superiores para ver plantillas de Empresas, Relaciones, Alumnos, Convenios o Todos los ámbitos.

### 11.4.2 Editor WYSIWYG

Al editar una plantilla, se abre un editor visual basado en **TipTap** con las siguientes herramientas:

- Negrita, cursiva, tachado, código en línea.
- Títulos (H1–H4).
- Colores de texto y fondo (selector de color hexadecimal).
- Listas ordenadas y no ordenadas.
- Alineación (izquierda, centrada, derecha, justificada).
- Enlaces.
- Deshacer / Rehacer.

El cuerpo de la plantilla puede incluir **marcadores** (ver sección 11.5) que serán reemplazados por datos reales al enviar el correo.

### 11.4.3 Tarjetas de plantilla

Cada plantilla se muestra como una tarjeta con:
- **Icono y color:** las plantillas de sistema tienen icono y color predefinidos. Las personalizadas usan PencilRuler con el color hex seleccionado.
- **Nombre y descripción.**
- **Ámbito de aplicación** (Empresas, Relaciones, Alumnos, Convenios o Todos).
- **Botón de editar** (lápiz, aparece al hacer hover) — no visible en la plantilla "Otros".
- **Botón de eliminar** (papelera, aparece al hacer hover) — solo en plantillas personalizadas.

### 11.4.4 La plantilla "Otros"

La plantilla **"Otros"** es una plantilla de sistema especial:
- **No tiene contenido editable** — se usa como opción genérica para cualquier situación.
- **Aparece en todos los ámbitos** (lleva asociado el ámbito "Todos").
- **Siempre se muestra la última** en el selector de plantillas, tanto en empresa como en relaciones.
- **No muestra botón de editar** ni se puede eliminar.
- Se distingue visualmente mostrando "Todos" como ámbito.

### 11.4.5 Envío desde Convenios

El botón **"Enviar correo a la empresa"** está en la columna **Acciones** del listado de convenios (con el icono de sobre), y también en las tarjetas de la vista móvil.

- **Usa la plantilla de sistema `convenio`**, que es de ámbito *Convenios* y de grupo *Registro individual*. Se edita en Configuración > Correo > ámbito Convenios; no hay selector de plantillas porque solo hay una.
- **El destinatario es la empresa del convenio.** Si no tiene email, avisa con un mensaje en vez de abrir el modal vacío.
- **Adjunta la última versión del documento del convenio** que haya en su gestor documental, y **nada más**: aquí no se autogenera nada. Si el gestor está vacío, el correo se abre sin adjuntos. Ver [11.6.1.1](#1161-el-documento-del-convenio).
- El centro y el curso que salen son los del convenio, no los de la vista.
- Los marcadores sin valor se sustituyen por texto vacío y se avisa, igual que en el resto de ámbitos.

El **nº de convenio** se crea por defecto como `C-[código de centro]-`, con el guion final incluido: es el hueco que el profesor rellena con el ordinal. Si se cambia de centro en el formulario y el campo sigue sin tocar, se rehace con el código del nuevo centro; en cuanto se edita a mano, se respeta lo escrito.

## 11.5 Marcadores

Los marcadores son códigos insertados en el cuerpo de las plantillas que se reemplazan automáticamente por datos reales del alumno, empresa o relación al enviar el correo.

### 11.5.1 Marcadores predefinidos de sistema

Cada plantilla pertenece a un ámbito, y **solo se ofrecen los marcadores que ese ámbito sabe resolver**. El editor los muestra como chips pulsables y el listado sale del mismo catálogo que usa el envío, de modo que lo que se ofrece nunca es más de lo que se sustituye.

| Marcador | Empresas | Relaciones | Alumnos | Convenios | Descripción |
|----------|:--------:|:----------:|:--------:|:----------:|-------------|
| `{{profesor.nombre}}` | Sí | Sí | Sí | Sí | Nombre del profesor/tutor del centro |
| `{{profesor.apellidos}}` | Sí | Sí | Sí | Sí | Apellidos del profesor/tutor del centro |
| `{{empresa.nombre}}` | Sí | Sí | Sí | Sí | Nombre de la empresa |
| `{{empresa.direccion}}` | — | Sí | — | Sí | Dirección de la empresa |
| `{{empresa.personaContacto}}` | Sí | Sí | Sí | Sí | Persona de contacto de la empresa |
| `{{tutor.nombre}}` | — | Sí | — | — | Nombre del tutor de empresa |
| `{{tutor.apellidos}}` | — | Sí | — | — | Apellidos del tutor de empresa |
| `{{centro.nombre}}` | Sí | Sí | — | Sí | Nombre del centro educativo (del convenio de la relación) |
| `{{curso.descripcion}}` | Sí | Sí | — | Sí | Descripción del curso académico |
| `{{relacion.numRelacion}}` | — | Sí | — | — | Número de la relación |
| `{{nombreApellidosAlumnos}}` | — | Sí | — | — | Alumnado de la relación, unido con comas |
| `{{alumnoTutor}}` | — | Sí | — | — | A quién va dirigido el correo: el alumno si su plan está pendiente de firma, el tutor en cualquier otro caso |
| `{{convenio.numConvenio}}` | — | — | — | Sí | Número del convenio |
| `{{convenio.fechaConvenio}}` | — | — | — | Sí | Fecha del convenio |
| `{{destinatario}}` | — | — | — | — | Dirección de correo del destinatario (solo válido con 1 destinatario en Para) |
| `{{@contacto}}` | Sí | Sí | Sí | Sí | Persona de contacto, resuelta por destinatario |
| `{{@nombreEmpresa}}` | Sí | Sí | Sí | Sí | Nombre de la empresa, resuelto por destinatario |

> ⚠️ Si escribes un marcador que el ámbito de esa plantilla no resuelve, el editor lo marca debajo del campo de texto. Suele ser una errata, y sin ese aviso solo se descubriría al abrir el correo ya enviado.

### 11.5.2 Marcadores personalizados

Además de los marcadores de sistema, puedes crear **marcadores personalizados** a tu medida. Se gestionan desde **Configuración → Correo → Marcadores**.

**Crear un marcador personalizado:**
1. Pulsa **Nuevo Marcador**.
2. Introduce un **nombre** (sin llaves, p.ej. `telefono_alumno`).
3. El sistema generará automáticamente el código `{{per_telefono_alumno}}`.
4. En **Valor HTML**, escribe el contenido que sustituirá al marcador (texto plano o HTML básico sin etiquetas de párrafo).

Los marcadores personalizados se renderizan con un editor WYSIWYG reducido y se almacenan con limpieza automática de etiquetas no deseadas.

**Editar o eliminar:** usa los iconos de lápiz y papelera en cada tarjeta de marcador. La eliminación requiere confirmación.

### 11.5.3 Aplicación de marcadores

Cuando envías un correo usando una plantilla desde los módulos de **Empresas** o **Relaciones**:

1. Selecciona la plantilla en el selector.
2. El sistema carga la plantilla y **reemplaza automáticamente** los marcadores de sistema (`{{profesor.nombre}}`, `{{empresa.nombre}}`, etc.) y personalizados (`{{per_...}}`) con los valores reales del alumno, empresa o relación seleccionados. Esto se aplica **también al asunto**: los marcadores del catálogo sirven en el campo de asunto igual que en el cuerpo, y los que no tienen valor se quedan vacíos con aviso.
3. Los marcadores **por destinatario** (`{{@contacto}}`, `{{@nombreEmpresa}}`) **no se reemplazan** en el editor, ya que su valor depende de cada destinatario cuando se envía a múltiples empresas.
4. Pulsa **Enviar** — justo antes del envío, el sistema resuelve los marcadores `{{@...}}` individualmente para cada destinatario.

> ⚠️ Los marcadores con `@` (p.ej. `{{@contacto}}`) se ven en el editor y solo se sustituyen en el momento del envío, permitiendo enviar el mismo correo a varias empresas con los datos personalizados de cada una. Esta sustitución por destinatario solo actúa sobre el **cuerpo**: un `{{@...}}` en el asunto no se sustituye, así que conviene no usarlo ahí.

#### Marcadores que no se pudieron resolver

Un marcador se queda **vacío**, nunca con las llaves puestas. `Hola {{profesor.nombre}}` en un correo enviado no es un marcador pendiente: es un fallo, porque el correo lo lee la empresa y no el profesor.

El envío **no se bloquea**. Antes de mandar, el modal avisa de qué marcadores van a quedar en hueco, para que puedas corregirlos o asumirlos:

- **Marcador sin valor.** La plantilla lo usa y en esta relación no hay dato que lo llene. Un caso normal: una plantilla de relaciones abierta sobre una relación cuyo convenio no tiene centro, y la plantilla dice `Estimado/a, {{alumnoTutor}}`.
- **Destinatario sin datos de personalización.** En un envío uno a uno, algún destinatario de la lista no tiene datos propios. En ese caso **no se envía nada**: se avisa y se deja decidir al profesor, porque un envío parcial no deja rastro de lo que faltaba y reenviar después duplicaría lo que sí salió.

## 11.6 Adjuntos: qué documento se manda

Cada documento que se manda por correo se busca siempre en el mismo orden:

1. **La última versión del gestor documental.** Si has subido o corregido un documento a mano, ese es el que sale. Es el que has revisado, y el que debe ir.
2. **El documento que genera la aplicación**, si en el gestor documental no hay ninguna versión.
3. **Nada**, si tampoco se puede generar. Un hueco en los adjuntos se ve; un documento equivocado, no.

El autogenerado se considera un borrador de trabajo, y por eso nunca se antepone a lo que hay en el gestor documental.

El paso 2 no aplica a todos: el documento del convenio no se autogenera, así que el correo sale con la última versión del gestor o sin adjunto. Está en [11.6.1.1](#1161-el-documento-del-convenio).

### 11.6.1 Qué tipos se guardan en el gestor documental

| Documento | ¿Se archiva? | Ámbito |
|-----------|:------------:|--------|
| Relación | Sí | La relación |
| Plan formativo | Sí | Cada alumno |
| Seguimiento | Sí | Cada alumno |
| Valoración | Sí | Cada alumno |
| Convenio | Sí | El convenio |
| Calendario | No | Se genera siempre al vuelo |
| Carta | No | Se genera siempre al vuelo |

Calendario y carta no se archivan porque no tienen versión que subir: siempre se generan. Por eso nunca buscan nada en el gestor documental, en lugar de devolver un "no hay" que no es un error.

Cada tipo se busca donde se archiva: las relaciones y los documentos de alumno cuelgan de la relación, y el documento del convenio del convenio. Por eso el endpoint `GET /api/documentos/adjunto` acepta `convenioId` además de `relacionId`. Un tipo al que se le pase el identificador que no es el suyo no busca nada, en vez de mirar en la tabla equivocada.

### 11.6.1.1 El documento del convenio

Es el único que **no tiene paso 2**. No hay documento de convenio que la aplicación pueda generar: lo único que existe es lo que el profesor ha subido a su gestor documental. Por eso el correo sale con la última versión subida y, si no hay ninguna, **sin adjunto**.

El texto de la plantilla tampoco dice "adjuntamos", por el mismo motivo: anunciar un adjunto que puede no estar es peor que no mencionarlo.

### 11.6.2 El anexo externo de la relación

Si en **Configuración → Relación → Anexo de relación** está puesto el modo **externo**, el profesor trabaja con su propio documento y el de la aplicación no le sirve: no se genera.

Eso **no** impide buscar en el gestor documental. Si el profesor ha subido allí su versión, esa es la que se manda, y con el mismo orden de prioridad de siempre: primero el gestor, y el autogenerado solo cuando no hay nada.

| Gestor documental | Modo externo | Qué se manda |
|-------------------|:------------:|--------------|
| Con documento | externo | La última versión del gestor |
| Con documento | app | La última versión del gestor |
| Sin documento | externo | Nada: el profesor lo sube él |
| Sin documento | app | El documento que genera la aplicación |

> ⚠️ El modo externo apaga la generación, no la búsqueda. Un correo sin adjunto porque el gestor estaba vacío es distinto de uno sin adjunto porque la aplicación no ha sido capaz de generar el documento: en el segundo caso el problema es nuestro, y conviene enterarse.

## 11.7 Integración con Empresas y Relaciones

Al enviar un correo desde los módulos de **Empresas** o **Relaciones**:
1. Se muestra un selector modal con todas las plantillas aplicables al ámbito actual.
2. Las plantillas aparecen ordenadas, con "Otros" siempre al final.
3. Cada plantilla se muestra con su icono, color, nombre y descripción.
4. Al seleccionar una plantilla, se carga en el editor de correo y puedes personalizar el mensaje antes de enviarlo.

---

[← Generación de Documentos](10-generacion-de-documentos.md)  |  [Índice](README.md)  |  [Panel de Control →](12-panel-de-control.md)
