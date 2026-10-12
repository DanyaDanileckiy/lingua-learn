// Translation proxy (avoids CORS in content script)
async function translate(text, tl) {
  const u = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&tl=' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(text);
  const r = await fetch(u);
  const j = await r.json();
  return (j[0] || []).map(x => x[0]).join('');
}
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg.type === 'translate') {
    translate(msg.text, msg.tl).then(t => send({ ok: true, text: t })).catch(e => send({ ok: false, error: String(e) }));
    return true;
  }
});
