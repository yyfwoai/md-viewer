import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openMDFile: () => ipcRenderer.invoke('open-md-file'),
  onTriggerOpenFile: (callback: () => void) => {
    ipcRenderer.on('trigger-open-file', () => callback())
  }
})