const listEl = document.getElementById("list");
const titleEl = document.getElementById("title");
const contentEl = document.getElementById("content");
const metaEl = document.getElementById("meta");
const searchEl = document.getElementById("search");
const statsEl = document.getElementById("stats");
const saveStatusEl = document.getElementById("save-status");
const btnNew = document.getElementById("btn-new");
const btnSave = document.getElementById("btn-save");
const btnDelete = document.getElementById("btn-delete");
const btnExport = document.getElementById("btn-export");
const btnImport = document.getElementById("btn-import");
const btnBackup = document.getElementById("btn-backup");
const btnAddTag = document.getElementById("btn-add-tag");
const tagNameEl = document.getElementById("tag-name");
const tagInputEl = document.getElementById("tag-input");
const settingsPanel = document.getElementById("settings-panel");
const btnSettings = document.getElementById("btn-settings");
const btnCloseSettings = document.getElementById("btn-close-settings");
const errorToast = document.getElementById("error-toast");

let items = [];
let currentId = null;
let searchQuery = "";
let autoSaveTimer = null;
let saveStatusTimer = null;

// 显示平台标识
const platformNames = { darwin: "macOS", win32: "Windows", linux: "Linux" };
document.getElementById("platform").textContent =
  platformNames[window.api.platform] || window.api.platform;

// ============================================================
// 配置应用
// ============================================================
async function applyConfig() {
  const cfg = await window.api.config.get();
  if (!cfg) return;

  if (cfg.appearance?.fontSize) {
    document.body.style.fontSize = `${cfg.appearance.fontSize}px`;
  }

  const theme = cfg.appearance?.theme || "dark";
  if (theme === "light") {
    document.body.style.background = "#f1f5f9";
    document.body.style.color = "#0f172a";
  } else {
    document.body.style.background = "#0f172a";
    document.body.style.color = "#e2e8f0";
  }

  if (cfg.appearance?.accentColor) {
    document.documentElement.style.setProperty(
      "--accent",
      cfg.appearance.accentColor,
    );
  }

  // 更新设置面板 UI
  updateSettingsUI(cfg);
}

function updateSettingsUI(cfg) {
  document.getElementById("setting-theme").value =
    cfg.appearance?.theme || "dark";
  document.getElementById("setting-fontsize").value =
    cfg.appearance?.fontSize || 14;
  document.getElementById("setting-accent").value =
    cfg.appearance?.accentColor || "#0ea5e9";
  document.getElementById("setting-autosave").value =
    cfg.behavior?.saveInterval || 30;
  document.getElementById("setting-checkupdates").checked =
    cfg.behavior?.checkUpdates !== false;
  document.getElementById("setting-tray").checked =
    cfg.behavior?.minimizeToTray !== false;
  document.getElementById("setting-rememberpos").checked =
    cfg.window?.rememberPosition !== false;
}

window.api.onConfigChange?.(() => {
  applyConfig();
});

// ============================================================
// 错误处理
// ============================================================
function showError(message) {
  errorToast.textContent = message;
  errorToast.classList.add("show");
  setTimeout(() => errorToast.classList.remove("show"), 3000);
}

async function safeCall(fn, errorMessage) {
  try {
    return await fn();
  } catch (e) {
    showError(`${errorMessage}: ${e.message}`);
    return null;
  }
}

// ============================================================
// 数据加载
// ============================================================
async function loadItems() {
  if (searchQuery) {
    items =
      (await safeCall(
        () => window.api.db.search(searchQuery),
        "Search failed",
      )) || [];
  } else {
    items = (await safeCall(() => window.api.db.all(), "Load failed")) || [];
  }
  renderList();
  updateStats();
}

async function updateStats() {
  const s = await safeCall(() => window.api.db.stats(), "Stats failed");
  if (s) {
    statsEl.textContent = `${s.totalItems} items • ${s.totalTags} tags • ${(s.dbSize / 1024).toFixed(1)} KB`;
  }
}

function renderList() {
  if (items.length === 0) {
    listEl.innerHTML =
      '<div class="empty" style="margin-top:20px">No items yet</div>';
    return;
  }
  listEl.innerHTML = items
    .map(
      (it) => `
    <div class="item ${it.id === currentId ? "active" : ""}" data-id="${it.id}">
      <div class="title">${escapeHtml(it.title)}</div>
      <div class="date">${new Date(it.created_at).toLocaleString()}</div>
    </div>`,
    )
    .join("");

  listEl.querySelectorAll(".item").forEach((el) => {
    el.onclick = () => selectItem(Number(el.dataset.id));
  });
}

function selectItem(id) {
  currentId = id;
  const item = items.find((i) => i.id === id);
  if (!item) return;
  titleEl.value = item.title;
  contentEl.value = item.content || "";
  metaEl.textContent = `Created: ${new Date(item.created_at).toLocaleString()} • Updated: ${new Date(item.updated_at).toLocaleString()}`;
  btnSave.style.display = "";
  btnDelete.style.display = "";
  tagInputEl.style.display = "";
  renderList();
}

function clearEditor() {
  currentId = null;
  titleEl.value = "";
  contentEl.value = "";
  metaEl.textContent = "";
  btnSave.style.display = "none";
  btnDelete.style.display = "none";
  tagInputEl.style.display = "none";
  renderList();
}

