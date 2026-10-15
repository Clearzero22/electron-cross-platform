const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const paths = require("./paths");
const logger = require("./logger");

let db = null;

// ============================================================
// 数据库迁移
// ============================================================
function migrate(database) {
  const version = database.pragma("user_version", { simple: true });

  try {
    if (version < 1) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC)",
      );
      database.exec("PRAGMA user_version = 1");
      logger.info("Database migrated to v1");
    }

    if (version < 2) {
      database.exec(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)",
      );
      database.exec("PRAGMA user_version = 2");
      logger.info("Database migrated to v2");
    }

    if (version < 3) {
      database.exec(
        'CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, color TEXT DEFAULT "#0ea5e9")',
      );
      database.exec(
        "CREATE TABLE IF NOT EXISTS item_tags (item_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, PRIMARY KEY (item_id, tag_id), FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE)",
      );
      database.exec("PRAGMA user_version = 3");
      logger.info("Database migrated to v3");
    }
  } catch (e) {
    logger.error("Migration failed:", e.message);
    throw e;
  }
}

function getDb() {
  if (db) return db;
  try {
    paths.ensureDirs();
    db = new Database(paths.db);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    logger.info("Database connected:", paths.db);
    return db;
  } catch (e) {
    logger.error("Database connection failed:", e.message);
    throw e;
  }
}

// ============================================================
// 数据验证
// ============================================================
function validateItem(title, content) {
  const errors = [];
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    errors.push("Title is required");
  }
  if (title && title.length > 200) {
    errors.push("Title must be less than 200 characters");
  }
  if (content && content.length > 100000) {
    errors.push("Content must be less than 100000 characters");
  }
  return errors;
}

