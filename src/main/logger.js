const fs = require("fs");
const path = require("path");
const paths = require("./paths");

// ============================================================
// 日志系统
// ============================================================
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let currentLevel = LOG_LEVELS.info;

const logger = {
  setLevel(level) {
    currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  },

  log(level, message, ...args) {
    if (LOG_LEVELS[level] < currentLevel) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const line = `${prefix} ${message}`;

    // 控制台输出
    if (level === "error") console.error(line, ...args);
    else if (level === "warn") console.warn(line, ...args);
    else console.log(line, ...args);

    // 文件持久化
    try {
      paths.ensureDirs();
      const logFile = path.join(paths.logs, "app.log");
      fs.appendFileSync(
        logFile,
        `${line} ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : a)).join(" ")}\n`,
      );
    } catch (e) {
      // 日志写入失败不阻断应用
    }
  },

  debug(msg, ...args) {
    this.log("debug", msg, ...args);
  },
  info(msg, ...args) {
    this.log("info", msg, ...args);
  },
  warn(msg, ...args) {
    this.log("warn", msg, ...args);
  },
  error(msg, ...args) {
    this.log("error", msg, ...args);
  },
};

module.exports = logger;