// ============================================================
// CRUD
// ============================================================
async function createItem() {
  const title = titleEl.value.trim();
  if (!title) {
    titleEl.focus();
    return;
  }
  const result = await safeCall(
    () => window.api.db.create(title, contentEl.value),
    "Create failed",
  );
  if (result) {
    titleEl.value = "";
    contentEl.value = "";
    await loadItems();
    selectItem(result.id);
  }
}

async function saveItem() {
  if (!currentId) return;
  const result = await safeCall(
    () =>
      window.api.db.update(currentId, titleEl.value.trim(), contentEl.value),
    "Save failed",
  );
  if (result) {
    showSaveStatus("saved");
    await loadItems();
    selectItem(currentId);
  }
}

async function deleteItem() {
  if (!currentId) return;
  const result = await safeCall(
    () => window.api.db.remove(currentId),
    "Delete failed",
  );
  if (result) {
    clearEditor();
    await loadItems();
  }
}

// ============================================================
// 自动保存
// ============================================================
function setupAutoSave() {
  const cfg = window.api.config.get();
  const interval = cfg?.behavior?.saveInterval || 30;

  if (autoSaveTimer) clearInterval(autoSaveTimer);

  if (interval > 0) {
    autoSaveTimer = setInterval(async () => {
      if (currentId && titleEl.value.trim()) {
        showSaveStatus("saving");
        await saveItem();
      }
    }, interval * 1000);
  }
}

function showSaveStatus(status) {
  if (saveStatusTimer) clearTimeout(saveStatusTimer);

  if (status === "saved") {
    saveStatusEl.textContent = "All changes saved";
    saveStatusEl.className = "save-status saved";
  } else if (status === "saving") {
    saveStatusEl.textContent = "Saving...";
    saveStatusEl.className = "save-status saving";
  }

  saveStatusTimer = setTimeout(() => {
    saveStatusEl.textContent = "";
  }, 2000);
}

// ============================================================
// 搜索
// ============================================================
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// 标签
// ============================================================
async function addTag() {
  const name = tagNameEl.value.trim();
  if (!name || !currentId) return;
  const result = await safeCall(
    () => window.api.db.addTag(currentId, name),
    "Add tag failed",
  );
  if (result) {
    tagNameEl.value = "";
    await loadItems();
    selectItem(currentId);
  }
}

// ============================================================
// 导入 / 导出 / 备份
// ============================================================
async function exportData() {
  const data = await safeCall(() => window.api.db.export(), "Export failed");
  if (!data) return;

  const filePath = await window.api.dialogSave("export.json");
  if (!filePath) return;

  const result = await safeCall(
    () => window.api.db.exportTo(filePath),
    "Export failed",
  );
  if (result) {
    showError(`Exported ${data.items.length} items`);
  }
}

async function importData() {
  const data = await window.api.dialogImport();
  if (!data) return;

  const result = await safeCall(
    () => window.api.db.import(data),
    "Import failed",
  );
  if (result) {
    showError(`Imported ${result.imported} items`);
    clearEditor();
    await loadItems();
  }
}

async function backup() {
  const path = await safeCall(() => window.api.db.backup(), "Backup failed");
  if (path) {
    showError("Backup saved");
  }
}

// ============================================================
// 设置面板
// ============================================================
function openSettings() {
  settingsPanel.classList.add("open");
}

function closeSettings() {
  settingsPanel.classList.remove("open");
}

async function saveSettings() {
  const settings = {
    "appearance.theme": document.getElementById("setting-theme").value,
    "appearance.fontSize": parseInt(
      document.getElementById("setting-fontsize").value,
    ),
    "appearance.accentColor": document.getElementById("setting-accent").value,
    "behavior.saveInterval": parseInt(
      document.getElementById("setting-autosave").value,
    ),
    "behavior.checkUpdates": document.getElementById("setting-checkupdates")
      .checked,
    "behavior.minimizeToTray": document.getElementById("setting-tray").checked,
    "window.rememberPosition": document.getElementById("setting-rememberpos")
      .checked,
  };

  for (const [key, value] of Object.entries(settings)) {
    await window.api.config.set(key, value);
  }

  applyConfig();
  setupAutoSave();
  closeSettings();
}

// ============================================================
// 事件绑定
// ============================================================
btnNew.onclick = createItem;
btnSave.onclick = saveItem;
btnDelete.onclick = deleteItem;
btnExport.onclick = exportData;
btnImport.onclick = importData;
btnBackup.onclick = backup;
btnAddTag.onclick = addTag;
btnSettings.onclick = openSettings;
btnCloseSettings.onclick = closeSettings;

// 设置面板变更时保存
document.getElementById("setting-theme").onchange = saveSettings;
document.getElementById("setting-fontsize").onchange = saveSettings;
document.getElementById("setting-accent").onchange = saveSettings;
document.getElementById("setting-autosave").onchange = saveSettings;
document.getElementById("setting-checkupdates").onchange = saveSettings;
document.getElementById("setting-tray").onchange = saveSettings;
document.getElementById("setting-rememberpos").onchange = saveSettings;

// 搜索防抖
let searchTimeout;
searchEl.oninput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = searchEl.value.trim();
    loadItems();
  }, 300);
};

// 快捷键：Cmd/Ctrl+N 新建
window.api.onNewItem(() => {
  clearEditor();
  titleEl.focus();
});

// 启动
applyConfig();
loadItems();
setupAutoSave();
