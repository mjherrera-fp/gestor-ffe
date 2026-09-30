# 10. Generación de Documentos

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

## 10.1 Tipos de documento

| Documento | Formatos | Alumno / Relación | Descripción |
|-----------|----------|-------------------|-------------|
| Relación de alumnos | DOCX, PDF | Relación | Listado de alumnos vinculados a la relación |
| Plan Formativo | DOCX, PDF | Individual | Plan de formación personalizado por alumno |
| Ficha de Seguimiento | DOCX | Individual | Seguimiento periódico del alumno |
| Valoración Final | DOCX | Individual | Valoración final del alumno |
| Calendario de Prácticas | PDF | Individual | Calendario mensual con código de colores |
| Carta a la Empresa | PDF | Relación | Carta informativa para la empresa |

## 10.2 Descarga individual

Desde el detalle de una relación, usa los botones **Descargar** junto a cada tipo de documento. Selecciona DOCX o PDF según el formato disponible.

## 10.3 Descarga masiva

Puedes descargar múltiples documentos de una o varias relaciones en un solo archivo ZIP o guardarlos directamente en disco:

1. Pulsa **Descargar todo**.
2. Selecciona los tipos de documento que deseas incluir.
3. Confirma la selección.

El comportamiento depende del modo configurado en **Configuración → General → Creación de ficheros**:

- **Descargar (ZIP):** se genera un archivo ZIP con la estructura `{empresa}/{alumno}/{documento}` y se descarga por el navegador.
- **Guardar en carpeta docs/:** los documentos se guardan directamente en la carpeta `docs/` junto al ejecutable, con la misma estructura de subcarpetas.

## 10.4 Guardar en carpeta (modo sin descarga)

Cuando se selecciona **Guardar en carpeta docs/** en la configuración, los documentos no se descargan por el navegador sino que se almacenan automáticamente en el disco:

- Todos los documentos se guardan en `docs/{nombre_empresa}/`.
- Si la opción **Crear una carpeta por estudiante** está activa (por defecto lo está), los documentos individuales (plan formativo, seguimiento, valoración, calendario) se organizan en subcarpetas por alumno: `docs/{empresa}/{alumno}/`.
- Los documentos comunes de la relación (relación de alumnos, carta a la empresa) se guardan siempre en la carpeta de la empresa.
- Al usar **Descargar todo** en este modo, los documentos se generan y guardan directamente en las carpetas correspondientes sin crear un ZIP, mostrando una barra de progreso.

## 10.5 Calendario de prácticas

El calendario generado en PDF muestra cada mes del período de prácticas con un código de colores:

| Color | Significado |
|-------|-------------|
| Verde | Día laborable (prácticas) |
| Rojo | Día no lectivo: festivo del centro o de la empresa, o día marcado como propio del alumno |
| Naranja | Tutoría |
| Azul | Fecha de inicio o fin |
| Gris | Fin de semana o día fuera del período |

El calendario tiene en cuenta los **días no lectivos propios de cada alumno** (ver
[Relaciones Alumno-Empresa](09-relaciones-alumno-empresa.md)): un día que el alumno marcó
como no lectivo aparece en rojo aunque no sea festivo oficial, y un festivo al que el
alumno asiste aparece en verde.

> `[IMAGEN: Ejemplo de calendario de prácticas PDF con código de colores]`

---

[← Relaciones Alumno-Empresa](09-relaciones-alumno-empresa.md)  |  [Índice](README.md)  |  [Correo Electrónico →](11-correo-electronico.md)
