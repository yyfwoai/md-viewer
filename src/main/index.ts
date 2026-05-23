import { app, BrowserWindow, ipcMain, dialog, Menu, net } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    title: 'MD 文件查看器',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '../renderer/preload.js')
    }
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  mainWindow.webContents.openDevTools()
}

function openFile() {
  mainWindow?.webContents.send('trigger-open-file')
}

app.whenReady().then(() => {
  createWindow()

  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        { label: '打开', accelerator: 'CmdOrCtrl+O', click: openFile },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
})

ipcMain.handle('open-md-file', async () => {
  if (!mainWindow) return null

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '选择 Markdown 文件',
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    properties: ['openFile']
  })

  if (canceled || !filePaths.length) return null

  const filePath = filePaths[0]
  const content = fs.readFileSync(filePath, 'utf8')
  return { filePath, content }
})

ipcMain.handle('open-md-file-by-path', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return { filePath, content }
  } catch {
    return null
  }
})

ipcMain.handle('fetch-url-content', async (_event, url: string) => {
  try {
    const response = await net.fetch(url)
    if (!response.ok) {
      return null
    }
    const content = await response.text()
    return { url, content }
  } catch {
    return null
  }
})

app.on('window-all-closed', () => app.quit())