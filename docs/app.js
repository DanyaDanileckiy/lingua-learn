'use strict';
const KEY = 'lingua_words';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
const save = w => localStorage.setItem(KEY, JSON.stringify(w));
const $ = s => document.querySelector(s);
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = 'none', 2000); }
const DAY = 864e5;

// Tabs
document.querySelectorAll('nav button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
function showTab(id) {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x.dataset.tab === id));
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.id === id));
  if (id === 'vocab') renderVocab(); if (id === 'cards') renderCard();
}

// Vocabulary
$('#q').oninput = renderVocab;
function renderVocab() {
  const q = $('#q').value.toLowerCase(), all = load();
  const due = all.filter(w => (w.srs?.due || 0) <= Date.now()).length;
  $('#stats').textContent = `Слов: ${all.length} · к повторению: ${due}`;
  const list = all.filter(w => !q || (w.word + ' ' + w.translation).toLowerCase().includes(q));
  $('#wlist').innerHTML = list.length ? list.map(w => `<div class="card"><h3>${esc(w.word)}</h3><div class="tr">${esc(w.translation)}</div><div class="ctx">${esc(w.sentence)}</div><div class="meta">${w.videoUrl ? `<a href="#" data-v="${esc(w.videoUrl)}">▶ к видео</a>` : '<span></span>'}<button class="del" data-id="${esc(w.id)}">Удалить</button></div></div>`).join('') : '<p class="muted">Словарь пуст. Импортируйте слова из расширения.</p>';
  $('#wlist').querySelectorAll('.del').forEach(b => b.onclick = () => { save(load().filter(w => w.id !== b.dataset.id)); renderVocab(); });
  $('#wlist').querySelectorAll('[data-v]').forEach(a => a.onclick = e => { e.preventDefault(); $('#vurl').value = a.dataset.v; showTab('video'); openVideo(); });
}

// SM-2
function sm2(s, q) {
  s = Object.assign({ ef: 2.5, n: 0, interval: 0 }, s);
  if (q < 3) { s.n = 0; s.interval = 1; }
  else { s.n++; s.interval = s.n === 1 ? 1 : s.n === 2 ? 6 : Math.round(s.interval * s.ef); }
  s.ef = Math.max(1.3, s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  s.due = Date.now() + (q < 3 ? 60e3 : s.interval * DAY);
  return s;
}
function renderCard() {
  const all = load(), due = all.filter(w => (w.srs?.due || 0) <= Date.now()).sort((a, b) => (a.srs?.due || 0) - (b.srs?.due || 0));
  const box = $('#cardbox');
  if (!due.length) { box.innerHTML = `<div class="panel flash"><div class="w">🎉</div><p>${all.length ? 'На сегодня всё повторено!' : 'Нет слов для изучения.'}</p></div>`; return; }
  const w = due[0];
  box.innerHTML = `<div class="panel flash"><p class="muted">Осталось: ${due.length}</p><div class="w">${esc(w.word)}</div><div class="ctx muted"><i>${esc(w.sentence)}</i></div><div id="ans" style="display:none"><div class="a">${esc(w.translation)}</div><div class="grades">
  ${[[0, 'Не помню', '#e55'], [3, 'Трудно', '#f0a030'], [4, 'Хорошо', '#3b9'], [5, 'Легко', '#6c5ce7']].map(([q, l, c]) => `<button data-q="${q}" style="background:${c}">${l}</button>`).join('')}</div></div>
  <button id="show" class="pri" style="margin-top:16px">Показать перевод</button></div>`;
  $('#show').onclick = () => { $('#ans').style.display = 'block'; $('#show').remove(); };
  box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
    const ws = load(), x = ws.find(i => i.id === w.id); x.srs = sm2(x.srs, +b.dataset.q); save(ws); renderCard();
  });
}

// Import / export
$('#file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(t => {
    let data; try { data = JSON.parse(t); } catch (err) { $('#imsg').textContent = 'Ошибка: неверный JSON'; return; }
    if (!Array.isArray(data)) data = data.words || [];
    const ws = load(), seen = new Set(ws.map(w => w.word.toLowerCase())); let n = 0;
    data.forEach(d => { if (d && d.word && !seen.has(d.word.toLowerCase())) { seen.add(d.word.toLowerCase()); ws.push(Object.assign({ id: Math.random().toString(36).slice(2) }, d)); n++; } });
    save(ws); $('#imsg').textContent = `Импортировано новых слов: ${n}`; toast('Готово');
  });
};
$('#export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' })); a.download = 'lingua-vocab.json'; a.click(); };
$('#clear').onclick = () => { if (confirm('Удалить все слова?')) { save([]); toast('Очищено'); } };

