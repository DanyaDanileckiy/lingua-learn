// Runs in page context: exposes caption tracks from player response
(function () {
  function send() {
    try {
      const p = document.getElementById('movie_player');
      const pr = (p && p.getPlayerResponse && p.getPlayerResponse()) || window.ytInitialPlayerResponse;
      const tracks = pr && pr.captions && pr.captions.playerCaptionsTracklistRenderer && pr.captions.playerCaptionsTracklistRenderer.captionTracks || [];
      window.postMessage({ source: 'lingua-inject', videoId: pr && pr.videoDetails && pr.videoDetails.videoId, tracks: tracks.map(t => ({ baseUrl: t.baseUrl, lang: t.languageCode, kind: t.kind || '' })) }, '*');
    } catch (e) { }
  }
  window.addEventListener('message', e => { if (e.data && e.data.source === 'lingua-req') send(); });
  send();
})();
