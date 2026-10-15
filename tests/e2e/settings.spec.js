const { test, expect, _electron } = require('@playwright/test');
const path = require('path');

const appPath = path.join(__dirname, '../..');

test('settings panel opens and saves config', async () => {
  const electronApp = await _electron.launch({
    args: [path.join(appPath, 'src/main/index.js')],
    env: { ...process.env, NODE_ENV: 'test' },
  });
  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForFunction(
    () => {
      const badge = document.getElementById('platform');
      return badge && badge.textContent !== '...';
    },
    { timeout: 10000 },
  );

  // 点击 Settings 按钮
  await window.locator('#btn-settings').click();
  await window.waitForTimeout(500);

  // 验证设置面板打开
  const panelOpen = await window.locator('#settings-panel.open').count();
  expect(panelOpen).toBe(1);

  // 修改主题为 light
  await window.locator('#setting-theme').selectOption('light');
  await window.waitForTimeout(500);

  // 验证主题已更改
  const bodyBg = await window.evaluate(() => document.body.style.background);
  expect(bodyBg).toContain('241'); // #f1f5f9

  await electronApp.close();
});
