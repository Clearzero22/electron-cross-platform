const { app } = require("electron");
const path = require("path");
const fs = require("fs");

const base = app.getPath("userData");

const paths = {
  base,
  settings: path.join(base, "settings.json"),
  db: path.join(base, "data.db"),
  attachments: path.join(base, "attachments"),
  logs: path.join(base, "logs"),
  cache: path.join(base, "cache"),

  ensureDirs() {
    ["attachments", "logs", "cache"].forEach((d) => {
      fs.mkdirSync(path.join(base, d), { recursive: true });
    });
  },

  ensureFile(file, defaultContent) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultContent, null, 2));
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  },
};

module.exports = paths;
