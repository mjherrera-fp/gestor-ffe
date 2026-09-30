# 🤝 9. Relaciones Alumno-Empresa

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

> `[IMAGEN: Listado de relaciones con filtros y buscador]`

## 9.1 Creación de una relación

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

## 9.2 Horario semanal

Puedes configurar el horario de prácticas de dos formas:

- **Configuración rápida:** establece hora de inicio, fin y horas totales, selecciona los días de la semana y pulsa **Aplicar horario a la semana**.
- **Detalle por día:** ajusta individualmente cada día de la semana (inicio, fin y horas).

## 9.3 Cálculo automático de fecha de fin

El sistema calcula automáticamente la **fecha estimada de fin** para cada alumno en función de:

- **Horas FFE:** total de horas que debe completar el alumno.
- **Horario semanal:** días y horas de práctica por semana.
- **Festivos del centro:** se descartan si están activados en Configuración.
- **Festivos de empresa (por localidad):** se descartan si están activados en Configuración.
- **Tutorías:** fechas de tutoría que se marcan en el calendario.

El cálculo se actualiza en tiempo real al modificar las horas, la fecha de inicio o el horario. También puedes usar **Fecha Fin Objetivo** para calcular la fecha de inicio retroactivamente.

> `[IMAGEN: Detalle de alumno en la relación con horas FFE, fecha inicio y fin estimado]`

## 9.4 Días no lectivos propios del alumno

No todos los alumnos siguen el calendario del centro y de la empresa: un alumno puede
acudir a un festivo o faltar un día que no es festivo. En la tarjeta de cada alumno hay
un botón **Días no lectivos** que abre el calendario con los días que ya le tocan, para
poder marcar los que se desvían.

- **Desmarcar** un festivo heredado significa que ese alumno **sí asiste** ese día: deja de
  descontarse y su fecha de fin se acorta.
- **Marcar** un día laborable significa que ese alumno **no asiste**: se descuenta y su
  fecha de fin se retrasa.

El calendario se abre con el conjunto efectivo del alumno, es decir, los festivos del
centro y de la empresa según los interruptores de Configuración, más lo que ese alumno ya
tenía marcado.

### Qué se ve

El botón solo aparece cuando el alumno tiene **fecha de inicio y fecha fin**: sin un
periodo no hay nada que decidir sobre qué días se pierde, así que no se ofrece.

El calendario se abre **sobre el periodo de ese alumno**, de su fecha de inicio a su fecha
fin estimada, y no sobre el curso entero. Los meses anteriores a empezar y posteriores a
terminar no le afectan, así que no se enseñan.

Cada día va marcado con un color, y la leyenda dice cuántos días hay de cada uno:

| Color | Significado | Contador |
|-------|-------------|----------|
| Rojo | Festivo: el alumno no asiste | Número de días no lectivos del periodo |
| Verde | Día lectivo: el alumno va a la empresa | Número de días que irá |
| Contorno azul | Límite del periodo: día de inicio y de fin | — |
| Rojo atenuado | Fin de semana, si el horario no tiene horas ese día | — |
| Apagado | Fuera del periodo. Se ve la forma del mes, pero no se puede marcar | — |

El verde sale del horario de la relación, no de un calendario genérico: si el convenio
trabaja los sábados, el sábado cuenta como día de trabajo. Un día marcado en rojo sobre un
día sin horas no resta ninguno, porque de ese día no se iba a ir igualmente.

### El calendario va en vivo

Todo lo del editor se recalcula mientras se tocan los días, sin esperar a confirmar:

- La **fecha fin estimada** de la barra superior, junto al periodo. Se resalta en azul
  cuando todavía no es la que hay guardada, y muestra entre paréntesis cuál era, para que
  se vea en cuánto se mueve antes de decidir.
- El **número de días propios**, es decir, los que se apartan de los festivos del convenio.
- Los **días en verde**, que aparecen al desmarcar un festivo (el alumno vuelve a
  trabajar ese día) y desaparecen al marcarlo.
- El **periodo que se está viendo**, porque la rejilla se recorta y se alarga con la fecha
  fin estimada.

Que todo esto vaya a una es lo importante. Si el calendario se dibujara sobre el periodo
guardado, marcar un festivo retrasaría la fecha fin sin que se viera ningún día nuevo, y
desmarcarlo la adelantaría dejando en verde toda la cola que el alumno ya no alcanzaría:
el número de días que irá subiría justo al se le acortan las prácticas. Al moverse el
periodo con la fecha, en cambio, la rejilla se acorta cuando el fin se adelanta y se alarga
cuando se retrasa, y el verde aparece y desaparece con ella.

Los días rojos también se cuentan y se muestran sobre ese mismo periodo, no sobre el curso
entero. Si el fin se adelanta y luego vuelve a atrasarse, los festivos heredados que
quedan a la vista vuelven a verse rojos, como son: no se cuelan en verde por el camino.

Nada de esto se guarda hasta pulsar **Guardar días**. El editor no toca al alumno, solo
pinta lo que se guardaría: por eso **Cancelar** funciona como se espera, y no deja la fecha
fin movida.

Estos días se tienen en cuenta, de forma coherente entre sí, en:

| Dónde | Efecto |
|-------|--------|
| Fecha de fin del alumno | Se recalcula al instante, sin esperar a guardar |
| Progreso de horas FFE (panel) | Cuenta las horas que el alumno no asiste |
| Seguridad Social | El día marcado no se cotiza; el desmarcado sí |
| Calendario de prácticas (PDF) | Los días propios aparecen en rojo, igual que los festivos |

Lo que se guarda no es la lista completa de días del alumno sino **en qué se diferencia**
de los festivos del convenio. Por eso, si más adelante añades un festivo al centro, todos
los alumnos lo reciben automáticamente y las preferencias que ya habías marcado siguen
teniendo efecto.

Cuando un alumno sale de la relación, sus días personalizados se borran, igual que sus
fechas de inicio y fin.

## 9.5 Flujo de estados de la relación

```
PENDIENTE_ENVIAR_EMPRESA → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_ENVIAR_DIRECTOR → PENDIENTE_FIRMA_DIRECTOR → COMPLETADO
```

## 9.6 Estados individuales por alumno

Cada alumno tiene tres estados independientes:

- **Plan Formativo:** ```PENDIENTE_ENVIAR_ESTUDIANTE → PENDIENTE_FIRMAR_ESTUDIANTE → PENDIENTE_ENVIAR_EMPRESA → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_FIRMA_TUTOR → COMPLETADO```
- **Seguimiento:** ```PENDIENTE → ENVIADO_A_EMPRESA → RECIBIDO```
- **Valoración:** ```PENDIENTE → ENVIADO_A_EMPRESA → RECIBIDO```

> `[IMAGEN: Detalle de relación con los estados individuales de cada alumno]`

---

[← Convenios](08-convenios.md)  |  [Índice](README.md)  |  [Generación de Documentos →](10-generacion-de-documentos.md)
