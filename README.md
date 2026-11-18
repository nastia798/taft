# Сайт «Тафт» — концепт

Многостраничный сайт на Vite (чистый JS), Three.js, GSAP и Leaflet. Весь текст на русском.
Внизу каждой страницы написано, что это концепт-проект, а не официальный сайт бренда.

---

**Адрес сайта:** https://nastia798.github.io/taft/
**Репозиторий:** https://github.com/nastia798/taft

Выкладка автоматическая: каждый `git push` в ветку `main` запускает workflow [deploy.yml](.github/workflows/deploy.yml). Он собирает сайт с `BASE_PATH=/taft/` и `SITE_URL=https://nastia798.github.io/taft` и публикует его на GitHub Pages.

**Обновить сайт после правок:**

```bash
cd ~/Desktop/курсовая/сайт
git add .
git commit -m "правки"
git push
```

Через 1–2 минуты изменения появятся на сайте (ход сборки виден во вкладке **Actions** репозитория).

---

## 1. Запуск на своём компьютере

Node.js уже стоит в `~/.local/node`. В новом окне Терминала:

```bash
export PATH="$HOME/.local/node/bin:$PATH"   # чтобы терминал нашёл Node
cd ~/Desktop/курсовая/сайт
npm run dev                                  # сайт откроется на http://localhost:5173
```

Чтобы не вводить первую строку каждый раз, добавь её в файл `~/.zprofile`.

Проверка готовой сборки: `npm run build`, затем `npm run preview` (http://localhost:4173).

---

## 2. Выкладка на GitHub Pages

Один раз в репозитории включи Pages: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Дальше всё делает `git push`.

Что делает workflow при каждой выкладке:

1. ставит зависимости (`npm ci`);
2. собирает сайт с адресом `https://nastia798.github.io/taft` (в `sitemap.xml`, canonical и Open Graph) и префиксом `/taft/` для всех ссылок;
3. публикует папку `dist` на GitHub Pages.

Проверить такую же сборку у себя:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/Desktop/курсовая/сайт
SITE_URL=https://nastia798.github.io/taft BASE_PATH=/taft/ npm run build
```

**Если поменяется адрес** (другой ник или имя репозитория), поправь две строки `BASE_PATH` и `SITE_URL` в [deploy.yml](.github/workflows/deploy.yml). Для адреса в корне домена (репозиторий `ник.github.io`) поставь `BASE_PATH: /` и `SITE_URL: https://ник.github.io`.

Если `git push` просит логин, введи ник GitHub, а вместо пароля **Personal access token** (*Settings → Developer settings → Personal access tokens → Tokens (classic)*, права `repo` и `workflow`). Связка ключей macOS запомнит его.

---

## 3. Где править данные (без кода)

| Что | Файл |
|---|---|
| Товары: названия, объёмы, цены, описания, применение | `src/data/products.json` |
| Магазины на карте (адреса, координаты, часы) | `src/data/stores.json` |
| Туториалы (видео, шаги) | `src/data/tutorials.json` |
| Вопросы и ответы (страница FAQ и чат стилиста) | `src/data/faq.json` |
| Соцсети, список магазинов для кнопки «Где купить», сноски | `src/data/site.json` |
| Цвета, шрифты, отступы | `src/styles/tokens.css` |
| Шапка, подвал, окна и виджеты | `src/partials/*.html` |

Страницы `catalog/`, `tutorialy/`, `faq/` и `novaya-upakovka/` создаются автоматически из этих файлов при `npm run dev` и `npm run build`. Руками их править не нужно: правки пропадут.

### Что осталось заполнить (TODO)

- **Цены** со значением `"TODO"` в `products.json`: «Лак без запаха», «Гель-воск „Блеск“» и все пять продуктов новой упаковки (концепт).
- **Адреса магазинов** — данные OpenStreetMap, в каждом есть пометка `check`. У части «Золотых Яблок» нет номера дома (магазины в торговых центрах).
- **Ссылки поиска** в Лавке и Самокате (`site.json → shops`): формат я составил сам, проверь, что поиск открывается.
- **Видео туториалов**: положи ролики в `public/video/tutorials/` и впиши путь в `tutorials.json → video`.
- **Фото** для блоков «до / после» и «укладка от вас» (сейчас заглушки «пример блока»).
- **Ники соцсетей** вымышленные: поменяй в `site.json → socials`.
- **Политика конфиденциальности:** название оператора и контактная почта (`TODO` в `politika-konfidencialnosti/index.html`).
- «Совет мастера» в туториалах: нет шагов.

---

## 3а. Аналитика (Яндекс Метрика 114348242)

- Код счётчика: [head.html](src/partials/head.html). Он подгружается после загрузки страницы и на localhost не включается. Включены Вебвизор, карта кликов, точный отказ и отслеживание ссылок.
- Цели и UTM-метки: [analytics.js](src/js/analytics.js). Цели заводятся в Метрике: *Цели → Добавить цель → JavaScript-событие*, идентификатор — как в таблице в ответе (`where_to_buy`, `marketplace_click` и т. д.).
- Ссылки на магазины получают `utm_source=taft_site&utm_medium=referral&utm_campaign=new_pack&utm_content=<код товара>`.
- Уведомление о cookie: [widgets.html](src/partials/widgets.html). Страница [политики конфиденциальности](politika-konfidencialnosti/index.html): впиши оператора и почту вместо `TODO`.

---

## 4. Как заменить 3D-флакон моделью из Blender

Сейчас флаконы строятся автоматически по силуэту рендеров упаковки. Если захочешь свою модель:

1. Собери флакон стоя, ось **Y вверх**, дно на нуле, масштаб любой (сайт приведёт к нужному размеру).
2. Назови меш корпуса `Body`, а крышки `Cap`: сайт сам наложит нужный материал и этикетку.
3. **File → Export → glTF 2.0 (.glb)**. В настройках включи *Apply Modifiers* и *+Y Up*, формат — **glTF Binary (.glb)**.
4. Сохрани файл как `public/models/taft-bottle.glb`.
5. В `src/data/bottle3d.json` поставь `"glb": true` и пересобери сайт.

Если файл не загрузится, сайт покажет обычный флакон — он не сломается.

---

## 5. Устройство и скорость

- Первая загрузка на медленном мобильном интернете: ≈ 4 с (с прелоадером), вес главной ≈ 650 КБ.
- Three.js (≈ 135 КБ в сжатом виде) подгружается после первого экрана; на слабых устройствах, при экономии трафика и `prefers-reduced-motion` вместо 3D показывается картинка.
- Кадры 3D рисуются, только пока флакон движется.
- Картинки — WebP с `srcset` и ленивой загрузкой; видео без звука и с ленивой загрузкой.
- `sitemap.xml`, `robots.txt`, canonical и Open Graph создаются при сборке по `SITE_URL` (GitHub Actions задаёт его сам).
