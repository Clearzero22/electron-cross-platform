const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// ============================================================
// 环境隔离：开发/生产使用不同的 userData 目录
// ============================================================
if (app.isPackaged) {
  app.setName("CrossPlatform");
} else {
  app.setName("CrossPlatform-dev");
}

const paths = require("./paths");
const platform = require("./platform");
const config = require("./config");
const store = require("./db");
const logger = require("./logger");

let mainWindow = null;

// ============================================================
// 全局错误处理
// ============================================================
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error.message);
  logger.error(error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at:", promise, "reason:", reason);
});

// ============================================================
// 窗口创建
// ============================================================
function createWindow() {
  const winConfig = config.get("window");
  const opts = platform.windowOptions();

  if (winConfig.width) opts.width = winConfig.width;
  if (winConfig.height) opts.height = winConfig.height;

  if (
    winConfig.rememberPosition &&
    winConfig.x !== null &&
    winConfig.y !== null
  ) {
    opts.x = winConfig.x;
    opts.y = winConfig.y;
  }

  mainWindow = new BrowserWindow(opts);

  if (winConfig.rememberPosition) {
    const saveBounds = () => {
      const b = mainWindow.getBounds();
      config.set("window.x", b.x);
      config.set("window.y", b.y);
      config.set("window.width", b.width);
      config.set("window.height", b.height);
    };
    mainWindow.on("resized", saveBounds);
    mainWindow.on("moved", saveBounds);
  }

  const isDev = !app.isPackaged && !!process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    const rendererPath = path.join(__dirname, "../renderer/dist/index.html");
    if (!fs.existsSync(rendererPath)) {
      throw new Error(
        `Renderer not found at ${rendererPath}. Run: npm run build:renderer`,
      );
    }
    mainWindow.loadFile(rendererPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  logger.info("Window created");
}

// ============================================================
// IPC 处理（带错误捕获）
// ============================================================
function setupIpc() {
  // 数据库
  ipcMain.handle("db:all", async () => {
    try {
      return await store.all();
    } catch (e) {
      logger.error("db:all failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:create", async (_, title, content) => {
    try {
      return await store.create(title, content);
    } catch (e) {
      logger.error("db:create failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:update", async (_, id, title, content) => {
    try {
      return await store.update(id, title, content);
    } catch (e) {
      logger.error("db:update failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:remove", async (_, id) => {
    try {
      return await store.remove(id);
    } catch (e) {
      logger.error("db:remove failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:search", async (_, query) => {
    try {
      return await store.search(query);
    } catch (e) {
      logger.error("db:search failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:paginate", async (_, page, pageSize) => {
    try {
      return await store.paginate(page, pageSize);
    } catch (e) {
      logger.error("db:paginate failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:stats", async () => {
    try {
      return await store.stats();
    } catch (e) {
      logger.error("db:stats failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:addTag", async (_, itemId, tagName, color) => {
    try {
      return await store.addTag(itemId, tagName, color);
    } catch (e) {
      logger.error("db:addTag failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:removeTag", async (_, itemId, tagName) => {
    try {
      return await store.removeTag(itemId, tagName);
    } catch (e) {
      logger.error("db:removeTag failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:getTags", async (_, itemId) => {
    try {
      return await store.getTags(itemId);
    } catch (e) {
      logger.error("db:getTags failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:setting", async (_, key, value) => {
    try {
      return await store.setting(key, value);
    } catch (e) {
      logger.error("db:setting failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:export", async () => {
    try {
      return await store.exportToJSON();
    } catch (e) {
      logger.error("db:export failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:exportTo", async (_, filePath) => {
    try {
      const data = store.exportToJSON();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return filePath;
    } catch (e) {
      logger.error("db:exportTo failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:import", async (_, data) => {
    try {
      return await store.importFromJSON(data);
    } catch (e) {
      logger.error("db:import failed:", e.message);
      throw e;
    }
  });
  ipcMain.handle("db:backup", async () => {
    try {
      return await store.backup();
    } catch (e) {
      logger.error("db:backup failed:", e.message);
      throw e;
    }
  });

  // 配置
  ipcMain.handle("config:get", (_, key) =>
    key ? config.get(key) : config.getAll(),
  );
  ipcMain.handle("config:set", (_, key, value) => config.set(key, value));
  ipcMain.handle("config:platform", () => ({
    platform: process.platform,
    isMac: platform.isMac,
    isWin: platform.isWin,
    isLinux: platform.isLinux,
  }));

  config.on("change", ({ key, oldValue, value }) => {
    mainWindow?.webContents.send("config:changed", { key, oldValue, value });
  });

  // 路径和对话框
  ipcMain.handle("paths:get", () => ({
    base: paths.base,
    attachments: paths.attachments,
    settings: paths.settings,
  }));
  ipcMain.handle("dialog:open", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    return result.filePaths[0] || null;
  });
  ipcMain.handle("dialog:save", async (_, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || "export.json",
    });
    return result.filePath || null;
  });
  ipcMain.handle("dialog:import", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled) return null;
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], "utf8"));
    return data;
  });

  logger.info("IPC handlers registered");
}

// ============================================================
// 菜单
// ============================================================
function setupMenu() {
  const template = [
    ...(platform.isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Item",
          accelerator: platform.accel("N"),
          click: () => mainWindow?.webContents.send("menu:new"),
        },
        { type: "separator" },
        platform.isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ============================================================
// 应用生命周期
// ============================================================
app.whenReady().then(() => {
  logger.info("App starting...");
  logger.info("Platform:", process.platform);
  logger.info("userData:", paths.base);

  paths.ensureDirs();
  store.setting("version", app.getVersion());
  store.setting("platform", process.platform);

  setupIpc();
  setupMenu();
  createWindow();

  platform.setupAppEvents();
  logger.info("App ready");
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (!platform.isMac) {
    store.close();
    app.quit();
  }
});

app.on("before-quit", () => {
  store.close();
  logger.info("App quitting");
});
