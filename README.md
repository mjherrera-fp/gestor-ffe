<div align="center">
<img width="1200" height="475" alt="Banner" src="./assets/banner.png" />
</div>

# Gestor FFE - Sistema de Gestión de Prácticas Formativas

**Versión:** 0.1.20-alpha  
**Plataforma:** Windows (portable)

Aplicación de escritorio para la gestión integral de la Fase de Formación en Empresa (FFE). Permite administrar alumnos, empresas, convenios, relaciones de prácticas, generación de documentos oficiales, envío de correos electrónicos y cálculo de días de Seguridad Social, todo en un mismo entorno.

---

## Documentación

El manual de uso está en **[`docs/`](docs/README.md)**, dividido en 17 documentos:

1. [Introducción](docs/01-introduccion.md) - qué es la aplicación, condiciones de uso y copyright
2. [Primeros pasos](docs/02-primeros-pasos.md) - instalación, desbloqueo y navegación
3. [Módulo de Profesor](docs/03-modulo-de-profesor.md) - datos personales, centros y ciclos
4. [Cursos](docs/04-cursos.md) - cursos académicos
5. [Alumnos](docs/05-alumnos.md) - alta, importación desde Excel y CV
6. [Empresas](docs/06-empresas.md) - empresas colaboradoras y tutores
7. [Intereses Alumno-Empresa](docs/07-intereses-alumno-empresa.md) - preferencias bidireccionales
8. [Convenios](docs/08-convenios.md) - convenios de colaboración y sus estados
9. [Relaciones Alumno-Empresa](docs/09-relaciones-alumno-empresa.md) - horarios, fechas y estados
10. [Generación de Documentos](docs/10-generacion-de-documentos.md) - documentos oficiales y calendario
11. [Correo Electrónico](docs/11-correo-electronico.md) - SMTP, plantillas y marcadores
12. [Panel de Control](docs/12-panel-de-control.md) - resumen, estadísticas y Seguridad Social
13. [Configuración](docs/13-configuracion.md) - avisos, festivos, ficheros y cifrado
14. [Histórico / Auditoría](docs/14-historico-auditoria.md) - registro de operaciones
15. [Seguridad y Cifrado](docs/15-seguridad-y-cifrado.md) - SQLCipher y bloqueo
16. [Servicios conectados](docs/16-servicios-conectados.md) - servicios externos
17. [Preguntas Frecuentes](docs/17-preguntas-frecuentes.md) - dudas habituales

Documentación técnica para quien mantiene la aplicación: [Seguridad interna](docs/seguridad-interna.md).

---

## Para empezar

1. Descarga el `.exe` `GestorFFE.exe`.
2. Si la base de datos tiene contraseña, introducirla en la pantalla de desbloqueo.
3. Ve a **Configuración** y revisa los avisos, los festivos y el correo antes de empezar.

> ⚠️  **Se recomienda cifrar la base de datos para proteger los datos de los estudiantes.** Si decides hacerlo, la contraseña
> **no es recuperable**: si la olvidas, los datos se pierden para siempre.

La aplicación se ejecuta en el propio ordenador: no necesita servidor ni conexión a
internet, salvo para obtener los festivos por localidad y para enviar correos.

---

## Condiciones de uso

El usuario es responsable de cumplir con todas las leyes y regulaciones aplicables al utilizar este software.

El desarrollador de esta aplicación **no se hace responsable** de ningún daño, pérdida o perjuicio que pueda derivarse del uso indebido, inapropiado o incorrecto de la aplicación. El uso de esta aplicación es a su propio riesgo.

**No garantizamos** que la aplicación funcione sin errores, interrupciones o fallos, ni que los resultados obtenidos sean precisos o completos. La aplicación se proporciona "tal cual" y "según disponibilidad", sin ninguna garantía expresa o implícita de ningún tipo.

Al utilizar esta aplicación, usted **acepta que el desarrollador no será responsable** de ningún daño directo, indirecto, incidental, especial o consecuente que pueda surgir del uso o mal funcionamiento de la aplicación.

El desarrollador no se hace responsable de la gestión, almacenamiento o protección de los datos introducidos en la aplicación. Es responsabilidad del usuario asegurarse de que los datos gestionados cumplen con la normativa vigente en materia de protección de datos.

### Derechos de autor

Copyright (c) Manuel Jesús Herrera Morgaz. Todos los derechos reservados.

Este software se distribuye bajo una licencia de código fuente disponible. Se permite usar, ver y estudiar el código. <a href="https://github.com/mjherrera-fp/gestor-ffe" target="_blank" rel="noopener noreferrer">El código fuente está disponible en GitHub</a>.

No se permite copiar, redistribuir, sublicenciar o usar con fines comerciales o de ningún otro tipo sin autorización expresa del autor.

Toda copia autorizada deberá mantener esta nota de copyright y atribuir al autor original.

Al aceptar estas condiciones, el usuario se compromete a hacer un uso responsable de la aplicación y de los datos gestionados a través de la misma.

---

## Para desarrollar

```bash
npm install
npm run dev            # servidor de desarrollo + Electron
npm run lint           # comprobación de tipos
npm test               # tests unitarios
npm run pack:win:portable   # genera el portable en release/
```

La base de datos (`ffe_management.db`) se crea junto al ejecutable. En desarrollo se
puede aislar en un directorio propio con la variable `PORTABLE_EXECUTABLE_DIR`, que es
como se ejecutan las pruebas sin tocar los datos reales.
