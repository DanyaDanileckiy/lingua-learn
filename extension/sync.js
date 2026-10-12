// Runs on the Lingua web app: pushes words saved in the extension into the page and serves transcript requests
function push() { chrome.storage.local.get({ words: [] }, o => window.postMessage({ source: 'lingua-ext', words: o.words }, location.origin)); }
chrome.storage.onChanged.addListener(c => { if (c.words) push(); });
window.addEventListener('message', e => {
  if (e.source !== window || !e.data) return;
  if (e.data.source === 'lingua-hello') push();
  if (e.data.source === 'lingua-req-transcript') chrome.runtime.sendMessage({ type: 'transcript', id: e.data.id }, r => window.postMessage({ source: 'lingua-ext-transcript', rid: e.data.rid, cues: r && r.cues }, location.origin));
});
document.documentElement.dataset.linguaExt = '1';
push(); window.addEventListener('load', push);
