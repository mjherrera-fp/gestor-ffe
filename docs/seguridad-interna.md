# Seguridad

Documento de referencia sobre los controles de seguridad de la aplicación y,
sobre todo, sobre los riesgos que **todavía no están resueltos**. No tomes
garantía de que la aplicación es segura: léelo entero, porque
lo importante está en la sección de deuda conocida.

## Modelo de la aplicación

La aplicación es una app de escritorio *portable* de un único usuario. No hay
servidor remoto, ni multiusuario, ni nada que escuche fuera del equipo. El
servidor Express:

- Escucha **solo en `127.0.0.1`**, nunca en `0.0.0.0`.
- Sirve a la vez la API y el frontend, y se abre con el `BrowserWindow`.
- Guarda la BBDD en la carpeta del propio `.exe` (`ffe_management.db`), cifrada
  con SQLCipher (`better-sqlite3-multiple-ciphers`, `legacy=4`,
  `page_size=4096`).

## Token de sesión (implementado)

### Por qué hacía falta

Escuchar en `127.0.0.1` **no** significa que solo la app pueda llamar al
servidor. Cualquier página web que el profesor tenga abierta en el navegador
puede hacer un `fetch` a `http://127.0.0.1:3000/api/...` y leer o modificar
todos sus datos de FFP. Es el ataque clásico CSRF/DNS-rebinding contra una
aplicación local, y no requiere malware: basta con que visite una web.

### Cómo funciona

1. El proceso principal (`main.js`) genera 32 bytes aleatorios con
   `crypto.randomBytes` en cada arranque.
2. Al servidor le llega por el entorno del `fork` (`FFE_SESSION_TOKEN`).
3. Al renderer le llega **únicamente** por el preload, expuesto como
   `window.ffeSession.token`.
4. Un parcheo de `window.fetch` en `src/main.tsx` añade la cabecera
   `X-FFE-Token` a toda petición a `/api` y `/uploads`.

Una web ajena no puede leer `window.ffeSession` (está en otro origen) ni
adivinar 64 caracteres hexadecimales. Además, como `X-FFE-Token` es una
cabecera personalizada, el navegador exigiría un preflight CORS que el
servidor no responde, así que ni siquiera se llega a enviar la petición.

La comparación del token se hace en tiempo constante sobre su hash, para no
filtrarlo por tiempos de respuesta. El middleware se registra **antes** de
`express.json()`, de modo que una petición no autorizada no llega a parsearse y
no puede gastar los 50 MB de body que permite el límite.

### Decisiones deliberadas

- **No se protegen los assets del frontend.** `index.html` y los bundles los
  carga el `BrowserWindow` con una navegación normal, que no puede añadir
  cabeceras. Exigirles el token dejaría la aplicación en blanco.
- **El wrapper no toca peticiones de otros orígenes.** Si añadiera la cabecera
  a una petición externa, el navegador exigiría un preflight que el servidor no
  contesta y la petición se rompería en lugar de protegerse.
- **En desarrollo el token viaja por un fichero.** Electron y el servidor los
  lanza `concurrently` como procesos separados y no comparten `process.env`, así
  que se consensúan con `.ffe-session-token` (git-ignored), que crea el
  primero que arranca. La resolución está replicada en `main.js` y en
  `resolveSessionToken()` de `server.ts`: **si tocas una, toca la otra**.

## Instancia única

`app.requestSingleInstanceLock()` evita abrir dos veces el `.exe`. Antes, el
segundo proceso forkeaba su propio servidor y los dos escribían en la misma
BBDD SQLCipher, con el `database is locked` como síntoma. El segundo proceso
cierra y le cede el sitio al primero.

## Path traversal en `/uploads` (corregido)

La ruta era:

```ts
res.sendFile(path.resolve('uploads', req.params.filename));
```

Express decodifica el parámetro de ruta **después** de casar con el patrón, así
que un `%2F..%2F` en el nombre llegaba como `../` y `path.resolve` salía de la
carpeta: cualquier fichero legible del disco. Ahora la resolución pasa por
`resolverRutaDentro()` (`src/lib/seguridadRutas.ts`), que reduce el nombre a su
último segmento y comprueba que el resultado sigue dentro de `uploads`.

