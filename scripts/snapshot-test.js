const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 捕获页面日志
  page.on('console', msg => {
    if (msg.text().includes('[AssetsPage]') || msg.type() === 'error') {
      console.log(`  [browser ${msg.type()}] ${msg.text()}`);
    }
  });

  // 捕获对话框 (原生 dialog)
  page.on('dialog', async dialog => {
    console.log(`  [dialog] type=${dialog.type()}, message="${dialog.message().slice(0, 100)}"`);
    await dialog.accept();
  });

  // 捕获页面错误
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    console.log('\n=== Step 1: 打开资产页面 ===');
    await page.goto('http://localhost:5174/assets', { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/Users/liqiang/code/personal-system/screenshots/step1-initial.png' });
    console.log('  Screenshot saved: step1-initial.png');

    // 检查页面标题
    const title = await page.title();
    console.log(`  Page title: ${title}`);

    console.log('\n=== Step 2: 点击第一个编辑按钮 ===');
    const editButtons = page.locator('button:has-text("编辑")');
    const count = await editButtons.count();
    console.log(`  Found ${count} edit buttons`);

    if (count === 0) {
      console.log('  ERROR: No edit buttons found');
      const bodyText = await page.locator('body').innerText();
      console.log(`  Page text: ${bodyText.slice(0, 500)}`);
      await browser.close();
      return;
    }

    await editButtons.first().click();
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: '/Users/liqiang/code/personal-system/screenshots/step2-edit.png', fullPage: true });
    console.log('  Screenshot saved: step2-edit.png');

    // 检查表单是否加载
    const formText = await page.locator('.n-form, [class*="form"]').first().innerText().catch(() => '');
    console.log(`  Form text preview: ${formText.slice(0, 200)}`);

    // 查找所有 input
    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();
    console.log(`  Found ${inputCount} input fields`);

    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      const placeholder = await inputs.nth(i).getAttribute('placeholder');
      console.log(`    [${i}] placeholder="${placeholder}"`);
    }

    console.log('\n=== Step 3: 填写余额 ===');
    // 查找当前余额输入框
    const balanceInputs = page.locator('[placeholder*="余额"], [placeholder*="保存时"]').first();
    const balanceCount = await balanceInputs.count();
    console.log(`  Balance input candidates: ${balanceCount}`);

    // 通过 label 查找
    const balanceLabel = page.locator('text=当前余额').first();
    const labelCount = await balanceLabel.count();
    console.log(`  Labels with "当前余额": ${labelCount}`);

    let filled = false;
    if (balanceCount > 0) {
      await balanceInputs.fill('88888');
      console.log('  Filled balance: 88888');
      filled = true;
    } else if (labelCount > 0) {
      const input = balanceLabel.locator('..').locator('input').first();
      await input.fill('88888');
      console.log('  Filled via label: 88888');
      filled = true;
    } else {
      // Try the 6th input (after code, name, type, bucket, risk, channel, currency)
      if (inputCount > 5) {
        const target = inputs.nth(inputCount - 3); // 倒数第三个可能是余额
        await target.fill('88888');
        console.log('  Filled target input: 88888');
        filled = true;
      }
    }

    if (!filled) {
      console.log('  WARNING: Could not find balance input');
    }

    await page.screenshot({ path: '/Users/liqiang/code/personal-system/screenshots/step3-filled.png', fullPage: true });
    console.log('  Screenshot saved: step3-filled.png');

    console.log('\n=== Step 4: 点击保存 ===');
    const saveBtn = page.locator('button:has-text("保存修改"):visible').first();
    const saveCount = await saveBtn.count();
    console.log(`  Save buttons: ${saveCount}`);

    if (saveCount > 0) {
      await saveBtn.click();
      console.log('  Clicked save');
      await new Promise(r => setTimeout(r, 3000));

      // 检查对话框
      const dialogs = page.locator('.n-dialog, .n-modal, [role="dialog"]');
      const dialogCount = await dialogs.count();
      console.log(`  Dialog elements: ${dialogCount}`);

      if (dialogCount > 0) {
        const dialogText = await dialogs.first().innerText();
        console.log(`  Dialog text: "${dialogText.slice(0, 300)}"`);
        console.log('  *** SNAPSHOT CONFIRMATION DIALOG SHOWN! ***');
      } else {
        console.log('  No dialog detected');
      }

      // 检查消息
      const messages = page.locator('.n-message, .n-notification');
      const msgCount = await messages.count();
      for (let i = 0; i < Math.min(msgCount, 3); i++) {
        const msgText = await messages.nth(i).innerText();
        console.log(`  Message[${i}]: "${msgText.slice(0, 100)}"`);
      }
    }

    // 最终截图
    await page.screenshot({ path: '/Users/liqiang/code/personal-system/screenshots/step4-final.png', fullPage: true });
    console.log('  Screenshot saved: step4-final.png');

    if (errors.length > 0) {
      console.log('\n  Page errors:');
      errors.forEach(e => console.log(`    - ${e}`));
    }

    console.log('\n=== DONE ===');

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: '/Users/liqiang/code/personal-system/screenshots/error.png' });
  } finally {
    await browser.close();
  }
})();
