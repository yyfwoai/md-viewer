import { marked } from 'marked'
import hljs from 'highlight.js'

console.log('Renderer script starting')
console.log('window.electron:', window.electron)

marked.setOptions({ breaks: true })

// Tab management
interface Tab {
  id: string           // 唯一标识符（地址哈希）
  filePath: string      // 当前地址（本地路径或URL）
  content: string       // MD内容
  historyIndex: number
  history: string[]     // 历史记录
  isRemote: boolean     // 是否远程URL
}
let tabs: Tab[] = []
let activeTabIndex = -1
let preview: HTMLElement
let tabsContainer: HTMLElement
let filePathEl: HTMLElement
let backBtn: HTMLButtonElement
let forwardBtn: HTMLButtonElement
let openBtn: HTMLButtonElement

// 生成地址唯一标识符
function generateAddressId(address: string): string {
  // 对于URL，去除hash和query参数后生成hash
  // 对于本地路径，直接使用规范化的路径
  if (address.startsWith('http://') || address.startsWith('https://')) {
    try {
      const url = new URL(address)
      return url.origin + url.pathname
    } catch {
      return address
    }
  }
  // 本地路径：规范化分隔符
  return address.replace(/\\/g, '/').toLowerCase()
}

// 判断是否为远程URL
function isRemoteUrl(address: string): boolean {
  return address.startsWith('http://') || address.startsWith('https://')
}

// 获取本地文件绝对路径
function getAbsolutePath(relativePath: string, basePath: string): string {
  if (/^[a-zA-Z]:/.test(relativePath) || relativePath.startsWith('\\\\')) {
    return relativePath
  }
  if (relativePath.startsWith('http') || relativePath.startsWith('/')) {
    return ''
  }
  const normalizedBase = basePath.replace(/[\\/]+$/, '')
  const lastSep = Math.max(normalizedBase.lastIndexOf('/'), normalizedBase.lastIndexOf('\\'), 0)
  const currentDir = normalizedBase.substring(0, lastSep)
  const cleanPath = relativePath.replace(/^\.\//, '')
  return currentDir + '/' + cleanPath
}

// 获取地址的显示名称
function getAddressDisplayName(address: string): string {
  if (isRemoteUrl(address)) {
    try {
      const url = new URL(address)
      return url.pathname.split('/').pop() || url.hostname
    } catch {
      return address
    }
  }
  const parts = address.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || 'Untitled'
}

// 查找已存在的Tab（通过地址精确匹配）
function findTabByAddress(address: string): number {
  const targetId = generateAddressId(address)
  return tabs.findIndex(t => generateAddressId(t.filePath) === targetId)
}

// 内容加载与渲染
async function loadContentToTab(tabIndex: number, address: string, content: string) {
  const tab = tabs[tabIndex]
  tab.filePath = address
  tab.content = content

  // 渲染内容
  const html = marked.parse(content)
  preview.innerHTML = html as string
  highlightCode()
  setupAllLinks()
  console.log('Tab content loaded:', address)
}

async function loadFileToTab(tabIndex: number, filePath: string) {
  console.log('loadFileToTab called with:', filePath)
  const res = await window.electron.openMDFileByPath(filePath)
  if (!res) {
    console.log('loadFileToTab: no result returned')
    return
  }
  await loadContentToTab(tabIndex, filePath, res.content)
}

async function loadRemoteToTab(tabIndex: number, url: string) {
  console.log('loadRemoteToTab called with:', url)
  const res = await window.electron.fetchUrlContent(url)
  if (!res) {
    console.log('loadRemoteToTab: failed to fetch')
    preview.innerHTML = '<div style="padding:40px;text-align:center;color:#f00;">加载失败: ' + url + '</div>'
    return
  }
  await loadContentToTab(tabIndex, url, res.content)
}

// 渲染Tab
async function renderTab(tabIndex: number) {
  const tab = tabs[tabIndex]
  if (!tab) return

  console.log('renderTab called, tab.filePath:', tab.filePath, 'content length:', tab.content.length)
  filePathEl.textContent = tab.filePath
  const result = marked.parse(tab.content)
  const html = typeof result === 'string' ? result : await result
  preview.innerHTML = html
  highlightCode()
  setupAllLinks()
  updateTabBar()
  updateNavButtons(tabIndex)
}

// 代码高亮
function highlightCode() {
  preview.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block as HTMLElement)
  })
}

