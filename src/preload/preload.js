const { contextBridge, ipcRenderer } = require("electron");

// 统一渲染进程 API 入口
contextBridge.exposeInMainWorld("api", {
  platform: process.platform,
  versions: process.versions,

  db: {
    all: () => ipcRenderer.invoke("db:all"),
    create: (title, content) => ipcRenderer.invoke("db:create", title, content),
    update: (id, title, content) =>
      ipcRenderer.invoke("db:update", id, title, content),
    remove: (id) => ipcRenderer.invoke("db:remove", id),
    search: (query) => ipcRenderer.invoke("db:search", query),
    paginate: (page, pageSize) =>
      ipcRenderer.invoke("db:paginate", page, pageSize),
    stats: () => ipcRenderer.invoke("db:stats"),
    addTag: (itemId, tagName, color) =>
      ipcRenderer.invoke("db:addTag", itemId, tagName, color),
    removeTag: (itemId, tagName) =>
      ipcRenderer.invoke("db:removeTag", itemId, tagName),
    getTags: (itemId) => ipcRenderer.invoke("db:getTags", itemId),
    setting: (key, value) => ipcRenderer.invoke("db:setting", key, value),
    export: () => ipcRenderer.invoke("db:export"),
    exportTo: (filePath) => ipcRenderer.invoke("db:exportTo", filePath),
    import: (data) => ipcRenderer.invoke("db:import", data),
    backup: () => ipcRenderer.invoke("db:backup"),
  },

  config: {
    get: (key) => ipcRenderer.invoke("config:get", key),
    set: (key, value) => ipcRenderer.invoke("config:set", key, value),
    platform: () => ipcRenderer.invoke("config:platform"),
  },

  paths: () => ipcRenderer.invoke("paths:get"),
  openDialog: () => ipcRenderer.invoke("dialog:open"),
  dialogSave: (name) => ipcRenderer.invoke("dialog:save", name),
  dialogImport: () => ipcRenderer.invoke("dialog:import"),

  // 菜单事件
  onNewItem: (callback) => {
    ipcRenderer.on("menu:new", callback);
    return () => ipcRenderer.removeListener("menu:new", callback);
  },

  // 配置变更事件
  onConfigChange: (callback) => {
    ipcRenderer.on("config:changed", callback);
    return () => ipcRenderer.removeListener("config:changed", callback);
  },
});
