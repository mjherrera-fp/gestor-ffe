# 15. Seguridad y Cifrado

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

## 15.1 Cifrado de base de datos

La aplicación utiliza SQLCipher para cifrar la base de datos SQLite. Cuando la base de datos está cifrada:

- Al iniciar la aplicación, se muestra la pantalla de bloqueo.
- Sin la contraseña correcta, no se puede acceder a los datos.
- La contraseña se mantiene en memoria durante la sesión.

## 15.2 Bloqueo manual

Puedes bloquear la aplicación manualmente desde el icono de candado en la barra superior. La aplicación se bloquea y requiere la contraseña para reanudar.

---

[← Histórico / Auditoría](14-historico-auditoria.md)  |  [Índice](README.md)  |  [Servicios conectados →](16-servicios-conectados.md)
