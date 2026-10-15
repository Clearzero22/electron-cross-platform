const fs = require('fs');
const { EventEmitter } = require('events');
const paths = require('./paths');
const platform = require('./platform');

// ============================================================
// 默认配置（三端通用 + 平台特定）
// ============================================================
const defaults = {
  // 窗口
  window: {
    width: 1200,
    height: 800,
    x: null,
    y: null,
    fullscreen: false,
    rememberPosition: true,
  },

  // 外观
  appearance: {
    theme: 'dark', // dark | light | auto
    fontSize: 14,
    locale: 'auto', // auto | zh-CN | en-US
    accentColor: '#0ea5e9',
  },

  // 行为
  behavior: {
    autoStart: false, // 开机启动
    minimizeToTray: true,
    closeToTray: true,
    checkUpdates: true,
    saveInterval: 30, // 自动保存间隔（秒）
  },

  // 平台特定配置
  platform: {
    mac: {
      vibrancy: true, // 毛玻璃效果
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 12, y: 12 },
    },
    win: {
      frame: true,
      autoHideMenuBar: true,
      taskbar: true, // 显示任务栏图标
    },
    linux: {
      frame: true,
      trayIcon: true, // 系统托盘
    },
  },
};

// ============================================================
// 配置管理器
// ============================================================
class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.cache = this.load();
  }

  load() {
    const userSettings = paths.ensureFile(paths.settings, {});
    this.cache = this.deepMerge(defaults, userSettings);
    return this.cache;
  }

  // 读取：config.get('window.width')
  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this.cache);
  }

  // 写入：config.set('window.width', 1400)
  set(key, value) {
    const keys = key.split('.');
    let obj = this.cache;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof obj[keys[i]] !== 'object' || obj[keys[i]] === null) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    const oldValue = obj[keys[keys.length - 1]];
    obj[keys[keys.length - 1]] = value;
    this.save();
    this.emit('change', { key, oldValue, value });
    return value;
  }

  // 批量设置
  setMultiple(entries) {
    Object.entries(entries).forEach(([key, value]) => this.set(key, value));
  }

  // 获取当前平台的配置（合并通用 + 平台特定）
  getPlatformConfig(section) {
    const platformKey = platform.isMac
      ? 'mac'
      : platform.isWin
        ? 'win'
        : 'linux';
    const platformSection = this.get(`platform.${platformKey}`);
    return { ...(defaults[section] || {}), ...(platformSection || {}) };
  }

  // 获取主题（处理 auto）
  getTheme() {
    const theme = this.get('appearance.theme');
    if (theme !== 'auto') return theme;
    // 简单判断：6 点到 18 点为浅色
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'light' : 'dark';
  }

  save() {
    fs.writeFileSync(paths.settings, JSON.stringify(this.cache, null, 2));
  }

  // 深度合并（source 覆盖 target）
  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  // 获取所有配置（用于渲染进程）
  getAll() {
    return JSON.parse(JSON.stringify(this.cache));
  }
}

module.exports = new ConfigManager();
