'use strict';
/* ---------- storage & utils ---------- */
const S = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('lingua_' + k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('lingua_' + k, JSON.stringify(v)); } catch (e) { toast('Хранилище переполнено'); } }
};
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = () => $('#app');
const today = () => new Date().toISOString().slice(0, 10);
const DAY = 864e5;
const fmt = s => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
function toast(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = 'none', 1800); }
function bump(n = 1) { const a = S.get('activity', {}); a[today()] = (a[today()] || 0) + n; S.set('activity', a); }
const TL = () => S.get('tl', 'ru');
const trCache = {};
const withTimeout = (p, ms = 9000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
const TR_PROVIDERS = [
  async (t, tl) => { const j = await (await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&tl=' + tl + '&q=' + encodeURIComponent(t))).json(); return (j[0] || []).map(x => x[0]).join(''); },
  async (t, tl) => { const j = await (await fetch('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=' + tl + '&q=' + encodeURIComponent(t))).json(); const x = j[0]; return Array.isArray(x) ? x[0] : x; },
  async (t, tl) => { const parts = []; for (const line of t.split('\n')) { const j = await (await fetch('https://api.mymemory.translated.net/get?langpair=en|' + tl + '&q=' + encodeURIComponent(line.slice(0, 480)))).json(); parts.push(j.responseStatus == 200 ? j.responseData.translatedText : ''); } return parts.join('\n'); },
  async (t, tl) => { const j = await (await fetch(WORKER + '/translate?tl=' + tl + '&q=' + encodeURIComponent(t))).json(); return j.text; },
  async (t, tl) => { const j = await (await fetch('https://lingva.ml/api/v1/auto/' + tl + '/' + encodeURIComponent(t))).json(); return j.translation !== t ? j.translation : ''; }
];
const trBad = {};
async function translate(text) {
  const tl = TL(), k = tl + '|' + text; if (trCache[k]) return trCache[k];
  for (let i = 0; i < TR_PROVIDERS.length; i++) {
    if ((trBad[i] || 0) > Date.now()) continue;
    try { const r = await withTimeout(TR_PROVIDERS[i](text, tl), 8000); if (r && r.trim()) return trCache[k] = r; } catch (e) { }
    trBad[i] = Date.now() + 60000; // back off this provider for a minute
  }
  return '';
}
const TTS_LANG = { en: 'en-US', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', pt: 'pt-BR', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', tr: 'tr-TR', ru: 'ru-RU', he: 'he-IL' };
const learnTTS = () => TTS_LANG[S.get('learnLang', 'en')] || 'en-US';
const guessTTS = t => /[\u0590-\u05ff]/.test(t) ? 'he-IL' : /[\u0400-\u04ff]/.test(t) ? 'ru-RU' : /[\u3040-\u30ff]/.test(t) ? 'ja-JP' : /[\uac00-\ud7af]/.test(t) ? 'ko-KR' : /[\u4e00-\u9fff]/.test(t) ? 'zh-CN' : learnTTS();
function speak(text, lang, rate = 0.95) { lang = lang || guessTTS(text); if (!window.speechSynthesis) return toast('TTS недоступен'); speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate; speechSynthesis.speak(u); return u; }
function listen(cb) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) { toast('Распознавание речи не поддерживается этим браузером'); return; }
  const r = new R(); r.lang = learnTTS(); r.interimResults = false; r.onresult = e => cb(e.results[0][0].transcript); r.onerror = e => toast('Микрофон: ' + e.error); r.start(); toast('🎙 Говорите…');
}
const clean = w => w.replace(/^[^\p{L}\p{M}\p{N}'׳״]+|[^\p{L}\p{M}\p{N}'׳״]+$/gu, '');
const wordsHTML = t => esc(t).split(/(\s+)/).map(w => /\S/.test(w) ? `<span class="w">${w}</span>` : w).join('');
const CAT = (c = '#8b5cf6') => `<svg viewBox="0 0 120 120"><ellipse cx="60" cy="104" rx="42" ry="8" fill="#000" opacity=".3"/><path d="M22 92l38-10 38 10-38 12z" fill="#f5f0e6"/><path d="M60 82v22" stroke="#cfc6b3" stroke-width="2"/><path d="M34 40l6-22 14 14M86 40l-6-22-14 14" fill="${c}"/><ellipse cx="60" cy="54" rx="30" ry="26" fill="${c}"/><ellipse cx="60" cy="80" rx="20" ry="14" fill="${c}"/><circle cx="49" cy="52" r="7" fill="#fff"/><circle cx="71" cy="52" r="7" fill="#fff"/><circle cx="50" cy="53" r="3.5" fill="#222"/><circle cx="72" cy="53" r="3.5" fill="#222"/><path d="M56 63q4 4 8 0" stroke="#3b1f6e" stroke-width="2" fill="none"/><ellipse cx="60" cy="61" rx="2.5" ry="1.6" fill="#f9a8d4"/><text x="88" y="30" font-size="14" fill="#f5c542">?</text><text x="20" y="34" font-size="11" fill="#f5c542">?</text></svg>`;
const empty = (msg, btns = '', big = true) => `<div class="empty ${big ? 'big' : ''}">${CAT()}<div>${msg}</div><div>${btns}</div></div>`;

/* ---------- words / srs ---------- */
const words = () => S.get('words', []);
function addWord(w) {
  const ws = words(); if (ws.some(x => x.word.toLowerCase() === w.word.toLowerCase())) { toast('Уже в словаре'); return false; }
  ws.push(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), createdAt: new Date().toISOString() }, w)); S.set('words', ws); bump(); toast('Слово сохранено'); return true;
}
function addSentence(s) { const ss = S.get('sentences', []); if (ss.some(x => x.text === s.text)) return toast('Уже сохранено'); ss.push(Object.assign({ id: Date.now().toString(36), createdAt: new Date().toISOString() }, s)); S.set('sentences', ss); bump(); toast('Предложение сохранено'); }
function sm2(s, q) {
  s = Object.assign({ ef: 2.5, n: 0, interval: 0 }, s);
  if (q < 3) { s.n = 0; s.interval = 1; } else { s.n++; s.interval = s.n === 1 ? 1 : s.n === 2 ? 6 : Math.round(s.interval * s.ef); }
  s.ef = Math.max(1.3, s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))); s.due = Date.now() + (q < 3 ? 60e3 : s.interval * DAY); return s;
}
const srsKey = (set, w) => set + ':' + w.toLowerCase();
function deck(setId) {
  const srs = S.get('srs', {}); const list = setId === 'saved' ? words() : (WORDSETS.find(s => s.id === setId) || { words: [] }).words;
  return list.map(w => Object.assign({}, w, { key: srsKey(setId, w.word), srs: srs[srsKey(setId, w.word)] }));
}
function srsStats() { const d = deck('saved'), now = Date.now(); return { due: d.filter(x => x.srs && x.srs.due <= now).length, fresh: d.filter(x => !x.srs).length }; }

/* ---------- word popup ---------- */
async function wordPopup(el, word, sentence, extra = {}) {
  word = clean(word); if (!word) return;
  const p = $('#pop'); const r = el.getBoundingClientRect();
  p.innerHTML = `<div class="pw">${esc(word)} <button class="ic" id="pspk">🔊</button><button class="x" id="pcl">✕</button></div><div class="pt" id="ptr">…</div><div class="ps">${esc(sentence)}</div><div class="ps" id="pst"></div><div class="row"><button class="btn s" id="psw">+ Слово</button><button class="btn g s" id="pss">+ Предложение</button></div>`;
  p.classList.remove('hidden');
  p.style.left = Math.min(window.innerWidth - 310, Math.max(10, r.left)) + 'px';
  p.style.top = (r.bottom + 260 > window.innerHeight ? Math.max(10, r.top - 230) : r.bottom + 8) + 'px';
  $('#pcl').onclick = () => p.classList.add('hidden'); $('#pspk').onclick = () => speak(word);
  const [t, st] = await Promise.all([translate(word), extra.sentenceTranslation ? Promise.resolve(extra.sentenceTranslation) : translate(sentence)]);
  $('#ptr').textContent = t || '(перевод недоступен)'; $('#pst').textContent = st;
  $('#psw').onclick = () => { addWord(Object.assign({ word, translation: t, sentence, sentenceTranslation: st }, extra.meta || {})); p.classList.add('hidden'); };
  $('#pss').onclick = () => { addSentence(Object.assign({ text: sentence, translation: st }, extra.meta || {})); p.classList.add('hidden'); };
}
document.addEventListener('mousedown', e => { const p = $('#pop'); if (!p.contains(e.target) && !e.target.classList.contains('w')) p.classList.add('hidden'); });

