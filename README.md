# Фото Клуб Кърджали — Клуб по фотография към ЦПЛР-ОДК Кърджали

Тъмна, минималистична витрина за фотографски клуб, с 3D фон от камера, която
се "разглобява" на части докато потребителят скролва.

## Стек

- HTML5 + Tailwind CSS (CDN) + Vanilla JavaScript (ES модули)
- Three.js (GLTFLoader) за 3D сцената
- GSAP + ScrollTrigger за анимацията при скрол
- Firebase Auth + Firestore + Storage за автентикация и съдържание
- GitHub Pages за хостинг (статичен сайт, без build стъпка)

## Структура на проекта

```
index.html                Начало (hero, за нас, преглед на галерия/новини, вход)
gallery.html              Пълна галерия — пагинация + lightbox преглед
news.html                 Пълен фийд Новини и Истории — филтър по тип
contact.html              Контакти — форма (записва в Firestore) + карта
privacy.html              Политика за поверителност (вкл. секция "Бисквитки")
terms.html                Условия за ползване
404.html                  Custom "страница не е намерена" (GitHub Pages я ползва автоматично)
admin.html                Администраторски панел (защитен)
css/style.css             Малък custom CSS слой върху Tailwind
js/firebase-config.js     Firebase инициализация + списък с админ имейли
js/scene.js               Three.js "exploded camera" сцена, движена от скрола (само index.html)
js/cookies.js             Банер за съгласие с бисквитки (localStorage, всички страници)
js/app.js                 Споделена логика (нав, вход/регистрация, преглед на feed-ове)
js/gallery-page.js        Логика само за gallery.html (пагинация, lightbox)
js/news-page.js           Логика само за news.html (пълен фийд, филтър)
js/contact-page.js        Логика само за contact.html (изпращане на форма)
js/admin.js               CRUD логика на админ панела (вкл. модул "Съобщения")
firebase/firestore.rules  Firestore security rules (вкл. колекция "messages")
firebase/storage.rules    Storage security rules
assets/models/camera.glb  3D модел на камерата (виж assets/models/README.md)
```

Всяка страница освен `admin.html` и `404.html` споделя един и същ header/footer
и включва `js/cookies.js` + `js/app.js` за консистентна навигация, состояние на
вход и банер за бисквитки. Само `index.html` зарежда Three.js/GSAP — другите
страници нарочно не носят тежестта на 3D сцената.

## 1. Настройка на Firebase

1. Създайте проект в [Firebase Console](https://console.firebase.google.com/).
2. Добавете уеб приложение и копирайте конфигурацията в
   `js/firebase-config.js` (обектът `firebaseConfig`).
3. Включете **Authentication** → Sign-in method → Email/Password (и по избор Google).
4. Създайте **Firestore Database** (production mode).
5. Включете **Storage**.
6. Публикувайте правилата от `firebase/firestore.rules` и
   `firebase/storage.rules` (Firebase Console → Firestore/Storage → Rules,
   copy-paste и Publish; или чрез Firebase CLI: `firebase deploy --only firestore:rules,storage:rules`).

### Задаване на администратор

Най-лесният начин: добавете имейла на администратора в `ADMIN_EMAILS` в
`js/firebase-config.js` (масивът се използва и в `firestore.rules` /
`storage.rules` — дръжте ги синхронизирани). Регистрирайте се с този имейл
през сайта, след което той автоматично ще вижда линка "Админ панел" и ще има
достъп до `admin.html`.

За по-сигурен вариант в продукция: задайте custom claim `admin: true` през
Firebase Admin SDK / Cloud Function и превключете проверката в `js/admin.js`
да чете claim-а вместо имейл списъка (правилата вече поддържат и двата
варианта едновременно).

## 2. 3D модел на камерата

Поставете файл `camera.glb` в `assets/models/`. Вижте
[assets/models/README.md](assets/models/README.md) за очакваните имена на
мешовете (`Body`, `Lens`, `Sensor`, `Flash`). Докато няма реален модел, сайтът
автоматично показва процедурно генерирана камера-заместител, за да е видима
анимацията при скрол.

## 3. Локално стартиране

Статичен сайт е — просто отворете `index.html` през локален сървър (ES
модулите изискват http/https, не `file://`). Ако имате Node:

```bash
npx serve .
```

Или без Node, вграден PowerShell сървър (Windows):

```bash
powershell -File scripts/serve.ps1
```

## 4. GitHub Pages

1. Push-нете репото в GitHub.
2. Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `root`.
3. Сайтът ще е достъпен на `https://<потребител>.github.io/<repo>/`.