---

# Deuda de seguridad conocida

Lo que sigue **no** está resuelto. Está aquí para que no se pierda de vista.

## 1. El token de GitHub viaja dentro del `.exe` distribuido

**Estado: aceptado temporalmente, con decisión del autor.** El repositorio
`mjherrera-fp/gestor-ffe` se mantiene **privado** mientras la aplicación no esté
terminada, y el actualizador automático necesita autenticación para descargar
los assets de las releases.

Cómo funciona hoy:

- `release.yml` inyecta el secret `FFE_GH_TOKEN` en
  `src/lib/update-secret.js`.
- Ese fichero está en `.gitignore` (no se versiona), pero **electron-builder lo
  empaqueta dentro del `.exe`**.
- `src/lib/updater.js` lo lee y lo manda como `Authorization: Bearer ...`.

El riesgo: **el token viaja en el binario que recibe cada usuario**, y de un
`.exe` se puede extraer el contenido con un descompresor. Cualquiera que tenga
la aplicación puede leer ese token y usarlo contra el repositorio. Solo lo
acota que sea un *fine-grained PAT* de **solo lectura** y acotado a este único
repositorio. Aun así, que un tercero con acceso a la aplicación pueda leer un
token de lectura de un repositorio privado no es una consecuencia deseable, y si el PAT se compartiera por
error con permisos de escritura, el alcance sería mucho mayor.

Por qué el actualizador necesita el token: en repositorios privados,
`asset.browser_download_url` devuelve 404 incluso con token, así que
`updater.js` usa el endpoint de assets de la API, que responde con un 302 a una
URL firmada.

**Cómo se resuelve:** cuando la aplicación esté lista, hacer el repositorio
público y cambiar el actualizador a `browser_download_url`, que no necesita
autenticación. Entonces se puede borrar todo el apparatus del secret: el paso de
inyección de `release.yml`, la rama de `update-secret.js` en `updater.js` y el
propio secret `FFE_GH_TOKEN`. Mientras tanto, revisar que el PAT siga siendo de
solo lectura y limitado a este repositorio.

## 2. Windows Hello / desbloqueo biométrico

**Estado: pendiente de revisar.** El desbloqueo biométrico se implementó en el
commit `5891551` con su evento de calendario asociado. Puntos que hay que
revisar antes de darlos por buenos:

- La contraseña de la BBDD se obtiene por el canal
  `biometric-get-password`, que la expone al renderer. Hay que confirmar que
  ningún camino alcanza a registrar ese dato.
- Compatibilidad y comportamiento de Windows Hello en la máquina de destino
  (obligatoria la presence, PIN, huella, etc.), incluida su interacción con
  `safeStorage`.
- Alternativas y respaldo: si Windows Hello no está disponible, la aplicación
  debe seguir siendo utilizable con contraseña.

## 3. Otras cosas que conviene tener en cuenta

- **Sin CSP ni endurecimiento de `BrowserWindow`.** `nodeIntegration: false` y
  `contextIsolation: true` están bien, pero conviene revisar si el modo
  development y el de producción pueden divergir, y valorar una
  `Content-Security-Policy` para el renderer.
- **La clave de cifrado de la BBDD.** Hay que confirmar de dónde procede y que
  no acaba en un sitio legible (`.env`, `claves-dev.txt` está en `.gitignore`,
  pero conviene revisarlo).
- **`info_instalador.txt`** afirmaba que la conversión a PDF se hacía con
  LibreOffice. **Corregido**: el texto dice ahora que el motor va incrustado
  (Puppeteer/Chromium) y que no hace falta instalar nada.
- **Tests de integración.** **Hecho**: existe `npm run test:integration`
  (`vitest.integration.config.ts`), que arranca el servidor real y trabaja
  contra una BBDD temporal. Ninguna prueba debe tocar la BBDD real: el punto de
  entrada es `PORTABLE_EXECUTABLE_DIR`, que se apunta a un directorio temporal,
  el mismo mecanismo que se usó para verificar el token de sesión. El recorrido
  de cifrado y desbloqueo está cubierto en `tests/integration/seguridad-ciclo.test.ts`.
