# HDRezka mirror: ad cleaner

Userscript, убирающий рекламу (VAST-ролики, попапы, рекламные скрипты/iframe) на зеркале `wandavision-hdrezka.net`.

## Установка

Скрипт нужно класть в расширение для пользовательских скриптов — **User JavaScript and CSS** (или любое аналогичное: Tampermonkey, Violentmonkey).

### User JavaScript and CSS (Chrome)

1. Установить расширение [User JavaScript and CSS](https://chromewebstore.google.com/detail/user-javascript-and-css/nbhcbdghjpllgmfilhnhkllmkecfmpld).
2. Открыть расширение → **New rule** (Добавить правило).
3. В поле URL указать: `*://wandavision-hdrezka.net/*`
4. Во вкладку **JS** вставить содержимое файла [`hdrezka-adblock.user.js`](./hdrezka-adblock.user.js).
5. Сохранить (**Save**), обновить страницу сайта.

### Tampermonkey / Violentmonkey

Создать новый скрипт, вставить содержимое `hdrezka-adblock.user.js`, сохранить. Шапка `==UserScript==` уже содержит нужный `@match` и `@run-at document-start`.

## Проверка

Открыть DevTools → Console: при работе скрипта появляются сообщения с префиксом `[AB]`.

## Важно

Домены `voidboost` и `voidaxel` отдают сами серии — не добавляйте их в список `AD_HOSTS`.
