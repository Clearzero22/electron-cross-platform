const store = require("../../src/main/db");

describe("Database", () => {
  beforeEach(() => {
    // 清空数据
    const items = store.all();
    items.forEach((item) => store.remove(item.id));
  });

  describe("CRUD", () => {
    test("should create an item", () => {
      const { id } = store.create("Test Item", "Test content");
      expect(id).toBeGreaterThan(0);

      const item = store.get(id);
      expect(item.title).toBe("Test Item");
      expect(item.content).toBe("Test content");
    });

    test("should update an item", () => {
      const { id } = store.create("Original", "Content");
      store.update(id, "Updated", "New content");

      const item = store.get(id);
      expect(item.title).toBe("Updated");
      expect(item.content).toBe("New content");
    });

    test("should delete an item", () => {
      const { id } = store.create("To Delete", "Content");
      store.remove(id);

      const item = store.get(id);
      expect(item).toBeUndefined();
    });

    test("should list all items", () => {
      store.create("Item 1", "Content 1");
      store.create("Item 2", "Content 2");

      const items = store.all();
      expect(items.length).toBe(2);
    });
  });

  describe("Validation", () => {
    test("should reject empty title", () => {
      expect(() => store.create("", "Content")).toThrow("Title is required");
    });

    test("should reject title over 200 chars", () => {
      const longTitle = "a".repeat(201);
      expect(() => store.create(longTitle, "Content")).toThrow(
        "Title must be less than 200 characters",
      );
    });

    test("should reject content over 100000 chars", () => {
      const longContent = "a".repeat(100001);
      expect(() => store.create("Title", longContent)).toThrow(
        "Content must be less than 100000 characters",
      );
    });
  });

  describe("Search", () => {
    beforeEach(() => {
      store.create("Hello World", "First item");
      store.create("Goodbye", "Second item");
      store.create("Hello Again", "Third item");
    });

    test("should search by title", () => {
      const results = store.search("Hello");
      expect(results.length).toBe(2);
    });

    test("should search by content", () => {
      const results = store.search("Second");
      expect(results.length).toBe(1);
    });

    test("should return empty for no match", () => {
      const results = store.search("nonexistent");
      expect(results.length).toBe(0);
    });
  });

  describe("Pagination", () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        store.create(`Item ${i}`, `Content ${i}`);
      }
    });

    test("should paginate results", () => {
      const page1 = store.paginate(1, 2);
      expect(page1.items.length).toBe(2);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);
    });

    test("should return correct page", () => {
      const page2 = store.paginate(2, 2);
      expect(page2.items.length).toBe(2);
      expect(page2.page).toBe(2);
    });
  });

  describe("Tags", () => {
    test("should add and get tags", () => {
      const { id } = store.create("Tagged Item", "Content");
      store.addTag(id, "important", "#ef4444");

      const tags = store.getTags(id);
      expect(tags.length).toBe(1);
      expect(tags[0].name).toBe("important");
    });

    test("should remove tags", () => {
      const { id } = store.create("Tagged Item", "Content");
      store.addTag(id, "temp");
      store.removeTag(id, "temp");

      const tags = store.getTags(id);
      expect(tags.length).toBe(0);
    });
  });

  describe("Settings", () => {
    test("should set and get settings", () => {
      store.setting("testKey", "testValue");
      expect(store.setting("testKey")).toBe("testValue");
    });

    test("should return undefined for missing key", () => {
      expect(store.setting("nonexistent")).toBeUndefined();
    });
  });

  describe("Stats", () => {
    test("should return stats", () => {
      store.create("Item 1", "Content");
      const stats = store.stats();

      expect(stats.totalItems).toBe(1);
      expect(stats.dbVersion).toBe(3);
      // dbSize 在 mock 环境下可能为 0，只检查属性存在
      expect(stats).toHaveProperty("dbSize");
    });
  });

  describe("Export/Import", () => {
    test("should export and import data", () => {
      store.create("Export Test", "Content");
      store.setting("exportKey", "exportValue");

      const exported = store.exportToJSON();
      expect(exported.items.length).toBe(1);
      expect(exported.settings.length).toBeGreaterThan(0);

      // 清空后导入
      const items = store.all();
      items.forEach((item) => store.remove(item.id));

      const result = store.importFromJSON(exported);
      expect(result.imported).toBe(1);

      const newItems = store.all();
      expect(newItems.length).toBe(1);
      expect(newItems[0].title).toBe("Export Test");
    });
  });
});
