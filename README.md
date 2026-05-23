# MD Viewer - Electron + TypeScript Markdown 文件查看器

## 功能
- 打开本地 .md 文件
- Markdown 语法渲染（标题、列表、代码、链接、表格）
- 代码块高亮
- 快捷键 Ctrl+O 打开文件
- 顶部菜单
- 图片画廊模式，点击可全屏查看
- 智能 Tab 管理（链接点击、Tab 切换/复用）
- 支持本地和远程 MD 文档

## 技术栈
- Electron（桌面端容器）
- TypeScript（类型安全）
- marked（MD 转 HTML）
- highlight.js（代码高亮）

## 项目结构
```
md-viewer/
├── src/
│   ├── main/            # 主进程（Electron 窗口、文件系统）
│   │   ├── index.ts
│   │   └── tsconfig.json
│   ├── renderer/        # 渲染进程（页面、MD 渲染）
│   │   ├── index.html
│   │   ├── index.ts
│   │   ├── style.css
│   │   ├── preload.ts
│   │   └── tsconfig.json
├── dist/                 # 编译输出
├── release/              # 打包输出
├── package.json
├── tsconfig.json
└── README.md
```

## 运行
```bash
npm install
npm start
```

## 打包

### Windows - 生成 .exe 安装包
```bash
npm run package
```
- 输出目录：`release/win-unpacked/`（便携版）
- 安装包：`release/MD Viewer Setup x.x.x.exe`

### Windows - 生成 .exe 便携版（免安装）
在 `package.json` 的 `build.win.target` 中添加：
```json
"portable": {
  "target": "portable"
}
```

### macOS - 生成 .dmg 安装包
```bash
npm run package
```
- 输出目录：`release/mac/`（便携版）
- 安装包：`release/MD Viewer-x.x.x.dmg`

### Linux - 生成 AppImage
在 `package.json` 的 `build` 中添加：
```json
"linux": {
  "target": ["AppImage"],
  "icon": null,
  "category": "Office"
}
```

### 同时打包多个平台
```bash
# Windows
npm run package -- --win

# macOS
npm run package -- --mac

# Linux
npm run package -- --linux

# 全部平台
npm run package -- --win --mac --linux
```

### 常见问题

**Q: 打包失败，提示缺少模块**
```bash
rm -rf node_modules
npm install
npm run package
```

**Q: Windows 打包后无法运行**
确保 `build.win.target` 配置正确，且 `build.files` 包含 `dist/**/*`

**Q: macOS 打包后签名问题**
默认不签名，如需签名需在 `package.json` 中配置 `mac.sign` 相关选项