/* ---------- shared widgets ---------- */
const thumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
function ago(iso) {
  const t = Date.parse(iso); if (!t) return ''; const d = (Date.now() - t) / 864e5;
  const pl = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return n + ' ' + (m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c); };
  if (d < 1 / 24) return 'только что'; if (d < 1) return pl(Math.floor(d * 24), 'час', 'часа', 'часов') + ' назад';
  if (d < 30) return pl(Math.floor(d), 'день', 'дня', 'дней') + ' назад'; if (d < 365) return pl(Math.floor(d / 30), 'месяц', 'месяца', 'месяцев') + ' назад';
  return pl(Math.floor(d / 365), 'год', 'года', 'лет') + ' назад';
}
const vcard = v => `<div class="v" data-id="${esc(v.id)}"><div class="th"><img loading="lazy" src="${thumb(v.id)}" alt=""><span class="d">${v.dur ? fmt(v.dur) : ''}</span></div><div class="ti">${esc(v.title)}</div><div class="ch">${esc(v.channel)}${v.published ? ' · ' + ago(v.published) : ''}</div></div>`;
const skel = n => Array.from({ length: n }, () => '<div class="v skel"><div class="th"></div><div class="ti">&nbsp;</div><div class="ch">&nbsp;</div></div>').join('');
const allVideos = () => VIDEOS.map(([id, title, channel, dur]) => ({ id, title, channel, dur }));
function bindV(root) { $$('.v', root).forEach(v => v.onclick = () => location.hash = '#/watch/' + v.dataset.id); }
function weekHTML() {
  const a = S.get('activity', {}), d = new Date(), dow = (d.getDay() + 6) % 7, names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return `<div class="week">${names.map((n, i) => { const x = new Date(d.getTime() + (i - dow) * DAY), k = x.toISOString().slice(0, 10); return `<div class="muted">${n}<b class="${i === dow ? 'today' : ''} ${a[k] ? 'act' : ''}">${x.getDate()}</b></div>`; }).join('')}</div>`;
}
function streak() { const a = S.get('activity', {}); let n = 0, t = Date.now(); while (a[new Date(t).toISOString().slice(0, 10)]) { n++; t -= DAY; } return n; }
function ring(val, max, label, sub, size = 90) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, f = Math.min(1, max ? val / max : 0);
  return `<svg class="ring" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="#333" stroke-width="7" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="#f5c542" stroke-width="7" fill="none" stroke-dasharray="${c * f} ${c}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="48%" text-anchor="middle" fill="#fff" font-size="${size / 5}" font-weight="700">${label}</text><text x="50%" y="66%" text-anchor="middle" fill="#888" font-size="${size / 9}">${sub}</text></svg>`;
}
function heatHTML() { const a = S.get('activity', {}); let h = ''; const start = Date.now() - (7 * 20 - 1) * DAY; for (let i = 0; i < 140; i++) { const k = new Date(start + i * DAY).toISOString().slice(0, 10), v = a[k] || 0; h += `<i title="${k}: ${v}" class="${v > 9 ? 'l3' : v > 3 ? 'l2' : v ? 'l1' : ''}"></i>`; } return `<div class="heat">${h}</div>`; }
function barChart(vals, labels, color = '#8b5cf6', h = 90) {
  const m = Math.max(1, ...vals), w = 260 / vals.length;
  return `<svg width="100%" viewBox="0 0 260 ${h + 18}">${vals.map((v, i) => `<rect x="${i * w + w * .2}" y="${h - v / m * h}" width="${w * .6}" height="${Math.max(1, v / m * h)}" rx="3" fill="${color}"/><text x="${i * w + w / 2}" y="${h + 14}" fill="#777" font-size="10" text-anchor="middle">${labels[i]}</text>`).join('')}</svg>`;
}
function last7(fn) { const out = [], lab = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * DAY); out.push(fn(d.toISOString().slice(0, 10))); lab.push(['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()]); } return [out, lab]; }

/* ---------- HOME ---------- */
let homeN = Math.max(10, Math.floor((window.innerWidth - 400) / 245) * 2);
function home() {
  const st = srsStats(), reviewed = S.get('reviews', {})[today()] || 0, ws = words(), ss = S.get('sentences', []), books = S.get('books', []);
  const [pv, pl] = last7(k => ws.filter(w => (w.createdAt || '').slice(0, 10) === k).length);
  app().innerHTML = `<div class="main"><div class="top"><input id="hs" placeholder="Поиск / вставьте ссылку YouTube" style="width:340px"><button class="btn s" id="hgo">Открыть</button></div>
  <h2>${myChs().length ? 'Новое на ваших каналах' : 'YouTube'} <small class="muted">${flag(curLang())} ${esc(langName(curLang()))}</small> <span><button class="btn s" id="haddch">+ Добавить канал</button> <a id="hmore">Показать больше ›</a></span></h2><div class="vgrid" id="hv">${myChs().length ? skel(homeN) : (curated().slice(0, homeN).map(vcard).join('') || noVids())}</div>${hiddenNote('channels')}
  ${homeN < Math.max(VIDEOS.length, (feedMem && feedMem.v.length) || 0) ? '<p style="text-align:center"><button class="btn g" id="hmore2">Показать больше</button></p>' : ''}
  <h2>Podcast <a href="#/library/podcasts">Показать больше ›</a></h2><div class="box" id="hpod">${podcastsBlock()}</div></div>
  <div class="rp"><div class="box"><h3>Календарь <span class="muted small">Серия ${streak()} д.</span></h3>${weekHTML()}</div>
  <div class="box"><h3>Карточка</h3><div class="fc"><div><div class="muted small">Повторить</div><div class="n">${st.due}</div></div><div><div class="muted small">Обучение</div><div class="n">${st.fresh}</div></div><div class="sp"></div>${ring(reviewed, 10, reviewed + '/10', 'Цель', 76)}</div>
  <div class="row" style="display:flex;gap:8px;margin-top:10px"><a class="btn g s" href="#/vocab/saved/learn">Тренировка</a><a class="btn s" href="#/vocab/saved/review">Повторение</a></div></div>
  <div class="tiles"><a class="tile" href="#/vocab/saved/learn"><div><b>${st.fresh}</b><span class="muted small">Обучение</span></div>🎓</a><a class="tile" href="#/vocab"><div><b>${ws.length}</b><span class="muted small">Словарь</span></div>📕</a><a class="tile" href="#/sentences"><div><b>${ss.length}</b><span class="muted small">Предложения</span></div>💬</a><a class="tile" href="#/books"><div><b>${books.length}</b><span class="muted small">PDF / книги</span></div>📄</a></div>
  <div class="box"><h3>Активность</h3>${heatHTML()}</div><div class="box"><h3>Прогресс <span class="muted small">новые слова</span></h3>${barChart(pv, pl)}</div></div>`;
  bindV(app()); bindPodcasts($('#hpod')); $('#haddch').onclick = addChannelDialog;
  if (myChs().length) fillFeed($('#hv'), homeN, false);
  $('#hmore').onclick = () => location.hash = '#/library';
  if ($('#hmore2')) $('#hmore2').onclick = () => { homeN += 10; home(); };
  const go = () => { const v = $('#hs').value.trim(), id = parseId(v); if (id) location.hash = '#/watch/' + id + (parseT(v) ? '/' + parseT(v) : ''); else { location.hash = '#/library'; setTimeout(() => { const q = $('#lq'); if (q) { q.value = v; q.oninput(); } }, 0); } };
  $('#hgo').onclick = go; $('#hs').onkeydown = e => e.key === 'Enter' && go();
}

/* ---------- PODCASTS ---------- */
async function fetchText(url) {
  const t = await tryFetch(url, {}, true); if (t) return t;
  throw new Error('fetch failed');
}
const POD_PRESETS = [['BBC 6 Minute English', 'https://podcasts.files.bbci.co.uk/p02pc9tn.rss'], ['The Daily (NYT)', 'https://rss.art19.com/the-daily'], ['Stuff You Should Know', 'https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/A91018A4-EA4F-4130-BF55-AE270180C327/44710ECC-10BB-48D1-93C7-AE270180C33E/podcast.rss']];
function podcastsBlock() {
  const ps = myPods();
  const form = `<div style="display:flex;gap:8px;justify-content:center;margin-top:8px"><input class="purl" placeholder="URL RSS-ленты подкаста" style="width:320px"><button class="btn s padd">Добавить подкаст</button></div><div class="chips" style="justify-content:center;margin-top:8px">${POD_PRESETS.map(([n, u]) => `<button class="chip ppre" data-u="${esc(u)}">+ ${esc(n)}</button>`).join('')}</div>`;
  if (!ps.length) return `<div class="empty">${CAT()}<div>Подкастов на этом языке пока нет — <a href="#/catalog">каталог</a></div>${form}</div>${hiddenNote('podcasts')}`;
  return `<div class="vgrid">${ps.map(p => { const i = p._i; return `<div class="v pod" data-i="${i}"><div class="th">${p.image ? `<img src="${esc(p.image)}" alt="">` : '<div class="empty">🎧</div>'}</div><div class="ti">${esc(p.title)}</div><div class="ch">${p.episodes.length} эпизодов <button class="x pdel" data-i="${i}">✕</button></div></div>`; }).join('')}</div>${form}${hiddenNote('podcasts')}`;
}
function bindPodcasts(root) {
  $$('.ppre', root).forEach(b => b.onclick = () => { $('.purl', root).value = b.dataset.u; $('.padd', root).click(); });
  $$('.padd', root).forEach(b => b.onclick = async () => {
    const url = $('.purl', root).value.trim(); if (!url) return; b.textContent = 'Загрузка…';
    const r = await addPodcastFeed(url); b.textContent = 'Добавить подкаст'; if (r) route();
  });
  $$('.pdel', root).forEach(b => b.onclick = e => { e.stopPropagation(); const ps = S.get('podcasts', []); ps.splice(+b.dataset.i, 1); S.set('podcasts', ps); route(); });
  $$('.pod', root).forEach(v => v.onclick = () => location.hash = '#/podcast/' + v.dataset.i);
}
async function addPodcastFeed(url, fallback = {}) {
  if (S.get('podcasts', []).some(p => p.url === url)) { toast('Уже добавлен'); return false; }
  try {
    const xml = new DOMParser().parseFromString(await extFetch(url) || await fetchText(url), 'text/xml'); const ch = xml.querySelector('channel'); if (!ch) throw 0;
    const img = ch.querySelector('image url') || [...ch.children].find(n => n.localName === 'image' && n.getAttribute('href'));
    const p = { url, title: ch.querySelector('title')?.textContent || fallback.title || url, image: fallback.image || (img ? (img.textContent || img.getAttribute('href')) : ''), lang: fallback.lang || curLang(), episodes: [...xml.querySelectorAll('item')].slice(0, 50).map(it => ({ title: it.querySelector('title')?.textContent || '', audio: it.querySelector('enclosure')?.getAttribute('url') || '', date: it.querySelector('pubDate')?.textContent || '' })) };
    const ps = S.get('podcasts', []); ps.push(p); S.set('podcasts', ps); toast('Подкаст добавлен'); return true;
  } catch (e) { toast('Не удалось загрузить RSS'); return false; }
}
function podcastPage(i) {
  const p = S.get('podcasts', [])[i]; if (!p) return location.hash = '#/library/podcasts';
  app().innerHTML = `<div class="main"><div class="top"><a class="btn g s" href="#/library/podcasts">‹</a><h1>${esc(p.title)}</h1></div><audio id="au" controls style="width:100%;margin-bottom:14px"></audio><div>${p.episodes.map((e, j) => `<div class="rl ep" data-j="${j}"><div class="av">▶</div><div><div>${esc(e.title)}</div><div class="muted small">${esc(e.date)}</div></div></div>`).join('')}</div></div>`;
  $$('.ep').forEach(x => x.onclick = () => { const e = p.episodes[+x.dataset.j]; $('#au').src = e.audio; $('#au').play().catch(() => toast('Браузер не может воспроизвести этот аудиофайл')); bump(); });
}

/* ---------- LIBRARY ---------- */
function library(tab = 'youtube') {
  const fav = S.get('fav', []), hist = S.get('history', []), chs = myChs();
  let body = '';
  if (tab === 'youtube') body = chs.length ? `<h2>Новое на ваших каналах</h2><div class="vgrid" id="lg">${skel(12)}</div>` : `<div class="vgrid" id="lg">${curated().map(vcard).join('') || noVids()}</div>`;
  else if (tab === 'podcasts') body = `<div class="box" id="lp">${podcastsBlock()}</div>`;
  else if (tab === 'sets') { const ss = S.get('sentences', []); body = ss.length ? `<div class="wl">${ss.map(s => `<div class="wc">${esc(s.text)}<div class="ctx">${esc(s.translation)}</div></div>`).join('')}</div>` : empty('Наборов предложений пока нет. Сохраняйте фразы при просмотре видео.', '<a class="btn" href="#/home">К видео</a>'); }
  else if (tab === 'movies') body = empty('Фильмы появятся позже. Пока можно открыть любое видео по ссылке YouTube.', '<a class="btn" href="#/home">Открыть видео</a>');
  else if (tab === 'fav') body = fav.length ? `<div class="vgrid">${fav.map(vcard).join('')}</div>` : empty('В избранном пока пусто. Нажмите ★ на странице видео.');
  else if (tab === 'history') body = hist.length ? `<div class="vgrid">${hist.map(vcard).join('')}</div>` : empty('История просмотров пуста.');
  else if (tab.startsWith('ch:')) body = `<div id="chv" class="muted">Загрузка видео канала…</div>`;
  app().innerHTML = `<div class="main"><div class="top"><h1>Библиотека</h1><div class="tabs">${[['youtube', '▶ YouTube'], ['podcasts', '🎧 Подкасты'], ['sets', '📑 Наборы предложений'], ['movies', '🎬 Фильмы']].map(([k, l]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/library/${k}">${l}</a>`).join('')}</div><div class="sp"></div><button class="btn s" id="addch">+ Добавить канал</button><a class="btn g s" href="#/catalog">Каталог каналов</a><input id="lq" placeholder="Поиск / Обзор" style="width:200px"></div>${body}</div>
  <div class="rp"><div class="box"><a class="rl" href="#/library/fav">⭐ Избранное <span class="muted" style="margin-left:auto">${fav.length}</span></a><a class="rl" href="#/library/history">🕘 История <span class="muted" style="margin-left:auto">${hist.length}</span></a></div>
  <div class="box"><h3>Подписанные каналы <a class="more" href="#/catalog">Каталог ›</a></h3>${chs.map(c => { const i = c._i; return `<a class="rl" href="#/library/ch:${i}">${c.avatar ? `<img class="av" src="${esc(c.avatar)}" alt="">` : `<div class="av" style="background:hsl(${(c.title.charCodeAt(0) * 37) % 360},45%,40%)">${esc(c.title[0] || '?')}</div>`}<span>${esc(c.title)}</span><button class="chl" data-i="${i}" title="Язык канала">${flag(c.lang || 'en')}</button><button class="x chdel" data-i="${i}">✕</button></a>`; }).join('') || '<div class="muted small">Нет каналов на этом языке</div>'}${hiddenNote('channels')}
  <div style="display:flex;gap:6px;margin-top:10px"><input id="chin" placeholder="URL канала или ID (UC…)" style="flex:1;min-width:0"><button class="btn s" id="chadd">+</button></div></div></div>`;
  bindV(app()); if ($('#lp')) bindPodcasts($('#lp'));
  $('#addch').onclick = addChannelDialog;
  $$('.chl').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const i = +b.dataset.i, all = S.get('channels', []); langMenu(b, l => { all[i].lang = l; S.set('channels', all); feedMem = null; toast(all[i].title + ' → ' + langName(l)); library(tab); }, all[i].lang); });
  if (tab === 'youtube' && chs.length) fillFeed($('#lg'), 0, true);
  $('#lq').oninput = () => { const q = $('#lq').value.toLowerCase(); $$('.v').forEach(v => v.style.display = v.textContent.toLowerCase().includes(q) ? '' : 'none'); };
  $$('.chdel').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const c = S.get('channels', []); c.splice(+b.dataset.i, 1); S.set('channels', c); library(); });
  $('#chadd').onclick = async () => {
    const v = $('#chin').value.trim(); if (!v) return; $('#chadd').textContent = '…';
    const ch = await resolveChannel(v); $('#chadd').textContent = '+';
    if (!ch) return toast('Канал не найден. Укажите ссылку, @handle или ID вида UC…');
    const c = S.get('channels', []); let i = c.findIndex(x => x.id === ch.id); if (i < 0) { c.push({ id: ch.id, title: ch.title, lang: curLang() }); i = c.length - 1; } S.set('channels', c); toast('Канал добавлен'); location.hash = '#/library/ch:' + i;
  };
  if (tab.startsWith('ch:')) loadChannel(S.get('channels', [])[+tab.slice(3)]);
}
async function pipedJSON(path) {
  for (const base of PIPED) { try { const r = await withTimeout(fetch(base + path), 8000); if (r.ok) { const j = await r.json(); if (!j.error) return j; } } catch (e) { } }
  return null;
}
function extFetch(url) {
  return new Promise(res => {
    if (!(window.__linguaExt || document.documentElement.dataset.linguaExt)) return res(null);
    const rid = Math.random().toString(36).slice(2), h = e => { if (e.source === window && e.data && e.data.source === 'lingua-ext-fetch' && e.data.rid === rid) { window.removeEventListener('message', h); res(e.data.text || null); } };
    window.addEventListener('message', h); window.postMessage({ source: 'lingua-req-fetch', url, rid }, location.origin); setTimeout(() => res(null), 15000);
  });
}
async function resolveChannel(v) {
  let id = (v.match(/(UC[\w-]{22})/) || [])[1];
  const handle = (v.match(/@([\w.-]+)/) || v.match(/youtube\.com\/(?:c|user)\/([\w.-]+)/) || [null, /^[\w.-]+$/.test(v) ? v : null])[1];
  let j = id ? await pipedJSON('/channel/' + id) : null;
  if (!j && handle) j = await pipedJSON('/c/' + handle) || await pipedJSON('/user/' + handle) || await pipedJSON('/@' + handle);
  if (j && j.id) return { id: j.id, title: j.name || j.id, videos: j.relatedStreams };
  if (!id && handle) { const html = await extFetch('https://www.youtube.com/@' + handle) || await fetchText('https://www.youtube.com/@' + handle).catch(() => null); id = html && (html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/) || [])[1]; }
  if (!id) return null;
  const xml = await extFetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + id);
  const title = xml && (new DOMParser().parseFromString(xml, 'text/xml').querySelector('feed > title') || {}).textContent;
  return { id, title: title || (handle ? '@' + handle : id) };
}
async function oembed(id) {
  try { const j = await (await withTimeout(fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id)), 6000)).json(); return { title: j.title, channel: j.author_name }; } catch (e) { return null; }
}
// Channel uploads via the IFrame API: playlist "UU…" exposes video IDs without CORS; titles via oEmbed (CORS-enabled)
function uploadsViaIframe(c) {
  return new Promise(res => {
    const run = () => {
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;width:200px;height:120px'; const inner = document.createElement('div'); host.appendChild(inner); document.body.appendChild(host);
      let done = false; const fin = async ids => { if (done) return; done = true; try { pl.destroy(); } catch (e) { } host.remove();
        const vs = await Promise.all((ids || []).slice(0, 24).map(async id => Object.assign({ id, channel: c.title, title: '' }, await oembed(id) || {})));
        res(vs.filter(v => v.title)); };
      const pl = new YT.Player(inner, { playerVars: { listType: 'playlist', list: 'UU' + c.id.slice(2), autoplay: 0, mute: 1 }, events: {
        onReady: () => { let n = 0; const t = setInterval(() => { const ids = pl.getPlaylist && pl.getPlaylist(); if ((ids && ids.length) || ++n > 20) { clearInterval(t); fin(ids || []); } }, 500); },
        onError: () => fin([]) } });
      setTimeout(() => fin([]), 15000);
    };
    ytReady ? run() : ytQ.push(run);
  });
}
async function loadChannel(c) {
  const el = $('#chv'); if (!c) { el.textContent = 'Канал не найден'; return; }
  el.innerHTML = '<div class="empty"><div class="spin"></div><div>Загрузка видео канала…</div></div>';
  let vs = [];
  const j = await pipedJSON('/channel/' + c.id);
  if (j && j.relatedStreams) vs = j.relatedStreams.filter(x => x.url).map(x => ({ id: (x.url.match(/v=([\w-]{11})/) || [])[1], title: x.title, channel: x.uploaderName || c.title, dur: x.duration > 0 ? x.duration : 0 })).filter(x => x.id);
  if (!vs.length) vs = await uploadsViaIframe(c);
  if (!vs.length) {
    const xml = await extFetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + c.id);
    if (xml) vs = [...new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagName('entry')].map(e => ({ id: (e.getElementsByTagName('yt:videoId')[0] || {}).textContent, title: (e.getElementsByTagName('title')[0] || {}).textContent, channel: c.title })).filter(x => x.id);
  }
  if (!vs.length) { el.innerHTML = empty(`Не удалось загрузить видео канала «${esc(c.title)}». Попробуйте позже или установите расширение Lingua.`, `<a class="btn" target="_blank" href="https://www.youtube.com/channel/${esc(c.id)}">Открыть на YouTube</a>`, false); return; }
  el.className = 'vgrid'; el.innerHTML = vs.map(vcard).join(''); bindV(el);
  const known = S.get('vmeta', {}); vs.forEach(v => known[v.id] = v); S.set('vmeta', known);
}
/* ---------- SUBSCRIPTIONS FEED ---------- */
let feedMem = null;
async function channelVideos(c) {
  const cache = S.get('feedc', {}), hit = cache[c.id];
  if (hit && Date.now() - hit.t < 30 * 60e3) return hit.v;
  let vs = [];
  try {
    const r = await withTimeout(fetch(WORKER + '/fetch?url=' + encodeURIComponent('https://www.youtube.com/feeds/videos.xml?channel_id=' + c.id)), 15000);
    if (r.ok) { const xml = new DOMParser().parseFromString(await r.text(), 'text/xml');
      vs = [...xml.getElementsByTagName('entry')].map(e => ({ id: (e.getElementsByTagName('yt:videoId')[0] || {}).textContent, title: (e.getElementsByTagName('title')[0] || {}).textContent, channel: c.title, channelId: c.id, published: (e.getElementsByTagName('published')[0] || {}).textContent })).filter(v => v.id); }
  } catch (e) { }
  if (!vs.length) vs = (await uploadsViaIframe(c)).slice(0, 12).map(v => Object.assign(v, { channelId: c.id }));
  if (vs.length) { const cc = S.get('feedc', {}); cc[c.id] = { t: Date.now(), v: vs.slice(0, 15) }; S.set('feedc', cc); }
  else if (hit) return hit.v;
  return vs;
}
async function subsFeed() {
  const chs = myChs(); if (!chs.length) return [];
  const key = curLang() + ':' + chs.map(c => c.id).join(','); if (feedMem && feedMem.key === key && Date.now() - feedMem.t < 5 * 60e3) return feedMem.v;
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(6, chs.length) }, async () => { while (i < chs.length) { const c = chs[i++]; out.push(...await channelVideos(c)); } }));
  const seen = new Set(), v = out.filter(x => !seen.has(x.id) && seen.add(x.id)).sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));
  const known = S.get('vmeta', {}); v.forEach(x => known[x.id] = { id: x.id, title: x.title, channel: x.channel }); S.set('vmeta', known);
  feedMem = { key, t: Date.now(), v }; return v;
}
const noVids = () => `<div class="empty" style="grid-column:1/-1">${CAT()}<div>Нет каналов на языке «${esc(langName(curLang()))}». Добавьте их из каталога.</div><a class="btn" href="#/catalog">Каталог каналов</a></div>`;
function curated() { return curLang() === 'en' ? allVideos() : []; }
async function fillFeed(el, limit, withCurated) {
  const vs = await subsFeed(); if (!el.isConnected) return;
  if (!vs.length) { el.innerHTML = curated().slice(0, limit || 999).map(vcard).join('') || noVids(); bindV(el); return; }
  el.innerHTML = vs.slice(0, limit || 999).map(vcard).join('') + (withCurated && curated().length ? `<h2 style="grid-column:1/-1">Рекомендованное</h2>` + curated().map(vcard).join('') : '');
  bindV(el); const q = $('#lq'); if (q && q.value) q.oninput();
}

/* ---------- ADD CHANNEL DIALOG ---------- */
function addChannelDialog() {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="mbox"><h3>Добавить канал <button class="x" id="mx">✕</button></h3><p class="muted small">Вставьте любую ссылку: youtube.com/@handle, /channel/UC…, /c/имя, /user/имя, ссылку на видео (youtu.be, m.youtube, shorts) — или просто @handle.</p>
  <div style="display:flex;gap:8px"><input id="mq" placeholder="https://www.youtube.com/@…" style="flex:1"><button class="btn" id="mfind">Найти</button></div><div id="mprev"></div></div>`;
  document.body.appendChild(m); const close = () => m.remove(); $('#mx').onclick = close; m.onclick = e => { if (e.target === m) close(); };
  const inp = $('#mq'); inp.focus();
  const find = async () => {
    const q = inp.value.trim(); if (!q) return; $('#mprev').innerHTML = '<div class="empty"><div class="spin"></div><div>Ищем канал…</div></div>';
    let c = null;
    try { const r = await withTimeout(fetch(WORKER + '/resolve?q=' + encodeURIComponent(q)), 25000); if (r.ok) c = await r.json(); } catch (e) { }
    if (!c || !c.id) { const r2 = await resolveChannel(q).catch(() => null); if (r2) c = { id: r2.id, name: r2.title }; }
    if (!c || !c.id) { $('#mprev').innerHTML = '<p class="muted">Канал не найден. Проверьте ссылку.</p>'; return; }
    const on = isSub(c.id);
    $('#mprev').innerHTML = `<div class="crow sel" style="margin-top:14px">${c.avatar ? `<img class="cav" src="${esc(c.avatar)}" alt="">` : '<div class="cav"></div>'}<div class="cinfo"><b>${esc(c.name)}</b><span>${c.subsN ? ruNum(c.subsN) + ' подписчиков' : ''}&nbsp;&nbsp;${c.videosN ? ruNum(c.videosN) + ' видео' : ''}${c.handle ? ' · ' + esc(c.handle) : ''}</span></div><button class="btn" id="mok" ${on ? 'disabled' : ''}>${on ? '✓ Уже подписаны' : 'Подписаться'}</button></div>`;
    if (!on) $('#mok').onclick = () => { toggleSub({ ...c, lang: curLang() }, true); feedMem = null; close(); route(); };
  };
  $('#mfind').onclick = find; inp.onkeydown = e => { if (e.key === 'Enter') find(); if (e.key === 'Escape') close(); };
}