// 智能链接处理 - 统一处理所有链接
function setupAllLinks() {
  const links = preview.querySelectorAll('a')
  console.log('setupAllLinks called, found', links.length, 'links')

  links.forEach(a => {
    const href = a.getAttribute('href') || ''
    if (!href) return

    // 确保链接样式
    a.style.color = '#0066cc'
    a.style.cursor = 'pointer'

    // 移除旧的事件监听器（通过clone方式）
    const newA = a.cloneNode(true) as HTMLElement
    a.parentNode?.replaceChild(newA, a)

    newA.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      console.log('Link clicked:', href)

      const targetAddress = resolveAddress(href, getCurrentBasePath())
      if (!targetAddress) {
        console.log('Cannot resolve address:', href)
        return
      }

      // 智能Tab管理：决定是切换还是新建
      await smartTabOpen(targetAddress, isMDFile(targetAddress))
    })
  })
}

// 解析相对/绝对地址为完整地址
function resolveAddress(href: string, basePath: string): string {
  // 绝对路径直接返回
  if (/^[a-zA-Z]:/.test(href) || href.startsWith('\\\\')) {
    return href
  }
  // 远程URL直接返回
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href
  }
  // 根路径
  if (href.startsWith('/')) {
    return href
  }
  // 本地相对路径
  return getAbsolutePath(href, basePath)
}

// 获取当前Tab的基础路径
function getCurrentBasePath(): string {
  if (activeTabIndex < 0 || activeTabIndex >= tabs.length) return ''
  return tabs[activeTabIndex].filePath
}

// 判断是否为MD文件
function isMDFile(address: string): boolean {
  const lower = address.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown')
}

// 智能Tab打开逻辑
async function smartTabOpen(address: string, forceNewTab: boolean = false) {
  const addressId = generateAddressId(address)

  console.log('smartTabOpen:', {
    address,
    addressId,
    forceNewTab,
    existingTabs: tabs.map(t => ({ id: t.id, path: t.filePath }))
  })

  // MD文档：强制新建Tab，不复用
  if (forceNewTab) {
    createNewTab(address)
    return
  }

  // 非MD文档：先查找已存在的Tab
  const existingIndex = findTabByAddress(address)
  if (existingIndex >= 0) {
    console.log('Found existing tab, switching to index:', existingIndex)
    switchToTab(existingIndex)
  } else {
    console.log('No existing tab, creating new')
    createNewTab(address)
  }
}

// 创建新Tab
async function createNewTab(address: string) {
  const newTab: Tab = {
    id: generateAddressId(address),
    filePath: address,
    content: '',
    history: [address],
    historyIndex: 0,
    isRemote: isRemoteUrl(address)
  }

  const newIndex = tabs.length
  tabs.push(newTab)
  activeTabIndex = newIndex

  // 根据类型加载内容
  if (newTab.isRemote) {
    await loadRemoteToTab(newIndex, address)
  } else {
    // 本地文件
    if (isMDFile(address)) {
      await loadFileToTab(newIndex, address)
    } else {
      // 非MD文件，尝试作为文本加载
      const res = await window.electron.openMDFileByPath(address)
      if (res) {
        await loadContentToTab(newIndex, address, res.content)
      }
    }
  }

  updateTabBar()
  updateNavButtons(newIndex)
}

