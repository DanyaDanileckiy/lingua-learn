(function () {
  let cues = [], trans = {}, tl = 'ru', curVideo = null, overlay, lastIdx = -1, timer;
  chrome.storage.sync.get({ targetLang: 'ru' }, o => tl = o.targetLang);
  chrome.storage.onChanged.addListener(c => { if (c.targetLang) { tl = c.targetLang.newValue; trans = {}; } });

  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('inject.js');
  document.documentElement.appendChild(s);

  function tr(text) {
    return new Promise(res => chrome.runtime.sendMessage({ type: 'translate', text, tl }, r => res(r && r.ok ? r.text : '')));
  }
  window.addEventListener('message', async e => {
    const d = e.data;
    if (!d || d.source !== 'lingua-inject' || !d.videoId || d.videoId === curVideo) return;
    if (new URL(location.href).searchParams.get('v') !== d.videoId) return;
    curVideo = d.videoId; cues = []; trans = {}; lastIdx = -1;
    if (!d.tracks.length) return;
    const t = d.tracks.find(t => t.kind !== 'asr') || d.tracks[0];
    try {
      const r = await fetch(t.baseUrl + '&fmt=json3');
      const j = await r.json();
      cues = (j.events || []).filter(ev => ev.segs).map(ev => ({ start: ev.tStartMs / 1000, end: (ev.tStartMs + (ev.dDurationMs || 2000)) / 1000, text: ev.segs.map(x => x.utf8).join('').replace(/\n/g, ' ').trim() })).filter(c => c.text);
    } catch (err) { console.warn('Lingua: captions failed', err); }
  });
  function poll() {
    if (location.pathname === '/watch') window.postMessage({ source: 'lingua-req' }, '*');
  }
  setInterval(poll, 2000);

  function ensureOverlay() {
    const host = document.querySelector('#movie_player');
    if (!host) return null;
    if (!overlay || !host.contains(overlay)) {
      overlay = document.createElement('div');
      overlay.id = 'lingua-overlay';
      overlay.innerHTML = '<div class="lg-orig"></div><div class="lg-tr"></div>';
      host.appendChild(overlay);
    }
    return overlay;
  }
  function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  async function tick() {
    const v = document.querySelector('video');
    const ov = ensureOverlay();
    if (!v || !ov || !cues.length || location.pathname !== '/watch') { if (ov) ov.style.display = 'none'; return; }
    const t = v.currentTime;
    const i = cues.findIndex(c => t >= c.start && t < c.end);
    if (i === lastIdx) return;
    lastIdx = i;
    if (i < 0) { ov.style.display = 'none'; return; }
    ov.style.display = 'block';
    const c = cues[i];
    ov.querySelector('.lg-orig').innerHTML = c.text.split(/(\s+)/).map(w => /\S/.test(w) ? '<span class="lg-w">' + esc(w) + '</span>' : w).join('');
    const trEl = ov.querySelector('.lg-tr');
    trEl.textContent = trans[i] || '…';
    if (!trans[i]) { const x = await tr(c.text); trans[i] = x; if (lastIdx === i) trEl.textContent = x; }
    // prefetch next
    if (cues[i + 1] && !trans[i + 1]) tr(cues[i + 1].text).then(x => trans[i + 1] = x);
  }
  timer = setInterval(tick, 200);

  document.addEventListener('click', async e => {
    const w = e.target.closest && e.target.closest('.lg-w');
    if (!w) { const p = document.getElementById('lingua-pop'); if (p && !p.contains(e.target)) p.remove(); return; }
    e.stopPropagation(); e.preventDefault();
    const v = document.querySelector('video'); if (v) v.pause();
    const word = w.textContent.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '');
    const sentence = w.parentElement.textContent;
    const ts = v ? Math.floor(v.currentTime) : 0;
    document.getElementById('lingua-pop')?.remove();
    const pop = document.createElement('div');
    pop.id = 'lingua-pop';
    pop.innerHTML = '<b></b><div class="lg-pt">…</div><button>Сохранить</button>';
    pop.querySelector('b').textContent = word;
    overlay.appendChild(pop);
    const translation = await tr(word);
    pop.querySelector('.lg-pt').textContent = translation;
    pop.querySelector('button').onclick = ev => {
      ev.stopPropagation();
      const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), word, translation, sentence, sentenceTranslation: trans[lastIdx] || '', videoUrl: 'https://www.youtube.com/watch?v=' + curVideo + '&t=' + ts + 's', videoId: curVideo, timestamp: ts, lang: tl, createdAt: new Date().toISOString() };
      chrome.storage.local.get({ words: [] }, o => {
        if (!o.words.some(x => x.word.toLowerCase() === word.toLowerCase())) o.words.push(item);
        chrome.storage.local.set({ words: o.words }, () => { pop.querySelector('button').textContent = '✓ Сохранено'; });
      });
    };
  }, true);
})();
