function render() {
  chrome.storage.local.get({ words: [] }, ({ words }) => {
    document.getElementById('n').textContent = words.length;
    const ul = document.getElementById('list'); ul.innerHTML = '';
    words.slice().reverse().forEach(w => {
      const li = document.createElement('li');
      li.innerHTML = '<button class="x">✕</button><b></b> — <span></span><br><a target="_blank">▶ видео</a>';
      li.querySelector('b').textContent = w.word; li.querySelector('span').textContent = w.translation;
      li.querySelector('a').href = w.videoUrl;
      li.querySelector('.x').onclick = () => chrome.storage.local.set({ words: words.filter(x => x.id !== w.id) }, render);
      ul.appendChild(li);
    });
  });
}
document.getElementById('exp').onclick = () => chrome.storage.local.get({ words: [] }, ({ words }) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' }));
  a.download = 'lingua-words.json'; a.click();
});
document.getElementById('opt').onclick = () => chrome.runtime.openOptionsPage();
render();
