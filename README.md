<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:8b5cf6,100:3b82f6&height=140&section=header&text=Lingua&fontSize=48&fontColor=fff&fontAlignY=35" width="100%"/>

**Изучение языков по видео · MVP-клон Trancy**

[Русский](README.md) · [English](README.en.md)

[![Open Site](https://img.shields.io/badge/Открыть_сайт-8b5cf6?style=for-the-badge&logo=googlechrome&logoColor=white)](https://danyadanileckiy.github.io/lingua-learn/)
[![Download Extension](https://img.shields.io/badge/Скачать_расширение-3b82f6?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/DanyaDanileckiy/lingua-learn/raw/main/extension.zip)

</div>

---

## Прямые ссылки

| Что | Ссылка |
|-----|--------|
| **Веб-приложение** | [https://danyadanileckiy.github.io/lingua-learn/](https://danyadanileckiy.github.io/lingua-learn/) |
| **Chrome-расширение** | [Скачать extension.zip](https://github.com/DanyaDanileckiy/lingua-learn/raw/main/extension.zip) |
| **Cloudflare Worker** | [https://lingua.lingua-learn.workers.dev](https://lingua.lingua-learn.workers.dev) |

## Что это

**Lingua** — инструмент для изучения языков по видео (YouTube и др.). Включает:

- **Chrome-расширение** — двойные субтитры на YouTube, клик по слову → перевод и сохранение в словарь
- **Веб-приложение** — библиотека, плеер с транскриптом, словарь (SM-2), книги, AI Talk, подкасты

Все данные хранятся **локально** (без сервера и аккаунта).

## Установка расширения

1. Скачайте [extension.zip](https://github.com/DanyaDanileckiy/lingua-learn/raw/main/extension.zip) и распакуйте
2. Откройте `chrome://extensions` → включите «Режим разработчика»
3. «Загрузить распакованное» → выберите папку `extension`
4. Откройте видео на YouTube с субтитрами — появятся двойные субтитры

## Возможности веб-приложения

- Библиотека видео, подкастов, книг (.txt / .epub)
- Плеер с двуязычным кликабельным транскриптом
- Словарь с интервальным повторением SM-2 + готовые наборы (CEFR, IT, BEC)
- AI Talk (62 ролевых сценария), диктант, шэдоуинг
- Экспорт/импорт словаря

## Ограничения

- Перевод через неофициальный endpoint Google (gtx) — может ограничиваться
- Данные только локально (localStorage / chrome.storage)
- Без расширения транскрипты с YouTube могут не загружаться из-за CORS
- AI Talk — сценарные диалоги (без нейросети)

## Локальный запуск сайта

```bash
cd docs && python3 -m http.server 8000
# → http://localhost:8000
```

<div align="center">

**Сделано с ❤️ для любителей изучать языки по видео**

[![Site](https://img.shields.io/badge/Открыть_сайт-8b5cf6?style=for-the-badge)](https://danyadanileckiy.github.io/lingua-learn/)

</div>
