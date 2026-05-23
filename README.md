# Gestor FFE — Sistema de Gestión de Prácticas Formativas

**Versión:** 0.1.0-alpha  
**Plataforma:** Windows (instalador NSIS / portable)

Aplicación de escritorio para la gestión integral de la Formación en Centros de Trabajo (FCT) / Formación Profesional en Empresa (FFE). Permite administrar alumnos, empresas, convenios, relaciones de prácticas, generación de documentos oficiales, envío de correos electrónicos y cálculo de días de Seguridad Social, todo en un mismo entorno.

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
12. [Panel de Control](#12-panel-de-control)
13. [Configuración](#13-configuración)
14. [Histórico / Auditoría](#14-histórico--auditoría)
15. [Seguridad y Cifrado](#15-seguridad-y-cifrado)
16. [Preguntas Frecuentes](#16-preguntas-frecuentes)

---

## 1. Introducción

**Gestor FFE** es una aplicación de escritorio desarrollada con tecnología web (React + Electron) que centraliza toda la gestión de las prácticas formativas de un centro educativo.

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

### 2.1 Instalación

Descarga el instalador `.exe` o la versión portable `.exe` desde la página de distribución. Ejecuta el instalador y sigue los pasos. En la versión portable, descomprime el archivo y ejecuta `GestorFFE.exe`.

### 2.2 Inicio de sesión / Desbloqueo

Si la base de datos está protegida con contraseña, al iniciar la aplicación aparecerá la pantalla de desbloqueo.

> `[IMAGEN: Pantalla de desbloqueo con un campo de contraseña y fondo oscuro degradado]`

Introduce la contraseña maestra y pulsa **Desbloquear**. Si es la primera vez que usas la aplicación, se creará una base de datos vacía sin contraseña.

### 2.3 Configuración inicial

Antes de comenzar, dirígete a **Configuración → Correo** para configurar los parámetros SMTP si planeas enviar correos desde la aplicación. Consulta la sección [11. Correo Electrónico](#11-correo-electrónico) para más detalles.

### 2.4 Estructura de la navegación

> `[IMAGEN: Barra lateral izquierda con todos los módulos visibles: Profesor, Cursos, Alumnos, Empresas, Intereses, Convenios, Relaciones, Panel, Configuración, Histórico]`

La navegación principal se encuentra en la barra lateral izquierda. Cada icono corresponde a un módulo:

| Icono | Módulo | Descripción |
|-------|--------|-------------|
| 🧑‍🏫 | Profesor | Datos personales, centros educativos y ciclos |
| 📚 | Cursos | Gestión de cursos académicos |
| 👥 | Alumnos | Gestión del alumnado |
| 🏢 | Empresas | Empresas colaboradoras y tutores |
| 🔗 | Intereses | Preferencias alumno-empresa |
| 📄 | Convenios | Convenios de colaboración |
| 🤝 | Relaciones | Periodos de prácticas |
| 📊 | Panel | Dashboard, estadísticas y Seguridad Social |
| ⚙️ | Configuración | Avisos, festivos, correo y seguridad |
| 📋 | Histórico | Auditoría de operaciones |

---

## 3. Módulo de Profesor

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

## 4. Cursos

> `[IMAGEN: Listado de cursos con tabla de cursos académicos]`

Gestiona los cursos académicos. Cada curso tiene una descripción, fecha de inicio y fecha de fin.

**Importante:** Al crear un nuevo curso, los alumnos, relaciones e intereses del curso anterior se eliminan automáticamente (las empresas y convenios se conservan).

---

## 5. Alumnos

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

## 6. Empresas

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

## 7. Intereses Alumno-Empresa

> `[IMAGEN: Vista de intereses con sidebar de alumnos y grid de empresas con toggles]`

Este módulo permite registrar las preferencias bidireccionales entre alumnos y empresas:

- **Alumno interesado en empresa:** el alumno ha mostrado interés en realizar prácticas en esa empresa.
- **Empresa interesada en alumno:** la empresa ha mostrado interés en acoger a ese alumno.

Usa los botones de toggle en cada celda para activar/desactivar los intereses. Puedes filtrar por empresa y buscar alumnos en la barra lateral.

---

## 8. Convenios

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

## 9. Relaciones Alumno-Empresa

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

- **Plan Formativo:** PENDIENTE_ENVIAR_ESTUDIANTE → PENDIENTE_FIRMAR_ESTUDIANTE → PENDIENTE_ENVIAR_EMPRESA → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_FIRMA_TUTOR → COMPLETADO
- **Seguimiento:** PENDIENTE → ENVIADO_A_EMPRESA → RECIBIDO
- **Valoración:** PENDIENTE → ENVIADO_A_EMPRESA → RECIBIDO

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

### 10.3 Descarga masiva en ZIP

Puedes descargar múltiples documentos de una o varias relaciones en un solo archivo ZIP:

1. Pulsa **Descargar todo**.
2. Selecciona los tipos de documento que deseas incluir.
3. Confirma la selección y espera a que se genere el ZIP.
4. El archivo se descargará automáticamente.

> `[IMAGEN: Modal de selección de documentos para descarga masiva]`

### 10.4 Calendario de prácticas

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

- Editor de texto enriquecido.
- Plantillas predefinidas para empresas y estudiantes.
- Adjuntos: sube archivos o selecciona documentos generados por el sistema.
- Autocompletado de contactos.

> `[IMAGEN: Modal de envío de correo con editor y selección de adjuntos]`

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

---

## 16. Preguntas Frecuentes

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
