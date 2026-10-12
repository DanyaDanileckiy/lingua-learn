const { chromium } = require('playwright-core');
const EXT = '/workspace/lingua/extension';
(async () => {
  const ctx = await chromium.launchPersistentContext('/tmp/pw/prof-' + Date.now(), {
    executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', headless: false,
    args: ['--no-sandbox', `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required', '--mute-audio'], viewport: { width: 1400, height: 850 }
  });
  let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const extId = sw.url().split('/')[2]; console.log('ext', extId);
  const p = await ctx.newPage(); const errs = []; p.on('console', m => { if (m.type() === 'error' && /lingua/i.test(m.text())) errs.push(m.text()); });
  await p.goto('https://www.youtube.com/watch?v=' + (process.argv[2] || 'H14bBuluwB8'), { waitUntil: 'domcontentloaded' });
  // consent dialog
  for (const t of ['Accept all', 'Reject all']) { const b = p.getByRole('button', { name: t }); if (await b.count()) { await b.first().click().catch(() => { }); break; } }
  await p.waitForTimeout(6000);
  await p.evaluate(() => { const v = document.querySelector('video'); if (v) { v.muted = true; v.play(); } });
  let ok = false;
  for (let i = 0; i < 30; i++) { await p.waitForTimeout(1000); const t = await p.evaluate(() => { const o = document.querySelector('#lingua-overlay'); return o && o.style.display !== 'none' ? o.innerText : ''; }); if (t && !t.endsWith('…')) { console.log('overlay:', JSON.stringify(t)); ok = true; break; } }
  await p.screenshot({ path: '/workspace/lingua/shots/qa-ext-youtube.png' });
  if (ok) {
    await p.evaluate(() => document.querySelector('video').pause());
    await p.click('#lingua-overlay .lg-w'); await p.waitForTimeout(2500);
    console.log('pop:', JSON.stringify(await p.evaluate(() => document.querySelector('#lingua-pop')?.innerText)));
    await p.click('#lingua-pop button'); await p.waitForTimeout(800);
    await p.screenshot({ path: '/workspace/lingua/shots/qa-ext-wordpopup.png' });
  }
  const pp = await ctx.newPage(); await pp.goto(`chrome-extension://${extId}/popup.html`); await pp.waitForTimeout(800);
  console.log('popup:', JSON.stringify(await pp.evaluate(() => document.body.innerText.slice(0, 200))));
  await pp.screenshot({ path: '/workspace/lingua/shots/qa-ext-popup.png' });
  const site = await ctx.newPage(); await site.goto('https://danyadanileckiy.github.io/lingua-learn/?cb=' + Date.now() + '#/vocab'); await site.waitForTimeout(3000);
  console.log('site vocab:', (await site.evaluate(() => localStorage.getItem('lingua_words')) || 'null').slice(0, 200));
  await site.screenshot({ path: '/workspace/lingua/shots/qa-ext-sync.png' });
  for (const id of ['dQw4w9WgXcQ', 'kJQP7kiw5Fk', '9bZkp7q19f0']) {
    await site.evaluate(id => location.hash = '#/watch/' + id, id);
    try { await site.waitForFunction(() => document.querySelector('.ln') || /Не удалось/.test(document.querySelector('#tr')?.innerText || ''), null, { timeout: 90000 }); } catch (e) { }
    await site.waitForTimeout(5000);
    console.log('bridge', id, JSON.stringify(await site.evaluate(() => ({ n: document.querySelectorAll('.ln').length, tr: [...document.querySelectorAll('.ln .t2')].filter(x => x.textContent).length, title: document.querySelector('.top h1')?.innerText, first: document.querySelector('.ln')?.innerText }))));
    await site.screenshot({ path: '/workspace/lingua/shots/qa-ext-bridge-' + id + '.png' });
  }
  console.log('errs', errs); await ctx.close();
})();
