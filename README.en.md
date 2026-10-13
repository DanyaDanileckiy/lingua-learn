<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:8b5cf6,100:3b82f6&height=140&section=header&text=Lingua&fontSize=48&fontColor=fff&fontAlignY=35" width="100%"/>

**Learn languages from videos · Trancy-style MVP**

[Русский](README.md) · [English](README.en.md)

[![Open Site](https://img.shields.io/badge/Open_Site-8b5cf6?style=for-the-badge&logo=googlechrome&logoColor=white)](https://danyadanileckiy.github.io/lingua-learn/)
[![Download Extension](https://img.shields.io/badge/Download_Extension-3b82f6?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/DanyaDanileckiy/lingua-learn/raw/main/extension.zip)

</div>

---

## Direct links

| What | Link |
|------|------|
| **Web app** | [https://danyadanileckiy.github.io/lingua-learn/](https://danyadanileckiy.github.io/lingua-learn/) |
| **Chrome extension** | [Download extension.zip](https://github.com/DanyaDanileckiy/lingua-learn/raw/main/extension.zip) |
| **Cloudflare Worker** | [https://lingua.lingua-learn.workers.dev](https://lingua.lingua-learn.workers.dev) |

## What is it

**Lingua** is a tool for learning languages from videos (YouTube etc.). It includes:

- **Chrome extension** — dual subtitles on YouTube, click a word → translation and save to vocabulary
- **Web app** — library, player with transcript, vocabulary (SM-2), books, AI Talk, podcasts

All data stays **local** (no server or account).

## Install the extension

1. Download [extension.zip](https://github.com/DanyaDanileckiy/lingua-learn/raw/main/extension.zip) and unzip
2. Open `chrome://extensions` → enable Developer mode
3. “Load unpacked” → select the `extension` folder
4. Open a YouTube video with subtitles — dual subtitles will appear

## Web app features

- Video / podcast / book library (.txt / .epub)
- Player with bilingual clickable transcript
- Vocabulary with SM-2 spaced repetition + ready sets (CEFR, IT, BEC)
- AI Talk (62 role scenarios), dictation, shadowing
- Vocabulary export/import

## Limitations

- Translation via unofficial Google endpoint (gtx) — may be rate-limited
- Data is local only (localStorage / chrome.storage)
- Without the extension YouTube transcripts may fail due to CORS
- AI Talk is scripted dialogues (no neural network)

## Run the site locally

```bash
cd docs && python3 -m http.server 8000
# → http://localhost:8000
```

<div align="center">

**Made with ❤️ for people who learn languages from videos**

[![Site](https://img.shields.io/badge/Open_Site-8b5cf6?style=for-the-badge)](https://danyadanileckiy.github.io/lingua-learn/)

</div>
