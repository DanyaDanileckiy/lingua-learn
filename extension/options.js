const sel = document.getElementById('tl');
chrome.storage.sync.get({ targetLang: 'ru' }, o => sel.value = o.targetLang);
sel.onchange = () => chrome.storage.sync.set({ targetLang: sel.value }, () => document.getElementById('ok').textContent = '✓ Сохранено');
