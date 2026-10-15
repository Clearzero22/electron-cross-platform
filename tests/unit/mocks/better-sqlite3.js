// Mock better-sqlite3 for unit tests
class Database {
  constructor() {
    this.data = {
      items: [],
      settings: [],
      tags: [],
      item_tags: [],
      nextId: 1,
    };
  }

  prepare(sql) {
    const sqlLower = sql.toLowerCase();

    if (sqlLower.includes("insert into items")) {
      return {
        run: (...args) => {
          // 支持 (title, content) 和 (id, title, content, created_at, updated_at) 两种模式
          let id, title, content, created_at, updated_at;
          if (args.length === 2) {
            id = this.data.nextId++;
            title = args[0];
            content = args[1];
            created_at = new Date().toISOString();
            updated_at = created_at;
          } else {
            id = args[0];
            title = args[1];
            content = args[2];
            created_at = args[3];
            updated_at = args[4];
            if (id >= this.data.nextId) this.data.nextId = id + 1;
          }
          this.data.items.push({ id, title, content, created_at, updated_at });
          return { lastInsertRowid: id, changes: 1 };
        },
      };
    }

    if (
      sqlLower.includes("select") &&
      sqlLower.includes("from items") &&
      sqlLower.includes("where id")
    ) {
      return {
        get: (id) => this.data.items.find((i) => i.id === id),
      };
    }

    if (
      sqlLower.includes("select") &&
      sqlLower.includes("from items") &&
      sqlLower.includes("like")
    ) {
      return {
        all: (q1, q2) => {
          const query = q1.replace(/%/g, "").toLowerCase();
          return this.data.items.filter(
            (i) =>
              i.title.toLowerCase().includes(query) ||
              (i.content && i.content.toLowerCase().includes(query)),
          );
        },
      };
    }

    if (
      sqlLower.includes("select") &&
      sqlLower.includes("from items") &&
      sqlLower.includes("limit")
    ) {
      return {
        all: (limit, offset) => {
          const items = [...this.data.items].reverse();
          return items.slice(offset, offset + limit);
        },
      };
    }

    if (
      sqlLower.includes("select") &&
      sqlLower.includes("from items") &&
      sqlLower.includes("order by")
    ) {
      return {
        all: () => [...this.data.items].reverse(),
      };
    }

    if (
      sqlLower.includes("select * from items") ||
      (sqlLower.includes("select") &&
        sqlLower.includes("from items") &&
        !sqlLower.includes("where") &&
        !sqlLower.includes("order") &&
        !sqlLower.includes("limit") &&
        !sqlLower.includes("count"))
    ) {
      return {
        all: () => [...this.data.items],
      };
    }

    if (
      sqlLower.includes("select count(*)") &&
      sqlLower.includes("from items")
    ) {
      return {
        get: () => ({ count: this.data.items.length }),
      };
    }

    if (sqlLower.includes("update items")) {
      return {
        run: (title, content, id) => {
          const item = this.data.items.find((i) => i.id === id);
          if (item) {
            item.title = title;
            item.content = content;
            item.updated_at = new Date().toISOString();
          }
          return { changes: item ? 1 : 0 };
        },
      };
    }

    if (sqlLower.includes("delete from items")) {
      return {
        run: (id) => {
          const index = this.data.items.findIndex((i) => i.id === id);
          if (index >= 0) {
            this.data.items.splice(index, 1);
            return { changes: 1 };
          }
          return { changes: 0 };
        },
      };
    }

    if (sqlLower.includes("insert into settings")) {
      return {
        run: (key, value) => {
          const existing = this.data.settings.find((s) => s.key === key);
          if (existing) {
            existing.value = value;
          } else {
            this.data.settings.push({ key, value });
          }
          return { changes: 1 };
        },
      };
    }

    if (
      sqlLower.includes("select") &&
      sqlLower.includes("from settings") &&
      sqlLower.includes("where key")
    ) {
      return {
        get: (key) => this.data.settings.find((s) => s.key === key),
      };
    }

    if (
      sqlLower.includes("select") &&
      sqlLower.includes("from settings") &&
      !sqlLower.includes("where")
    ) {
      return {
        all: () => [...this.data.settings],
      };
    }

    if (
      sqlLower.includes("select count(*)") &&
      sqlLower.includes("from settings")
    ) {
      return {
        get: () => ({ count: this.data.settings.length }),
      };
    }

    if (
      sqlLower.includes("select count(*)") &&
      sqlLower.includes("from tags")
    ) {
      return {
        get: () => ({ count: this.data.tags.length }),
      };
    }

    if (
      sqlLower.includes("insert") &&
      sqlLower.includes("tags") &&
      sqlLower.includes("name")
    ) {
      return {
        run: (name, color) => {
          const existing = this.data.tags.find((t) => t.name === name);
          if (existing) return { changes: 0 };
          const id = this.data.tags.length + 1;
          this.data.tags.push({ id, name, color });
          return { changes: 1, lastInsertRowid: id };
        },
      };
    }

    if (
      sqlLower.includes("select") &&
      sqlLower.includes("from tags") &&
      sqlLower.includes("where name")
    ) {
      return {
        get: (name) => this.data.tags.find((t) => t.name === name),
      };
    }

    if (sqlLower.includes("insert") && sqlLower.includes("item_tags")) {
      return {
        run: (itemId, tagId) => {
          this.data.item_tags.push({ item_id: itemId, tag_id: tagId });
          return { changes: 1 };
        },
      };
    }

    if (
      sqlLower.includes("select") &&
      sqlLower.includes("from tags") &&
      sqlLower.includes("join item_tags")
    ) {
      return {
        all: (itemId) => {
          const tagIds = this.data.item_tags
            .filter((it) => it.item_id === itemId)
            .map((it) => it.tag_id);
          return this.data.tags.filter((t) => tagIds.includes(t.id));
        },
      };
    }

    if (sqlLower.includes("delete from item_tags")) {
      return {
        run: (itemId, tagId) => {
          const index = this.data.item_tags.findIndex(
            (it) => it.item_id === itemId && it.tag_id === tagId,
          );
          if (index >= 0) {
            this.data.item_tags.splice(index, 1);
            return { changes: 1 };
          }
          return { changes: 0 };
        },
      };
    }

    if (sqlLower.includes("delete from")) {
      return {
        run: () => {
          if (sqlLower.includes("item_tags")) this.data.item_tags = [];
          if (sqlLower.includes("items")) this.data.items = [];
          if (sqlLower.includes("settings")) this.data.settings = [];
          if (sqlLower.includes("tags")) this.data.tags = [];
          return { changes: 0 };
        },
      };
    }

    return {
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
      get: () => undefined,
      all: () => [],
    };
  }

  exec(sql) {
    // 处理 DELETE FROM 语句（用于 importFromJSON）
    const sqlLower = sql.toLowerCase();
    if (sqlLower.includes("delete from item_tags")) this.data.item_tags = [];
    if (sqlLower.includes("delete from items")) this.data.items = [];
    if (sqlLower.includes("delete from settings")) this.data.settings = [];
    if (sqlLower.includes("delete from tags")) this.data.tags = [];
  }

  pragma(sql, opts) {
    if (sql.includes("user_version")) {
      return opts?.simple ? 3 : 3;
    }
    return undefined;
  }

  transaction(fn) {
    return fn;
  }

  backup(path) {}

  close() {}
}

module.exports = { Database };

// Also export Database directly for require('better-sqlite3') pattern
module.exports = Database;
module.exports.Database = Database;