/* ---------- CATALOG ---------- */
const LEARN_LANGS = [['en', 'English'], ['es', 'Español'], ['de', 'Deutsch'], ['fr', 'Français'], ['it', 'Italiano'], ['pt', 'Português'], ['ja', '日本語'], ['ko', '한국어'], ['zh', '中文'], ['tr', 'Türkçe'], ['ru', 'Русский'], ['he', 'עברית']];
const FLAG_CC = { en: 'us', es: 'es', de: 'de', fr: 'fr', it: 'it', pt: 'pt', ja: 'jp', ko: 'kr', zh: 'cn', tr: 'tr', ru: 'ru', he: 'il' };
const flag = (l, cls = 'flag') => FLAG_CC[l] ? `<img class="${cls}" src="flags/${FLAG_CC[l]}.svg" alt="${l}" width="22" height="16">` : '🌐';
const ruPl = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
const curLang = () => S.get('learnLang', 'en');
const langName = l => (LEARN_LANGS.find(x => x[0] === l) || [l, l])[1];
const myChs = () => S.get('channels', []).map((c, i) => ({ ...c, _i: i })).filter(c => (c.lang || 'en') === curLang());
const myPods = () => S.get('podcasts', []).map((p, i) => ({ ...p, _i: i })).filter(p => (p.lang || 'en') === curLang());
function hiddenNote(kind) {
  const n = S.get(kind, []).filter(c => (c.lang || 'en') !== curLang()).length;
  return n ? `<div class="muted small hidn">Скрыто ${n} ${kind === 'channels' ? ruPl(n, 'подписка', 'подписки', 'подписок') : ruPl(n, 'подкаст', 'подкаста', 'подкастов')} на других языках</div>` : '';
}
function setLang(l) { S.set('learnLang', l); feedMem = null; catState.cat = 'all'; route(); renderLangSw(); }
function renderLangSw() {
  let el = $('#langsw'); if (!el) { el = document.createElement('button'); el.id = 'langsw'; el.onclick = e => { e.stopPropagation(); langMenu(el); }; }
  const l = curLang(); el.title = 'Изучаемый язык: ' + langName(l); el.innerHTML = flag(l, 'flag big') + '<span class="car">▾</span>';
  const t = $('#app .top, #app .catsearch'); if (t && t.getBoundingClientRect().left < 200) { t.prepend(el); el.classList.remove('fx'); } else { document.body.appendChild(el); el.classList.add('fx'); }
}
function langMenu(anchor, onPick = setLang, cur = curLang()) {
  if ($('.lmenu')) { $$('.lmenu').forEach(x => x.remove()); return; }
  const m = document.createElement('div'); m.className = 'lmenu'; const r = anchor.getBoundingClientRect();
  m.style.left = Math.min(r.left, innerWidth - 200) + 'px'; m.style.top = Math.min(r.bottom + 6, innerHeight - 440) + 'px';
  m.innerHTML = LEARN_LANGS.map(([v, n]) => `<button data-l="${v}" class="${v === cur ? 'on' : ''}">${flag(v)} ${esc(n)}</button>`).join('');
  document.body.appendChild(m); $$('button', m).forEach(b => b.onclick = e => { e.stopPropagation(); m.remove(); onPick(b.dataset.l); });
  setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }));
}
async function migrateLangs() {
  const chs = S.get('channels', []), ps = S.get('podcasts', []);
  if (chs.every(c => c.lang) && ps.every(p => p.lang)) return;
  const map = {}, pmap = {};
  await Promise.all(LEARN_LANGS.map(async ([l]) => { try { (await loadCatalog(l)).forEach(c => { map[c.id] ||= l; }); } catch (e) { } }));
  try { Object.entries(catData.pods || {}).forEach(([l, a]) => a.forEach(p => pmap[p.feed] ||= l)); } catch (e) { }
  S.set('channels', chs.map(c => c.lang ? c : { ...c, lang: map[c.id] || curLang() }));
  S.set('podcasts', ps.map(p => p.lang ? p : { ...p, lang: pmap[p.url] || curLang() }));
}
const CAT_LABELS = [['all', 'Все'], ['vlog', 'Влог'], ['animation', 'Анимация'], ['music', 'Музыка'], ['film', 'Кино и сериалы'], ['food', 'Еда'], ['travel', 'Путешествия'], ['tech', 'Технологии'], ['ai', 'ИИ'], ['science', 'Наука'], ['education', 'Образование'], ['psychology', 'Психология'], ['career', 'Карьера'], ['art', 'Искусство'], ['history', 'История'], ['sport', 'Спорт'], ['health', 'Здоровье'], ['news', 'Новости'], ['interview', 'Интервью'], ['lectures', 'Лекции'], ['entertainment', 'Развлечения'], ['games', 'Игры'], ['minecraft', 'Майнкрафт'], ['urbex', 'Заброшки / Паранормальное']];
const catData = {}; let catState = { tab: 'yt', cat: 'all', q: '' };
async function loadCatalog(lang) {
  if (!catData[lang]) catData[lang] = (await (await fetch('data/channels/' + lang + '.json')).json()).channels;
  if (!catData.pods) catData.pods = await (await fetch('data/podcasts.json')).json();
  return catData[lang];
}
const ruNum = n => n >= 1e9 ? (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);
async function catalog() {
  const lang = S.get('learnLang', 'en');
  app().innerHTML = `<div class="main cat"><div class="catsearch"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="7" stroke="#888" stroke-width="2" fill="none"/><path d="M16 16l5 5" stroke="#888" stroke-width="2"/></svg><input id="cq" placeholder="Поиск YouTube или подкастов" value="${esc(catState.q)}"><select id="clang" title="Изучаемый язык">${LEARN_LANGS.map(([v, l]) => `<option value="${v}" ${v === lang ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="cattabs"><button class="ctab ${catState.tab === 'yt' ? 'on' : ''}" data-t="yt">▶ YouTube</button><button class="ctab ${catState.tab === 'pod' ? 'on' : ''}" data-t="pod">🎧 Podcast</button></div>
  <div class="catbody"><div class="catlist" id="cl"><div class="empty"><div class="spin"></div></div></div>${catState.tab === 'yt' ? `<div class="catcats" id="cc"></div>` : ''}</div></div>`;
  $('#clang').onchange = () => setLang($('#clang').value);
  $$('.ctab').forEach(b => b.onclick = () => { catState.tab = b.dataset.t; catalog(); });
  $('#cq').oninput = () => { catState.q = $('#cq').value; renderCatList(); };
  $('#cq').onkeydown = async e => {
    if (e.key !== 'Enter' || catState.tab !== 'yt') return; const v = $('#cq').value.trim();
    if (/youtube\.com|^@|^UC[\w-]{22}$/.test(v)) { toast('Ищем канал…'); const ch = await resolveChannel(v); if (!ch) return toast('Канал не найден'); toggleSub({ id: ch.id, name: ch.title }, true); renderCatList(); }
  };
  let chans; try { chans = await loadCatalog(lang); } catch (e) { $('#cl').innerHTML = empty('Не удалось загрузить каталог', '', false); return; }
  if ($('#cc')) {
    const counts = {}; chans.forEach(c => counts[c.cat] = (counts[c.cat] || 0) + 1);
    $('#cc').innerHTML = CAT_LABELS.filter(([k]) => k === 'all' || counts[k]).map(([k, l]) => `<button class="ccat ${catState.cat === k ? 'on' : ''}" data-c="${k}">${l}<span>${k === 'all' ? chans.length : counts[k]}</span></button>`).join('');
    $$('.ccat').forEach(b => b.onclick = () => { catState.cat = b.dataset.c; $$('.ccat').forEach(x => x.classList.toggle('on', x === b)); renderCatList(); });
  }
  renderCatList();
}
function isSub(id) { return S.get('channels', []).some(c => c.id === id); }
function toggleSub(c, forceOn) {
  let list = S.get('channels', []); const on = list.some(x => x.id === c.id);
  if (on && !forceOn) { list = list.filter(x => x.id !== c.id); toast('Отписка: ' + c.name); }
  else if (!on) { list.push({ id: c.id, title: c.name, avatar: c.avatar || '', subs: c.subsN || 0, lang: c.lang || curLang() }); toast('Подписка: ' + c.name); }
  S.set('channels', list); feedMem = null;
}
function renderCatList() {
  const el = $('#cl'); if (!el) return; const lang = S.get('learnLang', 'en'), q = catState.q.toLowerCase();
  if (catState.tab === 'pod') {
    const pods = (catData.pods || {})[lang] || [], subs = S.get('podcasts', []);
    const list = pods.filter(p => !q || (p.title + ' ' + p.author).toLowerCase().includes(q));
    el.innerHTML = `<div class="cathead">Рекомендованные подкасты</div>` + (list.map(p => { const on = subs.some(x => x.url === p.feed); return `<div class="crow"><img class="cav sq" src="${esc(p.image)}" alt="" loading="lazy"><div class="cinfo"><b>${esc(p.title)}</b><span>${esc(p.author)} · ${esc(p.genre)}</span></div><button class="csub ${on ? 'on' : ''}" data-f="${esc(p.feed)}" title="${on ? 'Отписаться' : 'Подписаться'}">${on ? '✓' : '+'}</button></div>`; }).join('') || empty('Ничего не найдено', '', false));
    $$('.csub', el).forEach(b => b.onclick = async () => {
      const p = pods.find(x => x.feed === b.dataset.f);
      if (b.classList.contains('on')) { S.set('podcasts', S.get('podcasts', []).filter(x => x.url !== p.feed)); toast('Отписка'); renderCatList(); return; }
      b.textContent = '…'; await addPodcastFeed(p.feed, { title: p.title, image: p.image, lang }); renderCatList();
    });
    return;
  }
  const chans = catData[lang] || [];
  const list = chans.filter(c => (catState.cat === 'all' || c.cat === catState.cat) && (!q || (c.name + ' ' + c.handle).toLowerCase().includes(q)));
  const label = (CAT_LABELS.find(([k]) => k === catState.cat) || [])[1];
  el.innerHTML = `<div class="cathead">Рекомендованные каналы YouTube${catState.cat !== 'all' ? ' · ' + label : ''}</div>` + (list.map(c => { const on = isSub(c.id); return `<div class="crow ${on ? 'sel' : ''}"><img class="cav" src="${esc(c.avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div class="cinfo"><b>${esc(c.name)}</b><span>${ruNum(c.subsN)} подписчиков&nbsp;&nbsp; ${c.videosN ? ruNum(c.videosN) + ' видео' : ''}</span></div><button class="csub ${on ? 'on' : ''}" data-id="${c.id}" title="${on ? 'Отписаться' : 'Подписаться'}">${on ? '✓' : '+'}</button></div>`; }).join('') || empty(q ? 'Ничего не найдено. Вставьте ссылку на канал или @handle и нажмите Enter.' : 'Нет каналов', '', false));
  $$('.csub', el).forEach(b => b.onclick = () => { toggleSub(chans.find(c => c.id === b.dataset.id)); renderCatList(); });
}

/* ---------- PLAYER ---------- */
let player, cues = [], curVid, ytReady = false, ytQ = [], hlTimer;
window.onYouTubeIframeAPIReady = () => { ytReady = true; ytQ.forEach(f => f()); ytQ = []; };
(() => { const t = document.createElement('script'); t.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(t); })();
function parseId(u) { const m = String(u).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(u) ? u : null); }
function parseT(u) { const m = String(u).match(/[?&]t=(\d+)/); return m ? +m[1] : 0; }
function watch(id, start = 0) {
  curVid = id; cues = [];
  const meta = allVideos().find(v => v.id === id) || S.get('vmeta', {})[id] || S.get('history', []).find(v => v.id === id) || { id, title: 'Видео ' + id, channel: '' };
  const h = S.get('history', []).filter(v => v.id !== id); h.unshift(meta); S.set('history', h.slice(0, 60)); bump();
  const isFav = S.get('fav', []).some(v => v.id === id);
  const ovl = S.get('ovl', true), panel = S.get('tpanel', true);
  app().innerHTML = `<div class="main watch ${panel ? '' : 'nopanel'}"><div class="top"><a class="btn g s" href="#/home">‹</a><h1 style="flex:1">${esc(meta.title)}</h1><button class="btn g s" id="tovl" title="Субтитры поверх видео">${ovl ? '☑' : '☐'} Субтитры на видео</button><button class="btn g s" id="tpan">${panel ? '⇥ Скрыть панель' : '⇤ Показать панель'}</button><button class="btn g s" id="fav">${isFav ? '★ В избранном' : '☆ В избранное'}</button></div>
  <div class="pl"><div class="pcol"><div class="pwrap"><div id="player"></div><div id="ovl" class="${ovl ? '' : 'hidden'}"><div class="o1"></div><div class="o2"></div></div></div><details style="margin-top:14px"><summary class="muted">Вставить субтитры вручную (SRT/VTT)</summary><textarea id="subs" rows="6" style="width:100%;margin-top:8px" placeholder="Вставьте содержимое .srt или .vtt"></textarea><button class="btn s" id="subsgo">Загрузить</button></details></div>
  <div class="box" id="tr"><div class="muted">Загрузка транскрипта…</div></div></div></div>`;
  $('#tovl').onclick = () => { const v = !S.get('ovl', true); S.set('ovl', v); $('#ovl').classList.toggle('hidden', !v); $('#tovl').textContent = (v ? '☑' : '☐') + ' Субтитры на видео'; };
  $('#tpan').onclick = () => { const v = !S.get('tpanel', true); S.set('tpanel', v); $('.watch').classList.toggle('nopanel', !v); $('#tpan').textContent = v ? '⇥ Скрыть панель' : '⇤ Показать панель'; };
  $('#ovl').onclick = e => { if (!e.target.classList.contains('w')) return; const c = cues[+$('#ovl').dataset.i]; if (!c) return; if (player && player.pauseVideo) player.pauseVideo(); wordPopup(e.target, e.target.textContent, c.text, { sentenceTranslation: c.tr, meta: { videoId: curVid, videoUrl: `https://www.youtube.com/watch?v=${curVid}&t=${Math.floor(c.s)}s`, timestamp: Math.floor(c.s) } }); };
  if (!meta.channel) oembed(id).then(o => { if (o && curVid === id) { Object.assign(meta, o); const h1 = $('.main .top h1'); if (h1) h1.textContent = o.title; const hh = S.get('history', []); if (hh[0] && hh[0].id === id) { Object.assign(hh[0], o); S.set('history', hh); } } });
  $('#fav').onclick = () => { let f = S.get('fav', []); f = f.some(v => v.id === id) ? f.filter(v => v.id !== id) : [meta, ...f]; S.set('fav', f); watch(id, player && player.getCurrentTime ? player.getCurrentTime() : 0); };
  $('#subsgo').onclick = () => { cues = parseSubs($('#subs').value); renderTr(); toast('Строк: ' + cues.length); };
  const mk = () => { player = new YT.Player('player', { videoId: id, playerVars: { start: Math.floor(start), rel: 0 } }); };
  ytReady ? mk() : ytQ.push(mk);
  fetchTranscript(id);
  clearInterval(hlTimer); hlTimer = setInterval(() => {
    if (!location.hash.startsWith('#/watch') || !player || !player.getCurrentTime || !cues.length) return;
    const t = player.getCurrentTime(); let idx = -1; cues.forEach((c, i) => { if (c.s <= t) idx = i; });
    const ov = $('#ovl'); if (ov && ov.dataset.i !== String(idx)) { ov.dataset.i = idx; const c = cues[idx]; ov.querySelector('.o1').innerHTML = c ? wordsHTML(c.text) : ''; ov.querySelector('.o2').textContent = c ? (c.tr || '') : ''; ov.style.visibility = c ? 'visible' : 'hidden'; }
    else if (ov && cues[idx] && cues[idx].tr && !ov.querySelector('.o2').textContent) ov.querySelector('.o2').textContent = cues[idx].tr;
    const cur = $('.ln.on'); if (cur && +cur.dataset.i === idx) return; if (cur) cur.classList.remove('on');
    const l = $(`.ln[data-i="${idx}"]`); if (l) { l.classList.add('on'); l.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }, 400);
}
/* Transcript fallback chain:
   1) pre-generated docs/transcripts/<id>.json (yt-dlp, GitHub Actions)
   2) Lingua extension bridge (background fetch, no CORS)
   3) innertube /player (ANDROID, IOS) directly, then via CORS proxies -> timedtext
   4) innertube get_transcript via proxies
   5) legacy timedtext endpoint */
const WORKER = 'https://lingua.lingua-learn.workers.dev';
async function viaWorker(id) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await withTimeout(fetch(WORKER + '/transcript?id=' + id + '&lang=' + S.get('learnLang', 'en')), 30000); const d = await r.json();
      if (d.cues && d.cues.length) { if (d.title && curVid === id) { const h1 = $('.main .top h1'); if (h1 && /^Видео /.test(h1.textContent)) h1.textContent = d.title; } return d.cues; }
      if (d.error && d.error !== 'blocked') return null; // no captions / unavailable: don't retry
    } catch (e) { }
  }
  return null;
}
const PROXIES = [
  u => WORKER + '/fetch?url=' + encodeURIComponent(u),
  u => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  u => 'https://api.codetabs.com/v1/proxy?quest=' + u,
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  u => 'https://thingproxy.freeboard.io/fetch/' + u,
  u => 'https://cors.eu.org/' + u
];
const IT_CLIENTS = [
  { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30, hl: 'en' },
  { clientName: 'IOS', clientVersion: '20.10.4', deviceModel: 'iPhone16,2', hl: 'en' },
  { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'en' }
];
const deadProxy = {};
async function tryFetch(url, opts, direct = true) {
  const urls = (direct ? [[-1, url]] : []).concat(PROXIES.map((f, i) => [i, f(url)]).filter(([i]) => (deadProxy[i] || 0) < 2));
  for (const [i, u] of urls) {
    try { const r = await withTimeout(fetch(u, opts), 7000); if (r.ok) { const t = await r.text(); if (t && t.length > 20) { deadProxy[i] = 0; return t; } } else if (i >= 0) deadProxy[i] = (deadProxy[i] || 0) + 1; }
    catch (e) { if (i >= 0) deadProxy[i] = (deadProxy[i] || 0) + 1; }
  }
  return null;
}
function parseTimed(t) {
  t = (t || '').trim(); if (!t) return [];
  if (t[0] === '{') return (JSON.parse(t).events || []).filter(e => e.segs).map(e => ({ s: e.tStartMs / 1000, text: e.segs.map(x => x.utf8).join('').replace(/\n/g, ' ').trim() })).filter(c => c.text);
  const doc = new DOMParser().parseFromString(t, 'text/xml'), out = [];
  doc.querySelectorAll('p').forEach(p => out.push({ s: +p.getAttribute('t') / 1000, text: p.textContent.replace(/\s+/g, ' ').trim() }));
  doc.querySelectorAll('text').forEach(p => out.push({ s: +p.getAttribute('start'), text: p.textContent.replace(/\s+/g, ' ').trim() }));
  return out.filter(c => c.text);
}
function pickTrack(tracks) {
  const en = tracks.filter(t => /^en/.test(t.languageCode));
  return en.find(t => t.kind !== 'asr') || en.find(t => t.kind === 'asr') || tracks.find(t => t.kind === 'asr') || tracks[0];
}
const dedupe = cs => cs.filter((c, i) => !i || c.text !== cs[i - 1].text);
const trStatus = m => { const el = $('#tr'); if (el && !cues.length) el.innerHTML = `<div class="empty"><div class="spin"></div><div>${m}</div></div>`; };
function extTranscript(id) {
  return new Promise(res => {
    const rid = Math.random().toString(36).slice(2), h = e => { if (e.source === window && e.data && e.data.source === 'lingua-ext-transcript' && e.data.rid === rid) { window.removeEventListener('message', h); res(e.data.cues || null); } };
    window.addEventListener('message', h); window.postMessage({ source: 'lingua-req-transcript', id, rid }, location.origin);
    setTimeout(() => { window.removeEventListener('message', h); res(null); }, (window.__linguaExt || document.documentElement.dataset.linguaExt) ? 20000 : 1200);
  });
}
async function viaInnertube(id) {
  for (const client of IT_CLIENTS) {
    for (const direct of [true, false]) {
      const t = await tryFetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: { client }, videoId: id }) }, direct);
      if (!t) continue;
      let tracks; try { tracks = JSON.parse(t).captions.playerCaptionsTracklistRenderer.captionTracks; } catch (e) { continue; }
      if (!tracks || !tracks.length) continue;
      const tr = pickTrack(tracks), url = tr.baseUrl.replace(/&fmt=[^&]*/, '') + '&fmt=json3';
      const body = await tryFetch(url, {}, true);
      const cs = body ? parseTimed(body) : []; if (cs.length) return cs;
    }
  }
  return null;
}
const PIPED = ['https://api.piped.private.coffee', 'https://pipedapi.ducks.party', 'https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://pipedapi.leptons.xyz'];
async function viaPiped(id) {
  for (const base of PIPED) {
    try {
      const d = await (await withTimeout(fetch(base + '/streams/' + id), 8000)).json(); const subs = d.subtitles || []; if (!subs.length) continue;
      const en = subs.filter(x => /^en/.test(x.code)); const sub = en.find(x => !x.autoGenerated) || en[0] || subs[0];
      const cs = parseTimed(await (await withTimeout(fetch(sub.url), 8000)).text()); if (cs.length) return cs;
    } catch (e) { }
  }
  return null;
}
async function viaGetTranscript(id) {
  const params = btoa('\n\x0b' + id);
  const t = await tryFetch('https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: '2.20250101.00.00', hl: 'en' } }, params }) }, false);
  if (!t) return null;
  const out = []; (function walk(o) { if (!o || typeof o !== 'object') return; if (o.transcriptSegmentRenderer) { const r = o.transcriptSegmentRenderer; out.push({ s: +r.startMs / 1000, text: (r.snippet.runs || []).map(x => x.text).join('').trim() }); return; } Object.values(o).forEach(walk); })(JSON.parse(t));
  return out.filter(c => c.text).length ? out.filter(c => c.text) : null;
}
async function viaTimedtext(id) {
  for (const q of ['lang=en', 'lang=en&kind=asr']) { const t = await tryFetch(`https://www.youtube.com/api/timedtext?v=${id}&${q}&fmt=json3`, {}, true); const cs = t ? parseTimed(t) : []; if (cs.length) return cs; }
  return null;
}
async function fetchTranscript(id) {
  const steps = [
    ['Загрузка готового транскрипта…', async () => { const r = await fetch('transcripts/' + id + '.json'); return r.ok ? (await r.json()).cues : null; }],
    ['Получение субтитров через сервер Lingua…', () => viaWorker(id)],
    ['Запрос через расширение Lingua…', () => extTranscript(id)],
    ['Получение субтитров YouTube (innertube)…', () => viaInnertube(id)],
    ['Пробуем Piped…', () => viaPiped(id)],
    ['Пробуем get_transcript…', () => viaGetTranscript(id)],
    ['Пробуем timedtext…', () => viaTimedtext(id)]
  ];
  const cached = S.get('tcache', {})[id]; if (cached) { cues = cached; return renderTr(); }
  for (const [msg, fn] of steps) {
    if (id !== curVid) return; trStatus(msg);
    let cs = null; try { cs = await fn(); } catch (e) { }
    if (id !== curVid) return;
    if (cs && cs.length) {
      cues = dedupe(cs.map(c => ({ s: c.s, text: c.text })));
      if (msg.indexOf('готового') < 0) { const tc = S.get('tcache', {}); const keys = Object.keys(tc); if (keys.length > 15) delete tc[keys[0]]; tc[id] = cues; S.set('tcache', tc); }
      return renderTr();
    }
  }
  renderTr();
}
function parseSubs(txt) {
  const out = [], re = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{3})\s*-->[^\n]*\r?\n([\s\S]*?)(?=\r?\n\s*\r?\n|$)/g; let m;
  while ((m = re.exec(txt))) out.push({ s: (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000, text: m[5].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() });
  return out.filter(c => c.text);
}
function renderTr() {
  const el = $('#tr'); if (!el) return;
  if (!cues.length) { el.innerHTML = `<div class="empty">${CAT()}<div>Не удалось автоматически получить субтитры для этого видео (YouTube блокирует запросы из браузера, а у видео может не быть субтитров).<br>Установите расширение Lingua — оно загружает субтитры любого видео — или вставьте SRT/VTT вручную ниже.</div></div>`; return; }
  el.innerHTML = cues.map((c, i) => `<div class="ln" data-i="${i}"><span class="ts">${fmt(c.s)}</span>${wordsHTML(c.text)}<div class="t2"></div></div>`).join('');
  $$('.ln', el).forEach(l => l.onclick = e => {
    const c = cues[+l.dataset.i];
    if (e.target.classList.contains('w')) { if (player && player.pauseVideo) player.pauseVideo(); wordPopup(e.target, e.target.textContent, c.text, { sentenceTranslation: c.tr, meta: { videoId: curVid, videoUrl: `https://www.youtube.com/watch?v=${curVid}&t=${Math.floor(c.s)}s`, timestamp: Math.floor(c.s) } }); return; }
    if (player && player.seekTo) { player.seekTo(c.s, true); player.playVideo(); }
  });
  translateCues();
}
async function translateCues() {
  const vid = curVid;
  for (let i = 0; i < cues.length; i += 25) {
    const chunk = cues.slice(i, i + 25), src = chunk.map(c => c.text).join('\n'); let out = await translate(src);
    for (let k = 0; !out && k < 3; k++) { await new Promise(r => setTimeout(r, 2000 * (k + 1))); out = await translate(src); }
    if (vid !== curVid) return; const parts = out.split('\n');
    chunk.forEach((c, j) => { c.tr = parts[j] || ''; const el = $(`.ln[data-i="${i + j}"] .t2`); if (el) el.textContent = c.tr; });
  }
}

/* ---------- AI TALK ---------- */
let talkCat = 'Все';
function talk() {
  const st = S.get('talk', { sessions: 0, msgs: 0, done: [] });
  const list = SCENARIOS.map((s, i) => [...s, i]).filter(s => talkCat === 'Все' || s[2] === talkCat);
  app().innerHTML = `<div class="main"><div class="top"><h1>AI Talk</h1><span class="muted small">Ролевые диалоги с озвучкой и распознаванием речи</span></div>
  <div class="sgrid">${list.map(([t, e, c, i]) => `<a class="sc" href="#/talk/${i}"><div><b>${esc(t)}</b><div class="small muted">${DIALOGS[c].length} реплик · ${c}${st.done.includes(i) ? ' · ✓' : ''}</div></div><div class="e">${e}</div></a>`).join('')}</div></div>
  <div class="rp"><div class="box"><div class="tiles"><div class="tile"><div><b>${st.sessions}</b><span class="muted small">Сессий</span></div>💬</div><div class="tile"><div><b>${st.msgs}</b><span class="muted small">Реплик</span></div>🎙</div><div class="tile"><div><b>${st.done.length}</b><span class="muted small">Пройдено</span></div>🏆</div><div class="tile"><div><b>${SCENARIOS.length}</b><span class="muted small">Сценариев</span></div>📚</div></div></div>
  <div class="box"><h3>Категории</h3><div class="chips">${CATS.map(c => `<button class="chip ${c === talkCat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div></div></div>`;
  $$('.chip').forEach(b => b.onclick = () => { talkCat = b.dataset.c; talk(); });
}
function chat(i) {
  const [title, emoji, cat] = SCENARIOS[i] || []; if (!title) return location.hash = '#/talk';
  const script = DIALOGS[cat]; let step = 0;
  const st = S.get('talk', { sessions: 0, msgs: 0, done: [] }); st.sessions++; S.set('talk', st); bump();
  app().innerHTML = `<div class="main"><div class="top"><a class="btn g s" href="#/talk">‹</a><h1>${emoji} ${esc(title)}</h1><span class="muted small">${cat}</span></div><div class="chat" id="ch"></div><div class="sugs" id="sg"></div>
  <div style="max-width:760px;margin:0 auto;display:flex;gap:8px"><input id="ci" placeholder="Напишите ответ по-английски…" style="flex:1"><button class="btn g" id="cmic" title="Голосовой ввод">🎙</button><button class="btn" id="csend">Отправить</button></div></div>`;
  const add = async (text, me) => { const d = document.createElement('div'); d.className = 'msg' + (me ? ' me' : ''); d.innerHTML = `<div>${wordsHTML(text)}</div><div class="t2">…</div>`; $('#ch').appendChild(d); d.scrollIntoView({ behavior: 'smooth' }); $$('.w', d).forEach(w => w.onclick = () => wordPopup(w, w.textContent, text)); d.querySelector('.t2').textContent = await translate(text); if (!me) d.querySelector('div').insertAdjacentHTML('beforeend', ' <button class="ic spk">🔊</button>'), d.querySelector('.spk').onclick = () => speak(text); };
  const bot = () => { const [line, sugs] = script[step]; add(line, false); speak(line); $('#sg').innerHTML = sugs.map(s => `<button class="sug">${esc(s)}</button>`).join(''); $$('.sug').forEach(b => b.onclick = () => reply(b.textContent)); };
  const reply = t => {
    t = t.trim(); if (!t) return; add(t, true); $('#ci').value = ''; const s = S.get('talk', st); s.msgs++; step++;
    if (step >= script.length) { if (!s.done.includes(i)) s.done.push(i); S.set('talk', s); $('#sg').innerHTML = '<div class="box" style="text-align:center">🎉 Диалог завершён! <a class="btn s" href="#/talk">К сценариям</a></div>'; return; }
    S.set('talk', s); setTimeout(bot, 600);
  };
  $('#csend').onclick = () => reply($('#ci').value); $('#ci').onkeydown = e => e.key === 'Enter' && reply($('#ci').value);
  $('#cmic').onclick = () => listen(t => { $('#ci').value = t; });
  bot();
}

/* ---------- BOOKS ---------- */
let readTimer;
function readStats() { return S.get('reading', {}); }
function readingPanel() {
  const r = readStats(), sec = r[today()] || 0; const [v, l] = last7(k => Math.round((r[k] || 0) / 60));
  return `<div class="box" style="text-align:center"><div class="muted small">Чтение сегодня</div>${ring(sec, 1200, fmt(sec), 'цель 20 мин', 150)}</div><div class="box"><h3>Неделя <span class="muted small">минут в день</span></h3>${barChart(v, l, '#f5c542')}</div>`;
}
function books() {
  const bs = S.get('books', []);
  app().innerHTML = `<div class="main"><div class="top"><h1>Мои книги</h1><div class="sp"></div><label class="btn s">+ Загрузить книгу<input type="file" id="bf" accept=".txt,.epub" hidden></label></div>
  ${bs.length ? `<div class="bgrid">${bs.map((b, i) => `<a class="bk" href="#/read/${i}"><div class="cov" style="background:hsl(${(i * 67 + 260) % 360},40%,35%)">${esc(b.title)}</div><div class="small">${esc(b.title)}</div><div class="muted small">${Math.round((b.pos || 0) * 100)}% · ${b.type}</div><button class="x bdel" data-i="${i}" style="position:absolute;top:6px;right:6px">✕</button></a>`).join('')}</div>` : empty('Полка пуста — добавьте книгу, чтобы начать читать.<br>Поддерживаются .txt и .epub', '<button class="btn" onclick="document.getElementById(\'bf\').click()">Загрузить книгу</button>')}</div><div class="rp">${readingPanel()}</div>`;
  $$('.bdel').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const x = S.get('books', []); x.splice(+b.dataset.i, 1); S.set('books', x); books(); });
  $('#bf').onchange = async e => {
    const f = e.target.files[0]; if (!f) return; let text = '', title = f.name.replace(/\.\w+$/, ''), type = 'txt';
    try {
      if (/\.epub$/i.test(f.name)) { type = 'epub'; ({ text, title } = await parseEpub(f, title)); } else text = await f.text();
      const bs = S.get('books', []); bs.push({ title, type, text: text.slice(0, 1500000), pos: 0, addedAt: Date.now() }); S.set('books', bs); toast('Книга добавлена'); books();
    } catch (err) { toast('Ошибка чтения файла: ' + err.message); }
  };
}
async function loadJSZip() { if (window.JSZip) return; await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; s.onload = ok; s.onerror = () => no(new Error('JSZip не загрузился')); document.head.appendChild(s); }); }
async function parseEpub(file, fallback) {
  await loadJSZip(); const zip = await JSZip.loadAsync(file);
  const cont = await zip.file('META-INF/container.xml').async('text'); const opfPath = cont.match(/full-path="([^"]+)"/)[1]; const base = opfPath.includes('/') ? opfPath.replace(/[^/]+$/, '') : '';
  const opf = new DOMParser().parseFromString(await zip.file(opfPath).async('text'), 'application/xml');
  const title = opf.getElementsByTagName('dc:title')[0]?.textContent || fallback; const man = {};
  [...opf.getElementsByTagName('item')].forEach(it => man[it.getAttribute('id')] = it.getAttribute('href'));
  let text = '';
  for (const ir of opf.getElementsByTagName('itemref')) {
    const href = man[ir.getAttribute('idref')]; const zf = href && zip.file(decodeURIComponent(base + href)); if (!zf) continue;
    const doc = new DOMParser().parseFromString(await zf.async('text'), 'text/html');
    $$('p,h1,h2,h3,li,div:not(:has(p,div))', doc.body || doc).forEach(n => { const t = n.textContent.trim(); if (t) text += t + '\n\n'; });
  }
  return { text, title };
}
function reader(i) {
  const bs = S.get('books', []), b = bs[i]; if (!b) return location.hash = '#/books';
  const paras = b.text.split(/\n\s*\n|\r?\n/).map(s => s.trim()).filter(Boolean); const PAGE = 30; let page = Math.floor((b.pos || 0) * Math.ceil(paras.length / PAGE));
  app().innerHTML = `<div class="main"><div class="top"><a class="btn g s" href="#/books">‹</a><h1 style="flex:1">${esc(b.title)}</h1><button class="btn g s" id="pp">‹ Назад</button><span id="pg" class="muted small"></span><button class="btn g s" id="pn">Вперёд ›</button></div><div class="reader" id="rd"></div></div><div class="rp" id="rrp">${readingPanel()}</div>`;
  const pages = Math.max(1, Math.ceil(paras.length / PAGE));
  const show = () => {
    $('#rd').innerHTML = paras.slice(page * PAGE, page * PAGE + PAGE).map(p => `<p>${wordsHTML(p)}</p>`).join(''); $('#pg').textContent = `${page + 1} / ${pages}`; window.scrollTo(0, 0);
    const x = S.get('books', []); if (x[i]) { x[i].pos = page / pages; S.set('books', x); }
  };
  $('#pp').onclick = () => { if (page > 0) { page--; show(); } }; $('#pn').onclick = () => { if (page < pages - 1) { page++; show(); } };
  $('#rd').onclick = e => { if (!e.target.classList.contains('w')) return; const p = e.target.closest('p').textContent; const sent = (p.match(/[^.!?]+[.!?]*/g) || [p]).find(s => s.includes(e.target.textContent)) || p; wordPopup(e.target, e.target.textContent, sent.trim(), { meta: { source: 'book:' + b.title } }); };
  show();
  clearInterval(readTimer); readTimer = setInterval(() => {
    if (!location.hash.startsWith('#/read') || document.hidden) return; const r = readStats(); r[today()] = (r[today()] || 0) + 1; S.set('reading', r);
    if (r[today()] % 10 === 0) { const rp = $('#rrp'); if (rp) rp.innerHTML = readingPanel(); } if (r[today()] % 60 === 0) bump();
  }, 1000);
}

