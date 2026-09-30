# 2. Primeros pasos

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

## 2.1 Uso

Descarga la última versión portable `.exe` desde la página de distribución. Ejecuta el archivo `GestorFFE.exe`.

## 2.2 Inicio de sesión / Desbloqueo

Si la base de datos está protegida con contraseña, al iniciar la aplicación aparecerá la pantalla de desbloqueo.

> `[IMAGEN: Pantalla de desbloqueo con un campo de contraseña y fondo oscuro degradado]`

Introduce la contraseña maestra y pulsa **Desbloquear**. Si es la primera vez que usas la aplicación, se creará una base de datos vacía sin contraseña.

> ⚠️ Se recomienda cifrar la base de datos para proteger la información de los alumnos/as.

## 2.3 Configuración inicial

Antes de comenzar, dirígete a **Configuración** revisa los parámetros configurables de la aplicación y no te olvides de configurar tu correo si planeas enviar emails desde la aplicación. Consulta la sección [11. Correo Electrónico](11-correo-electronico.md#11-correo-electrónico) para más detalles.

En la seccion **Seguridad** podrás introducir una contraseña para cifrar la base de datos. Consulta la sección [15. Seguridad y Cifrado](15-seguridad-y-cifrado.md#15-seguridad-y-cifrado)

> **MUY importante**, una vez cifrada la base de datos, los datos quedarán cifrados, por lo que si decides cifrar **NO** olvides la contraseña dado que no se puede recuperar y **los datos se perderían para siempre**.

## 2.4 Estructura de la navegación

> `[IMAGEN: Barra lateral izquierda con todos los módulos visibles: Profesor, Cursos, Centros, Panel, Alumnos, Empresas, Intereses, Convenios, Relaciones, Enviar a la DAT, Configuración, Histórico]`

La navegación principal se encuentra en la barra lateral izquierda. Cada icono corresponde a un módulo:

> ℹ️ Solo **Profesor** está disponible siempre. Todos los demás módulos aparecen en gris y
> no se pueden abrir hasta que tengas un profesor configurado **y** un curso académico creado.
> Para desbloquearlos, ve a **Cursos** y crea el curso.

> ℹ️ **Enviar a la DAT** solo aparece si tienes un profesor y un curso seleccionados, y si en
> Configuración el envío a la DAT está en modo **Es necesario**. Consulta la sección
> [18. Comunicaciones DAT](18-comunicaciones-dat.md).

| Icono | Módulo | Descripción |
|-------|--------|-------------|
| 🧑‍🏫 | Profesor | Tus datos personales |
| 📖 | Cursos | Gestión de cursos académicos |
| 🏫 | Centros | Centros educativos y sus ciclos formativos |
| 📊 | Panel | Dashboard, estadísticas y Seguridad Social |
| 👥 | Alumnos | Gestión del alumnado |
| 🏢 | Empresas | Empresas colaboradoras y tutores |
| 🔗 | Intereses | Preferencias alumno-empresa |
| 📄 | Convenios | Convenios de colaboración |
| 🤝 | Relaciones | Periodos de prácticas |
| 📤 | Enviar a la DAT | Comunicaciones a la DAT y su estado de trámite |

En la parte superior podemos encontrar otra sección de iconos que nos llevan a elementos más generales:

| Icono | Módulo        | Descripción                                                         |
|-------|---------------|---------------------------------------------------------------------|
| 🕓 | Histórico     | Auditoría de operaciones                                            |
| 💻 | Tema          | Cambio rápido entre tema claro, oscura y del sistema                |
| ⬇️ | Descarga      | Este icono solo es visible cuando una nueva versión está disponible |
| 🔔 | Avisos        | Ver y crear nuevos avisos                                           |
| ⚙️ | Configuración | Avisos, festivos, correo y seguridad                                |

> ℹ️ En esta fila superior encontraremos un selector de ciclo, pudiendo elegir entre diferentes ciclos de los que seamos tutores de FFE.

---

[← Introducción](01-introduccion.md)  |  [Índice](README.md)  |  [Módulo de Profesor →](03-modulo-de-profesor.md)
