const { contextBridge, ipcRenderer } = require('electron');

// El token de sesión llega por additionalArguments desde el proceso principal
// (ver main.js). Es la única forma de que el renderer pueda hablar con la API
// local, y no debe exponerse por ningún otro canal.
const sessionToken = (process.argv.find(arg => arg.startsWith('--ffe-session-token=')) || '')
  .slice('--ffe-session-token='.length);

contextBridge.exposeInMainWorld('ffeSession', {
  token: sessionToken,
});

contextBridge.exposeInMainWorld('updater', {
  onStatus(callback) {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('updater-status', handler);
    return () => ipcRenderer.removeListener('updater-status', handler);
  },
  applyAndRestart() {
    ipcRenderer.send('updater-apply');
  },
  checkNow() {
    ipcRenderer.send('updater-check');
  },
  download() {
    ipcRenderer.send('updater-download');
  },
});

contextBridge.exposeInMainWorld('calendar', {
  createIcsEvent(content, filename) {
    return ipcRenderer.invoke('calendar-save-ics', { content, filename });
  },
});

contextBridge.exposeInMainWorld('biometric', {
  status() {
    return ipcRenderer.invoke('biometric-status');
  },
  save({ credentialId, password }) {
    return ipcRenderer.invoke('biometric-save', { credentialId, password });
  },
  getPassword() {
    return ipcRenderer.invoke('biometric-get-password');
  },
  delete() {
    return ipcRenderer.invoke('biometric-delete');
  },
});