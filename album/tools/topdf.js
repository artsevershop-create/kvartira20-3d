const { chromium } = require('D:/cache/shots/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'D:/cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe' });
  const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('file:///D:/cache/claude-scratch/udsd/album/album.html', { waitUntil: 'load' }); await p.waitForTimeout(800);
  const out = process.argv[2] || 'D:/cache/claude-scratch/udsd/album/album.pdf';
  await p.pdf({ path: out, width: '420mm', height: '297mm', printBackground: true, preferCSSPageSize: true });
  if (process.argv[3]) { // preview PNGs of chosen sheets
    const nums = process.argv[3].split(',').map(Number);
    await p.setViewportSize({ width: 1588, height: 1123 });
    for (const n of nums) { const el = (await p.$$('section.pg'))[n - 1]; await el.screenshot({ path: 'D:/cache/claude-scratch/udsd/album/prev-' + n + '.png' }); }
  }
  console.log('pdf ok'); await b.close();
})();
