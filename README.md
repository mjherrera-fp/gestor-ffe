<div align="center">
<img width="1200" height="475" alt="Banner" src="./assets/banner.png" />
</div>

# Gestor FFE â€” Sistema de GestiÃ³n de PrÃ¡cticas Formativas

**VersiÃ³n:** 0.1.20-alpha  
**Plataforma:** Windows (portable)

AplicaciÃ³n de escritorio para la gestiÃ³n integral de la Fase de FormaciÃ³n en Empresa (FFE). Permite administrar alumnos, empresas, convenios, relaciones de prÃ¡cticas, generaciÃ³n de documentos oficiales, envÃ­o de correos electrÃ³nicos y cÃ¡lculo de dÃ­as de Seguridad Social, todo en un mismo entorno.

---

## DocumentaciÃ³n

El manual de uso estÃ¡ en **[`docs/`](docs/README.md)**, dividido en 17 documentos:

1. [IntroducciÃ³n](docs/01-introduccion.md) â€” quÃ© es la aplicaciÃ³n, condiciones de uso y copyright
2. [Primeros pasos](docs/02-primeros-pasos.md) â€” instalaciÃ³n, desbloqueo y navegaciÃ³n
3. [MÃ³dulo de Profesor](docs/03-modulo-de-profesor.md) â€” datos personales, centros y ciclos
4. [Cursos](docs/04-cursos.md) â€” cursos acadÃ©micos
5. [Alumnos](docs/05-alumnos.md) â€” alta, importaciÃ³n desde Excel y CV
6. [Empresas](docs/06-empresas.md) â€” empresas colaboradoras y tutores
7. [Intereses Alumno-Empresa](docs/07-intereses-alumno-empresa.md) â€” preferencias bidireccionales
8. [Convenios](docs/08-convenios.md) â€” convenios de colaboraciÃ³n y sus estados
9. [Relaciones Alumno-Empresa](docs/09-relaciones-alumno-empresa.md) â€” horarios, fechas y estados
10. [GeneraciÃ³n de Documentos](docs/10-generacion-de-documentos.md) â€” documentos oficiales y calendario
11. [Correo ElectrÃ³nico](docs/11-correo-electronico.md) â€” SMTP, plantillas y marcadores
12. [Panel de Control](docs/12-panel-de-control.md) â€” resumen, estadÃ­sticas y Seguridad Social
13. [ConfiguraciÃ³n](docs/13-configuracion.md) â€” avisos, festivos, ficheros y cifrado
14. [HistÃ³rico / AuditorÃ­a](docs/14-historico-auditoria.md) â€” registro de operaciones
15. [Seguridad y Cifrado](docs/15-seguridad-y-cifrado.md) â€” SQLCipher y bloqueo
16. [Servicios conectados](docs/16-servicios-conectados.md) â€” servicios externos
17. [Preguntas Frecuentes](docs/17-preguntas-frecuentes.md) â€” dudas habituales

DocumentaciÃ³n tÃ©cnica para quien mantiene la aplicaciÃ³n: [Seguridad interna](docs/seguridad-interna.md).

---

## Para empezar

1. Descomprime el `.zip` descargado y ejecuta `GestorFFE.exe`.
2. Si la base de datos tiene contraseÃ±a, introducirla en la pantalla de desbloqueo.
3. Ve a **ConfiguraciÃ³n** y revisa los avisos, los festivos y el correo antes de empezar.

> âš ï¸ **Cifrar la base de datos no se puede revertir.** Si decides hacerlo, la contraseÃ±a
> **no es recuperable**: si la olvidas, los datos se pierden para siempre.

La aplicaciÃ³n se ejecuta en el propio ordenador: no necesita servidor ni conexiÃ³n a
internet, salvo para obtener los festivos por localidad y para enviar correos.

---

## Condiciones de uso

El usuario es responsable de cumplir con todas las leyes y regulaciones aplicables al utilizar este software.

El desarrollador de esta aplicaciÃ³n **no se hace responsable** de ningÃºn daÃ±o, pÃ©rdida o perjuicio que pueda derivarse del uso indebido, inapropiado o incorrecto de la aplicaciÃ³n. El uso de esta aplicaciÃ³n es a su propio riesgo.

**No garantizamos** que la aplicaciÃ³n funcione sin errores, interrupciones o fallos, ni que los resultados obtenidos sean precisos o completos. La aplicaciÃ³n se proporciona "tal cual" y "segÃºn disponibilidad", sin ninguna garantÃ­a expresa o implÃ­cita de ningÃºn tipo.

Al utilizar esta aplicaciÃ³n, usted **acepta que el desarrollador no serÃ¡ responsable** de ningÃºn daÃ±o directo, indirecto, incidental, especial o consecuente que pueda surgir del uso o mal funcionamiento de la aplicaciÃ³n.

El desarrollador no se hace responsable de la gestiÃ³n, almacenamiento o protecciÃ³n de los datos introducidos en la aplicaciÃ³n. Es responsabilidad del usuario asegurarse de que los datos gestionados cumplen con la normativa vigente en materia de protecciÃ³n de datos.

### Derechos de autor

Copyright (c) Manuel JesÃºs Herrera Morgaz. Todos los derechos reservados.

Este software se distribuye bajo una licencia de cÃ³digo fuente disponible. Se permite usar, ver y estudiar el cÃ³digo. <a href="https://github.com/mjherrera-fp/gestor-ffe" target="_blank" rel="noopener noreferrer">El cÃ³digo fuente estÃ¡ disponible en GitHub</a>.

No se permite copiar, redistribuir, sublicenciar o usar con fines comerciales o de ningÃºn otro tipo sin autorizaciÃ³n expresa del autor.

Toda copia autorizada deberÃ¡ mantener esta nota de copyright y atribuir al autor original.

Al aceptar estas condiciones, el usuario se compromete a hacer un uso responsable de la aplicaciÃ³n y de los datos gestionados a travÃ©s de la misma.

---

## Para desarrollar

```bash
npm install
npm run dev            # servidor de desarrollo + Electron
npm run lint           # comprobaciÃ³n de tipos
npm test               # tests unitarios
npm run pack:win:portable   # genera el portable en release/
```

La base de datos (`ffe_management.db`) se crea junto al ejecutable. En desarrollo se
puede aislar en un directorio propio con la variable `PORTABLE_EXECUTABLE_DIR`, que es
como se ejecutan las pruebas sin tocar los datos reales.
