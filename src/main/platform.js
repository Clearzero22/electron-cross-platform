const { app, Notification } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const isLinux = process.platform === 'linux';

const platform = {
  isMac,
  isWin,
  isLinux,

  // 统一快捷键：Mac 用 Cmd，其他用 Ctrl
  accel(key) {
    return isMac ? `Cmd+${key}` : `Ctrl+${key}`;
  },

  // 统一窗口行为
  windowOptions() {
    const opts = {
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    };
    if (isMac) {
      opts.titleBarStyle = 'hiddenInset';
      opts.trafficLightPosition = { x: 12, y: 12 };
    } else if (isWin) {
      opts.frame = true;
      opts.autoHideMenuBar = true;
    } else {
      opts.frame = true;
    }
    return opts;
  },

  // 统一通知
  notify(title, body) {
    if (Notification.isSupported()) {
      const n = new Notification({ title, body, silent: isMac });
      n.show();
    }
  },

  // 统一应用退出行为
  setupAppEvents() {
    app.on('window-all-closed', () => {
      if (!isMac) app.quit();
    });
  },
};

module.exports = platform;
