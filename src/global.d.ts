declare module '*.css';

interface UpdateStatus {
  state: 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'error'
    // GF-77: resultado de la actualización aplicada en el arranque anterior.
    | 'updated' | 'apply-error';
  version?: string;
  received?: number;
  total?: number;
  message?: string;
  releaseUrl?: string;
}

interface Window {
  ffeSession?: {
    token: string;
  };
  updater?: {
    onStatus: (callback: (status: UpdateStatus) => void) => () => void;
    applyAndRestart: () => void;
    checkNow: () => void;
    download: () => void;
  };
  calendar?: {
    createIcsEvent: (content: string, filename?: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  };
  biometric?: {
    status: () => Promise<{ available: boolean; enabled: boolean; credentialId: string | null }>;
    save: (params: { credentialId: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
    getPassword: () => Promise<{ ok: boolean; password?: string; error?: string }>;
    delete: () => Promise<{ ok: boolean; error?: string }>;
  };
}