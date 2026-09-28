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

- **Crear plantilla personalizada:** pulsa **Nueva Plantilla**, asigna un nombre, una descripción, un color y el ámbito de aplicación (Empresas / Relaciones / Todos). Las plantillas creadas por el usuario usan siempre el icono `✏️` (PencilRuler) y pueden editarse y eliminarse libremente.
- **Editar plantilla:** haz clic en una tarjeta o en su icono de lápiz para abrir el editor completo. Las plantillas de sistema (predefinidas) solo pueden visualizarse, no editarse.
- **Eliminar plantilla:** las plantillas personalizadas pueden eliminarse mediante el botón de papelera, con confirmación previa. Las plantillas de sistema no se pueden eliminar.
- **Filtrar por ámbito:** usa los filtros superiores para ver plantillas de Empresas, Relaciones o Todos los ámbitos.

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
- **Ámbito de aplicación** (Empresas, Relaciones o Todos).
- **Botón de editar** (lápiz, aparece al hacer hover) — no visible en la plantilla "Otros".
- **Botón de eliminar** (papelera, aparece al hacer hover) — solo en plantillas personalizadas.

### 11.4.4 La plantilla "Otros"

La plantilla **"Otros"** es una plantilla de sistema especial:
- **No tiene contenido editable** — se usa como opción genérica para cualquier situación.
- **Aparece en todos los ámbitos** (lleva asociado el ámbito "Todos").
- **Siempre se muestra la última** en el selector de plantillas, tanto en empresa como en relaciones.
- **No muestra botón de editar** ni se puede eliminar.
- Se distingue visualmente mostrando "Todos" como ámbito.

## 11.5 Marcadores

Los marcadores son códigos insertados en el cuerpo de las plantillas que se reemplazan automáticamente por datos reales del alumno, empresa o relación al enviar el correo.

### 11.5.1 Marcadores predefinidos de sistema

| Marcador | Descripción |
|----------|-------------|
| `{{profesor.nombre}}` | Nombre del profesor/tutor del centro |
| `{{profesor.apellidos}}` | Apellidos del profesor/tutor del centro |
| `{{empresa.nombre}}` | Nombre de la empresa |
| `{{empresa.direccion}}` | Dirección de la empresa |
| `{{empresa.personaContacto}}` | Persona de contacto de la empresa |
| `{{tutor.nombre}}` | Nombre del tutor de empresa |
| `{{tutor.apellidos}}` | Apellidos del tutor de empresa |
| `{{centro.nombre}}` | Nombre del centro educativo |
| `{{curso.descripcion}}` | Descripción del curso académico |
| `{{nombreApellidosAlumnos}}` | Nombre completo de los alumnos (en envíos desde relaciones) |
| `{{alumnoTutor}}` | Saludo condicional ("estimado alumno" o "estimado tutor") |
| `{{destinatario}}` | Dirección de correo del destinatario (solo válido con 1 destinatario en Para) |
| `{{@contacto}}` | Persona de contacto (se resuelve individualmente por cada destinatario en envíos uno a uno) |
| `{{@nombreEmpresa}}` | Nombre de la empresa (se resuelve individualmente por cada destinatario) |

### 11.5.2 Marcadores personalizados

Además de los marcadores de sistema, puedes crear **marcadores personalizados** a tu medida. Se gestionan desde **Configuración → Correo → Marcadores**.

**Crear un marcador personalizado:**
1. Pulsa **Nuevo Marcador**.
2. Introduce un **nombre** (sin llaves, p.ej. `telefono_alumno`).
3. El sistema generará automáticamente el código `{{telefono_alumno}}`.
4. En **Valor HTML**, escribe el contenido que sustituirá al marcador (texto plano o HTML básico sin etiquetas de párrafo).

Los marcadores personalizados se renderizan con un editor WYSIWYG reducido y se almacenan con limpieza automática de etiquetas no deseadas.

**Editar o eliminar:** usa los iconos de lápiz y papelera en cada tarjeta de marcador. La eliminación requiere confirmación.

### 11.5.3 Aplicación de marcadores

Cuando envías un correo usando una plantilla desde los módulos de **Empresas** o **Relaciones**:

1. Selecciona la plantilla en el selector.
2. El sistema carga la plantilla y **reemplaza automáticamente** los marcadores de sistema (`{{profesor.nombre}}`, `{{empresa.nombre}}`, etc.) y personalizados (`{{per_...}}`) con los valores reales del alumno, empresa o relación seleccionados.
3. Los marcadores **por destinatario** (`{{@contacto}}`, `{{@nombreEmpresa}}`) **no se reemplazan** en el editor, ya que su valor depende de cada destinatario cuando se envía a múltiples empresas.
4. Pulsa **Enviar** — justo antes del envío, el sistema resuelve los marcadores `{{@...}}` individualmente para cada destinatario.

> ⚠️ Los marcadores con `@` (p.ej. `{{@contacto}}`) se ven en el editor y solo se sustituyen en el momento del envío, permitiendo enviar el mismo correo a varias empresas con los datos personalizados de cada una.

## 11.6 Integración con Empresas y Relaciones

Al enviar un correo desde los módulos de **Empresas** o **Relaciones**:
1. Se muestra un selector modal con todas las plantillas aplicables al ámbito actual.
2. Las plantillas aparecen ordenadas, con "Otros" siempre al final.
3. Cada plantilla se muestra con su icono, color, nombre y descripción.
4. Al seleccionar una plantilla, se carga en el editor de correo y puedes personalizar el mensaje antes de enviarlo.

---

[← Generación de Documentos](10-generacion-de-documentos.md)  |  [Índice](README.md)  |  [Panel de Control →](12-panel-de-control.md)
