const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  startScan: (location) => ipcRenderer.invoke('start-scan', location)
});