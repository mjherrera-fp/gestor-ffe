# 13. Configuración

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

## 13.1 General

### Avisos automáticos

Configura con cuántas semanas de antelación se generan los avisos:

- **Semanas antes del inicio:** aviso para alumnos que empiezan prácticas próximamente.
- **Semanas antes del inicio (documentos):** aviso para alumnos con documentación pendiente.
- **Semanas antes del fin:** aviso para alumnos que finalizan prácticas próximamente.

> `[IMAGEN: Sección de configuración de avisos]`

### Festivos del centro

Activa o desactiva la opción **Usar días festivos del centro** para que los festivos del centro educativo se descuenten del cálculo de fechas de fin de prácticas y días de Seguridad Social.

Los festivos del centro se editan desde **Centros → Añadir/Editar centro → Calendario**, no desde aquí. Consulta el [módulo de Profesor y sección Centros](03-modulo-de-profesor.md).

### Festivos de empresa

Activa o desactiva la opción **Usar días festivos de empresa** para descontar los festivos locales de la empresa en el cálculo.

**Gestión de festivos por localidad:**

1. Activa **Descontar días festivos de la empresa** para que aparezca la lista.
2. Pulsa **Festivos** en la localidad que quieras configurar.
3. En el modal, pulsa un día del calendario para marcarlo o desmarcarlo. El calendario muestra el curso entero, del primer día al último.
4. Usa **Obtener festivos** para importar los festivos de la localidad desde la API de Calendarios Nacionales (localidades de Madrid), o **Borrar todos** para vaciarlos.

Solo se marcan los días que caen dentro del curso: los que se quedaran fuera se descartan al guardar.

> `[IMAGEN: Modal de días festivos de la empresa con el calendario del curso y la lista de días marcados]`

Los cambios se quedan pendientes hasta que pulses **Guardar Configuración de Festivos**, que además recalcula las fechas de fin de todos los alumnos.

### Creación de ficheros

Configura cómo se generan los documentos (DOCX, PDF, XLSX):

- **Modo de creación:**
  - **Descargar:** los documentos se descargan por el navegador a la carpeta de descargas del sistema.
  - **Guardar en carpeta docs/:** los documentos se guardan automáticamente en la carpeta `docs/` junto al ejecutable de la aplicación, organizados por empresa.
- **Crear una carpeta por estudiante:** cuando está marcado, dentro de la carpeta de cada empresa se crean subcarpetas por alumno para los documentos individuales (plan formativo, seguimiento, valoración, calendario). Los documentos comunes (relación, carta) se guardan siempre en la carpeta de la empresa.

> `[IMAGEN: Sección de configuración de creación de ficheros con selector de modo y checkbox]`

### Envío a la DAT

Indica si, en tu centro, es necesario enviar documentación a la DAT:

- **Es necesario:** muestra el módulo «Enviar a la DAT» en el menú y añade al Panel las columnas **Fecha Envío DAT** y **Estado DAT**.
- **No es necesario:** oculta el módulo y esas dos columnas.

> ⚠️ Después de guardar el cambio **hay que reiniciar la aplicación** para que tome efecto.

> `[IMAGEN: Sección de configuración de envío a la DAT con las dos opciones y el botón de guardar]`

El uso del módulo está explicado en [18. Comunicaciones DAT](18-comunicaciones-dat.md).

## 13.2 Correo

Configuración del servidor SMTP (ver sección [11.1](11-correo-electronico.md#111-configuración-smtp)).

## 13.3 Seguridad

### Cifrado de la base de datos

Puedes proteger la base de datos con una contraseña maestra usando cifrado SQLCipher.

**Importante:** La contraseña no es recuperable. Si la olvidas, los datos serán irrecuperables.

- Para **cifrar**: introduce una contraseña y confírmala.
- Para **cambiar la contraseña**: introduce la contraseña actual y la nueva.
- Para **descifrar**: deja la contraseña en blanco.

> `[IMAGEN: Pantalla de configuración de seguridad con campos de contraseña]`

---

[← Panel de Control](12-panel-de-control.md)  |  [Índice](README.md)  |  [Histórico / Auditoría →](14-historico-auditoria.md)
