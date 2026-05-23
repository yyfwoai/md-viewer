export {}

declare global {
  interface Window {
    electron: {
      openMDFile: () => Promise<{ filePath: string; content: string } | null>
      openMDFileByPath: (filePath: string) => Promise<{ filePath: string; content: string } | null>
      onTriggerOpenFile: (callback: () => void) => void
    }
  }
}