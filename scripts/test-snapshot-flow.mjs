import { chromium } from 'playwright';
import { setTimeout as sleep } from 'timers/promises';

const BASE = 'http://localhost:5174';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: 'zh-CN' });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.text().includes('[AssetsPage]') || msg.type() === 'error') {
      console.log(`  [console/${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('dialog', async dialog => {
    console.log(`  [Dialog] type=${dialog.type()}, message="${dialog.message()}"`);
    if (dialog.message().includes('生成资产快照') || dialog.message().includes('快照')) {
      console.log('  >> 确认快照对话框');
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    console.log('=== Step 1: 打开资产页面 ===');
    await page.goto(`${BASE}/assets`, { waitUntil: 'networkidle' });
    await sleep(1500);

    // 检查页面已加载
    const title = await page.title();
    console.log(`  页面标题: ${title}`);

    // 等待资产卡片加载
    await page.waitForSelector('[class*="asset"]', { timeout: 10000 }).catch(() => {});
    await sleep(500);

    // 查找第一个编辑按钮
    console.log('\n=== Step 2: 点击第一个资产的编辑按钮 ===');
    const editButtons = page.locator('button:has-text("编辑")');
    const count = await editButtons.count();
    console.log(`  找到 ${count} 个编辑按钮`);

    if (count === 0) {
      console.log('  ✗ 没有找到编辑按钮，页面可能还没加载完');
      console.log('  页面文本摘要:', (await page.locator('body').innerText()).slice(0, 300));
      return;
    }

    await editButtons.first().click();
    await sleep(800);

    // 查找余额输入框
    console.log('\n=== Step 3: 填写余额 ===');
    const balanceInput = page.locator('input[placeholder*="余额"], input[placeholder*="¥"]').or(
      page.locator('[class*="n-input"] input').filter({ has: page.locator('..') })
    );

    // 更简单的方式：通过 label 找到输入框
    const balanceField = page.locator('.n-form-item-label:has-text("当前余额"), label:has-text("余额")')
      .first()
      .locator('..')
      .locator('input')
      .first();

    const balanceFieldCount = await balanceField.count();
    console.log(`  余额输入框数量: ${balanceFieldCount}`);

    if (balanceFieldCount > 0) {
      await balanceField.fill('12345');
      console.log('  已填写余额: 12345');
    } else {
      // Try alternative: find any input that might be the balance field
      console.log('  未通过 label 找到，尝试查找页面上所有 visible input...');
      const allInputs = page.locator('input[type="text"], input:not([type="hidden"])');
      const inputCount = await allInputs.count();
      console.log(`  共 ${inputCount} 个输入框`);
      for (let i = 0; i < Math.min(inputCount, 8); i++) {
        const placeholder = await allInputs.nth(i).getAttribute('placeholder');
        console.log(`  [${i}] placeholder="${placeholder}"`);
      }
    }

    console.log('\n=== Step 4: 点击保存 ===');
    const saveBtn = page.locator('button:has-text("保存修改"), button:has-text("保存")').first();
    const saveBtnCount = await saveBtn.count();
    console.log(`  保存按钮数量: ${saveBtnCount}`);
    if (saveBtnCount > 0) {
      await saveBtn.click();
      console.log('  已点击保存');
    }

    await sleep(2000);

    // 检查是否出现快照对话框（Naive UI 的 dialog 是用 div 模拟的，不是原生 dialog）
    console.log('\n=== Step 5: 检查快照确认对话框 ===');
    const dialogEl = page.locator('.n-dialog:has-text("快照"), .n-modal:has-text("快照"), [role="dialog"]:has-text("快照"), div:has-text("生成资产快照")');
    const dialogCount = await dialogEl.count();
    console.log(`  对话框数量: ${dialogCount}`);

    if (dialogCount > 0) {
      const dialogText = await dialogEl.first().innerText();
      console.log(`  对话框文本: "${dialogText.slice(0, 200)}"`);
      console.log('  ✓ 快照确认对话框已弹出！');

      const confirmBtn = page.locator('button:has-text("生成快照"), button:has-text("确认")').first();
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        console.log('  已点击 "生成快照"');
        await sleep(1500);
      }
    } else {
      console.log('  ✗ 未检测到快照对话框');
      // 截图看看当前页面状态
      await page.screenshot({ path: '/tmp/snapshot-debug.png' });
      console.log('  已保存截图: /tmp/snapshot-debug.png');
    }

    // 检查是否有成功消息
    console.log('\n=== Step 6: 检查结果 ===');
    const successMsg = page.locator('.n-message:has-text("快照"), .n-notification:has-text("快照"), div:has-text("已生成快照")');
    const successCount = await successMsg.count();
    if (successCount > 0) {
      console.log(`  ✓ 成功消息: "${await successMsg.first().innerText()}"`);
    } else {
      console.log('  - 未检测到成功消息（可能已自动消失）');
    }

    // 打印页面上的消息
    const messages = page.locator('.n-message, .n-notification');
    const msgCount = await messages.count();
    for (let i = 0; i < msgCount; i++) {
      console.log(`  消息[${i}]: "${await messages.nth(i).innerText()}"`);
    }

    if (errors.length > 0) {
      console.log('\n  页面错误:');
      errors.forEach(e => console.log(`    - ${e}`));
    }

  } catch (e) {
    console.error('脚本异常:', e.message);
    await page.screenshot({ path: '/tmp/snapshot-error.png' });
    console.log('已保存错误截图: /tmp/snapshot-error.png');
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });