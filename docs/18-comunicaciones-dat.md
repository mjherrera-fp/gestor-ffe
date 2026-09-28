# 18. Comunicaciones DAT

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

## 18.1 Qué es este módulo

Comunicaciones DAT sirve para registrar los envíos documentales que hay que hacer a la **DAT** y controlar el estado en que se encuentra cada envío hasta que queda completado.

Cada comunicación tiene su fecha, sus alumnos destinatarios, su documentación y su estado de trámite. La aplicación no comprueba si un envío es obligatorio: solo organiza y registra lo que decides enviar.

## 18.2 Cuándo está disponible

El módulo aparece en la barra lateral como **Enviar a la DAT**, pero solo si se cumplen estas condiciones:

1. Hay un profesor configurado.
2. Hay un curso seleccionado.

Además, la visibilidad depende de una opción de configuración:

| Modo | Comportamiento |
|------|----------------|
| **Es necesario** | Muestra el menú «Enviar a la DAT» y añade al Panel las columnas **Fecha Envío DAT** y **Estado DAT**. |
| **No es necesario** | Oculta el menú y esas dos columnas del Panel. |

> ⚠️ Esta opción se cambia en **Configuración → Documentos → Enviar a la DAT** y **es necesario reiniciar la aplicación** para que los cambios tomen efecto.

## 18.3 La lista de comunicaciones

> `[IMAGEN: Vista del módulo con la lista de comunicaciones a la izquierda y el detalle a la derecha]`

El módulo se divide en dos paneles:

- **Izquierda**: buscador, filtros y lista de comunicaciones.
- **Derecha**: detalle de la comunicación seleccionada, con sus acciones de estado y su gestor documental.

En pantalla ancha la lista es una tabla con las columnas **Fecha**, **Estudiantes**, **Estado** y **Acciones**. En móvil se convierte en tarjetas con las acciones dentro.

| Control | Para qué sirve |
|---------|----------------|
| **Nueva Comunicación** | Abre el formulario de alta. |
| **Buscar por fecha o estudiante** | Filtra por la fecha de la comunicación o por el nombre, apellidos o DNI de sus alumnos. Se limpia con la ✕ del campo. |
| **Filtro de estado** | Muestra todas las comunicaciones o solo las de un estado. |
| **Fecha / Estado** | Ordena la lista por ese criterio. Al pulsar sobre el criterio ya activo, invierte el sentido (ascendente o descendente). |

> ℹ️ Los filtros y el orden son independientes: puedes combinar un filtro de estado con una búsqueda por DNI, por ejemplo.

### Acciones de cada fila

| Acción | Qué hace |
|--------|----------|
| 🗄️ | Abre el gestor documental de esa comunicación. |
| ✏️ | Edita la fecha de la comunicación. |
| 🗑️ | Pide confirmación y elimina la comunicación. |

Cuando no hay resultados se muestra el aviso **No se encontraron comunicaciones**.

## 18.4 Crear una comunicación

Pulsa **Nueva Comunicación**. El formulario permite definir:

- **Fecha de la comunicación**: por defecto, la fecha de hoy.
- **Estudiantes destinatarios**.

La lista de estudiantes muestra únicamente los alumnos del curso actual que **tienen una relación en estado Completado**. Por defecto se ocultan los que ya están asignados a otra comunicación; activa **Mostrar estudiantes con comunicación previa** para verlos también.

> ℹ️ Usa **Seleccionar todos** / **Deseleccionar todos** para marcar o desmarcar la lista de una vez.

El botón **Crear comunicación** permanece desactivado mientras falte la fecha o no haya ningún estudiante seleccionado.

Una vez creada, la comunicación empieza en estado **Pendiente de enviar** y los alumnos seleccionados quedan asignados a ella, por lo que dejan de aparecer en el formulario de nuevas comunicaciones.

## 18.5 Estados

> `[IMAGEN: Detalle de una comunicación con el botón de acción de estado y el botón de regresar estado]`

| Estado | Qué significa | Botón disponible |
|--------|---------------|------------------|
| **Pendiente de enviar** | La comunicación está creada, pero todavía no se ha remitido a Dirección. | **Enviar a Dirección** |
| **Pendiente de firma** | Dirección ha recibido la comunicación y falta su firma. | **Recibido de Dirección** |
| **Completado** | El trámite ha terminado. | Ninguno; se muestra el aviso **TRÁMITE COMPLETADO**. |

- El botón principal avanza un paso.
- **Regresar Estado Anterior** retrocede un paso y no aparece en el primer estado, porque no hay estado anterior.

> ℹ️ Estos botones solo cambian el estado del trámite. El envío efectivo de la documentación se hace desde el gestor documental, como se explica en la sección siguiente.

En el **Panel** verás la fecha y el estado de la comunicación en las columnas **Fecha Envío DAT** y **Estado DAT**, para los alumnos que tiene asignados.

## 18.6 Documentos de la comunicación

Pulsa **DOCS** en el detalle, o el icono 🗄️ de la fila, para abrir el **Gestor Documental** de esa comunicación. Ahí puedes:

- **Preparar** la documentación, que se genera en el servidor en formato PDF.
- **Adjuntar** ficheros.
- **Enviar** la carpeta a NextCloud.

Los PDF generados se nombran con el prefijo `CDAT_` seguido del código de la relación y el DNI del alumno, y cada nueva versión del documento se guarda como una versión adicional.

### Carpetas de NextCloud

La ruta de destino se define en **Configuración → Cloud → Carpeta enviar a dirección → Comunicación DAT** (clave `folder_send_principal_com_dat`).

- En los estados **Pendiente de enviar** y **Pendiente de firma** se usa esa ruta.
- En el estado **Completado** se usa la carpeta personal de cada alumno, igual que en el resto de módulos.

Si la ruta no está definida, el envío se detiene y avisa de que debes configurarla antes, en lugar de subir el documento a una ubicación arbitraria.

> ℹ️ El resto de rutas y el resto de servicios se explican en [16. Servicios conectados](16-servicios-conectados.md).

## 18.7 Editar y eliminar

- **Editar**: abre el formulario con la fecha actual para cambiarla. Los alumnos asignados no se modifican al editar.
- **Eliminar**: pide confirmación, borra la comunicación y libera a sus alumnos, que vuelven a estar disponibles para nuevas comunicaciones.

> ⚠️ Los documentos que hubiera adjuntado a la comunicación también se eliminan. Si necesitas conservarlos, no elimines la comunicación.

## 18.8 Errores frecuentes

**No me aparece el icono de Enviar a la DAT.**
Comprueba que tienes un profesor y un curso seleccionados, y que la opción de envío a la DAT está en modo **Es necesario**. Si acabas de cambiarla, reinicia la aplicación.

**No aparecen todos mis alumnos en el formulario.**
Solo se listan los alumnos con una relación en estado Completado, y por defecto se ocultan los que ya tienen una comunicación asignada. Activa **Mostrar estudiantes con comunicación previa** o revisa el estado de sus relaciones.

**No puedo guardar la comunicación.**
El botón permanece desactivado si falta la fecha o no hay ningún estudiante seleccionado.

**La comunicación no aparece en el Panel.**
Las columnas de DAT solo se muestran cuando el modo de envío está en **Es necesario**, y debes estar consultando el curso y el detalle académico correctos.

**El envío a Nextcloud no se completa.**
Comprueba en **Configuración → Cloud** que la ruta de Comunicación DAT está definida. Si no lo está, el sistema te avisa en lugar de subir a una ubicación incorrecta.

---

[← Preguntas frecuentes](17-preguntas-frecuentes.md)  |  [Índice](README.md)
