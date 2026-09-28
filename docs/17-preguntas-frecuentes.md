# 17. Preguntas Frecuentes

> Manual de Gestor FFE · [índice del manual](README.md) · [volver a la portada](../README.md)

**¿Cómo se calcula la fecha de fin de prácticas?**
El sistema suma las horas FFE del alumno día a día según su horario semanal, saltando los festivos del centro y de la empresa (si están activados) y los fines de semana no laborables.

**¿Qué ocurre si creo un nuevo curso?**
Los alumnos, relaciones e intereses del curso anterior se eliminan. Las empresas y convenios se conservan para el nuevo curso.

**¿Puedo importar alumnos desde Excel?**
Sí, desde el módulo de Alumnos puedes importar mediante Excel. Descarga la plantilla desde el propio botón de importación.

**¿Los festivos de empresa se importan automáticamente?**
Sí, desde el modal de gestión de festivos de empresa puedes obtener los festivos de una localidad automáticamente a través de la API de Calendarios Nacionales (soporta localidades de la Comunidad de Madrid).

**¿Cómo recupero la contraseña de la base de datos?**
No es posible recuperarla. Si olvidas la contraseña, los datos serán irrecuperables. Guarda la contraseña en un lugar seguro.

**¿Puedo enviar correos a múltiples destinatarios?**
Sí, el sistema soporta envío masivo con un delay configurable entre cada envío para evitar bloqueos del servidor SMTP.

**¿Los documentos se generan en el servidor o en el cliente?**
Los documentos DOCX y PDF se generan en el servidor Express utilizando docxtemplater (DOCX) y Puppeteer (PDF).

**¿Dónde se almacenan los archivos adjuntos temporales?**
En el directorio `uploads/` junto a la aplicación. Los adjuntos se limpian automáticamente tras el envío o al cerrar la aplicación.

**¿Quién es la DAT y es obligatorio enviarle las comunicaciones?**
La aplicación no comprueba si el envío es obligatorio: solo registra los envíos que decides hacer. Consulta la normativa aplicable a tu centro antes de darlos por obligatorios.

**¿Por qué no me aparece el módulo «Enviar a la DAT»?**
Porque falta un profesor o un curso seleccionado, o porque en **Configuración → Documentos** el envío a la DAT está en modo **No es necesario**. Hay que reiniciar la aplicación después de cambiar esa opción. Ver [18. Comunicaciones DAT](18-comunicaciones-dat.md#182-cuándo-está-disponible).

**¿Por qué no aparece un alumno al crear una comunicación?**
Solo se listan los alumnos con una relación en estado Completado, y por defecto se ocultan los que ya tienen una comunicación asignada. Activa **Mostrar estudiantes con comunicación previa** en el formulario.

---

[← Servicios conectados](16-servicios-conectados.md)  |  [Índice](README.md)  |  [Comunicaciones DAT →](18-comunicaciones-dat.md)