// ============================================================
// 数据访问层
// ============================================================
const store = {
  // ---------- 基础 CRUD ----------
  all() {
    try {
      return getDb()
        .prepare("SELECT * FROM items ORDER BY created_at DESC")
        .all();
    } catch (e) {
      logger.error("Failed to fetch all items:", e.message);
      throw e;
    }
  },

  get(id) {
    try {
      return getDb().prepare("SELECT * FROM items WHERE id = ?").get(id);
    } catch (e) {
      logger.error(`Failed to fetch item ${id}:`, e.message);
      throw e;
    }
  },

  create(title, content = "") {
    const errors = validateItem(title, content);
    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }
    try {
      const result = getDb()
        .prepare("INSERT INTO items (title, content) VALUES (?, ?)")
        .run(title.trim(), content);
      const id = Number(result.lastInsertRowid);
      logger.info(`Item created: id=${id}, title="${title.trim()}"`);
      return { id };
    } catch (e) {
      logger.error("Failed to create item:", e.message);
      throw e;
    }
  },

  update(id, title, content) {
    const errors = validateItem(title, content);
    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }
    try {
      const result = getDb()
        .prepare(
          "UPDATE items SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .run(title.trim(), content, id);
      if (result.changes === 0) {
        throw new Error(`Item ${id} not found`);
      }
      logger.info(`Item updated: id=${id}`);
      return result;
    } catch (e) {
      logger.error(`Failed to update item ${id}:`, e.message);
      throw e;
    }
  },

  remove(id) {
    try {
      const result = getDb().prepare("DELETE FROM items WHERE id = ?").run(id);
      if (result.changes === 0) {
        throw new Error(`Item ${id} not found`);
      }
      logger.info(`Item deleted: id=${id}`);
      return result;
    } catch (e) {
      logger.error(`Failed to delete item ${id}:`, e.message);
      throw e;
    }
  },

  // ---------- 搜索 ----------
  search(query) {
    try {
      const q = `%${query}%`;
      return getDb()
        .prepare(
          "SELECT * FROM items WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC",
        )
        .all(q, q);
    } catch (e) {
      logger.error(`Failed to search items with query "${query}":`, e.message);
      throw e;
    }
  },

  // ---------- 分页 ----------
  paginate(page = 1, pageSize = 20) {
    try {
      const offset = (page - 1) * pageSize;
      const total = getDb()
        .prepare("SELECT COUNT(*) as count FROM items")
        .get().count;
      const items = getDb()
        .prepare(
          "SELECT * FROM items ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
        .all(pageSize, offset);
      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (e) {
      logger.error("Failed to paginate items:", e.message);
      throw e;
    }
  },

  // ---------- 标签 ----------
  addTag(itemId, tagName, color = "#0ea5e9") {
    try {
      const db = getDb();
      const tag = db
        .prepare("INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)")
        .run(tagName, color);
      const tagRow = db
        .prepare("SELECT id FROM tags WHERE name = ?")
        .get(tagName);
      db.prepare(
        "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)",
      ).run(itemId, tagRow.id);
      logger.info(`Tag "${tagName}" added to item ${itemId}`);
      return tagRow;
    } catch (e) {
      logger.error(
        `Failed to add tag "${tagName}" to item ${itemId}:`,
        e.message,
      );
      throw e;
    }
  },

  removeTag(itemId, tagName) {
    try {
      const tag = getDb()
        .prepare("SELECT id FROM tags WHERE name = ?")
        .get(tagName);
      if (!tag) return;
      return getDb()
        .prepare("DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?")
        .run(itemId, tag.id);
    } catch (e) {
      logger.error(
        `Failed to remove tag "${tagName}" from item ${itemId}:`,
        e.message,
      );
      throw e;
    }
  },

  getTags(itemId) {
    try {
      return getDb()
        .prepare(
          "SELECT t.* FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?",
        )
        .all(itemId);
    } catch (e) {
      logger.error(`Failed to get tags for item ${itemId}:`, e.message);
      throw e;
    }
  },

  // ---------- 统计 ----------
  stats() {
    try {
      const db = getDb();
      return {
        totalItems: db.prepare("SELECT COUNT(*) as count FROM items").get()
          .count,
        totalTags: db.prepare("SELECT COUNT(*) as count FROM tags").get().count,
        dbSize: fs.existsSync(paths.db) ? fs.statSync(paths.db).size : 0,
        dbVersion: db.pragma("user_version", { simple: true }),
      };
    } catch (e) {
      logger.error("Failed to get stats:", e.message);
      throw e;
    }
  },

  // ---------- 设置 ----------
  setting(key, value) {
    try {
      if (value === undefined) {
        const row = getDb()
          .prepare("SELECT value FROM settings WHERE key = ?")
          .get(key);
        return row ? row.value : undefined;
      }
      getDb()
        .prepare(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .run(key, String(value));
      return value;
    } catch (e) {
      logger.error(`Failed to set setting "${key}":`, e.message);
      throw e;
    }
  },

  // ---------- 导入 / 导出 ----------
  exportToJSON() {
    try {
      const db = getDb();
      const items = db.prepare("SELECT * FROM items").all();
      const settings = db.prepare("SELECT * FROM settings").all();
      const tags = db.prepare("SELECT * FROM tags").all();
      const itemTags = db.prepare("SELECT * FROM item_tags").all();
      logger.info(`Exported ${items.length} items`);
      return {
        version: db.pragma("user_version", { simple: true }),
        exportedAt: new Date().toISOString(),
        items,
        settings,
        tags,
        itemTags,
      };
    } catch (e) {
      logger.error("Failed to export data:", e.message);
      throw e;
    }
  },

  importFromJSON(data) {
    try {
      const db = getDb();
      const importMany = db.transaction(() => {
        db.exec("DELETE FROM item_tags");
        db.exec("DELETE FROM items");
        db.exec("DELETE FROM settings");
        db.exec("DELETE FROM tags");

        if (data.settings) {
          const insertSetting = db.prepare(
            "INSERT INTO settings (key, value) VALUES (?, ?)",
          );
          data.settings.forEach((s) => insertSetting.run(s.key, s.value));
        }

        if (data.tags) {
          const insertTag = db.prepare(
            "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
          );
          data.tags.forEach((t) => insertTag.run(t.id, t.name, t.color));
        }

        if (data.items) {
          const insertItem = db.prepare(
            "INSERT INTO items (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          );
          data.items.forEach((i) =>
            insertItem.run(
              i.id,
              i.title,
              i.content,
              i.created_at,
              i.updated_at,
            ),
          );
        }

        if (data.itemTags) {
          const insertItemTag = db.prepare(
            "INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)",
          );
          data.itemTags.forEach((it) =>
            insertItemTag.run(it.item_id, it.tag_id),
          );
        }

        if (data.version) {
          db.prepare(`PRAGMA user_version = ${data.version}`).run();
        }
      });
      importMany();
      logger.info(`Imported ${data.items?.length || 0} items`);
      return { imported: data.items?.length || 0 };
    } catch (e) {
      logger.error("Failed to import data:", e.message);
      throw e;
    }
  },

  // ---------- 备份 ----------
  backup() {
    try {
      const backupDir = path.join(paths.base, "backups");
      fs.mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
      getDb().backup(backupPath);
      logger.info(`Backup created: ${backupPath}`);
      return backupPath;
    } catch (e) {
      logger.error("Failed to create backup:", e.message);
      throw e;
    }
  },

  // ---------- 关闭 ----------
  close() {
    if (db) {
      try {
        db.close();
        db = null;
        logger.info("Database closed");
      } catch (e) {
        logger.error("Failed to close database:", e.message);
      }
    }
  },
};

module.exports = store;