/* ---------- VOCAB ---------- */
function vocab(setId = 'saved', mode = '', filter = 'all') {
  const saved = words(), d = deck(setId), learned = d.filter(x => x.srs && x.srs.n >= 3);
  const set = setId === 'saved' ? { name: 'Сохранённые слова', color: '#5b3fa8' } : WORDSETS.find(s => s.id === setId);
  const side = `<div class="vl"><h1 style="font-size:18px;margin:4px 8px 12px">Словарь</h1><a class="set ${setId === 'saved' ? 'on' : ''}" href="#/vocab/saved"><div class="cov" style="background:#5b3fa8">Мои</div><div><div>Сохранённые слова</div><div class="muted small">${saved.length}</div></div></a><div class="muted small" style="margin:12px 8px 6px">Избранные учебники</div>
  ${WORDSETS.map(s => `<a class="set ${setId === s.id ? 'on' : ''}" href="#/vocab/${s.id}"><div class="cov" style="background:${s.color}">${esc(s.name.split(' ')[0])}</div><div><div>${esc(s.name)}</div><div class="muted small">${s.words.length}</div></div></a>`).join('')}</div>`;
  let body;
  if (mode) body = '<div id="fcb"></div>';
  else {
    const list = (filter === 'learned' ? learned : d);
    body = `<div class="top"><div class="tabs"><a class="tab ${filter === 'all' ? 'on' : ''}" href="#/vocab/${setId}">Все ${d.length}</a><a class="tab ${filter === 'learned' ? 'on' : ''}" href="#/vocab/${setId}//learned">Освоено ${learned.length}</a></div><input id="vq" placeholder="Поиск…" style="width:200px"><div class="sp"></div><a class="btn g s" href="#/vocab/${setId}/learn">Тренировка</a><a class="btn s" href="#/vocab/${setId}/review">Повторение</a></div>
    ${list.length ? `<div class="wl">${list.map(w => `<div class="wc" data-q="${esc((w.word + ' ' + w.translation).toLowerCase())}"><b>${esc(w.word)}</b> <button class="ic spk" data-w="${esc(w.word)}">🔊</button><div>${esc(w.translation)}</div>${w.sentence ? `<div class="ctx">${esc(w.sentence)}</div>` : ''}<div class="meta">${w.srs ? `<span class="muted">повтор: ${new Date(w.srs.due).toLocaleDateString('ru')}</span>` : '<span class="muted">новое</span>'}${w.videoId ? `<a href="#/watch/${esc(w.videoId)}/${w.timestamp || 0}" style="color:var(--y)">▶ видео</a>` : ''}${setId === 'saved' ? `<button class="x wdel" data-id="${esc(w.id)}">Удалить</button>` : ''}</div></div>`).join('')}</div>`
      : empty(setId === 'saved' && filter === 'all' ? 'Сохранённых слов нет. Сохраняйте при просмотре видео или подкастов, либо через расширение Lingua.' : 'Пока ничего не освоено.', setId === 'saved' ? '<a class="btn" href="#/import">Установить расширение / импорт</a>' : '')}`;
  }
  app().innerHTML = side + `<div class="main"><h2 style="margin-top:4px">${esc(set.name)}</h2>${body}</div>`;
  $$('.spk').forEach(b => b.onclick = () => speak(b.dataset.w));
  $$('.wdel').forEach(b => b.onclick = () => { S.set('words', words().filter(w => w.id !== b.dataset.id)); vocab(setId, '', filter); });
  if ($('#vq')) $('#vq').oninput = () => { const q = $('#vq').value.toLowerCase(); $$('.wc').forEach(c => c.style.display = c.dataset.q.includes(q) ? '' : 'none'); };
  if (mode) flash(setId, mode);
}
function flash(setId, mode) {
  const now = Date.now(), d = deck(setId);
  let q = mode === 'learn' ? d.filter(x => !x.srs).slice(0, 10) : d.filter(x => x.srs && x.srs.due <= now).sort((a, b) => a.srs.due - b.srs.due);
  const box = $('#fcb');
  if (!q.length) { box.innerHTML = `<div class="flash">${CAT()}<p>${mode === 'learn' ? 'Новых слов нет.' : 'Нечего повторять — всё повторено! 🎉'}</p><a class="btn g" href="#/vocab/${setId}">К списку</a> ${mode === 'review' ? `<a class="btn" href="#/vocab/${setId}/learn">Учить новые</a>` : ''}</div>`; return; }
  const w = q[0];
  box.innerHTML = `<div class="flash"><div class="muted small">${mode === 'learn' ? 'Обучение' : 'Повторение'} · осталось ${q.length}</div><div class="fw">${esc(w.word)} <button class="ic" id="fs">🔊</button></div>${w.sentence ? `<div class="muted"><i>${esc(w.sentence)}</i></div>` : ''}
  <div id="fa" style="display:none"><div class="fa">${esc(w.translation)}</div><div class="gr">${[[0, 'Не помню', '#dc4444'], [3, 'Трудно', '#d98a1f'], [4, 'Хорошо', '#2f9e6e'], [5, 'Легко', '#7c5ce6']].map(([g, l, c]) => `<button data-g="${g}" style="background:${c}">${l}</button>`).join('')}</div></div>
  <p><button class="btn" id="fshow">Показать перевод</button></p><a class="muted small" href="#/vocab/${setId}">Завершить</a></div>`;
  speak(w.word); $('#fs').onclick = () => speak(w.word);
  $('#fshow').onclick = () => { $('#fa').style.display = 'block'; $('#fshow').remove(); };
  $$('[data-g]').forEach(b => b.onclick = () => {
    const srs = S.get('srs', {}); srs[w.key] = sm2(srs[w.key], +b.dataset.g); S.set('srs', srs);
    const r = S.get('reviews', {}); r[today()] = (r[today()] || 0) + 1; S.set('reviews', r); bump(); flash(setId, mode);
  });
}

