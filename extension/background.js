// Translation proxy (avoids CORS in content script)
async function translate(text, tl) {
  const u = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&tl=' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(text);
  try { const j = await (await fetch(u)).json(); const t = (j[0] || []).map(x => x[0]).join(''); if (t) return t; } catch (e) { }
  try { const j = await (await fetch('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(text))).json(); const x = j[0]; const t = Array.isArray(x) ? x[0] : x; if (t) return t; } catch (e) { }
  const j = await (await fetch('https://api.mymemory.translated.net/get?langpair=en|' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(text.slice(0, 480)))).json();
  return j.responseData ? j.responseData.translatedText : '';
}
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg.type === 'translate') {
    translate(msg.text, msg.tl).then(t => send({ ok: true, text: t })).catch(e => send({ ok: false, error: String(e) }));
    return true;
  }
});

// Transcript fetch for the Lingua web app (no CORS limits in the extension)
const IT_CLIENTS = [
  { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30, hl: 'en' },
  { clientName: 'IOS', clientVersion: '20.10.4', deviceModel: 'iPhone16,2', hl: 'en' }
];
function parseTimed(t) {
  t = (t || '').trim(); if (!t) return [];
  if (t[0] === '{') return (JSON.parse(t).events || []).filter(e => e.segs).map(e => ({ s: e.tStartMs / 1000, text: e.segs.map(x => x.utf8).join('').replace(/\n/g, ' ').trim() })).filter(c => c.text);
  const out = []; const re = /<p t="(\d+)"[^>]*>([\s\S]*?)<\/p>/g; let m;
  while ((m = re.exec(t))) out.push({ s: +m[1] / 1000, text: m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim() });
  return out.filter(c => c.text);
}
async function getTranscript(id) {
  for (const client of IT_CLIENTS) {
    try {
      const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: { client }, videoId: id }) });
      const tracks = (((await r.json()).captions || {}).playerCaptionsTracklistRenderer || {}).captionTracks || [];
      if (!tracks.length) continue;
      const en = tracks.filter(t => /^en/.test(t.languageCode));
      const tr = en.find(t => t.kind !== 'asr') || en.find(t => t.kind === 'asr') || tracks.find(t => t.kind === 'asr') || tracks[0];
      const cues = parseTimed(await (await fetch(tr.baseUrl.replace(/&fmt=[^&]*/, '') + '&fmt=json3', { credentials: 'omit' })).text());
      if (cues.length) return cues;
    } catch (e) { }
  }
  return null;
}
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg.type === 'transcript') { getTranscript(msg.id).then(cues => send({ cues })); return true; }
});
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg.type !== 'fetch') return;
  let u; try { u = new URL(msg.url); } catch (e) { send({}); return; }
  const yt = /(^|\.)youtube\.com$/.test(u.hostname) && (u.pathname.startsWith('/feeds/') || u.pathname.startsWith('/@') || u.pathname.startsWith('/channel/'));
  const rss = /^https:$/.test(u.protocol) && !yt && /rss|feed|xml|podcast/i.test(u.href);
  if (!yt && !rss) { send({}); return; }
  fetch(u.href, { credentials: 'omit' }).then(r => r.text()).then(text => send({ text: text.slice(0, 5e6) })).catch(() => send({}));
  return true;
});