// Video
let player, cues = [], vid = null, ytReady = false, pending = null;
window.onYouTubeIframeAPIReady = () => { ytReady = true; if (pending) { pending(); pending = null; } };
const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag);
function parseId(u) { const m = String(u).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(u) ? u : null); }
function parseT(u) { const m = String(u).match(/[?&]t=(\d+)/); return m ? +m[1] : 0; }
$('#vload').onclick = openVideo;
function openVideo() {
  const u = $('#vurl').value.trim(), id = parseId(u); if (!id) { toast('Неверная ссылка'); return; }
  vid = id; const start = parseT(u);
  const go = () => { if (player && player.loadVideoById) player.loadVideoById({ videoId: id, startSeconds: start }); else player = new YT.Player('player', { videoId: id, playerVars: { start, cc_load_policy: 0 } }); };
  ytReady ? go() : pending = go;
  fetchTranscript(id);
}
async function fetchTranscript(id) {
  cues = []; $('#transcript').innerHTML = '<p class="muted">Загрузка транскрипта…</p>';
  for (const lang of ['en', 'en-US', 'de', 'fr', 'es']) {
    try {
      const r = await fetch(`https://www.youtube.com/api/timedtext?v=${id}&lang=${lang}&fmt=json3`);
      const t = await r.text(); if (!t) continue;
      cues = (JSON.parse(t).events || []).filter(e => e.segs).map(e => ({ s: e.tStartMs / 1000, text: e.segs.map(x => x.utf8).join('').trim() })).filter(c => c.text);
      if (cues.length) break;
    } catch (e) { /* CORS or empty */ }
  }
  renderTranscript();
}
function parseSubs(txt) {
  const out = [], re = /(\d{1,2}:)?(\d{1,2}):(\d{2})[.,](\d{3})\s*-->.*\r?\n([\s\S]*?)(?=\r?\n\r?\n|$)/g; let m;
  while ((m = re.exec(txt))) out.push({ s: (+(m[1] || '0:').slice(0, -1)) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000, text: m[5].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() });
  return out.filter(c => c.text);
}
$('#subsgo').onclick = () => { cues = parseSubs($('#subs').value); renderTranscript(); toast(`Строк: ${cues.length}`); };
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function renderTranscript() {
  const el = $('#transcript');
  if (!cues.length) { el.innerHTML = '<p class="muted">Транскрипт недоступен (YouTube ограничивает доступ из браузера). Вставьте субтитры вручную ниже или используйте расширение.</p>'; return; }
  el.innerHTML = cues.map((c, i) => `<div class="line" data-i="${i}"><span class="ts">${fmt(c.s)}</span>${esc(c.text).split(/(\s+)/).map(w => /\S/.test(w) ? `<span class="tw">${w}</span>` : w).join('')}</div>`).join('');
  el.querySelectorAll('.line').forEach(l => l.onclick = e => {
    const c = cues[+l.dataset.i];
    if (e.target.classList.contains('tw')) { wordClick(e.target.textContent, c); return; }
    player && player.seekTo && player.seekTo(c.s, true);
  });
}
async function wordClick(raw, c) {
  const word = raw.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ''); if (!word) return;
  let translation = '';
  try { const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q=' + encodeURIComponent(word)); translation = (await r.json())[0].map(x => x[0]).join(''); } catch (e) { }
  if (!confirm(`${word} — ${translation || '(перевод недоступен)'}\n\nСохранить в словарь?`)) return;
  const ws = load();
  if (ws.some(w => w.word.toLowerCase() === word.toLowerCase())) { toast('Уже в словаре'); return; }
  ws.push({ id: Date.now().toString(36), word, translation, sentence: c.text, videoUrl: `https://www.youtube.com/watch?v=${vid}&t=${Math.floor(c.s)}s`, timestamp: Math.floor(c.s), createdAt: new Date().toISOString() });
  save(ws); toast('Сохранено');
}
setInterval(() => {
  if (!player || !player.getCurrentTime || !cues.length) return;
  const t = player.getCurrentTime(); let idx = -1; cues.forEach((c, i) => { if (c.s <= t) idx = i; });
  document.querySelectorAll('.line.on').forEach(l => l.classList.remove('on'));
  const l = document.querySelector(`.line[data-i="${idx}"]`); if (l) l.classList.add('on');
}, 500);
renderVocab();