/* ---------- SENTENCES ---------- */
const SAMPLE = ['The quick brown fox jumps over the lazy dog.', 'Could you tell me how to get to the station?', 'I have been learning English for three years.', 'What do you usually do on weekends?', 'It takes practice to become fluent.', 'I would like to book a table for two.', 'She is looking forward to the trip.', 'Let me know if you have any questions.'];
const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '').split(/\s+/).filter(Boolean);
function diff(target, got) { const g = new Set(norm(got)); const t = norm(target); const ok = t.filter(w => g.has(w)).length; return { score: Math.round(ok / Math.max(1, t.length) * 100), html: t.map(w => `<span class="${g.has(w) ? 'ok' : 'bad'}">${esc(w)}</span>`).join(' ') }; }
let sIdx = 0;
function sentences(tab = 'fav') {
  const ss = S.get('sentences', []); const pool = ss.length ? ss.map(s => s.text) : SAMPLE;
  let body = '';
  if (tab === 'fav') body = ss.length ? `<div class="wl">${ss.map(s => `<div class="wc"><div>${wordsHTML(s.text)}</div><div class="ctx">${esc(s.translation)}</div><div class="meta"><button class="ic spk" data-t="${esc(s.text)}">🔊</button>${s.videoId ? `<a href="#/watch/${esc(s.videoId)}/${s.timestamp || 0}" style="color:var(--y)">▶ видео</a>` : ''}<button class="x sdel" data-id="${esc(s.id)}">Удалить</button></div></div>`).join('')}</div>`
    : empty('Сохранённых фраз нет. Сохраняйте при просмотре видео или подкастов, либо через расширение Lingua.', '<a class="btn" href="#/import">Установить расширение</a>');
  else {
    const t = pool[sIdx % pool.length];
    body = `<div class="flash" style="max-width:680px"><div class="muted small">${ss.length ? 'Из ваших предложений' : 'Демо-фразы (сохраните свои, чтобы тренироваться на них)'} · ${sIdx % pool.length + 1}/${pool.length}</div>
    ${tab === 'dict' ? `<p>Прослушайте фразу и напишите её.</p><p><button class="btn" id="play">🔊 Прослушать</button> <button class="btn g" id="slow">🐢 Медленно</button></p><input id="din" style="width:100%" placeholder="Введите услышанное…"><p><button class="btn" id="chk">Проверить</button></p>`
        : `<div class="dict">${esc(t)}</div><p><button class="btn g" id="play">🔊 Слушать</button> <button class="btn" id="rec">🎙 Повторить</button></p>`}
    <div id="res" class="diff dict" style="font-size:18px"></div><button class="btn g s" id="nx">Следующая ›</button></div>`;
  }
  app().innerHTML = `<div class="main"><div class="top"><h1>Предложения</h1><div class="tabs"><a class="tab ${tab === 'fav' ? 'on' : ''}" href="#/sentences/fav">Избранное</a><a class="tab ${tab === 'dict' ? 'on' : ''}" href="#/sentences/dict">⌨ Диктант</a><a class="tab ${tab === 'shadow' ? 'on' : ''}" href="#/sentences/shadow">🎙 Шэдоуинг</a></div></div>${body}</div>`;
  $$('.spk').forEach(b => b.onclick = () => speak(b.dataset.t));
  $$('.sdel').forEach(b => b.onclick = () => { S.set('sentences', S.get('sentences', []).filter(s => s.id !== b.dataset.id)); sentences('fav'); });
  if ($$('#sentences .w').length || tab === 'fav') $$('.wc .w').forEach(w => w.onclick = () => wordPopup(w, w.textContent, w.closest('.wc').firstElementChild.textContent));
  if (tab === 'fav') return;
  const t = pool[sIdx % pool.length];
  $('#play').onclick = () => speak(t); if ($('#slow')) $('#slow').onclick = () => speak(t, undefined, 0.6);
  $('#nx').onclick = () => { sIdx++; sentences(tab); };
  const show = got => { const r = diff(t, got); $('#res').innerHTML = `<div>${r.html}</div><div class="small muted" style="margin-top:8px">Точность: ${r.score}% ${r.score > 85 ? '🎉' : ''}${tab === 'shadow' ? '<br>Распознано: ' + esc(got) : '<br>' + esc(t)}</div>`; bump(); };
  if ($('#chk')) { $('#chk').onclick = () => show($('#din').value); $('#din').onkeydown = e => e.key === 'Enter' && show($('#din').value); }
  if ($('#rec')) $('#rec').onclick = () => listen(show);
  if (tab === 'dict') speak(t);
}

