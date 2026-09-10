declare module '*.css';

interface UpdateStatus {
  state: 'checking' | 'none' | 'downloading' | 'ready' | 'error';
  version?: string;
  received?: number;
  total?: number;
  message?: string;
}

interface Window {
  updater?: {
    onStatus: (callback: (status: UpdateStatus) => void) => () => void;
    applyAndRestart: () => void;
    checkNow: () => void;
  };
}