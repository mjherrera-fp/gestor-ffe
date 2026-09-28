# 16. Servicios conectados

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

Desde Gestor FFE se usan los siguientes servicios:

| Servicio | URL | Uso | ¿Obligatorio? |
|----------|-----|-----|----------------|
| <img src="https://calendariosnacionales.com/logo-mark.svg" width="40" height="40"> | https://calendariosnacionales.com/ | Obtención automática de los días festivos de una localidad | No |
| **NextCloud / ownCloud** | La que configures, por ejemplo `https://nextcloud.midominio.es` | Envío de la documentación a las carpetas del centro | No |
| **Servidor SMTP** | El que configures | Envío de correos y comunicaciones a empresas y centros | No |
| **GitHub** | github.com/mjherrera-fp/gestor-ffe | Comprobación de si hay una versión nueva disponible | No |

> ℹ️ Ninguno de estos servicios es obligatorio para usar la aplicación. Todos se consultan
> únicamente cuando tu lo pides: al pedir unos festivos, al enviar a NextCloud, al enviar un
> correo o al comprobar actualizaciones al arrancar.

### Dónde se configura

| Servicio | Dónde |
|----------|-------|
| Festivos por localidad | **Configuración → General → Festivos de empresa** |
| NextCloud | **Configuración → Cloud** (URL, usuario, contraseña y rutas de carpetas) |
| SMTP | **Configuración → Correo** |

> 🔒 Las credenciales de NextCloud y SMTP se guardan en la base de datos, que puede estar
> cifrada. Consulta [15. Seguridad y Cifrado](15-seguridad-y-cifrado.md).

### Carpetas de NextCloud

En **Configuración → Cloud** se define, además de la carpeta por defecto y las carpetas por
ciclo, las carpetas a las que se envía la documentación de cada tipo de trámite:

| Clave | Contenido |
|-------|-----------|
| Carpeta enviar a dirección → **Relaciones** | Documentación de las relaciones de prácticas |
| Carpeta enviar a dirección → **Convenio / Acuerdo** | Documentación de los convenios |
| Carpeta enviar a dirección → **Comunicación DAT** | Documentación de las comunicaciones a la DAT |
| Carpeta enviar a dirección → **Cambio de condiciones** | Documentación del cambio de condiciones de prácticas |

Si la carpeta que corresponde al estado actual del trámite no está definida, la aplicación
lo avisa y no sube nada, en lugar de escribir en una ubicación arbitraria.

> ℹ️ El comportamiento de las comunicaciones a la DAT está detallado en
> [18. Comunicaciones DAT](18-comunicaciones-dat.md).

---

[← Seguridad y Cifrado](15-seguridad-y-cifrado.md)  |  [Índice](README.md)  |  [Preguntas Frecuentes →](17-preguntas-frecuentes.md)
