import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { compareVersions, interpretarResultado, scriptAplicar, MOTIVOS_FALLO } from '../src/lib/updaterScript.js';

// GF-77: el script que sustituye el exe portable y el aviso del resultado.

describe('compareVersions', () => {
  it('ordena versiones con prerelease', () => {
    expect(compareVersions('0.1.37-alpha', '0.1.36-alpha')).toBeGreaterThan(0);
    expect(compareVersions('0.1.36-alpha', '0.1.36-alpha')).toBe(0);
    expect(compareVersions('0.1.36', '0.1.36-alpha')).toBeGreaterThan(0);
    expect(compareVersions('v0.2.0', '0.1.99')).toBeGreaterThan(0);
  });
});

describe('interpretarResultado', () => {
  it('sin fichero o ilegible no hay aviso', () => {
    expect(interpretarResultado(null, '0.1.37-alpha')).toBeNull();
    expect(interpretarResultado('basura', '0.1.37-alpha')).toBeNull();
  });

  it('completada si la version que corre es la instalada', () => {
    expect(interpretarResultado('{"ok":true,"version":"0.1.37-alpha"}\r\n', '0.1.37-alpha'))
      .toEqual({ state: 'updated', version: '0.1.37-alpha' });
  });

  it('error si el script dice ok pero sigue la version vieja', () => {
    const r = interpretarResultado('{"ok":true,"version":"0.1.37-alpha"}', '0.1.36-alpha');
    expect(r.state).toBe('apply-error');
    expect(r.message).toMatch(/sigue en la versión 0\.1\.36-alpha/);
  });

  it('error con el motivo que dejo el script', () => {
    expect(interpretarResultado('{"ok":false,"version":"0.1.37-alpha","motivo":"bloqueado"}', '0.1.36-alpha'))
      .toEqual({ state: 'apply-error', version: '0.1.37-alpha', message: MOTIVOS_FALLO.bloqueado });
    expect(interpretarResultado('{"ok":false,"version":"x","motivo":"raro"}', '0.1.36-alpha').message)
      .toMatch(/no se pudo completar/);
  });
});

describe('scriptAplicar', () => {
  it('escapa % y & de las rutas', () => {
    const s = scriptAplicar({ app: 'C:\\A&B\\100%\\GestorFFE.exe', final: 'f', nuevo: 'n', resultado: 'r', version: '1.0.0', pid: 1 });
    expect(s).toContain('set "APP=C:\\A^&B\\100%%\\GestorFFE.exe"');
  });
});

// Se ejecuta el .cmd de verdad: solo en Windows.
describe.runIf(process.platform === 'win32')('scriptAplicar en Windows', () => {
  let dir: string;
  let app: string;
  let nuevo: string;
  let resultado: string;
  let bloqueo: ChildProcess | null = null;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-updater-'));
    fs.mkdirSync(path.join(dir, 'app'));
    fs.mkdirSync(path.join(dir, 'descarga'));
    app = path.join(dir, 'app', 'GestorFFE.exe');
    nuevo = path.join(dir, 'descarga', 'GestorFFE.exe');
    resultado = path.join(dir, 'update-result.json');
    fs.writeFileSync(app, 'VIEJO');
    fs.writeFileSync(nuevo, 'NUEVO');
  });

  const soltar = async () => {
    if (!bloqueo) return;
    const b = bloqueo;
    bloqueo = null;
    if (b.exitCode === null) {
      const fin = new Promise(r => b.once('exit', r));
      b.kill();
      await fin;
    }
  };

  afterEach(async () => {
    await soltar();
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  });

  /** Abre el exe sin compartir durante `segundos`, como hace el lanzador portable. */
  const bloquear = async (segundos: number) => {
    const ps = `$f=[IO.File]::Open('${app}','Open','Read','None'); Write-Output listo; Start-Sleep -Seconds ${segundos}; $f.Close()`;
    bloqueo = spawn('powershell', ['-NoProfile', '-Command', ps]);
    await new Promise<void>((resolver) => bloqueo!.stdout!.once('data', () => resolver()));
  };

  const ejecutar = (intentos: number) => {
    const cmd = path.join(dir, 'update-apply.cmd');
    // PID que no existe: no hay que esperar a ninguna app.
    fs.writeFileSync(cmd, scriptAplicar({ app, final: app, nuevo, resultado, version: '0.1.37-alpha', pid: 999999, intentos, relanzar: false }));
    spawnSync('cmd.exe', ['/c', cmd], { timeout: 60_000 });
  };

  it('sustituye el exe y deja el resultado ok', () => {
    ejecutar(5);
    expect(fs.readFileSync(app, 'utf8')).toBe('NUEVO');
    expect(fs.existsSync(nuevo)).toBe(false);
    expect(fs.readFileSync(`${app}.old`, 'utf8')).toBe('VIEJO');
    expect(interpretarResultado(fs.readFileSync(resultado, 'utf8'), '0.1.37-alpha')).toEqual({ state: 'updated', version: '0.1.37-alpha' });
  }, 60_000);

  it('espera a que el exe deje de estar en uso (el fallo de GF-77)', async () => {
    await bloquear(4);
    ejecutar(30);
    expect(fs.readFileSync(app, 'utf8')).toBe('NUEVO');
    expect(JSON.parse(fs.readFileSync(resultado, 'utf8'))).toEqual({ ok: true, version: '0.1.37-alpha' });
  }, 60_000);

  it('si sigue en uso, conserva el antiguo y lo dice', async () => {
    await bloquear(20);
    ejecutar(2);
    await soltar();
    expect(fs.readFileSync(app, 'utf8')).toBe('VIEJO');
    expect(fs.existsSync(nuevo)).toBe(true);
    const r = interpretarResultado(fs.readFileSync(resultado, 'utf8'), '0.1.36-alpha');
    expect(r).toEqual({ state: 'apply-error', version: '0.1.37-alpha', message: MOTIVOS_FALLO.bloqueado });
  }, 60_000);
});
