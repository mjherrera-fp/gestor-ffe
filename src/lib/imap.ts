import net from 'net';
import tls from 'tls';

export interface ImapSentOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  folder: string;
  raw: Buffer;
  timeoutMs?: number;
  dataTimeoutMs?: number;
  maxAttempts?: number;
}

const FOLDER_FALLBACKS = ['Sent', 'Enviados', 'INBOX.Sent'];
const RETRYABLE = /Tiempo de espera agotado conectando por IMAP|Error IMAP en|se cerr\u00f3 inesperadamente/;

function quote(value: string): string {
  return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function attemptOneshot(options: ImapSentOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const socket = options.secure
      ? tls.connect({ host: options.host, port: options.port, servername: options.host, rejectUnauthorized: false })
      : net.connect({ host: options.host, port: options.port });

    let buffer = '';
    let tagCounter = 0;
    let pendingTag: number | null = null;
    let expectContinuation = false;
    let onDataReady: (() => void) | null = null;
    let onCommandDone: ((ok: boolean, text: string) => void) | null = null;
    let resolveGreeting: ((line: string) => void) | null = null;
    let greetingReceived = false;
    let finished = false;
    let currentTimeout = options.timeoutMs || 20000;
    let literalFullySent = false;
    let activeFolder = options.folder;

    const resetTimer = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        finish(new Error(`Tiempo de espera agotado conectando por IMAP a ${options.host}:${options.port}`));
      }, ms);
    };

    const finish = (err: Error | null, folderUsed?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.destroy();
      if (err) reject(err);
      else resolve(folderUsed!);
    };

    let timer = setTimeout(() => {
      finish(new Error(`Tiempo de espera agotado conectando por IMAP a ${options.host}:${options.port}`));
    }, currentTimeout);

    socket.on('error', (e) => {
      if (finished) return;
      // Si el literal ya se escribió completo, el mensaje puede estar guardado aunque el
      // servidor haya caído antes de confirmar: se da por bueno para evitar duplicados.
      if (literalFullySent) finish(null, activeFolder);
      else finish(new Error(`Error IMAP en ${options.host}: ${e.message}`));
    });
    socket.on('close', () => {
      if (finished) return;
      if (literalFullySent) finish(null, activeFolder);
      else finish(new Error(`La conexión IMAP con ${options.host} se cerró inesperadamente`));
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (!greetingReceived) {
          greetingReceived = true;
          if (resolveGreeting) {
            const r = resolveGreeting;
            resolveGreeting = null;
            r(trimmed);
          }
          continue;
        }

        if (expectContinuation && trimmed.startsWith('+')) {
          expectContinuation = false;
          const cb = onDataReady;
          onDataReady = null;
          if (cb) cb();
          continue;
        }

        const m = trimmed.match(/^A(\d+)\s+(OK|NO|BAD)(.*)$/i);
        if (m && pendingTag !== null && Number(m[1]) === pendingTag) {
          const cb = onCommandDone;
          onCommandDone = null;
          pendingTag = null;
          if (cb) cb(m[2].toUpperCase() === 'OK', (m[3] || '').trim());
          continue;
        }
      }
    });

    const waitGreeting = (): Promise<string> => new Promise((res) => {
      if (greetingReceived) return res('');
      resolveGreeting = res;
    });

    const command = (cmd: string): Promise<{ ok: boolean; text: string }> => new Promise((res, rej) => {
      const t = ++tagCounter;
      pendingTag = t;
      onCommandDone = (ok, text) => (ok ? res({ ok, text }) : rej(new Error(text || cmd)));
      socket.write(`A${t} ${cmd}\r\n`);
    });

    const appendMessage = (folder: string): Promise<void> => new Promise((res, rej) => {
      const t = ++tagCounter;
      const size = options.raw.length;
      activeFolder = folder;
      pendingTag = t;
      expectContinuation = true;
      onCommandDone = (ok) => (ok ? res() : rej(new Error(`No se pudo guardar en la carpeta "${folder}"`)));
      onDataReady = () => {
        resetTimer(options.dataTimeoutMs || 60000);
        socket.write(options.raw, () => { literalFullySent = true; });
      };
      socket.write(`A${t} APPEND ${quote(folder)} (\\Seen) {${size}}\r\n`);
    });

    (async () => {
      await waitGreeting();
      await command(`LOGIN ${quote(options.user)} ${quote(options.pass)}`);
      const folders = [...new Set([options.folder, ...FOLDER_FALLBACKS].filter(Boolean))];
      for (const folder of folders) {
        try {
          await appendMessage(folder);
          finish(null, folder);
          return;
        } catch {
          // probar la siguiente carpeta candidata
          resetTimer(currentTimeout);
        }
      }
      finish(new Error('No se encontró una carpeta de Enviados válida en el servidor IMAP'));
    })().catch((err) => finish(err));
  });
}

export async function appendToSentFolder(options: ImapSentOptions): Promise<string> {
  const maxAttempts = options.maxAttempts ?? 3;
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptOneshot(options);
    } catch (err: any) {
      lastErr = err;
      if (attempt >= maxAttempts) break;
      if (!RETRYABLE.test(err.message || '')) break;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw lastErr ?? new Error('No se pudo conectar por IMAP');
}