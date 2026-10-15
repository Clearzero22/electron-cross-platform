# Electron Cross-Platform App

跨平台 Electron 应用模板，统一路径、平台差异、数据存储。

## 项目结构

```
src/
├── main/               # 主进程
│   ├── index.js        # 入口：生命周期、IPC、菜单
│   ├── paths.js        # 统一路径（userData 封装）
│   ├── platform.js     # 统一平台差异（快捷键/窗口/通知）
│   └── db.js           # SQLite 数据层 + 版本迁移
├── preload/
│   └── preload.js      # 渲染进程 API 桥接
└── renderer/           # 前端（Vite + 原生 JS）
    ├── index.html
    └── src/main.js
```

## 开发

```bash
npm install
npm run dev          # 启动 Vite dev server + Electron
```

## 构建

```bash
npm run build:renderer   # 构建前端
npm run dist            # 打包三平台（Linux/macOS/Windows）
npm run dist:linux      # 只打包 Linux
npm run dist:mac        # 只打包 macOS
npm run dist:win        # 只打包 Windows
```

产物在 `dist/`。

## 跨平台数据

- **位置**：`app.getPath('userData')`（自动适配三平台）
  - Linux: `~/.config/CrossPlatform/`
  - macOS: `~/Library/Application Support/CrossPlatform/`
  - Windows: `%APPDATA%\CrossPlatform\`
- **存储**：SQLite（`better-sqlite3`），单文件 `data.db`
- **迁移**：`src/main/db.js` 里 `migrate()`，用 `PRAGMA user_version` 管理版本
- **配置**：`settings.json` + `settings` 表

## 原生模块

```bash
npm run rebuild   # 三平台切换后必须重新编译原生模块
```

## 新增平台相关代码

1. 平台判断 → `src/main/platform.js`
2. 路径 → `src/main/paths.js`
3. 快捷键 → 用 `platform.accel('N')` 自动转换 Cmd/Ctrl
