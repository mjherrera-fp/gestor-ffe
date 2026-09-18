<div align="center">
<img width="1200" height="475" alt="Banner" src="./assets/banner.png" />
</div>

# Gestor FFE — Sistema de Gestión de Prácticas Formativas

**Versión:** 0.1.0-alpha  
**Plataforma:** Windows (portable)

Aplicación de escritorio para la gestión integral de la Fase de Formación en Empresa (FFE). Permite administrar alumnos, empresas, convenios, relaciones de prácticas, generación de documentos oficiales, envío de correos electrónicos y cálculo de días de Seguridad Social, todo en un mismo entorno.

---

## Índice

1. [Introducción](#1-introducción)
2. [Primeros pasos](#2-primeros-pasos)
3. [Módulo de Profesor](#3-módulo-de-profesor)
4. [Cursos](#4-cursos)
5. [Alumnos](#5-alumnos)
6. [Empresas](#6-empresas)
7. [Intereses Alumno-Empresa](#7-intereses-alumno-empresa)
8. [Convenios](#8-convenios)
9. [Relaciones Alumno-Empresa](#9-relaciones-alumno-empresa)
10. [Generación de Documentos](#10-generación-de-documentos)
11. [Correo Electrónico](#11-correo-electrónico)
    1. [Configuración SMTP](#111-configuración-smtp)
    2. [Envío de correos](#112-envío-de-correos)
    3. [Guardado en la carpeta Enviados](#113-guardado-en-la-carpeta-enviados)
    4. [Plantillas de correo](#114-plantillas-de-correo)
    5. [Marcadores](#115-marcadores)
    6. [Integración con Empresas y Relaciones](#116-integración-con-empresas-y-relaciones)
12. [Panel de Control](#12-panel-de-control)
13. [Configuración](#13-configuración)
14. [Histórico / Auditoría](#14-histórico--auditoría)
15. [Seguridad y Cifrado](#15-seguridad-y-cifrado)
16. [Servicios conectados](#16-servicios-conectados)
17. [Preguntas Frecuentes](#16-preguntas-frecuentes)

---

## 1. Introducción

**Gestor FFE** es una aplicación de escritorio desarrollada con tecnología web (React + Electron) que centraliza toda la gestión de las prácticas formativas de un centro educativo.

### Condiciones de uso

El usuario es responsable de cumplir con todas las leyes y regulaciones aplicables al utilizar este software.

El desarrollador de esta aplicación **no se hace responsable** de ningún daño, pérdida o perjuicio que pueda derivarse del uso indebido, inapropiado o incorrecto de la aplicación. El uso de esta aplicación es bajo su propio riesgo.

**No garantizamos** que la aplicación funcione sin errores, interrupciones o fallos, ni que los resultados obtenidos sean precisos o completos. La aplicación se proporciona "tal cual" y "según disponibilidad", sin ninguna garantía expresa o implícita de ningún tipo.

Al utilizar esta aplicación, usted **acepta que el desarrollador no será responsable** de ningún daño directo, indirecto, incidental, especial o consecuente que pueda surgir del uso o mal funcionamiento de la aplicación.

### Derechos de autor
Copyright (c) Manuel Jesús Herrera Morgaz. Todos los derechos reservados.

Este software se distribuye bajo una licencia de código fuente disponible. Se permite usar,
ver y estudiar el código. <a href="https://github.com/mjherrera-fp/gestor-ffe" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">El código fuente está disponible en GitHub</a>.

No se permite copiar, redistribuir, sublicenciar o usar con fines comerciales o de ningún otro tipo sin
autorización expresa del autor.

Toda copia autorizada deberá mantener esta nota de copyright y atribuir al autor original.

Al aceptar estas condiciones, el usuario se compromete a hacer un uso responsable de la
aplicación y de los datos gestionados a través de la misma, cumpliendo con la normativa
vigente en materia de protección de datos.

El desarrollador no se hace responsable de la gestión, almacenamiento o protección de los datos introducidos en la aplicación. Es responsabilidad del usuario asegurarse de que los datos gestionados a través de la aplicación cumplen con las leyes y regulaciones aplicables, incluyendo pero no limitándose a la Ley de Protección de Datos Personales.

### Funcionalidades principales

- Gestión de alumnos, empresas, centros educativos y ciclos formativos.
- Creación de convenios de colaboración y relaciones alumno-empresa.
- Asignación de horarios semanales y cálculo automático de fechas de fin de prácticas, descontando festivos del centro y de la empresa (por localidad).
- Generación de documentos oficiales: relación de alumnos, plan formativo individual, ficha de seguimiento, valoración final, calendario de prácticas y carta a la empresa.
- Envío de correos electrónicos con documentos adjuntos.
- Panel de control con resumen, estadísticas gráficas, tabla de Seguridad Social y control de firmas.
- Histórico de comunicaciones y cambios de estado.
- Cifrado de la base de datos con contraseña maestra.
- Avisos y notificaciones automáticas.

---

## 2. Primeros pasos

### 2.1 Uso

Descarga la última versión portable `.zip` desde la página de distribución. Descomprime el archivo y ejecuta el programa `GestorFFE.exe`.

### 2.2 Inicio de sesión / Desbloqueo

Si la base de datos está protegida con contraseña, al iniciar la aplicación aparecerá la pantalla de desbloqueo.

> `[IMAGEN: Pantalla de desbloqueo con un campo de contraseña y fondo oscuro degradado]`

Introduce la contraseña maestra y pulsa **Desbloquear**. Si es la primera vez que usas la aplicación, se creará una base de datos vacía sin contraseña.

> ⚠️ Se recomienda cifrar la base de datos para proteger la información de los alumnos/as.

### 2.3 Configuración inicial

Antes de comenzar, dirígete a **Configuración** revisa los parámetros configurables de la aplicación y no te olvides de configurar tu correo si planeas enviar emails desde la aplicación. Consulta la sección [11. Correo Electrónico](#11-correo-electrónico) para más detalles.

En la seccion **Seguridad** podrás introducir una contraseña para cifrar la base de datos. Consulta la sección [15. Seguridad y Cifrado](#15-seguridad-y-cifrado)

> **MUY importante**, una vez cifrada la base de datos, esta operación **NO se puede revertir** y SIEMPRE quedará cifrada, por lo que si decides cifrar **NO** olvides la contraseña dado que no se puede recuperar y **los datos se perderían para siempre**.

### 2.4 Estructura de la navegación

> `[IMAGEN: Barra lateral izquierda con todos los módulos visibles: Profesor, Cursos, Alumnos, Empresas, Intereses, Convenios, Relaciones, Panel, Configuración, Histórico]`

La navegación principal se encuentra en la barra lateral izquierda. Cada icono corresponde a un módulo:

| Icono | Módulo | Descripción |
|-------|--------|-------------|
| 🧑‍🏫 | Profesor | Datos personales, centros educativos y ciclos |
| 📖 | Cursos | Gestión de cursos académicos |
| 📊 | Panel | Dashboard, estadísticas y Seguridad Social |
| 👥 | Alumnos | Gestión del alumnado |
| 🏢 | Empresas | Empresas colaboradoras y tutores |
| 🔗 | Intereses | Preferencias alumno-empresa |
| 📄 | Convenios | Convenios de colaboración |
| 🤝 | Relaciones | Periodos de prácticas |

En la parte superior podemos encontrar otra sección de iconos que nos llevan a elementos más generales:
| Icono | Módulo | Descripción |
|-------|--------|-------------|
| 🕓 | Histórico | Auditoría de operaciones |
| 🔔 | Avisos | Ver y crear nuevos avisos |
| ⚙️ | Configuración | Avisos, festivos, correo y seguridad |

> ℹ️ En esta fila superior encontraremos un selector de ciclo, pudiendo elegir entre diferentes ciclos de los que seamos tutores de FFE.

---

## 🧑‍🏫 3. Módulo de Profesor

> `[IMAGEN: Vista del módulo Profesor con el formulario de datos personales y la lista de centros educativos]`

### 3.1 Datos del profesor

Completa tus datos personales: nombre, apellidos, NIF, correo electrónico y teléfono. Estos datos se incluirán en la documentación generada.

### 3.2 Centros educativos

Gestiona los centros educativos a los que perteneces. Cada centro puede tener:

- Nombre, ciudad, teléfono y correo electrónico.
- **Festivos del centro:** días no laborables que se descontarán del cálculo de fechas de prácticas.

> `[IMAGEN: Modal de creación/edición de centro educativo con campo de festivos]`

### 3.3 Ciclos formativos (Detalles académicos)

Dentro de cada centro, puedes gestionar los ciclos formativos:

- Código, nombre del ciclo, nivel, grado (medio/superior), régimen (presencial/distancia) y código de grupo.
- **Resultados de aprendizaje:** define los módulos profesionales, sus códigos y los resultados de aprendizaje asociados.
- **Tutorías:** selecciona las fechas de tutoría que se marcarán en el calendario de prácticas.

---

## 📖 4. Cursos

> `[IMAGEN: Listado de cursos con tabla de cursos académicos]`

Gestiona los cursos académicos. Cada curso tiene una descripción, fecha de inicio y fecha de fin.

> ⚠️ **Importante:** Al crear un nuevo curso, los alumnos, relaciones e intereses del curso anterior se eliminan automáticamente (las empresas y convenios se conservan).

---

## 👥 5. Alumnos

> `[IMAGEN: Vista de alumnos en modo grid con tarjetas]`

### 5.1 Gestión manual

Desde el módulo de Alumnos puedes:

- **Añadir alumno:** introduce datos personales, DNI, número de Seguridad Social, teléfonos, correos electrónicos (educamadrid y personal), fecha de nacimiento, horas FFE y fechas de prácticas.
- **Editar / Eliminar:** modifica o elimina alumnos existentes.
- **Subir CV:** adjunta el currículum vitae del alumno en formato PDF.
- **Asignar ciclo formativo:** vincula el alumno a un detalle académico (centro + ciclo).

> `[IMAGEN: Modal de creación/edición de alumno con todos los campos]`

### 5.2 Importación masiva desde Excel

Puedes importar múltiples alumnos desde un archivo Excel:

1. Pulsa el botón **Importar Excel**.
2. Descarga la plantilla si es necesario.
3. Selecciona el archivo (`.xlsx`, `.xls` o `.csv`).
4. Los datos se importarán automáticamente.

> `[IMAGEN: Botón de importar Excel con diálogo de selección de archivo]`

### 5.3 Vista grid / tabla

Cambia entre la vista de tarjetas (grid) y la vista de tabla usando el selector superior derecho. Puedes buscar, filtrar por cualquier campo y ordenar los resultados.

---

## 🏢 6. Empresas

> `[IMAGEN: Listado de empresas con buscador y filtros]`

### 6.1 Gestión de empresas

Registra las empresas colaboradoras con sus datos:

- Nombre, dirección, ciudad, CIF, correo electrónico, teléfono, persona de contacto, comunidad autónoma y provincia.
- **Nota:** La ciudad de la empresa se utiliza para determinar los festivos de empresa aplicables (ver [Configuración → Festivos](#133-festivos)).

> `[IMAGEN: Modal de creación/edición de empresa]`

### 6.2 Tutores de empresa

Cada empresa puede tener uno o varios tutores. Gestiona sus datos: nombre, apellidos, NIF, correo y teléfono. El tutor seleccionado en una relación será el contacto principal para las comunicaciones.

> `[IMAGEN: Panel de tutores dentro de la ficha de una empresa]`

### 6.3 Estadísticas por empresa

Para cada empresa y curso puedes registrar:

- Número de alumnos acogidos.
- Número de alumnos contratados tras las prácticas.
- Valoración (puntuación de 0 a 5).

### 6.4 Importación desde Excel

Al igual que con los alumnos, puedes importar empresas desde un archivo Excel.

### 6.5 Filtros avanzados

Filtra las empresas por valoración mínima, últimos cursos con colaboración o estado de colaboración.

---

## 🔗 7. Intereses Alumno-Empresa

> `[IMAGEN: Vista de intereses con sidebar de alumnos y grid de empresas con toggles]`

Este módulo permite registrar las preferencias bidireccionales entre alumnos y empresas:

- **Alumno interesado en empresa:** el alumno ha mostrado interés en realizar prácticas en esa empresa.
- **Empresa interesada en alumno:** la empresa ha mostrado interés en acoger a ese alumno.

Usa los botones de toggle en cada celda para activar/desactivar los intereses. Puedes filtrar por empresa y buscar alumnos en la barra lateral.

---

## 📄 8. Convenios

> `[IMAGEN: Listado de convenios con filtros por empresa y estado]`

### 8.1 Gestión

Los convenios formalizan la colaboración entre el centro educativo y una empresa. Cada convenio incluye:

- Número de convenio y fecha.
- Empresa, curso y centro educativo asociados.
- Tipo de firma (Digital / Manual / Sin asignar).

### 8.2 Flujo de estados

El convenio avanza a través de estos estados:

```
PENDIENTE_ENVIAR → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_ENVIAR_DIRECTOR → PENDIENTE_FIRMA_DIRECTOR → COMPLETADO
```

Usa los botones **Avanzar** / **Retroceder** para mover el convenio entre estados. Solo los convenios en estado `COMPLETADO` pueden asociarse a una relación.

> `[IMAGEN: Detalle de convenio con botones de avance/retroceso de estado]`

---

## 🤝 9. Relaciones Alumno-Empresa

> `[IMAGEN: Listado de relaciones con filtros y buscador]`

### 9.1 Creación de una relación

Una relación vincula a uno o varios alumnos con una empresa para un período de prácticas.

Para crear una relación:

1. Pulsa **Nueva Relación**.
2. Introduce el **número de relación**.
3. Selecciona un **convenio** (debe estar en estado COMPLETADO).
4. Selecciona un **tutor de empresa**.
5. Configura el **horario semanal** (horas por día).
6. Añade los **alumnos** que participan en esta relación.
7. Define las **horas FFE** y la **fecha de inicio** para cada alumno.
8. Selecciona el **estado de tramitación**.

> `[IMAGEN: Modal de creación de relación con campos de convenio, tutor, horario y alumnos]`

### 9.2 Horario semanal

Puedes configurar el horario de prácticas de dos formas:

- **Configuración rápida:** establece hora de inicio, fin y horas totales, selecciona los días de la semana y pulsa **Aplicar horario a la semana**.
- **Detalle por día:** ajusta individualmente cada día de la semana (inicio, fin y horas).

### 9.3 Cálculo automático de fecha de fin

El sistema calcula automáticamente la **fecha estimada de fin** para cada alumno en función de:

- **Horas FFE:** total de horas que debe completar el alumno.
- **Horario semanal:** días y horas de práctica por semana.
- **Festivos del centro:** se descartan si están activados en Configuración.
- **Festivos de empresa (por localidad):** se descartan si están activados en Configuración.
- **Tutorías:** fechas de tutoría que se marcan en el calendario.

El cálculo se actualiza en tiempo real al modificar las horas, la fecha de inicio o el horario. También puedes usar **Fecha Fin Objetivo** para calcular la fecha de inicio retroactivamente.

> `[IMAGEN: Detalle de alumno en la relación con horas FFE, fecha inicio y fin estimado]`

### 9.4 Flujo de estados de la relación

```
PENDIENTE_ENVIAR_EMPRESA → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_ENVIAR_DIRECTOR → PENDIENTE_FIRMA_DIRECTOR → COMPLETADO
```

### 9.5 Estados individuales por alumno

Cada alumno tiene tres estados independientes:

- **Plan Formativo:** ```PENDIENTE_ENVIAR_ESTUDIANTE → PENDIENTE_FIRMAR_ESTUDIANTE → PENDIENTE_ENVIAR_EMPRESA → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_FIRMA_TUTOR → COMPLETADO```
- **Seguimiento:** ```PENDIENTE → ENVIADO_A_EMPRESA → RECIBIDO```
- **Valoración:** ```PENDIENTE → ENVIADO_A_EMPRESA → RECIBIDO```

> `[IMAGEN: Detalle de relación con los estados individuales de cada alumno]`

---

## 10. Generación de Documentos

### 10.1 Tipos de documento

| Documento | Formatos | Alumno / Relación | Descripción |
|-----------|----------|-------------------|-------------|
| Relación de alumnos | DOCX, PDF | Relación | Listado de alumnos vinculados a la relación |
| Plan Formativo | DOCX, PDF | Individual | Plan de formación personalizado por alumno |
| Ficha de Seguimiento | DOCX | Individual | Seguimiento periódico del alumno |
| Valoración Final | DOCX | Individual | Valoración final del alumno |
| Calendario de Prácticas | PDF | Individual | Calendario mensual con código de colores |
| Carta a la Empresa | PDF | Relación | Carta informativa para la empresa |

### 10.2 Descarga individual

Desde el detalle de una relación, usa los botones **Descargar** junto a cada tipo de documento. Selecciona DOCX o PDF según el formato disponible.

### 10.3 Descarga masiva

Puedes descargar múltiples documentos de una o varias relaciones en un solo archivo ZIP o guardarlos directamente en disco:

1. Pulsa **Descargar todo**.
2. Selecciona los tipos de documento que deseas incluir.
3. Confirma la selección.

El comportamiento depende del modo configurado en **Configuración → General → Creación de ficheros**:

- **Descargar (ZIP):** se genera un archivo ZIP con la estructura `{empresa}/{alumno}/{documento}` y se descarga por el navegador.
- **Guardar en carpeta docs/:** los documentos se guardan directamente en la carpeta `docs/` junto al ejecutable, con la misma estructura de subcarpetas.

### 10.4 Guardar en carpeta (modo sin descarga)

Cuando se selecciona **Guardar en carpeta docs/** en la configuración, los documentos no se descargan por el navegador sino que se almacenan automáticamente en el disco:

- Todos los documentos se guardan en `docs/{nombre_empresa}/`.
- Si la opción **Crear una carpeta por estudiante** está activa (por defecto lo está), los documentos individuales (plan formativo, seguimiento, valoración, calendario) se organizan en subcarpetas por alumno: `docs/{empresa}/{alumno}/`.
- Los documentos comunes de la relación (relación de alumnos, carta a la empresa) se guardan siempre en la carpeta de la empresa.
- Al usar **Descargar todo** en este modo, los documentos se generan y guardan directamente en las carpetas correspondientes sin crear un ZIP, mostrando una barra de progreso.

### 10.5 Calendario de prácticas

El calendario generado en PDF muestra cada mes del período de prácticas con un código de colores:

| Color | Significado |
|-------|-------------|
| Verde | Día laborable (prácticas) |
| Rojo | Festivo (centro o empresa) |
| Naranja | Tutoría |
| Azul | Fecha de inicio o fin |
| Gris | Fin de semana o día fuera del período |

> `[IMAGEN: Ejemplo de calendario de prácticas PDF con código de colores]`

---

## 11. Correo Electrónico

### 11.1 Configuración SMTP

Antes de enviar correos, configura el servidor SMTP en **Configuración → Correo**:

- Servidor (host) y puerto.
- Usuario y contraseña.
- Dirección de correo remitente.
- Conexión segura (SSL/TLS).
- Delay entre envíos (milisegundos) para envíos masivos.

Pulsa **Probar configuración** para verificar que los datos son correctos.

> `[IMAGEN: Formulario de configuración SMTP]`

### 11.2 Envío de correos

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

### 11.3 Guardado en la carpeta Enviados

El servidor SMTP de EducaMadrid no guarda por sí mismo una copia de los correos que se envían desde aplicaciones externas. Para que los envíos aparezcan en la carpeta **Enviados** de tu webmail, la aplicación guarda automáticamente una copia del mensaje en el servidor mediante **IMAP** justo después de enviarlo.

En **Configuración → Correo → Guardar copia en el servidor (Enviados)** puedes:

- **Activar o desactivar** el guardado de copias. Está activado por defecto.
- Ajustar los datos de conexión IMAP: **servidor**, **puerto**, **carpeta** y **conexión segura SSL/TLS**.

Los valores por defecto son `imap.educa.madrid.org`, puerto `993`, conexión segura activada y carpeta `Sent`. Se reutilizan el usuario y la contraseña configurados para el envío (SMTP).

> El guardado en Enviados es opcional y no bloquea el envío: si la conexión IMAP falla, el correo se envía igualmente y solo se omite la copia en el servidor. En los envíos reales la copia IMAP se hace en segundo plano (no retrasa la entrega) y la conexión se reintenta varias veces con timeouts amplios; el botón **Probar configuración** sí espera al guardado IMAP y muestra si la copia se guardó correctamente.

> El servidor IMAP de EducaMadrid usa un certificado no firmado por una CA pública, por lo que la conexión IMAP se realiza **sin validar la cadena de certificados** (el tráfico sigue cifrado con TLS, ejecutándose el login del usuario con su contraseña SMTP). Si necesitas conexiones IMAP con validación estricta, usa un servidor con certificado válido.

### 11.4 Plantillas de correo

Las plantillas de correo permiten crear mensajes predefinidos reutilizables que incorporan datos dinámicos mediante **marcadores**. Se gestionan desde **Configuración → Correo → Plantillas**.

#### 11.4.1 Gestión de plantillas

Desde la sección Plantillas puedes:

- **Crear plantilla personalizada:** pulsa **Nueva Plantilla**, asigna un nombre, una descripción, un color y el ámbito de aplicación (Empresas / Relaciones / Todos). Las plantillas creadas por el usuario usan siempre el icono `✏️` (PencilRuler) y pueden editarse y eliminarse libremente.
- **Editar plantilla:** haz clic en una tarjeta o en su icono de lápiz para abrir el editor completo. Las plantillas de sistema (predefinidas) solo pueden visualizarse, no editarse.
- **Eliminar plantilla:** las plantillas personalizadas pueden eliminarse mediante el botón de papelera, con confirmación previa. Las plantillas de sistema no se pueden eliminar.
- **Filtrar por ámbito:** usa los filtros superiores para ver plantillas de Empresas, Relaciones o Todos los ámbitos.

#### 11.4.2 Editor WYSIWYG

Al editar una plantilla, se abre un editor visual basado en **TipTap** con las siguientes herramientas:

- Negrita, cursiva, tachado, código en línea.
- Títulos (H1–H4).
- Colores de texto y fondo (selector de color hexadecimal).
- Listas ordenadas y no ordenadas.
- Alineación (izquierda, centrada, derecha, justificada).
- Enlaces.
- Deshacer / Rehacer.

El cuerpo de la plantilla puede incluir **marcadores** (ver sección 11.5) que serán reemplazados por datos reales al enviar el correo.

#### 11.4.3 Tarjetas de plantilla

Cada plantilla se muestra como una tarjeta con:
- **Icono y color:** las plantillas de sistema tienen icono y color predefinidos. Las personalizadas usan PencilRuler con el color hex seleccionado.
- **Nombre y descripción.**
- **Ámbito de aplicación** (Empresas, Relaciones o Todos).
- **Botón de editar** (lápiz, aparece al hacer hover) — no visible en la plantilla "Otros".
- **Botón de eliminar** (papelera, aparece al hacer hover) — solo en plantillas personalizadas.

#### 11.4.4 La plantilla "Otros"

La plantilla **"Otros"** es una plantilla de sistema especial:
- **No tiene contenido editable** — se usa como opción genérica para cualquier situación.
- **Aparece en todos los ámbitos** (lleva asociado el ámbito "Todos").
- **Siempre se muestra la última** en el selector de plantillas, tanto en empresa como en relaciones.
- **No muestra botón de editar** ni se puede eliminar.
- Se distingue visualmente mostrando "Todos" como ámbito.

### 11.5 Marcadores

Los marcadores son códigos insertados en el cuerpo de las plantillas que se reemplazan automáticamente por datos reales del alumno, empresa o relación al enviar el correo.

#### 11.5.1 Marcadores predefinidos de sistema

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

#### 11.5.2 Marcadores personalizados

Además de los marcadores de sistema, puedes crear **marcadores personalizados** a tu medida. Se gestionan desde **Configuración → Correo → Marcadores**.

**Crear un marcador personalizado:**
1. Pulsa **Nuevo Marcador**.
2. Introduce un **nombre** (sin llaves, p.ej. `telefono_alumno`).
3. El sistema generará automáticamente el código `{{telefono_alumno}}`.
4. En **Valor HTML**, escribe el contenido que sustituirá al marcador (texto plano o HTML básico sin etiquetas de párrafo).

Los marcadores personalizados se renderizan con un editor WYSIWYG reducido y se almacenan con limpieza automática de etiquetas no deseadas.

**Editar o eliminar:** usa los iconos de lápiz y papelera en cada tarjeta de marcador. La eliminación requiere confirmación.

#### 11.5.3 Aplicación de marcadores

Cuando envías un correo usando una plantilla desde los módulos de **Empresas** o **Relaciones**:

1. Selecciona la plantilla en el selector.
2. El sistema carga la plantilla y **reemplaza automáticamente** los marcadores de sistema (`{{profesor.nombre}}`, `{{empresa.nombre}}`, etc.) y personalizados (`{{per_...}}`) con los valores reales del alumno, empresa o relación seleccionados.
3. Los marcadores **por destinatario** (`{{@contacto}}`, `{{@nombreEmpresa}}`) **no se reemplazan** en el editor, ya que su valor depende de cada destinatario cuando se envía a múltiples empresas.
4. Pulsa **Enviar** — justo antes del envío, el sistema resuelve los marcadores `{{@...}}` individualmente para cada destinatario.

> ⚠️ Los marcadores con `@` (p.ej. `{{@contacto}}`) se ven en el editor y solo se sustituyen en el momento del envío, permitiendo enviar el mismo correo a varias empresas con los datos personalizados de cada una.

### 11.6 Integración con Empresas y Relaciones

Al enviar un correo desde los módulos de **Empresas** o **Relaciones**:
1. Se muestra un selector modal con todas las plantillas aplicables al ámbito actual.
2. Las plantillas aparecen ordenadas, con "Otros" siempre al final.
3. Cada plantilla se muestra con su icono, color, nombre y descripción.
4. Al seleccionar una plantilla, se carga en el editor de correo y puedes personalizar el mensaje antes de enviarlo.

---

## 12. Panel de Control

> `[IMAGEN: Panel de control con las cuatro pestañas visibles]`

### 12.1 Resumen

Tabla completa de todos los alumnos con su estado actual en cada proceso: convenio, relación, plan formativo, seguimiento y valoración. Puedes filtrar por cualquier columna y ordenar los resultados.

> `[IMAGEN: Tabla de resumen con filtros activos]`

### 12.2 Estadísticas

Gráficas circulares y de barras que muestran:

- Distribución de alumnos por empresa.
- Alumnos con/sin prácticas.
- Estados de convenios, relaciones, planes formativos, seguimientos y valoraciones.

### 12.3 Seguridad Social

> `[IMAGEN: Tabla de Seguridad Social con alumnos por filas y meses por columnas]`

Tabla que muestra los **días de cotización** por alumno y mes. El cálculo considera:

- Horario semanal del alumno.
- Festivos del centro educativo.
- Festivos de la empresa (por localidad).

Usa los filtros para buscar por nombre y mostrar solo alumnos con FFE o con prácticas iniciadas.

### 12.4 Firmas

Tabla imprimible con el tipo de firma (Digital / Manual / Sin asignar) de cada documento para todos los alumnos.

---

## 13. Configuración

### 13.1 General

#### Avisos automáticos

Configura con cuántas semanas de antelación se generan los avisos:

- **Semanas antes del inicio:** aviso para alumnos que empiezan prácticas próximamente.
- **Semanas antes del inicio (documentos):** aviso para alumnos con documentación pendiente.
- **Semanas antes del fin:** aviso para alumnos que finalizan prácticas próximamente.

> `[IMAGEN: Sección de configuración de avisos]`

#### Festivos del centro

Activa o desactiva la opción **Usar días festivos del centro** para que los festivos del centro educativo se descuenten del cálculo de fechas de fin de prácticas y días de Seguridad Social.

#### Festivos de empresa

Activa o desactiva la opción **Usar días festivos de empresa** para descontar los festivos locales de la empresa en el cálculo.

**Gestión de festivos por localidad:**

1. Pulsa **Gestionar festivos por localidad**.
2. Selecciona la localidad cuyos festivos deseas configurar.
3. Añade o elimina fechas manualmente.
4. Usa **Obtener festivos** para importar automáticamente los festivos desde la API de Calendarios Nacionales (localidades de Madrid).

> `[IMAGEN: Modal de gestión de festivos de empresa por localidad con lista de fechas]`

#### Creación de ficheros

Configura cómo se generan los documentos (DOCX, PDF, XLSX):

- **Modo de creación:**
  - **Descargar:** los documentos se descargan por el navegador a la carpeta de descargas del sistema.
  - **Guardar en carpeta docs/:** los documentos se guardan automáticamente en la carpeta `docs/` junto al ejecutable de la aplicación, organizados por empresa.
- **Crear una carpeta por estudiante:** cuando está marcado, dentro de la carpeta de cada empresa se crean subcarpetas por alumno para los documentos individuales (plan formativo, seguimiento, valoración, calendario). Los documentos comunes (relación, carta) se guardan siempre en la carpeta de la empresa.

> `[IMAGEN: Sección de configuración de creación de ficheros con selector de modo y checkbox]`

### 13.2 Correo

Configuración del servidor SMTP (ver sección [11.1](#111-configuración-smtp)).

### 13.3 Seguridad

#### Cifrado de la base de datos

Puedes proteger la base de datos con una contraseña maestra usando cifrado SQLCipher.

**Importante:** La contraseña no es recuperable. Si la olvidas, los datos serán irrecuperables.

- Para **cifrar**: introduce una contraseña y confírmala.
- Para **cambiar la contraseña**: introduce la contraseña actual y la nueva.
- Para **descifrar**: deja la contraseña en blanco.

> `[IMAGEN: Pantalla de configuración de seguridad con campos de contraseña]`

---

## 14. Histórico / Auditoría

> `[IMAGEN: Vista del histórico con pestañas de comunicaciones, convenios, relaciones y cambios de estado]`

### 14.1 Comunicaciones

Registro de todos los correos electrónicos enviados desde la aplicación: destinatario, asunto, fecha y adjuntos. Puedes filtrar por destinatario, rango de fechas, contenido o si incluye adjuntos.

### 14.2 Convenios

Operaciones realizadas sobre convenios: creación, modificación y eliminación, con fecha y tipo de operación.

### 14.3 Relaciones

Operaciones realizadas sobre relaciones (CREATE, UPDATE, DELETE).

### 14.4 Cambios de Estado

Registro detallado de todos los cambios de estado en los procesos: convenio, relación, plan formativo, seguimiento y valoración, indicando el estado anterior y el nuevo.

---

## 15. Seguridad y Cifrado

### 15.1 Cifrado de base de datos

La aplicación utiliza SQLCipher para cifrar la base de datos SQLite. Cuando la base de datos está cifrada:

- Al iniciar la aplicación, se muestra la pantalla de bloqueo.
- Sin la contraseña correcta, no se puede acceder a los datos.
- La contraseña se mantiene en memoria durante la sesión.

### 15.2 Bloqueo manual

Puedes bloquear la aplicación manualmente desde el icono de candado en la barra superior. La aplicación se bloquea y requiere la contraseña para reanudar.

## 16. Servicios conectados
Desde Gestor FFE se usan los siguientes servicios:

| Icono | URL | Uso|
|-------|-----|--------|
| <img src="https://calendariosnacionales.com/logo-mark.svg" width="40" height="40"> | https://calendariosnacionales.com/ |Obtención automática de los días festivos|

**¡Gracias!**

---

## 17. Preguntas Frecuentes

**¿Cómo se calcula la fecha de fin de prácticas?**
El sistema suma las horas FFE del alumno día a día según su horario semanal, saltando los festivos del centro y de la empresa (si están activados) y los fines de semana no laborables.

**¿Qué ocurre si creo un nuevo curso?**
Los alumnos, relaciones e intereses del curso anterior se eliminan. Las empresas y convenios se conservan para el nuevo curso.

**¿Puedo importar alumnos desde Excel?**
Sí, desde el módulo de Alumnos puedes importar mediante Excel. Descarga la plantilla desde el propio botón de importación.

**¿Los festivos de empresa se importan automáticamente?**
Sí, desde el modal de gestión de festivos de empresa puedes obtener los festivos de una localidad automáticamente a través de la API de Calendarios Nacionales (soporta localidades de la Comunidad de Madrid).

**¿Cómo recupero la contraseña de la base de datos?**
No es posible recuperarla. Si olvidas la contraseña, los datos serán irrecuperables. Guarda la contraseña en un lugar seguro.

**¿Puedo enviar correos a múltiples destinatarios?**
Sí, el sistema soporta envío masivo con un delay configurable entre cada envío para evitar bloqueos del servidor SMTP.

**¿Los documentos se generan en el servidor o en el cliente?**
Los documentos DOCX y PDF se generan en el servidor Express utilizando docxtemplater (DOCX) y Puppeteer (PDF).

**¿Dónde se almacenan los archivos adjuntos temporales?**
En el directorio `uploads/` junto a la aplicación. Los adjuntos se limpian automáticamente tras el envío o al cerrar la aplicación.
