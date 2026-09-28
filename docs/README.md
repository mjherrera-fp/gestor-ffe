# Manual de Gestor FFE

Documentación de uso de la aplicación, dividida en un documento por módulo.

**Versión:** 0.1.20-alpha · **Plataforma:** Windows (portable) · **18 documentos**

## Contenido

| # | Documento | Qué encontrarás |
|---|-----------|-----------------|
| 1 | [Introducción](01-introduccion.md) | Qué es la aplicación, condiciones de uso, copyright y funcionalidades |
| 2 | [Primeros pasos](02-primeros-pasos.md) | Instalación, desbloqueo de la base de datos y estructura de la navegación |
| 3 | [Módulo de Profesor](03-modulo-de-profesor.md) | Tus datos, centros educativos y ciclos formativos |
| 4 | [Cursos](04-cursos.md) | Gestión de los cursos académicos y qué ocurre al crear uno nuevo |
| 5 | [Alumnos](05-alumnos.md) | Alta manual, importación desde Excel, CV y vistas grid/tabla |
| 6 | [Empresas](06-empresas.md) | Empresas colaboradoras, tutores, estadísticas e importación |
| 7 | [Intereses Alumno-Empresa](07-intereses-alumno-empresa.md) | Preferencias bidireccionales entre alumnos y empresas |
| 8 | [Convenios](08-convenios.md) | Creación de convenios y su flujo de estados |
| 9 | [Relaciones Alumno-Empresa](09-relaciones-alumno-empresa.md) | Horarios, cálculo de fecha de fin y estados por alumno |
| 10 | [Generación de Documentos](10-generacion-de-documentos.md) | Tipos de documento, descargas masivas y calendario de prácticas |
| 11 | [Correo Electrónico](11-correo-electronico.md) | SMTP, envío, carpeta Enviados, plantillas y marcadores |
| 12 | [Panel de Control](12-panel-de-control.md) | Resumen, estadísticas, Seguridad Social y firmas |
| 13 | [Configuración](13-configuracion.md) | Avisos, festivos, creación de ficheros, correo y cifrado |
| 14 | [Histórico / Auditoría](14-historico-auditoria.md) | Comunicaciones, convenios, relaciones y cambios de estado |
| 15 | [Seguridad y Cifrado](15-seguridad-y-cifrado.md) | Cifrado SQLCipher y bloqueo de la aplicación |
| 16 | [Servicios conectados](16-servicios-conectados.md) | Servicios externos que usa la aplicación |
| 17 | [Preguntas Frecuentes](17-preguntas-frecuentes.md) | Dudas habituales y sus respuestas |
| 18 | [Comunicaciones DAT](18-comunicaciones-dat.md) | Envíos a la DAT, estados del trámite, documentación y NextCloud |

## Documentación técnica

- [Seguridad interna](seguridad-interna.md) — modelo de seguridad, token de sesión y
  deuda de seguridad conocida. Dirigida a quien mantiene la aplicación, no al usuario final.

## Convenciones

- Los bloques `> \`[IMAGEN: ...]\`` marcan el sitio donde debe insertarse una captura de
  pantalla. Son marcadores de posición: al añadir la imagen, se sustituye la línea
  completa por la imagen en markdown.
- Las advertencias que afectan a la integridad de los datos van marcadas con `⚠️`.
