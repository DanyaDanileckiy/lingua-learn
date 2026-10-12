const { chromium } = require('playwright-core'); const B = process.env.BASE || 'https://danyadanileckiy.github.io/lingua-learn/';
const W = 'https://lingua.lingua-learn.workers.dev'; const R = []; const ok = (n, p, i = '') => { R.push([n, p]); console.log(p ? 'PASS' : 'FAIL', n, String(i).slice(0, 220)); };
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const ROUTES = ['#/home', '#/library/youtube', '#/library/podcasts', '#/library/sets', '#/library/movies', '#/library/fav', '#/library/history', '#/catalog', '#/watch/eIho2S0ZahI', '#/podcast/0', '#/talk', '#/talk/0', '#/books', '#/vocab', '#/vocab/saved', '#/vocab/b2', '#/vocab/saved/learn', '#/vocab/saved/review', '#/sentences/fav', '#/sentences/dictation', '#/sentences/shadow', '#/import'];
const SEED = () => { const now = new Date().toISOString();
  localStorage.lingua_words = JSON.stringify([{ id: 'w1', word: 'remarkable', translation: 'замечательный', sentence: 'It is remarkable.', createdAt: now, videoId: 'eIho2S0ZahI' }, { id: 'w2', word: 'journey', translation: 'путешествие', createdAt: now }]);
  localStorage.lingua_sentences = JSON.stringify([{ id: 's1', text: 'The human voice is the instrument we all play.', translation: 'Человеческий голос — инструмент, на котором мы все играем.', videoId: 'eIho2S0ZahI', t: 13 }]);
  localStorage.lingua_channels = JSON.stringify([{ id: 'UCAuUUnT6oDeKwE6v1NGQxug', title: 'TED', lang: 'en' }, { id: 'UCX6OQ3DkcsbYNE6H8uQQuVA', title: 'MrBeast', lang: 'en' }, { id: 'UCI0e9LV2H-AT5XZ-RjxXbvw', title: 'HikakinTV', lang: 'ja' }]);
  localStorage.lingua_fav = JSON.stringify([['eIho2S0ZahI', 'How to speak so that people want to listen', 'TED', 600]]); localStorage.lingua_history = localStorage.lingua_fav;
  localStorage.lingua_podcasts = JSON.stringify([{ url: 'https://podcasts.files.bbci.co.uk/p02pc9tn.rss', title: '6 Minute English', lang: 'en', image: '', episodes: [{ title: 'Ep', audio: 'https://www.w3schools.com/html/horse.mp3', date: '' }] }]); };
