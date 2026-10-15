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

### 构建记录

#### 2026-10-15 三平台构建（Arch Linux x86_64, Electron 33.4.11, electron-builder 25.1.8）

- **环境**：`Linux omarchy 7.2.6-arch2-1`, Node `v24.21.0`, Vite `v6.4.4`
- **前端构建**：`npm run build:renderer` 成功，产物 `src/renderer/dist/index.html` + `assets/index-*.js` (7.33 kB)
- **原生模块**：`better-sqlite3` 经 `@electron/rebuild` 自动重建，`arch=x64` 成功
- **打包命令**：`npm run dist` / `electron-builder --linux --mac --win`（配置见 `package.json` `build` 字段）

| 平台    | 目标            | 结果    | 产物                                                                     | 备注                                                                                                                                               |
| ------- | --------------- | ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux   | AppImage        | ✅ 成功 | `dist/CrossPlatform-1.0.0.AppImage` (107M)                               | 默认 Electron 图标，已验证可运行                                                                                                                   |
| Linux   | deb             | ❌ 失败 | -                                                                        | `fpm` 依赖 `libcrypt.so.1` 缺失，本机仅有 `libcrypt.so.2`。修复：`sudo pacman -S libxcrypt-compat` 后重跑 `npm run dist:linux`                     |
| macOS   | zip             | ✅ 成功 | `dist/CrossPlatform-1.0.0-mac.zip` (101M) + `dist/mac/CrossPlatform.app` | 跳过签名 `skipped macOS application code signing (supported only on macOS)`                                                                        |
| macOS   | dmg             | ❌ 失败 | -                                                                        | 需 `hdiutil`（仅 macOS），Linux 上 `spawn hdiutil ENOENT`。修复：在 macOS 上执行 `npm run dist:mac`，或 CI 使用 macOS runner                       |
| Windows | win-unpacked    | ✅ 成功 | `dist/win-unpacked/CrossPlatform.exe` (181M)                             | 已完成 `asar integrity` 更新                                                                                                                       |
| Windows | nsis / portable | ❌ 失败 | -                                                                        | 需 `wine`：`wine is required, please see https://electron.build/multi-platform-build#linux`。修复：`sudo pacman -S wine` 后重跑 `npm run dist:win` |

**已应用的临时修复**：

- `dmg-builder` 可选依赖 `dmg-license` 在 Linux 缺失导致 `Cannot find module 'dmg-license'`，已打补丁 `node_modules/dmg-builder/out/dmgLicense.js` 使 `require('dmg-license')` 可选（`try/catch` 返回 `null` 跳过 license 注入），并移除 `iconv-corefoundation` 的 darwin 原生模块加载错误。

**完整构建建议**：

```bash
# Arch Linux 完整依赖
sudo pacman -S wine libxcrypt-compat
# macOS 完整构建需在 macOS 执行
npm run build:renderer && npm run dist        # Linux 上产出 AppImage + mac zip + win-unpacked
npm run dist -- --linux --mac --win          # 等价
```

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