// Tab切换
function switchToTab(tabIndex: number) {
  if (tabIndex < 0 || tabIndex >= tabs.length) return
  activeTabIndex = tabIndex
  renderTab(tabIndex)
  updateTabBar()
  updateNavButtons(tabIndex)
}

// Tab关闭
function closeTab(tabIndex: number) {
  if (tabIndex < 0 || tabIndex >= tabs.length) return
  const tab = tabs[tabIndex]
  tabs.splice(tabIndex, 1)

  if (activeTabIndex >= tabs.length) {
    activeTabIndex = tabs.length - 1
  }
  if (activeTabIndex >= 0) {
    renderTab(activeTabIndex)
  } else {
    preview.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">点击"打开 MD 文件"开始</div>'
    filePathEl.textContent = ''
  }
  updateTabBar()
}

// 前进/后退导航
function navigateBack() {
  if (activeTabIndex < 0) return
  const tab = tabs[activeTabIndex]
  if (tab.historyIndex > 0) {
    tab.historyIndex--
    const address = tab.history[tab.historyIndex]
    navigateInTab(activeTabIndex, address)
  }
}

function navigateForward() {
  if (activeTabIndex < 0) return
  const tab = tabs[activeTabIndex]
  if (tab.historyIndex < tab.history.length - 1) {
    tab.historyIndex++
    const address = tab.history[tab.historyIndex]
    navigateInTab(activeTabIndex, address)
  }
}

async function navigateInTab(tabIndex: number, address: string) {
  const tab = tabs[tabIndex]
  tab.filePath = address
  tab.isRemote = isRemoteUrl(address)

  if (tab.isRemote) {
    await loadRemoteToTab(tabIndex, address)
  } else {
    await loadFileToTab(tabIndex, address)
  }

  updateTabBar()
  updateNavButtons(tabIndex)
}

// 更新Tab栏
function updateTabBar() {
  tabsContainer.innerHTML = ''
  tabs.forEach((tab, index) => {
    const tabEl = document.createElement('div')
    tabEl.className = 'tab' + (index === activeTabIndex ? ' active' : '')
    tabEl.innerHTML = `
      <span class="tab-title" title="${tab.filePath}">${getAddressDisplayName(tab.filePath)}</span>
      <span class="tab-close" data-index="${index}">×</span>
    `
    tabEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('tab-close')) {
        closeTab(parseInt(target.dataset.index || '0'))
      } else {
        switchToTab(index)
      }
    })
    tabsContainer.appendChild(tabEl)
  })
}

// 更新导航按钮状态
function updateNavButtons(tabIndex: number) {
  const tab = tabs[tabIndex]
  if (!tab) return
  backBtn.disabled = tab.historyIndex <= 0
  forwardBtn.disabled = tab.historyIndex >= tab.history.length - 1
}

// 初始化
function init() {
  console.log('init called')
  openBtn = document.getElementById('openBtn') as HTMLButtonElement
  backBtn = document.getElementById('backBtn') as HTMLButtonElement
  forwardBtn = document.getElementById('forwardBtn') as HTMLButtonElement
  preview = document.getElementById('preview') as HTMLElement
  tabsContainer = document.getElementById('tabs') as HTMLElement
  filePathEl = document.getElementById('filePath') as HTMLElement

  backBtn.addEventListener('click', navigateBack)
  forwardBtn.addEventListener('click', navigateForward)

  openBtn.addEventListener('click', async () => {
    const res = await window.electron.openMDFile()
    if (!res) return
    await createNewTab(res.filePath)
  })

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      openBtn.click()
    }
    if (e.altKey && e.key === 'ArrowLeft') {
      backBtn.click()
    }
    if (e.altKey && e.key === 'ArrowRight') {
      forwardBtn.click()
    }
  })

  if (window.electron && window.electron.onTriggerOpenFile) {
    window.electron.onTriggerOpenFile(() => {
      openBtn.click()
    })
  }

  // 显示初始空白状态
  preview.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">点击"打开 MD 文件"开始</div>'
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}