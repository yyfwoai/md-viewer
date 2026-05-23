import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openMDFile: () => ipcRenderer.invoke('open-md-file'),
  openMDFileByPath: (filePath: string) => ipcRenderer.invoke('open-md-file-by-path', filePath),
  fetchUrlContent: (url: string) => ipcRenderer.invoke('fetch-url-content', url),
  onTriggerOpenFile: (callback: () => void) => {
    ipcRenderer.on('trigger-open-file', () => callback())
  }
})