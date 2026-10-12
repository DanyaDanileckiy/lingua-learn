#!/usr/bin/env python3
"""Real podcasts per language via iTunes Search API (feedUrl), verified by fetching the RSS. -> docs/data/podcasts.json"""
import json, os, urllib.request, urllib.parse, concurrent.futures as cf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q = {'en': ('US', ['learn english', 'ted talks', 'history', 'science']), 'es': ('ES', ['aprender español', 'historia', 'ciencia']), 'de': ('DE', ['deutsch lernen', 'nachrichten', 'wissen']),
     'fr': ('FR', ['apprendre le français', 'histoire', 'science']), 'it': ('IT', ['imparare italiano', 'storia', 'scienza']), 'pt': ('BR', ['aprender português', 'história', 'ciência']),
     'ja': ('JP', ['日本語 学習', 'ニュース', '歴史']), 'ko': ('KR', ['한국어 배우기', '뉴스', '역사']), 'zh': ('TW', ['學中文', '新聞', '歷史']), 'tr': ('TR', ['türkçe öğren', 'tarih', 'bilim']), 'ru': ('RU', ['русский язык', 'история', 'наука']), 'he': ('IL', ['עברית', 'היסטוריה', 'מדע', 'חדשות'])}
UA = {'User-Agent': 'Mozilla/5.0'}
def ok(feed):
    try: t = urllib.request.urlopen(urllib.request.Request(feed, headers=UA), timeout=20).read(400000).decode('utf-8', 'ignore'); return t.count('<item') >= 3 and '<enclosure' in t
    except Exception: return False
import sys
PATH = os.path.join(ROOT, 'docs', 'data', 'podcasts.json')
out = json.load(open(PATH, encoding='utf-8')) if os.path.exists(PATH) else {}
for lang, (cc, terms) in Q.items():
    if sys.argv[1:] and lang not in sys.argv[1:]: continue
    cands, seen = [], set()
    for t in terms:
        try: r = json.loads(urllib.request.urlopen('https://itunes.apple.com/search?media=podcast&limit=8&country=' + cc + '&term=' + urllib.parse.quote(t), timeout=20).read())
        except Exception: continue
        for x in r.get('results', []):
            if x.get('feedUrl') and x['feedUrl'] not in seen: seen.add(x['feedUrl']); cands.append({'title': x['collectionName'], 'author': x.get('artistName', ''), 'feed': x['feedUrl'], 'image': x.get('artworkUrl100', ''), 'genre': x.get('primaryGenreName', '')})
    with cf.ThreadPoolExecutor(8) as ex: good = [c for c, g in zip(cands, ex.map(lambda c: ok(c['feed']), cands)) if g]
    out[lang] = good[:10]; print(lang, len(cands), '->', len(out[lang]), flush=True)
os.makedirs(os.path.join(ROOT, 'docs', 'data'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'docs', 'data', 'podcasts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
