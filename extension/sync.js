// Runs on the Lingua web app: pushes words saved in the extension into the page
function push() { chrome.storage.local.get({ words: [] }, o => window.postMessage({ source: 'lingua-ext', words: o.words }, location.origin)); }
push();
chrome.storage.onChanged.addListener(c => { if (c.words) push(); });
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || e.data.source !== 'lingua-req-transcript') return;
  chrome.runtime.sendMessage({ type: 'transcript', id: e.data.id }, r => window.postMessage({ source: 'lingua-ext-transcript', rid: e.data.rid, cues: r && r.cues }, location.origin));
});
