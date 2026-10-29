// renders the album's views from the 3D model (swiftshader, slow but fine) and dumps the model data
const { chromium } = require('D:/cache/shots/node_modules/playwright-core');
const fs = require('fs'); const out = 'D:/cache/claude-scratch/udsd/album/img/';
const E = (eye, look, o) => Object.assign({ eye, look, mode: 'walk', fov: 62 }, o || {});
const V = {
  hall1: E([5.45, 1.45, 2.95], [5.73, 0.85, 0.0], { fov: 80 }), hall2: E([5.75, 1.45, 0.25], [6.6, 0.9, 2.95], { fov: 72 }),
  liv1: E([4.55, 1.5, 2.9], [1.2, 1.0, 1.6]), liv2: E([4.6, 1.5, 5.5], [1.0, 1.0, 0.5]), liv3: E([2.6, 1.5, 0.85], [2.6, 0.9, 5.9]), liv4: E([0.5, 1.5, 2.5], [4.8, 1.0, 3.6]),
  liv5: E([4.55, 1.5, 2.9], [1.2, 1.0, 1.6], { evening: true }), corr: E([6.25, 1.45, 2.55], [8.9, 1.0, 2.5], { fov: 70 }),
  wc: { mode: 'cut', eye: [6.0, 3.6, 3.9], look: [6.62, 0.2, 0.9], fov: 46 }, bath1: E([7.7, 1.45, 1.72], [8.5, 0.6, 0.2], { fov: 88 }), bath2: E([7.12, 1.45, 1.9], [8.7, 0.6, 0.5], { fov: 82 }),
  kids1: E([9.3, 1.5, 2.75], [12.4, 1.0, 0.8]), kids2: E([12.75, 1.45, 2.85], [9.3, 0.9, 0.4], { fov: 72 }),
  off1: { mode: 'cut', eye: [6.25, 4.2, 1.4], look: [6.2, 0.3, 4.9], fov: 46 }, off2: E([5.2, 1.45, 5.85], [7.3, 0.9, 3.3], { fov: 72 }), ward: { mode: 'cut', eye: [8.47, 4.2, 2.0], look: [8.47, 0.3, 5.0], fov: 46 },
  mas1: E([9.65, 1.45, 3.25], [12.3, 0.8, 5.6], { fov: 70 }), mas2: E([12.85, 1.45, 5.85], [9.7, 0.9, 3.3], { fov: 70 }), mas3: E([9.65, 1.45, 3.25], [12.3, 0.8, 5.6], { fov: 70, evening: true }),
  liv6: E([4.55, 1.5, 2.9], [1.2, 1.0, 1.6], { style: 'dark' }), liv7: E([4.55, 1.5, 2.9], [1.2, 1.0, 1.6], { style: 'warm' }),
  mas4: E([9.65, 1.45, 3.25], [12.3, 0.8, 5.6], { fov: 70, style: 'dark' }), mas5: E([9.65, 1.45, 3.25], [12.3, 0.8, 5.6], { fov: 70, style: 'warm' }),
  top: { mode: 'cut', eye: [6.5 + 0.01, 21, 3 + 2.0], look: [6.5, 0, 3.0], fov: 40 },
  iso: { mode: 'cut', eye: [6.5 + 9, 9.5, 6 + 8.5], look: [6.5, 0, 3.3], fov: 40 },
  iso_dark: { mode: 'cut', eye: [6.5 + 9, 9.5, 6 + 8.5], look: [6.5, 0, 3.3], fov: 40, style: 'dark' },
  iso_warm: { mode: 'cut', eye: [6.5 + 9, 9.5, 6 + 8.5], look: [6.5, 0, 3.3], fov: 40, style: 'warm' },
  iso_eve: { mode: 'cut', eye: [6.5 + 9, 9.5, 6 + 8.5], look: [6.5, 0, 3.3], fov: 40, evening: true }
};
const only = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: 'D:/cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:8093/index.html'); await p.waitForTimeout(2000);
  await p.addStyleTag({ content: '.ui,.hint,#labels,#dock{display:none!important}' });
  fs.writeFileSync(out + '../data.json', await p.evaluate(() => JSON.stringify(window.__kv.data)));
  console.log('data ok');
  const frameOf = () => p.evaluate(() => window.__kv.renderer.info.render.frame);
  for (const k of Object.keys(V)) {
    if (only.length && !only.includes(k)) continue;
    const v = V[k], t0 = Date.now(), f0 = await frameOf();
    await p.evaluate((v) => {
      const kv = window.__kv, S = kv.S;
      kv.applyStyle(v.style || 'light'); kv.setTime(!!v.evening);
      S.room = 'all'; S.ctx = false; S.walls = v.mode === 'cut' ? 'cut' : 'full'; S.cam = v.mode === 'walk' ? 'walk' : 'top'; kv.applyView(true);
      kv.camera.fov = v.fov; kv.camera.updateProjectionMatrix();
      kv.fly(v.eye, v.mode === 'walk' ? kv.near(v.eye, v.look) : v.look, true);
      kv.renderer.shadowMap.needsUpdate = true; kv.refresh();
    }, v);
    for (let i = 0; i < 120; i++) { await p.waitForTimeout(250); if ((await frameOf()) >= f0 + 2) break; }
    await p.screenshot({ path: out + k + '.png' });
    console.log(k, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  await b.close();
})();
