// Runs on the Lingua web app: pushes words saved in the extension into the page
function push() { chrome.storage.local.get({ words: [] }, o => window.postMessage({ source: 'lingua-ext', words: o.words }, location.origin)); }
push();
chrome.storage.onChanged.addListener(c => { if (c.words) push(); });
