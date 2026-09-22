const { contextBridge, ipcRenderer } = require('electron');

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