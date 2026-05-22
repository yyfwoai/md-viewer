# MD Viewer - Electron + TypeScript Markdown 文件查看器

## 功能
- 打开本地 .md 文件
- Markdown 语法渲染（标题、列表、代码、链接、表格）
- 代码块高亮
- 快捷键 Ctrl+O 打开文件
- 顶部菜单

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
```bash
npm run package
```

生成文件：build/*.exe (Windows) / build/*.dmg (Mac)