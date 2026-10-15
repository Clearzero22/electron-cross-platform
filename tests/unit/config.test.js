const config = require("../../src/main/config");

describe("Config Manager", () => {
  describe("get", () => {
    test("should get default value", () => {
      expect(config.get("window.width")).toBe(1200);
      expect(config.get("window.height")).toBe(800);
    });

    test("should get nested value", () => {
      expect(config.get("appearance.theme")).toBe("dark");
      expect(config.get("appearance.fontSize")).toBe(14);
    });

    test("should return undefined for missing key", () => {
      expect(config.get("nonexistent.key")).toBeUndefined();
    });
  });

  describe("set", () => {
    test("should set value", () => {
      config.set("test.key", "testValue");
      expect(config.get("test.key")).toBe("testValue");
    });

    test("should update existing value", () => {
      const original = config.get("window.width");
      config.set("window.width", 1400);
      expect(config.get("window.width")).toBe(1400);
      config.set("window.width", original);
    });

    test("should create nested objects", () => {
      config.set("test.nested.deep", "value");
      expect(config.get("test.nested.deep")).toBe("value");
    });
  });

  describe("getPlatformConfig", () => {
    test("should return platform-specific config", () => {
      const platformConfig = config.getPlatformConfig("window");
      expect(platformConfig).toHaveProperty("width");
      expect(platformConfig).toHaveProperty("height");
    });
  });

  describe("getTheme", () => {
    test("should return theme", () => {
      const theme = config.getTheme();
      expect(["dark", "light"]).toContain(theme);
    });
  });

  describe("getAll", () => {
    test("should return all config", () => {
      const all = config.getAll();
      expect(all).toHaveProperty("window");
      expect(all).toHaveProperty("appearance");
      expect(all).toHaveProperty("behavior");
      expect(all).toHaveProperty("platform");
    });
  });

  describe("deepMerge", () => {
    test("should deep merge objects", () => {
      const target = { a: 1, b: { c: 2, d: 3 } };
      const source = { b: { c: 20 }, e: 4 };
      const result = config.deepMerge(target, source);

      expect(result.a).toBe(1);
      expect(result.b.c).toBe(20);
      expect(result.b.d).toBe(3);
      expect(result.e).toBe(4);
    });
  });
});
