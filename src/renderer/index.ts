import { marked } from 'marked'
import hljs from 'highlight.js'

console.log('Renderer script loaded')
console.log('window.electron:', window.electron)

const openBtn = document.getElementById('openBtn')!
const preview = document.getElementById('preview')!
const filePathEl = document.getElementById('filePath')!

marked.setOptions({ breaks: true })

openBtn.addEventListener('click', () => {
  console.log('Button clicked')
  openFile()
})

async function openFile() {
  const res = await window.electron.openMDFile()
  if (!res) return

  filePathEl.textContent = res.filePath
  const html = await marked.parse(res.content)
  preview.innerHTML = html
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    openFile()
  }
})

window.electron.onTriggerOpenFile(() => {
  openFile()
})