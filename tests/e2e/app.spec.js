const { test, expect, _electron } = require("@playwright/test");
const path = require("path");

const appPath = path.join(__dirname, "../..");

test.describe("Electron App", () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    electronApp = await _electron.launch({
      args: [path.join(appPath, "src/main/index.js")],
      env: { ...process.env, NODE_ENV: "test" },
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState("domcontentloaded");

    // 等待应用初始化完成
    await window.waitForFunction(
      () => {
        const badge = document.getElementById("platform");
        return (
          badge && badge.textContent !== "..." && badge.textContent.length > 0
        );
      },
      { timeout: 10000 },
    );
  });

  test.beforeEach(async () => {
    // 每个测试前清空数据库，确保测试环境干净
    await window.evaluate(() => {
      return window.api.db.all().then((items) => {
        return Promise.all(items.map((item) => window.api.db.remove(item.id)));
      });
    });
    await window.waitForTimeout(200);
  });

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
  });

  test("should display app title", async () => {
    const title = await window.locator("h1").textContent();
    expect(title).toBe("CrossPlatform");
  });

  test("should show platform badge", async () => {
    const badge = await window.locator("#platform").textContent();
    expect(["Linux", "macOS", "Windows"]).toContain(badge);
  });

  test("should create new item", async () => {
    await window.locator("#title").fill("E2E Test Item");
    await window.locator("#content").fill("This is a test");
    await window.locator("#btn-new").click();

    await window.waitForSelector(".item");
    const items = await window.locator(".item").count();
    expect(items).toBe(1);
  });

  test("should save existing item", async () => {
    // 先创建一条
    await window.locator("#title").fill("Save Test");
    await window.locator("#btn-new").click();
    await window.waitForSelector(".item");

    // 再修改保存
    await window.locator("#title").fill("Updated Title");
    await window.locator("#btn-save").click();
    await window.waitForTimeout(200);
    const items = await window.locator(".item").count();
    expect(items).toBe(1);
  });

  test("should search items", async () => {
    // 创建两条数据
    await window.locator("#title").fill("First Item");
    await window.locator("#btn-new").click();
    await window.waitForSelector(".item");

    await window.locator("#title").fill("Second Item");
    await window.locator("#btn-new").click();
    await window.waitForTimeout(300);

    // 搜索
    await window.locator("#search").fill("First");
    await window.waitForTimeout(400);
    const items = await window.locator(".item").count();
    expect(items).toBe(1);

    await window.locator("#search").fill("nonexistent");
    await window.waitForTimeout(400);
    const emptyText = await window.locator(".empty").count();
    expect(emptyText).toBe(1);
  });

  test("should delete item", async () => {
    // 清空搜索框
    await window.locator("#search").fill("");
    await window.waitForTimeout(400);

    // 先创建一条
    await window.locator("#title").fill("Delete Test");
    await window.locator("#btn-new").click();
    await window.waitForSelector(".item");

    // 删除
    await window.locator("#btn-delete").click();
    await window.waitForTimeout(200);
    const items = await window.locator(".item").count();
    expect(items).toBe(0);
  });
});

// ============================================================
// Prod-mode smoke test (loadRenderer mode = file://)
// ============================================================
test.describe("Prod Smoke", () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    electronApp = await _electron.launch({
      args: [path.join(appPath, "src/main/index.js")],
      // no VITE_DEV_SERVER_URL → loadFile mode
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await window.waitForFunction(
      () => {
        const badge = document.getElementById("platform");
        return badge && badge.textContent !== "...";
      },
      { timeout: 10000 },
    );
  });

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
  });

  test("prod-mode loads and api available", async () => {
    const title = await window.locator("h1").textContent();
    expect(title).toBe("CrossPlatform");

    const platform = await window.evaluate(() => window.api?.platform);
    expect(["linux", "darwin", "win32"]).toContain(platform);

    expect(await window.locator("#platform").textContent()).toMatch(
      /Linux|macOS|Windows/,
    );
  });

  test("prod-mode crud works", async () => {
    await window.locator("#title").fill("Prod Check");
    await window.locator("#content").fill("prod content");
    await window.locator("#btn-new").click();
    await window.waitForSelector(".item");
    const items = await window.locator(".item").count();
    expect(items).toBe(1);

    const t = await window.locator(".item .title").first().textContent();
    expect(t).toBe("Prod Check");
  });
});
