const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, isolated Electron API to renderer if needed
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});
