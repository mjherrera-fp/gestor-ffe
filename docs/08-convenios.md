# 📄 8. Convenios

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

> `[IMAGEN: Listado de convenios con filtros por empresa y estado]`

## 8.1 Gestión

Los convenios formalizan la colaboración entre el centro educativo y una empresa. Cada convenio incluye:

- Número de convenio y fecha.
- Empresa, curso y centro educativo asociados.
- Tipo de firma (Digital / Manual / Sin asignar).

## 8.2 Flujo de estados

El convenio avanza a través de estos estados:

```
PENDIENTE_ENVIAR → PENDIENTE_FIRMA_EMPRESA → PENDIENTE_ENVIAR_DIRECTOR → PENDIENTE_FIRMA_DIRECTOR → COMPLETADO
```

Usa los botones **Avanzar** / **Retroceder** para mover el convenio entre estados. Solo los convenios en estado `COMPLETADO` pueden asociarse a una relación.

> `[IMAGEN: Detalle de convenio con botones de avance/retroceso de estado]`

---

[← Intereses Alumno-Empresa](07-intereses-alumno-empresa.md)  |  [Índice](README.md)  |  [Relaciones Alumno-Empresa →](09-relaciones-alumno-empresa.md)
