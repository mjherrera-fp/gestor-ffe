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

## 9.4 Flujo de estados de la relación

```
PENDIENTE_ENVIAR_EMPRESA → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_ENVIAR_DIRECTOR → PENDIENTE_FIRMA_DIRECTOR → COMPLETADO
```

## 9.5 Estados individuales por alumno

Cada alumno tiene tres estados independientes:

- **Plan Formativo:** ```PENDIENTE_ENVIAR_ESTUDIANTE → PENDIENTE_FIRMAR_ESTUDIANTE → PENDIENTE_ENVIAR_EMPRESA → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_FIRMA_TUTOR → COMPLETADO```
- **Seguimiento:** ```PENDIENTE → ENVIADO_A_EMPRESA → RECIBIDO```
- **Valoración:** ```PENDIENTE → ENVIADO_A_EMPRESA → RECIBIDO```

> `[IMAGEN: Detalle de relación con los estados individuales de cada alumno]`

---

[← Convenios](08-convenios.md)  |  [Índice](README.md)  |  [Generación de Documentos →](10-generacion-de-documentos.md)
