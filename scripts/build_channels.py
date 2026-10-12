#!/usr/bin/env python3
"""Build docs/data/channels/<lang>.json: resolve seed handles via channel pages, fill thin categories via YouTube channel search.
Avatars cached to docs/data/avatars/<channelId>.jpg"""
import html as H_, json, os, re, sys, time, urllib.request, urllib.parse, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__)); from channel_seeds import SEEDS
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'data', 'channels'); AV = os.path.join(ROOT, 'docs', 'data', 'avatars')
os.makedirs(OUT, exist_ok=True); os.makedirs(AV, exist_ok=True)
H = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/135 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', 'Cookie': 'CONSENT=YES+cb; SOCS=CAI'}
GL = {'en': 'US', 'es': 'ES', 'de': 'DE', 'fr': 'FR', 'it': 'IT', 'pt': 'BR', 'ja': 'JP', 'ko': 'KR', 'zh': 'TW', 'tr': 'TR', 'ru': 'RU'}
CATS = {'vlog': 'vlog', 'animation': 'animation cartoon', 'music': 'music', 'film': 'movie review', 'food': 'cooking recipes', 'travel': 'travel', 'tech': 'technology reviews', 'ai': 'artificial intelligence', 'science': 'science', 'education': 'education lessons', 'psychology': 'psychology', 'career': 'career business', 'art': 'drawing art', 'history': 'history', 'sport': 'football sport', 'health': 'health doctor', 'news': 'news', 'interview': 'interview podcast', 'lectures': 'lectures university', 'entertainment': 'entertainment comedy', 'games': 'gaming lets play', 'minecraft': 'minecraft', 'urbex': 'abandoned places paranormal'}
MIN_SEED, MIN_SEARCH, PER_CAT = 20000, 50000, 2

def get(url, tries=3):
    for i in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=25).read().decode('utf-8', 'ignore')
        except Exception as e:
            if i == tries - 1: return ''
            time.sleep(2 + i * 3)
def num(t):
    m = re.match(r'([\d.,]+)\s*([KMB]?)', t or ''); 
    if not m: return 0
    v = float(m.group(1).replace(',', '')); return int(v * {'': 1, 'K': 1e3, 'M': 1e6, 'B': 1e9}[m.group(2)])
def resolve(path):
    h = get('https://www.youtube.com/' + path + ('&' if '?' in path else '?') + 'hl=en&gl=US')
    m = re.search(r'"externalId":"(UC[\w-]{22})"', h) or re.search(r'"channelId":"(UC[\w-]{22})"', h)
    if not m: return None
    t = re.search(r'<meta property="og:title" content="([^"]+)"', h); img = re.search(r'<meta property="og:image" content="([^"]+)"', h)
    subs = re.search(r'"content":"([\d.,]+[KMB]?) subscribers?"', h); vids = re.search(r'"content":"([\d.,]+[KMB]?) videos?"', h)
    handle = re.search(r'"canonicalBaseUrl":"/(@[^"]+)"', h) or re.search(r'<link rel="canonical" href="https://www.youtube.com/(@[^"]+)"', h)
    d = re.search(r'<meta property="og:description" content="([^"]*)"', h)
    return {'desc': H_.unescape(d.group(1))[:300] if d else '', 'id': m.group(1), 'name': H_.unescape(t.group(1)) if t else path, 'handle': urllib.parse.unquote(handle.group(1)) if handle else '', 'avatarRemote': img.group(1) if img else '', 'subs': subs.group(1) if subs else '', 'subsN': num(subs.group(1)) if subs else 0, 'videos': vids.group(1) if vids else '', 'videosN': num(vids.group(1)) if vids else 0}
def translate(q, tl):
    if tl == 'en': return q
    try: j = json.loads(get('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=' + tl + '&q=' + urllib.parse.quote(q))); x = j[0]; return x[0] if isinstance(x, list) else x
    except Exception: return q
def detect(text):
    if not text.strip(): return ''
    try: j = json.loads(get('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=en&q=' + urllib.parse.quote(text[:300]))); return j[0][1] if isinstance(j[0], list) else ''
    except Exception: return ''
