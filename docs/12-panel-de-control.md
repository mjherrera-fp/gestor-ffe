# 12. Panel de Control

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

> `[IMAGEN: Panel de control con las cuatro pestañas visibles]`

## 12.1 Resumen

Tabla completa de todos los alumnos con su estado actual en cada proceso: convenio, relación, plan formativo, seguimiento y valoración. Puedes filtrar por cualquier columna y ordenar los resultados.

> ℹ️ Si en **Configuración → Documentos** el envío a la DAT está en modo **Es necesario**, la tabla añade dos columnas más: **Fecha Envío DAT** y **Estado DAT**, con la fecha y el estado de la comunicación a la que está asignado cada alumno. Ver [18. Comunicaciones DAT](18-comunicaciones-dat.md).

> `[IMAGEN: Tabla de resumen con filtros activos]`

## 12.2 Estadísticas

Gráficas circulares y de barras que muestran:

- Distribución de alumnos por empresa.
- Alumnos con/sin prácticas.
- Estados de convenios, relaciones, planes formativos, seguimientos y valoraciones.

## 12.3 Seguridad Social

> `[IMAGEN: Tabla de Seguridad Social con alumnos por filas y meses por columnas]`

Tabla que muestra los **días de cotización** por alumno y mes. El cálculo considera:

- Horario semanal del alumno.
- Festivos del centro educativo.
- Festivos de la empresa (por localidad).

Usa los filtros para buscar por nombre y mostrar solo alumnos con FFE o con prácticas iniciadas.

## 12.4 Firmas

Tabla imprimible con el tipo de firma (Digital / Manual / Sin asignar) de cada documento para todos los alumnos.

## 12.5 Valoración FFE

Informe de valoración de una fecha de evaluación, que se elige en la cabecera. Se elige una fecha concreta porque las horas cumplidas cambian todos los días.

> `[IMAGEN: Valoración FFE con las seis tarjetas de resumen y la tabla de alumnos]`

Arriba van seis tarjetas: alumnos totales, con FFE, no cursada, sin evaluar, todos los RA superados y con algún RA pendiente.

La tabla tiene una columna por alumno con **Alumno**, **Nivel**, **Horas FFE**, **Resultado FFE** y **Nota final**.

**Horas FFE** muestra las horas del nivel del alumno y, entre paréntesis, las que le faltan a la fecha de evaluación. Por ejemplo, `500h (120h)` son 500 horas de nivel, de las que a esa fecha ha hecho 380.

Las pendientes se miden contra las horas de **este** nivel. En 2º eso importa: de las 500 horas del ciclo, 300 fueron del curso pasado y ya están hechas, así que de las 200 de este año solo se cuenta lo que va de este nivel. Un alumno de 2º que va por la mitad aparece como `200h (100h)`, no como horas pendientes cero.

> ⚠️ La columna dice las horas del nivel, no las realizadas. Para ver lo que lleva hecho están las columnas **Horas Realizadas FFE** y **Horas Pendientes** de la tabla [Resumen](#121-resumen).

Un alumno sin horas asignadas aparece con `0h (0h)`, y uno que no ha hecho nada todavía, con el total entero entre paréntesis (`500h (500h)`).

---

[← Correo Electrónico](11-correo-electronico.md)  |  [Índice](README.md)  |  [Configuración →](13-configuracion.md)
