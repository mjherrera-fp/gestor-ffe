# 🧑‍🏫 3. Módulo de Profesor y sección Centros

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

Este documento cubre dos entradas del menú: **Profesor** (tus datos personales) y **Centros** (los centros educativos donde impartes clase y sus ciclos formativos). La sección **Centros** solo se habilita cuando ya existe un curso académico creado.

> `[IMAGEN: Menú lateral con "Profesor" y "Centros" como entradas separadas, la segunda en gris hasta que haya curso]`

## 3.1 Datos del profesor

Completa tus datos personales: nombre, apellidos, NIF, correo electrónico y teléfono. Estos datos se incluirán en la documentación generada.

> La sección **Profesor** está siempre disponible: es la única que se puede usar antes de crear el curso.

## 3.2 Centros educativos

En la sección **Centros** gestionas los centros educativos a los que perteneces. Cada centro puede tener:

- Nombre, ciudad, teléfono y correo electrónico.
- **Festivos del centro:** días no laborables que se podrán descontar del cálculo de fechas de prácticas.

> `[IMAGEN: Tarjeta de un centro con el botón de calendario a la izquierda de editar y eliminar]`

### Festivos del centro

Los días festivos no se escriben en ningún formulario. El botón **Calendario** de la tarjeta del centro, a la izquierda de editar, abre un modal con el curso entero dibujado mes a mes, desde el primer día hasta el último:

- Pulsa un día para marcarlo o desmarcarlo como festivo.
- **Obtener festivos** los descarga de Calendarios Nacionales. Trae todos los años naturales que cubre el curso y descarta lo que cae fuera de sus fechas, así que no aparecen días de cursos anteriores ni festivos que aún no han ocurrido.
- **Borrar todos** vacía el calendario.

El calendario se abre sobre el centro ya creado, porque no hay tarjeta hasta que existe. Al guardar desde ahí se persiste al momento, sin tocar el resto de sus datos. La tarjeta muestra cuántos días tiene en rojo junto a su ciudad.

Los días que ya estaban guardados y no caen dentro del curso se avisan antes de guardar, y se descartan: los festivos pertenecen al curso, no son un ajuste permanente.

> Los botones de editar y eliminar, tanto del centro como de sus ciclos, están siempre visibles.

> `[IMAGEN: Modal de días festivos con el calendario del curso, días marcados en rojo y la lista de días al pie]`

## 3.3 Ciclos formativos (Detalles académicos)

Dentro de cada centro, dentro de la sección **Centros**, puedes gestionar los ciclos formativos:

- Código, nombre del ciclo, nivel, grado (medio/superior), régimen (presencial/distancia) y código de grupo.
- **Tutorías:** selecciona las fechas de tutoría que se marcarán en el calendario de prácticas.

Cada ciclo se muestra como una ficha con su nombre, su código y su grupo, y un resumen con los módulos, las sesiones de tutoría y el número de resultados de aprendizaje.

### 3.3.1 Resultados de aprendizaje

Desde la ficha de un ciclo, pulsa **Gestionar RA** para abrir sus resultados de aprendizaje. Ahí defines los módulos profesionales, sus códigos y los RA asociados a cada uno. De cada RA se guarda:

- **ID del RA:** su identificador dentro del módulo.
- **Nombre:** la descripción del resultado.
- **Impartido en empresa:** si el RA se trabaja en el centro o en la empresa.
- **Actividad formativa:** la actividad concreta que lo desarrolla, si la tiene.

La pantalla abre sobre el ciclo ya creado, porque los RA se guardan en el propio ciclo y antes de crearlo no hay dónde escribirlos. Pulsa **Añadir RA** para añadir uno nuevo, o edita y borra los que ya hay con los iconos de cada fila. Los campos obligatorios son el módulo, el código, el ID y el nombre: si falta alguno, la fila se marca en rojo y no se guarda.

Los cambios se agrupan: puedes añadir, editar y borrar todos los RA que quieras y no se escribe nada en el ciclo hasta que pulsas **Guardar cambios**. Si cancelas, se descartan y la ficha sigue mostrando los RA que había. Mientras tengas un RA escrito en el formulario o una edición sin aplicar, **Guardar cambios** no está disponible: primero hay que añadirlo, actualizarlo o cancelar la edición, para que no se pierda lo escrito por el camino.

> `[IMAGEN: Ficha de un ciclo con el botón Gestionar RA y el contador de resultados de aprendizaje]`

> `[IMAGEN: Modal de resultados de aprendizaje con el formulario de un RA y la lista de RA del ciclo]`

---

[← Primeros pasos](02-primeros-pasos.md)  |  [Índice](README.md)  |  [Cursos →](04-cursos.md)
