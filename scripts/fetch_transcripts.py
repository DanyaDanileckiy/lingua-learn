#!/usr/bin/env python3
"""Pre-generate transcripts for curated videos: docs/transcripts/<id>.json
Usage: python3 scripts/fetch_transcripts.py [extra_video_ids...]  (needs yt-dlp)"""
import json, os, re, subprocess, sys, tempfile, time, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'transcripts')
os.makedirs(OUT, exist_ok=True)
ids = re.findall(r"\['([A-Za-z0-9_-]{11})',", open(os.path.join(ROOT, 'docs', 'data.js'), encoding='utf-8').read()) + sys.argv[1:]
force = os.environ.get('FORCE') == '1'
index = {}
for vid in dict.fromkeys(ids):
    dst = os.path.join(OUT, vid + '.json')
    if os.path.exists(dst) and not force:
        index[vid] = True; continue
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(['yt-dlp', '--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', 'en,en-US,en-GB,en-orig',
                        '--sub-format', 'json3', '--sleep-subtitles', '2', '-o', os.path.join(td, '%(id)s'), 'https://www.youtube.com/watch?v=' + vid],
                       capture_output=True, text=True)
        files = sorted(glob.glob(os.path.join(td, '*.json3')), key=lambda f: ('orig' in f, f))
        if not files:
            print('FAIL', vid); continue
        f = files[0]; ev = json.load(open(f, encoding='utf-8')).get('events', [])
        cues = []
        for e in ev:
            t = ''.join(s.get('utf8', '') for s in e.get('segs') or []).replace('\n', ' ').strip()
            if t: cues.append({'s': round(e.get('tStartMs', 0) / 1000, 2), 'd': round(e.get('dDurationMs', 0) / 1000, 2), 'text': t})
        # auto captions emit rolling duplicates; drop consecutive repeats
        cues = [c for i, c in enumerate(cues) if not i or c['text'] != cues[i - 1]['text']]
        json.dump({'id': vid, 'lang': os.path.basename(f).split('.')[-2], 'source': 'yt-dlp', 'cues': cues}, open(dst, 'w', encoding='utf-8'), ensure_ascii=False)
        index[vid] = True; print('OK', vid, len(cues)); time.sleep(3)
json.dump(sorted(index), open(os.path.join(OUT, 'index.json'), 'w'))
