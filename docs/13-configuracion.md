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

### Festivos de empresa

Activa o desactiva la opción **Usar días festivos de empresa** para descontar los festivos locales de la empresa en el cálculo.

**Gestión de festivos por localidad:**

1. Pulsa **Gestionar festivos por localidad**.
2. Selecciona la localidad cuyos festivos deseas configurar.
3. Añade o elimina fechas manualmente.
4. Usa **Obtener festivos** para importar automáticamente los festivos desde la API de Calendarios Nacionales (localidades de Madrid).

> `[IMAGEN: Modal de gestión de festivos de empresa por localidad con lista de fechas]`

### Creación de ficheros

Configura cómo se generan los documentos (DOCX, PDF, XLSX):

- **Modo de creación:**
  - **Descargar:** los documentos se descargan por el navegador a la carpeta de descargas del sistema.
  - **Guardar en carpeta docs/:** los documentos se guardan automáticamente en la carpeta `docs/` junto al ejecutable de la aplicación, organizados por empresa.
- **Crear una carpeta por estudiante:** cuando está marcado, dentro de la carpeta de cada empresa se crean subcarpetas por alumno para los documentos individuales (plan formativo, seguimiento, valoración, calendario). Los documentos comunes (relación, carta) se guardan siempre en la carpeta de la empresa.

> `[IMAGEN: Sección de configuración de creación de ficheros con selector de modo y checkbox]`

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
