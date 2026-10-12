// Lingua Worker: YouTube transcripts, translation and feed proxy for the Lingua site.
const ALLOWED = [/^https:\/\/danyadanileckiy\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const CLIENTS = [
  { ctx: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30, hl: 'en', gl: 'US' }, ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip' },
  { ctx: { clientName: 'IOS', clientVersion: '20.10.4', deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '18.3.2.22D82', hl: 'en', gl: 'US' }, ua: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)' },
  { ctx: { clientName: 'ANDROID_VR', clientVersion: '1.62.27', androidSdkVersion: 32, hl: 'en', gl: 'US' }, ua: 'com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L) gzip' },
  { ctx: { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'en', gl: 'US' }, ua: 'Mozilla/5.0' , embed: true },
  { ctx: { clientName: 'WEB_EMBEDDED_PLAYER', clientVersion: '1.20250101.00.00', hl: 'en', gl: 'US' }, ua: 'Mozilla/5.0', embed: true }
];
function cors(req) {
  const o = req.headers.get('Origin') || '';
  return ALLOWED.some(r => r.test(o)) ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET,OPTIONS' } : {};
}
const json = (req, data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors(req), extra) });
function parseTimed(t) {
  t = (t || '').trim(); if (!t) return [];
  if (t[0] === '{') return (JSON.parse(t).events || []).filter(e => e.segs).map(e => ({ s: e.tStartMs / 1000, d: (e.dDurationMs || 0) / 1000, text: e.segs.map(x => x.utf8).join('').replace(/\n/g, ' ').trim() })).filter(c => c.text);
  const out = []; const re = /<p t="(\d+)"(?: d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g; let m;
  const dec = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  while ((m = re.exec(t))) out.push({ s: +m[1] / 1000, d: +(m[2] || 0) / 1000, text: dec(m[3]) });
  return out.filter(c => c.text);
}
function pick(tracks, lang) {
  const want = tracks.filter(t => t.languageCode.startsWith(lang));
  return want.find(t => t.kind !== 'asr') || want.find(t => t.kind === 'asr') || tracks.find(t => t.kind === 'asr') || tracks.find(t => t.kind !== 'asr') || tracks[0];
}
const WEB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
const COOKIE = 'CONSENT=YES+cb; SOCS=CAI; PREF=hl=en&gl=US';
async function tracksToCues(tracks, lang, ua) {
  const tr = pick(tracks, lang); const base = tr.baseUrl.replace(/&fmt=[^&]*/, '');
  for (const fmt of ['json3', 'srv3']) {
    const tt = await (await fetch((base.startsWith('http') ? base : 'https://www.youtube.com' + base) + '&fmt=' + fmt, { headers: { 'User-Agent': ua } })).text();
    const cues = parseTimed(tt); if (cues.length) return { cues, lang: tr.languageCode, kind: tr.kind || 'manual' };
  }
  return null;
}
async function viaPlayer(id, lang, tried, visitorData) {
  for (const c of CLIENTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const body = { context: { client: Object.assign({}, c.ctx, visitorData ? { visitorData } : {}) }, videoId: id, contentCheckOk: true, racyCheckOk: true };
        if (c.embed) body.context.thirdParty = { embedUrl: 'https://www.youtube.com/' };
        const headers = { 'Content-Type': 'application/json', 'User-Agent': c.ua, 'X-Goog-Api-Format-Version': '2' };
        if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;
        const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', { method: 'POST', headers, body: JSON.stringify(body) });
        const txt = await r.text(); let j; try { j = JSON.parse(txt); } catch (e) { tried.push(c.ctx.clientName + ':' + r.status + ':html'); break; }
        const tracks = j.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        const st = j.playabilityStatus?.status; tried.push(c.ctx.clientName + (visitorData ? '+vd' : '') + ':' + st + ':' + tracks.length);
        if (!tracks.length) { if (st === 'LOGIN_REQUIRED') continue; break; }
        const out = await tracksToCues(tracks, lang, c.ua);
        if (out) return Object.assign(out, { client: c.ctx.clientName, title: j.videoDetails?.title, author: j.videoDetails?.author });
        tried.push('empty-track'); break;
      } catch (e) { tried.push(c.ctx.clientName + ':err:' + e.message); break; }
    }
  }
  return null;
}
function extractJSON(html, marker) {
  const i = html.indexOf(marker); if (i < 0) return null; let j = html.indexOf('{', i), depth = 0, inStr = false, esc = false;
  for (let k = j; k < html.length; k++) { const ch = html[k];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { if (--depth === 0) { try { return JSON.parse(html.slice(j, k + 1)); } catch (e) { return null; } } } }
  return null;
}
async function viaWatchPage(id, lang, tried) {
  const r = await fetch('https://www.youtube.com/watch?v=' + id + '&hl=en&bpctr=9999999999&has_verified=1', { headers: { 'User-Agent': WEB_UA, 'Accept-Language': 'en-US,en;q=0.9', 'Cookie': COOKIE } });
  const html = await r.text();
  const visitorData = (html.match(/"VISITOR_DATA":"([^"]+)"/) || [])[1];
  const cver = (html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1] || '2.20250312.04.00';
  const pr = extractJSON(html, 'ytInitialPlayerResponse = ');
  const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  tried.push('watch:' + r.status + ':' + (pr?.playabilityStatus?.status) + ':' + tracks.length + (visitorData ? ':vd' : ''));
  const meta = { title: pr?.videoDetails?.title, author: pr?.videoDetails?.author };
  // get_transcript using params from the page
  const params = (html.match(/"getTranscriptEndpoint":\{"params":"([^"]+)"/) || [])[1];
  if (params) {
    try {
      const gr = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': WEB_UA, 'Cookie': COOKIE, ...(visitorData ? { 'X-Goog-Visitor-Id': visitorData } : {}) }, body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: cver, hl: 'en', gl: 'US', visitorData } }, params }) });
      const gj = await gr.json(); const out = [];
      (function walk(o) { if (!o || typeof o !== 'object') return; if (o.transcriptSegmentRenderer) { const s = o.transcriptSegmentRenderer; const text = (s.snippet?.runs || []).map(x => x.text).join('').replace(/\s+/g, ' ').trim(); if (text) out.push({ s: +s.startMs / 1000, d: (+s.endMs - +s.startMs) / 1000, text }); return; } for (const v of Object.values(o)) walk(v); })(gj);
      tried.push('get_transcript:' + gr.status + ':' + out.length);
      if (out.length) return Object.assign({ cues: out, lang: 'en', kind: 'transcript', client: 'get_transcript' }, meta);
    } catch (e) { tried.push('get_transcript:err'); }
  } else tried.push('get_transcript:no-params');
  if (tracks.length) { const out = await tracksToCues(tracks, lang, WEB_UA); if (out) return Object.assign(out, { client: 'watch' }, meta); tried.push('watch-tracks-empty'); }
  return { visitorData, meta };
}
const PIPED = ['https://api.piped.private.coffee', 'https://pipedapi.ducks.party'];
async function viaPiped(id, lang, tried) {
  for (const base of PIPED) {
    try { const d = await (await fetch(base + '/streams/' + id)).json(); const subs = d.subtitles || []; tried.push('piped:' + subs.length);
      if (!subs.length) continue; const want = subs.filter(x => x.code.startsWith(lang)); const sub = want.find(x => !x.autoGenerated) || want[0] || subs[0];
      const cues = parseTimed(await (await fetch(sub.url)).text()); if (cues.length) return { cues, lang: sub.code, kind: sub.autoGenerated ? 'asr' : 'manual', client: 'piped', title: d.title, author: d.uploader };
    } catch (e) { tried.push('piped:err'); }
  }
  return null;
}
async function transcript(id, lang) {
  const tried = [], clients = CLIENTS.slice(0, 3); // ANDROID, IOS, ANDROID_VR
  const t0 = Date.now();
  for (let round = 0; round < 6 && Date.now() - t0 < 20000; round++) {
    for (const c of clients) {
      try {
        const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': c.ua, 'X-Goog-Api-Format-Version': '2' }, body: JSON.stringify({ context: { client: c.ctx }, videoId: id, contentCheckOk: true, racyCheckOk: true }) });
        const j = await r.json(); const tracks = j.captions?.playerCaptionsTracklistRenderer?.captionTracks || []; const st = j.playabilityStatus?.status;
        tried.push(round + ':' + c.ctx.clientName + ':' + st + ':' + tracks.length);
        if (!tracks.length) { if (st === 'OK' || st === 'UNPLAYABLE' || st === 'ERROR') return { id, error: st === 'OK' ? 'video has no captions' : 'unavailable: ' + st, tried }; continue; }
        const out = await tracksToCues(tracks, lang, c.ua);
        if (out) return Object.assign({ id, client: c.ctx.clientName, attempts: tried.length, title: j.videoDetails?.title, author: j.videoDetails?.author }, out);
      } catch (e) { tried.push(c.ctx.clientName + ':err'); }
    }
    await new Promise(r => setTimeout(r, 300 + round * 200));
  }
  const p = await viaPiped(id, lang, tried); if (p) return Object.assign({ id }, p);
  return { id, error: 'blocked', tried };
}
async function translate(q, tl) {
  try { const j = await (await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&tl=' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(q))).json(); const t = (j[0] || []).map(x => x[0]).join(''); if (t) return t; } catch (e) { }
  try { const j = await (await fetch('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(q))).json(); const x = j[0]; const t = Array.isArray(x) ? x[0] : x; if (t) return t; } catch (e) { }
  try { const parts = []; for (const line of q.split('\n')) { const j = await (await fetch('https://api.mymemory.translated.net/get?langpair=en|' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(line.slice(0, 480)))).json(); parts.push(j.responseData ? j.responseData.translatedText : ''); } const t = parts.join('\n'); if (t.trim()) return t; } catch (e) { }
  return '';
}
function fetchAllowed(u) {
  if (u.protocol !== 'https:') return false;
  if (/(^|\.)youtube\.com$/.test(u.hostname)) return u.pathname.startsWith('/feeds/') || u.pathname.startsWith('/@') || u.pathname.startsWith('/channel/');
  return /rss|feed|podcast|\.xml/i.test(u.href); // podcast RSS
}
const HOSTS = ['www.youtube.com', 'youtubei.googleapis.com', 'www.youtube-nocookie.com', 'm.youtube.com'];
const EXTRA = [
  { ctx: { clientName: 'MWEB', clientVersion: '2.20250311.03.00', hl: 'en', gl: 'US' }, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  { ctx: { clientName: 'TVHTML5', clientVersion: '7.20250312.16.00', hl: 'en', gl: 'US' }, ua: 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version' },
  { ctx: { clientName: 'WEB_CREATOR', clientVersion: '1.20250312.03.01', hl: 'en', gl: 'US' }, ua: WEB_UA },
  { ctx: { clientName: 'ANDROID_MUSIC', clientVersion: '7.27.52', androidSdkVersion: 30, hl: 'en', gl: 'US' }, ua: 'com.google.android.apps.youtube.music/7.27.52 (Linux; U; Android 11) gzip' },
  { ctx: { clientName: 'ANDROID_CREATOR', clientVersion: '24.45.100', androidSdkVersion: 30, hl: 'en', gl: 'US' }, ua: 'com.google.android.apps.youtube.creator/24.45.100 (Linux; U; Android 11) gzip' }
];
async function debug(id) {
  const out = [];
  for (const host of HOSTS) for (const c of CLIENTS.concat(EXTRA)) {
    try { const r = await fetch('https://' + host + '/youtubei/v1/player?prettyPrint=false', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': c.ua }, body: JSON.stringify({ context: { client: c.ctx }, videoId: id, contentCheckOk: true, racyCheckOk: true }) });
      const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) { }
      out.push(host + ' ' + c.ctx.clientName + ' ' + r.status + ' ' + (j.playabilityStatus?.status || t.slice(0, 30)) + ' ' + (j.captions?.playerCaptionsTracklistRenderer?.captionTracks || []).length);
    } catch (e) { out.push(host + ' ' + c.ctx.clientName + ' err'); }
  }
  for (const u of ['https://video.google.com/timedtext?lang=en&v=' + id, 'https://www.youtube.com/api/timedtext?lang=en&v=' + id, 'https://www.youtube.com/api/timedtext?lang=en&kind=asr&v=' + id + '&fmt=json3', 'https://www.youtube.com/api/timedtext?type=list&v=' + id]) {
    try { const r = await fetch(u); const t = await r.text(); out.push(u.slice(8, 60) + ' ' + r.status + ' ' + t.length); } catch (e) { out.push(u + ' err'); }
  }
  return out;
}
export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    const url = new URL(req.url);
    if (!cors(req)['Access-Control-Allow-Origin'] && req.headers.get('Origin')) return json(req, { error: 'origin not allowed' }, 403);
    const cache = caches.default;
    if (url.pathname === '/transcript') {
      const id = url.searchParams.get('id') || '', lang = url.searchParams.get('lang') || 'en';
      if (!/^[\w-]{11}$/.test(id)) return json(req, { error: 'bad id' }, 400);
      const key = new Request('https://cache.lingua/transcript/' + id + '/' + lang);
      let hit = await cache.match(key); if (hit) { const r = new Response(hit.body, hit); Object.entries(cors(req)).forEach(([k, v]) => r.headers.set(k, v)); return r; }
      const data = await transcript(id, lang);
      const res = json(req, data, data.cues ? 200 : 404, { 'Cache-Control': data.cues ? 'public, max-age=86400' : 'no-store' });
      if (data.cues) ctx.waitUntil(cache.put(key, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } })));
      return res;
    }
    if (url.pathname === '/translate') {
      const q = (url.searchParams.get('q') || '').slice(0, 5000), tl = url.searchParams.get('tl') || 'ru';
      if (!q) return json(req, { error: 'empty' }, 400);
      return json(req, { text: await translate(q, tl) });
    }
    if (url.pathname === '/fetch') {
      let u; try { u = new URL(url.searchParams.get('url')); } catch (e) { return json(req, { error: 'bad url' }, 400); }
      if (!fetchAllowed(u)) return json(req, { error: 'url not allowed' }, 403);
      const r = await fetch(u.href, { headers: { 'User-Agent': 'Mozilla/5.0 (LinguaBot)' } });
      return new Response(r.body, { status: r.status, headers: Object.assign({ 'Content-Type': r.headers.get('Content-Type') || 'text/plain' }, cors(req)) });
    }
    return json(req, { ok: true, endpoints: ['/transcript?id=', '/translate?q=&tl=', '/fetch?url='] });
  }
};