/* ---------- IMPORT ---------- */
function importPage() {
  app().innerHTML = `<div class="main" style="max-width:760px"><h1>Импорт и расширение</h1>
  <div class="box"><h3>Расширение Lingua для Chrome</h3><p class="muted">Двойные субтитры на YouTube и сохранение слов в один клик. Скачайте <a style="color:var(--y)" href="https://github.com/DanyaDanileckiy/lingua-learn/raw/main/extension.zip">extension.zip</a>, распакуйте, откройте <code>chrome://extensions</code>, включите «Режим разработчика» → «Загрузить распакованное». Когда этот сайт открыт, расширение автоматически синхронизирует сохранённые слова.</p></div>
  <div class="box" style="margin-top:12px"><h3>Импорт слов из JSON</h3><input type="file" id="file" accept=".json"><p id="imsg" class="muted"></p></div>
  <div class="box" style="margin-top:12px"><h3>Язык перевода</h3><select id="tl">${[['ru', 'Русский'], ['uk', 'Українська'], ['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'], ['fr', 'Français']].map(([v, l]) => `<option value="${v}" ${TL() === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="box" style="margin-top:12px"><h3>Резервная копия</h3><button class="btn" id="exp">Экспорт словаря</button> <button class="btn g" id="clr">Очистить слова</button></div></div>`;
  $('#tl').onchange = () => { S.set('tl', $('#tl').value); toast('Сохранено'); };
  $('#file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { let d = JSON.parse(await f.text()); if (!Array.isArray(d)) d = d.words || []; $('#imsg').textContent = 'Импортировано новых слов: ' + mergeWords(d); } catch (err) { $('#imsg').textContent = 'Ошибка: неверный JSON'; } };
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(words(), null, 2)], { type: 'application/json' })); a.download = 'lingua-vocab.json'; a.click(); };
  $('#clr').onclick = () => { if (confirm('Удалить все сохранённые слова?')) { S.set('words', []); toast('Очищено'); } };
}
function mergeWords(list) {
  const ws = words(), seen = new Set(ws.map(w => w.word.toLowerCase())); let n = 0;
  (list || []).forEach(d => { if (d && d.word && !seen.has(d.word.toLowerCase())) { seen.add(d.word.toLowerCase()); ws.push(Object.assign({ id: Math.random().toString(36).slice(2) }, d)); n++; } });
  S.set('words', ws); if (n) bump(n); return n;
}
// Extension direct sync: content script posts {source:'lingua-ext', words:[...]}
window.addEventListener('message', e => { if (e.source === window && e.data && e.data.source === 'lingua-ext') window.__linguaExt = true; if (e.source === window && e.data && e.data.source === 'lingua-ext' && Array.isArray(e.data.words)) { const n = mergeWords(e.data.words); if (n) { toast('Синхронизировано из расширения: ' + n); route(); } } });

/* ---------- ROUTER ---------- */
function route() {
  const [r, a, b, c] = location.hash.replace(/^#\/?/, '').split('/');
  $('#pop').classList.add('hidden'); if (r !== 'watch' && player && player.destroy) { try { player.destroy(); } catch (e) { } player = null; }
  $$('#side a[data-r]').forEach(x => x.classList.toggle('on', x.dataset.r === (r === 'watch' || r === 'podcast' || r === 'catalog' ? 'library' : r === 'read' ? 'books' : r || 'home')));
  window.scrollTo(0, 0);
  switch (r) {
    case 'library': return library(a ? decodeURIComponent(a) : 'youtube');
    case 'catalog': return catalog();
    case 'watch': return watch(a, +b || 0);
    case 'podcast': return podcastPage(+a);
    case 'talk': return a != null && a !== '' ? chat(+a) : talk();
    case 'books': return books();
    case 'read': return reader(+a);
    case 'vocab': return vocab(a || 'saved', b || '', c || 'all');
    case 'sentences': return sentences(a || 'fav');
    case 'import': return importPage();
    default: return home();
  }
}
window.addEventListener('hashchange', route);
new MutationObserver(() => { if (!$('#langsw') || !$('#langsw').isConnected || ($('#langsw').classList.contains('fx') && $('#app .top, #app .catsearch') && $('#app .top, #app .catsearch').getBoundingClientRect().left < 200) || (!$('#langsw').classList.contains('fx') && !$('#app').contains($('#langsw')))) renderLangSw(); }).observe(document.getElementById('app'), { childList: true });
if (document.documentElement.dataset.linguaExt) window.__linguaExt = true;
window.postMessage({ source: 'lingua-hello' }, location.origin);
renderLangSw(); migrateLangs().finally(route);