EXTRA_Q = {'ru': {'urbex': ['заброшки', 'паранормальное'], 'minecraft': ['майнкрафт летсплей'], 'music': ['русская музыка клипы']}, 'de': {'urbex': ['lost places deutschland', 'paranormal deutsch'], 'entertainment': ['comedy deutsch']},
  'ko': {'urbex': ['폐가 체험', '흉가 미스터리'], 'minecraft': ['마인크래프트']}, 'it': {'urbex': ['luoghi abbandonati', 'paranormale italia'], 'entertainment': ['comici italiani']}, 'zh': {'urbex': ['廢墟探險', '靈異', '鬼故事'], 'tech': ['科技 開箱', '3C 評測'], 'vlog': ['台灣 vlog', '日常 vlog'], 'entertainment': ['搞笑 台灣', '綜藝'], 'games': ['遊戲實況'], 'minecraft': ['麥塊', '我的世界'], 'ai': ['人工智慧 AI 教學'], 'music': ['華語 MV'], 'food': ['美食 台灣'], 'travel': ['旅遊 台灣'], 'education': ['教學 知識'], 'history': ['歷史 故事'], 'science': ['科普']},
  'tr': {'urbex': ['terk edilmiş yerler', 'paranormal türkçe'], 'games': ['oyun türkçe']}, 'fr': {'urbex': ['urbex france', 'paranormal français'], 'minecraft': ['minecraft français']}, 'es': {'urbex': ['lugares abandonados', 'paranormal español'], 'tech': ['tecnología reseñas español']},
  'pt': {'urbex': ['lugares abandonados brasil']}, 'ja': {'urbex': ['廃墟 探索', '心霊スポット']}, 'en': {}}
def search(q, lang):
    h = get('https://www.youtube.com/results?search_query=' + urllib.parse.quote(q) + '&sp=EgIQAg%253D%253D&hl=' + lang + '&gl=' + GL[lang])
    m = re.search(r'var ytInitialData = (\{.*?\});</script>', h, re.S)
    if not m: return []
    out = []
    def walk(o):
        if isinstance(o, dict):
            if 'channelRenderer' in o: out.append(o['channelRenderer']['channelId']); return
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(json.loads(m.group(1))); return out[:6]
def avatar(c):
    p = os.path.join(AV, c['id'] + '.jpg')
    if not os.path.exists(p) and c['avatarRemote']:
        u = re.sub(r'=s\d+[^?]*', '=s88-c-k-c0x00ffffff-no-rj', c['avatarRemote'])
        try: open(p, 'wb').write(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=20).read())
        except Exception: pass
    c['avatar'] = 'data/avatars/' + c['id'] + '.jpg' if os.path.exists(p) else c['avatarRemote']
def norm(x): return re.sub(r'[^0-9a-z]', '', x.lower())
def resolve_seed(handle, lang):
    c = resolve('@' + handle)
    if c and c['subsN'] >= MIN_SEED: return c
    key = norm(handle)[:5]
    if len(key) < 4: return c
    for cid in search(handle.replace('_', ' '), lang)[:3]:
        d = resolve('channel/' + cid)
        if d and d['subsN'] >= 100000 and (key in norm(d['name']) or key in norm(d['handle'])): return d
    return c
def build(lang):
    seeds = SEEDS[lang]; res = []; seen = set()
    with cf.ThreadPoolExecutor(6) as ex:
        for (handle, cat), c in zip(seeds, ex.map(lambda s: resolve_seed(s[0], lang), seeds)):
            if c and c['subsN'] >= MIN_SEED and c['id'] not in seen: seen.add(c['id']); c['cat'] = cat; c['source'] = 'seed'; res.append(c)
            else: print(lang, 'drop', handle, c and c['subsN'])
    for per, cat, term in [(PER_CAT, c, t) for c, t in CATS.items()] + [(3, c, t) for c, t in CATS.items()]:
        have = sum(1 for c in res if c['cat'] == cat)
        if have >= per or (per > PER_CAT and len(res) >= 35): continue
        for q in EXTRA_Q.get(lang, {}).get(cat, []) + [translate(term, 'zh-TW' if lang == 'zh' else lang)]:
            if have >= per: break
            ids = [i for i in search(q, lang) if i not in seen]
            with cf.ThreadPoolExecutor(6) as ex: cands = list(ex.map(lambda i: resolve('channel/' + i), ids))
            cands = [c for c in cands if c and c['subsN'] >= MIN_SEARCH]
            with cf.ThreadPoolExecutor(6) as ex: langs = list(ex.map(lambda c: detect(c['name'] + '. ' + c['desc']), cands))
            for c, dl in sorted(zip(cands, langs), key=lambda x: -x[0]['subsN']):
                if have >= per: break
                if not dl.lower().startswith(lang[:2]) and not (lang == 'zh' and dl.startswith('zh')): continue
                seen.add(c['id']); c['cat'] = cat; c['source'] = 'search:' + q; res.append(c); have += 1
    with cf.ThreadPoolExecutor(8) as ex: list(ex.map(avatar, res))
    for c in res: c.pop('avatarRemote', None); c.pop('desc', None)
    res.sort(key=lambda c: -c['subsN'])
    json.dump({'lang': lang, 'updated': time.strftime('%Y-%m-%d'), 'channels': res}, open(os.path.join(OUT, lang + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    cats = {}; [cats.__setitem__(c['cat'], cats.get(c['cat'], 0) + 1) for c in res]
    print('DONE', lang, len(res), cats, flush=True)
for lang in (sys.argv[1:] or SEEDS): build(lang)
