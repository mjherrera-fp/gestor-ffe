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
});