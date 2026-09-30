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
- **Resultados de aprendizaje:** define los módulos profesionales, sus códigos y los resultados de aprendizaje asociados.
- **Tutorías:** selecciona las fechas de tutoría que se marcarán en el calendario de prácticas.

---

[← Primeros pasos](02-primeros-pasos.md)  |  [Índice](README.md)  |  [Cursos →](04-cursos.md)
