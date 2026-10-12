// Page context: exposes caption tracks and captures the timedtext the player itself downloads (has PO token)
(function () {
  if (window.__linguaInj) return; window.__linguaInj = true;
  const post = (url, text) => { try { const u = new URL(url, location.href); window.postMessage({ source: 'lingua-timedtext', videoId: u.searchParams.get('v'), lang: u.searchParams.get('lang') || '', kind: u.searchParams.get('kind') || '', tlang: u.searchParams.get('tlang') || '', text }, '*'); } catch (e) { } };
  const of = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url;
    const pr = of.apply(this, arguments);
    if (url && url.includes('/api/timedtext')) pr.then(r => r.clone().text().then(t => post(url, t))).catch(() => { });
    return pr;
  };
  const oo = XMLHttpRequest.prototype.open, os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, url) { this.__lu = String(url); return oo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () { if (this.__lu && this.__lu.includes('/api/timedtext')) this.addEventListener('load', () => { try { post(this.__lu, this.responseText); } catch (e) { } }); return os.apply(this, arguments); };
  function info() {
    const p = document.getElementById('movie_player');
    const pr = (p && p.getPlayerResponse && p.getPlayerResponse()) || window.ytInitialPlayerResponse;
    const tracks = (pr && pr.captions && pr.captions.playerCaptionsTracklistRenderer && pr.captions.playerCaptionsTracklistRenderer.captionTracks) || [];
    return { p, vid: pr && pr.videoDetails && pr.videoDetails.videoId, tracks };
  }
  function send() {
    const { vid, tracks } = info();
    window.postMessage({ source: 'lingua-inject', videoId: vid, tracks: tracks.map(t => ({ baseUrl: t.baseUrl, lang: t.languageCode, kind: t.kind || '' })) }, '*');
  }
  // ask the player to load captions (prefers manual English, then auto English)
  function enableCaptions() {
    const { p, tracks } = info(); if (!p || !tracks.length || !p.setOption) return;
    const en = tracks.filter(t => /^en/.test(t.languageCode)); const t = en.find(x => x.kind !== 'asr') || en[0] || tracks.find(x => x.kind !== 'asr') || tracks[0];
    try { p.loadModule && p.loadModule('captions'); p.setOption('captions', 'track', { languageCode: t.languageCode, kind: t.kind || undefined }); } catch (e) { }
  }
  window.addEventListener('message', e => {
    if (!e.data) return;
    if (e.data.source === 'lingua-req') send();
    if (e.data.source === 'lingua-enable-cc') enableCaptions();
  });
  send();
})();