async function sweep(b, w, h, profile) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [], bad = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/youtube|google|doubleclick|ERR_BLOCKED|favicon|Failed to load resource/i.test(m.text()) && errs.push('console: ' + m.text()));
  p.on('response', r => { const u = r.url(); if (r.status() >= 400 && u.startsWith(B)) bad.push(r.status() + ' ' + u.replace(B, '')); });
  await p.goto(B, { waitUntil: 'domcontentloaded' }); await p.evaluate(profile === 'data' ? SEED : () => localStorage.clear());
  await p.goto(B + '?az=' + Date.now(), { waitUntil: 'networkidle' });
  const probs = [];
  for (const r of ROUTES) {
    await p.evaluate(r => location.hash = r, r); await p.waitForTimeout(r.startsWith('#/watch') ? 4000 : 1500);
    const m = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth - innerWidth, imgs: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && !/ytimg|ggpht|googleusercontent/.test(i.src)).map(i => i.src.slice(-50)), sw: !!document.querySelector('#langsw'), txt: document.querySelector('#app').innerText.length, und: /undefined|NaN|\[object/.test(document.querySelector('#app').innerText) }));
    if (m.ov > 2) probs.push(`${r} overflow ${m.ov}px`); if (m.imgs.length) probs.push(`${r} broken img ${m.imgs.join(',')}`); if (!m.sw) probs.push(`${r} no switcher`); if (m.txt < 20) probs.push(`${r} empty page`); if (m.und) probs.push(`${r} undefined/NaN text`);
    if (['#/home', '#/library/youtube', '#/catalog', '#/watch/eIho2S0ZahI', '#/vocab/saved', '#/talk'].includes(r) && (w === 3440 || w === 390 || profile === 'data' && w === 1920)) await p.screenshot({ path: `/workspace/lingua/shots/az-${w}-${profile}-${r.slice(2).replace(/\//g, '_')}.png` });
  }
  ok(`sweep ${w}x${h} ${profile}: ${ROUTES.length} routes`, !probs.length && !errs.length && !bad.length, [...probs, ...errs, ...bad].join(' | ') || 'clean');
  await p.close();
}
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  if (!process.env.ONLY || process.env.ONLY === 'sweep') for (const [w, h] of [[3440, 1440], [1920, 1080], [1366, 768], [390, 844]]) for (const pr of ['fresh', 'data']) await sweep(b, w, h, pr);
  if (process.env.ONLY === 'sweep') return b.close();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B, { waitUntil: 'domcontentloaded' }); await p.evaluate(SEED); await p.goto(B + '?f=' + Date.now() + '#/home', { waitUntil: 'networkidle' });
  const langs = await p.evaluate(() => LEARN_LANGS.map(x => x[0])); let catProbs = [];
  for (const l of langs) {
    await p.click('#langsw'); await p.click(`.lmenu button[data-l="${l}"]`); await p.evaluate(() => location.hash = '#/catalog'); await p.waitForSelector('.crow', { timeout: 15000 }).catch(() => catProbs.push(l + ' no rows'));
    const f = await p.$eval('#langsw img', i => i.naturalWidth > 0 && i.getAttribute('src')).catch(() => false); if (!f) catProbs.push(l + ' flag');
    const cats = await p.$$eval('.ccat', a => a.map(x => x.dataset.c)); for (const c of cats) { await p.click(`.ccat[data-c="${c}"]`); const n = await p.$$eval('.crow', a => a.length); if (!n) catProbs.push(`${l}/${c} empty`); }
    await p.waitForTimeout(800); const brk = await p.$$eval('.crow img', a => a.filter(i => i.complete && i.naturalWidth === 0).length); if (brk) catProbs.push(`${l} ${brk} broken avatars`);
    await p.click('.ctab[data-t="pod"]'); await p.waitForTimeout(800); const pods = await p.$$eval('.crow', a => a.length); if (pods < 5) catProbs.push(`${l} pods ${pods}`); await p.click('.ctab[data-t="yt"]');
  }
  ok('flag switcher + catalog: 12 langs × all categories + podcasts', !catProbs.length, catProbs.join(', ') || langs.join(','));
  await p.click('#langsw'); await p.click('.lmenu button[data-l="en"]'); await p.evaluate(() => location.hash = '#/catalog'); await p.waitForSelector('.crow');
  await p.fill('#cq', 'zzzzqq'); await p.waitForTimeout(300); const emptyTxt = await p.textContent('#cl'); ok('catalog search empty state', /Ничего|не найден|нет/i.test(emptyTxt), emptyTxt.slice(0, 80)); await p.fill('#cq', '');
  await p.evaluate(() => location.hash = '#/home'); await p.waitForTimeout(5000);
  const hw = await p.evaluate(() => ({ feed: document.querySelectorAll('#hv .v:not(.skel)').length, rp: document.querySelector('.rp').innerText.replace(/\s+/g, ' ').slice(0, 300), hidden: (document.querySelector('.hidn') || {}).textContent }));
  ok('home: feed + calendar + card + tiles + heatmap + progress + hidden note', hw.feed > 3 && /Календарь/.test(hw.rp) && /Активность/.test(hw.rp) && /Прогресс/.test(hw.rp) && /1 подписка/.test(hw.hidden || ''), JSON.stringify(hw));
  for (const sel of ['#hmore', '#haddch']) { await p.evaluate(() => location.hash = '#/home'); await p.waitForTimeout(800); await p.click(sel); await p.waitForTimeout(600); }
  ok('home buttons: Показать больше / +Добавить канал', await p.isVisible('.modal')); await p.click('#mx');
  await p.evaluate(() => location.hash = '#/library/youtube'); await p.waitForTimeout(4000);
  const tabs = await p.$$eval('.tabs .tab', a => a.map(x => x.getAttribute('href'))); let tp = [];
  for (const t of tabs) { await p.click(`.tabs a[href="${t}"]`); await p.waitForTimeout(500); if ((await p.textContent('#app')).length < 50) tp.push(t); }
  ok('library tabs', !tp.length && tabs.length === 4, tabs.join(','));
  await p.click('.rl[href="#/library/fav"]'); await p.waitForTimeout(500); const favn = await p.$$eval('.main .v', a => a.length); await p.click('.rl[href="#/library/history"]'); await p.waitForTimeout(500);
  ok('favorites + history lists', favn === 1 && (await p.$$eval('.main .v', a => a.length)) === 1, favn);
  await p.click('.rp a[href^="#/library/ch:"]'); await p.waitForFunction(() => document.querySelectorAll('.main .v').length > 3, null, { timeout: 40000 }).catch(() => { });
  ok('subscribed channel page', (await p.$$eval('.main .v', a => a.length)) > 3);
  await p.click('.chl >> nth=0'); await p.click('.lmenu button[data-l="de"]'); await p.waitForTimeout(500); const after = await p.$$eval('.rp .chl', a => a.length);
  const note = await p.textContent('.rp .hidn'); ok('flag menu moves channel + note', after === 1 && /2 подписки/.test(note), note);
  await p.click('.chdel >> nth=0'); await p.waitForTimeout(400); ok('delete subscription', (await p.evaluate(() => JSON.parse(localStorage.lingua_channels).length)) === 2);
  await p.evaluate(() => location.hash = '#/podcast/0'); await p.waitForSelector('.ep'); await p.click('.ep'); await p.waitForTimeout(3000);
  const au = await p.evaluate(() => { const a = document.querySelector('#au'); return { t: a.currentTime, paused: a.paused, err: a.error && a.error.code }; }); ok('podcast playback', au.t > 0 || !au.paused, JSON.stringify(au));
  await p.evaluate(() => { location.hash = '#/watch/eIho2S0ZahI'; }); await p.waitForSelector('.ln .w', { timeout: 30000 }); await p.waitForTimeout(2500);
  const f0 = await p.evaluate(() => JSON.parse(localStorage.lingua_fav).length); await p.click('#fav'); await p.waitForTimeout(300); const f1 = await p.evaluate(() => JSON.parse(localStorage.lingua_fav).length); await p.click('#fav');
  ok('favourites toggle', f1 !== f0, f0 + '→' + f1);
  await p.click('#tovl'); await p.click('#tovl'); await p.click('#tpan'); const tr1 = await p.isVisible('#tr'); await p.click('#tpan');
  ok('overlay toggle + hide panel', !tr1 && (await p.isVisible('#tr')));
  await p.evaluate(() => { window.__spoke = []; const o = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { __spoke.push(u.text + '|' + u.lang); o(u); }; });
  await p.click('.ln .w >> nth=3'); await p.waitForFunction(() => document.querySelector('#ptr').textContent.length > 1 && document.querySelector('#ptr').textContent !== '…', null, { timeout: 15000 }).catch(() => { });
  await p.click('#pspk'); const wb = await p.evaluate(() => JSON.parse(localStorage.lingua_words || '[]').length); await p.click('#psw'); await p.click('#pss').catch(() => { }); await p.waitForTimeout(400);
  const sp = await p.evaluate(() => __spoke); const wa = await p.evaluate(() => JSON.parse(localStorage.lingua_words).length);
  ok('word popup: translate, TTS, save word/sentence', sp.length && wa === wb + 1, `tr=${await p.textContent('#ptr')} tts=${sp} words ${wb}→${wa}`); await p.screenshot({ path: '/workspace/lingua/shots/az-watch-popup.png' }); await p.click('#pcl').catch(() => { });
  await p.evaluate(() => location.hash = '#/watch/aqz-KE-bpKQ'); await p.waitForTimeout(12000); const nc = await p.textContent('#tr');
  ok('video without captions → graceful', /недоступ|нет субтитров|вставьте|SRT/i.test(nc) || (await p.$$eval('.ln', a => a.length)) > 0, nc.slice(0, 120)); await p.screenshot({ path: '/workspace/lingua/shots/az-watch-nocaptions.png' });
  await p.evaluate(() => { localStorage.lingua_learnLang = '"he"'; location.hash = '#/watch/5MgBikgcWnY'; }); await p.waitForSelector('.ln', { timeout: 60000 }).catch(() => { }); await p.waitForTimeout(4000);
  const he = await p.evaluate(() => { const l = [...document.querySelectorAll('.ln')].find(x => /[\u0590-\u05FF]{3}/.test(x.textContent)); const t = l && l.querySelector('.w'); return { n: document.querySelectorAll('.ln').length, dir: t && getComputedStyle(t.parentElement).unicodeBidi, txt: l && l.innerText.slice(0, 80) }; });
  ok('Hebrew RTL transcript', he.n > 100 && /plaintext/.test(he.dir || ''), JSON.stringify(he)); await p.screenshot({ path: '/workspace/lingua/shots/az-watch-hebrew.png' });
  await p.evaluate(() => localStorage.lingua_learnLang = '"en"');
  await p.evaluate(() => location.hash = '#/vocab/saved'); await p.waitForTimeout(700); const vAll = await p.$$eval('.wc', a => a.length);
  await p.click('.main .tabs a.tab >> nth=1'); await p.waitForTimeout(400); const vL = await p.$$eval('.wc', a => a.length); await p.click('.main .tabs a.tab >> nth=0'); await p.waitForTimeout(400);
  await p.click('.wdel >> nth=0'); await p.waitForTimeout(400); const vD = await p.$$eval('.wc', a => a.length);
  ok('vocab Все/Освоено + delete', vAll >= 3 && vD === vAll - 1, `all=${vAll} learned=${vL} afterDel=${vD}`);
  let sets = await p.$$eval('.vl a.set', a => a.map(x => x.getAttribute('href'))); let sp2 = [];
  for (const s of sets) { await p.evaluate(s => location.hash = s, s); await p.waitForTimeout(300); if (!(await p.$$eval('.wc', a => a.length)) && !/saved/.test(s)) sp2.push(s); }
  ok('all word sets list words', !sp2.length && sets.length >= 9, sets.length + ' sets ' + sp2);
  let tk = [];
  for (const i of [0, 7, 20, 41, 61]) { await p.evaluate(i => location.hash = '#/talk/' + i, i); await p.waitForTimeout(800); const inp = await p.$('.main input, .main textarea'); if (!inp) { tk.push(i + ' no input'); continue; }
    const cnt = () => p.evaluate(() => (document.querySelector('#msgs, .msgs, .chat') || document.querySelector('.main')).querySelectorAll('div').length);
    const b0 = await cnt(); await inp.fill('Hello, I would like some help please.'); await inp.press('Enter'); await p.waitForTimeout(2500); const b1 = await cnt(); if (b1 < b0 + 2) tk.push(`${i}: ${b0}→${b1}`); }
  ok('AI Talk 5 scenarios end-to-end', !tk.length, tk.join(', '));
  await p.evaluate(() => location.hash = '#/talk'); await p.waitForTimeout(500); const cn = await p.$$eval('.rp .chip', a => a.map(x => x.dataset.c)); let cp = 0, det = []; for (const c of cn) { await p.click(`.rp .chip[data-c="${c}"]`); await p.waitForTimeout(150); const n = await p.$$eval('.sc', a => a.length); det.push(c + ':' + n); if (n > 0) cp++; }
  ok('AI Talk filters', cp === cn.length && cn.length > 2, det.join(' '));
  await p.evaluate(() => location.hash = '#/import'); await p.waitForSelector('#exp'); const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#exp')]);
  let exj = null; if (dl) { const path = await dl.path(); try { exj = JSON.parse(require('fs').readFileSync(path, 'utf8')); } catch (e) { } }
  ok('export JSON', exj && (Array.isArray(exj) ? exj.length : (exj.words || []).length) >= 1, dl && dl.suggestedFilename());
  ok('functional run: no page errors', !errs.length, errs.join(' | '));
  const wk = await p.evaluate(async W => { const o = {}; const j = async u => { const r = await fetch(W + u); return [r.status, r.headers.get('access-control-allow-origin'), await r.text()]; };
    o.tr = await j('/transcript?id=dQw4w9WgXcQ&lang=en'); o.tl = await j('/translate?q=' + encodeURIComponent('good morning') + '&tl=ru&sl=en'); o.fe = await j('/fetch?url=' + encodeURIComponent('https://www.youtube.com/feeds/videos.xml?channel_id=UCAuUUnT6oDeKwE6v1NGQxug')); o.re = await j('/resolve?q=@TED'); o.bad = await j('/fetch?url=' + encodeURIComponent('https://example.com/')); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [v[0], v[1], v[2].slice(0, 400)]])); }, W);
  const cors = (await fetch(W + '/resolve?q=@TED', { headers: { Origin: 'https://evil.example.com' } })).status;
  ok('Worker /transcript', wk.tr[0] === 200 && /"cues"/.test(wk.tr[2]), wk.tr[2].slice(0, 100)); ok('Worker /translate (no junk; Cyrillic or empty when upstream blocks)', wk.tl[0] === 200 && !/WARNING|good morning/i.test(wk.tl[2]), wk.tl[2]);
  ok('Worker /fetch RSS', wk.fe[0] === 200 && /<feed|<\?xml/.test(wk.fe[2])); ok('Worker /resolve', wk.re[0] === 200 && /UCAuUUnT6oDeKwE6v1NGQxug/.test(wk.re[2]), wk.re[2]);
  ok('Worker /fetch rejects non-allowed URL', wk.bad[0] >= 400, wk.bad[0]); ok('Worker CORS rejects foreign origin', cors === 403, cors);
  await b.close(); console.log('TOTAL', R.filter(x => x[1]).length + '/' + R.length);
})();
