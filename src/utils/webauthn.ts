export type WebauthnResult =
  | { ok: true; credentialId?: string; error?: undefined }
  | { ok: false; credentialId?: string; error: string };

const RP_ID = 'localhost';
const RP_NAME = 'Gestor FFE';

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(b64: string): Uint8Array {
  const pad = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

function isWebauthnSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.credentials && typeof PublicKeyCredential !== 'undefined';
}

function errorToMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'cancelado';
    if (err.name === 'NotSupportedError') return 'no-soportado';
    if (err.name === 'InvalidStateError') return 'ya-existe';
  }
  return 'error-desconocido';
}

export async function plataformaBiometricaDisponible(): Promise<boolean> {
  if (!isSecureContext() || !isWebauthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function crearCredencialBiometrica(): Promise<WebauthnResult> {
  if (!isSecureContext()) return { ok: false, error: 'no-contexto-seguro' };
  if (!isWebauthnSupported()) return { ok: false, error: 'no-soportado' };
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { id: RP_ID, name: RP_NAME },
        user: {
          id: new TextEncoder().encode('gestor-ffe'),
          name: 'gestor-ffe',
          displayName: RP_NAME,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) return { ok: false, error: 'cancelado' };
    return { ok: true, credentialId: base64UrlEncode(credential.rawId) };
  } catch (err) {
    return { ok: false, error: errorToMessage(err) };
  }
}

export async function verificarCredencialBiometrica(credentialId: string): Promise<WebauthnResult> {
  if (!isSecureContext()) return { ok: false, error: 'no-contexto-seguro' };
  if (!isWebauthnSupported()) return { ok: false, error: 'no-soportado' };
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: base64UrlDecode(credentialId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) return { ok: false, error: 'cancelado' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorToMessage(err) };
  }
}