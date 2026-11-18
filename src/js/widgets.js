// Общие виджеты: «Спроси стилиста», pop-up с пробником, счётчик находок (пасхалки).
import faq from '../data/faq.json';
import { load, save } from './storage.js';
import { goal } from './analytics.js';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ================= Спроси стилиста ================= */
function initStylist() {
  const fab = document.querySelector('[data-stylist-open]');
  const box = document.getElementById('stylist');
  if (!fab || !box) return;
  const log = box.querySelector('[data-stylist-log]');
  const chips = box.querySelector('[data-stylist-chips]');
  const form = box.querySelector('[data-stylist-form]');
  let started = false;

  const bubble = (who, html) => {
    const b = document.createElement('div');
    b.className = `msg msg--${who}`;
    b.innerHTML = html;
    log.append(b);
    log.scrollTop = log.scrollHeight;
    return b;
  };
  const answer = (item) => {
    bubble('me', esc(item.q));
    const typing = bubble('bot', '<span class="typing" aria-label="Стилист печатает"><i></i><i></i><i></i></span>');
    setTimeout(() => {
      typing.innerHTML = esc(item.a) + (item.link ? ` <a href="${BASE}${item.link[1]}">${esc(item.link[0])} →</a>` : '');
      log.scrollTop = log.scrollHeight;
    }, reduced() ? 0 : 650);
  };
  const renderChips = () => {
    const top = ['chto-takoe-teksturajzer', 'kak-nanosit-teksturajzer', 'skleit-li', 'cifra-fiksacii', 'novaya-upakovka', 'povrezhdennye', 'gde-kupit'];
    chips.innerHTML = top.map((id) => faq.items.find((f) => f.id === id)).filter(Boolean)
      .map((f) => `<button type="button" class="chip chip--sm" data-q="${f.id}">${esc(f.q)}</button>`).join('')
      + '<button type="button" class="chip chip--sm chip--ask" data-q="__ask">Другой вопрос…</button>';
  };
  const open = (state) => {
    box.hidden = !state;
    fab.setAttribute('aria-expanded', String(state));
    document.body.classList.toggle('stylist-open', state);
    if (state) goal('stylist_open');
    if (state && !started) {
      started = true;
      bubble('bot', 'Привет! Я стилист Тафт. Выбери вопрос — отвечу сразу. Или задай свой.');
      renderChips();
    }
    if (state) box.querySelector('.chip, .stylist__close')?.focus();
    else fab.focus();
  };
  fab.addEventListener('click', () => open(box.hidden));
  box.querySelector('[data-stylist-close]').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) open(false); });
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    if (b.dataset.q === '__ask') { form.hidden = false; form.querySelector('input').focus(); return; }
    answer(faq.items.find((f) => f.id === b.dataset.q));
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const name = form.name.value.trim();
    form.reset();
    form.hidden = true;
    bubble('bot', `Спасибо, ${esc(name)}! Вопрос у нас — ответим в течение дня по указанному контакту.`);
  });
  // Ссылки «Спроси стилиста» в тексте страниц
  document.querySelectorAll('[data-open-stylist]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(true); }));
}

/* ================= Pop-up «Получи пробник» ================= */
function initLeadPop() {
  const dlg = document.querySelector('[data-leadpop]');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  if (load('leadpop', false)) return;                       // показываем один раз
  let shown = false;
  const show = () => {
    if (shown || document.querySelector('dialog[open]') || document.body.classList.contains('stylist-open') || document.querySelector('.preloader:not(.is-done)')) return;
    shown = true;
    save('leadpop', true);
    cleanup();
    dlg.showModal();
  };
  const timer = setTimeout(show, 20000);                     // не раньше 20 секунд…
  const onScroll = () => {                                   // …или на половине страницы
    const max = document.documentElement.scrollHeight - innerHeight;
    if (max > 0 && scrollY / max >= 0.5) show();
  };
  const cleanup = () => { clearTimeout(timer); removeEventListener('scroll', onScroll); };
  addEventListener('scroll', onScroll, { passive: true });
  dlg.querySelectorAll('[data-leadpop-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  const form = dlg.querySelector('[data-leadpop-form]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = form.querySelector('[data-form-msg]');
    if (!form.email.checkValidity()) { msg.textContent = 'Проверь почту — кажется, опечатка.'; form.email.focus(); return; }
    if (!form.ok.checked) { msg.textContent = 'Поставь галочку согласия — без неё не сможем написать.'; return; }
    msg.textContent = 'Готово! Письмо с адресом, где забрать пробник, уже летит ✦';
    goal('sample_popup');
    form.querySelector('button[type=submit]').disabled = true;
    setTimeout(() => dlg.close(), 2600);
  });
}

/* ================= Находки (пасхалки) ================= */
export const FINDS = [
  ['bubble', 'Лопнуть мыльный пузырь', 'на первом экране главной'],
  ['bear', 'Поймать мармеладного мишку', 'они прячутся на разных страницах'],
  ['phone', 'Дозвониться до Тафт', 'ретро-телефон на главной'],
  ['quiz', 'Посчитать на калькуляторе', 'квиз «По моим расчётам…»'],
  ['clapper', 'Щёлкнуть хлопушкой', 'блок «до / после» на главной'],
  ['vending', 'Достать флакон из автомата', 'на странице новой упаковки'],
  ['tv', 'Переключить канал', 'ретро-телевизор в туториалах'],
];

export function find(id) {
  const got = load('finds', []);
  if (got.includes(id) || !FINDS.some((f) => f[0] === id)) return;
  got.push(id);
  save('finds', got);
  renderFinds(true);
}

function renderFinds(isNew = false) {
  const box = document.querySelector('[data-finds]');
  if (!box) return;
  const got = load('finds', []);
  if (!got.length) return;
  box.hidden = false;
  box.querySelector('[data-finds-count]').textContent = `${got.length} из ${FINDS.length}`;
  box.querySelector('[data-finds-list]').innerHTML = FINDS.map(([id, name, hint]) =>
    `<li class="${got.includes(id) ? 'is-got' : ''}"><span aria-hidden="true">${got.includes(id) ? '✦' : '○'}</span> ${got.includes(id) ? name : `<span class="finds__hint">${hint}</span>`}</li>`).join('');
  if (isNew) {
    const toast = document.querySelector('[data-find-toast]');
    toast.textContent = got.length === FINDS.length ? 'Ты нашла всё! Удивительно, на что способна ты ✦' : `Находка! ${got.length} из ${FINDS.length} ✦`;
    toast.classList.add('is-on');
    clearTimeout(renderFinds.t);
    renderFinds.t = setTimeout(() => toast.classList.remove('is-on'), 2600);
  }
}

function initFinds() {
  const box = document.querySelector('[data-finds]');
  if (!box) return;
  const btn = box.querySelector('[data-finds-toggle]');
  const panel = box.querySelector('.finds__panel');
  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
  });
  renderFinds();
  document.addEventListener('taft:bubble-pop', () => find('bubble'));
  document.addEventListener('taft:quiz-done', () => find('quiz'));
  document.addEventListener('taft:find', (e) => find(e.detail));
  // мармеладные мишки по страницам: тап — мишка подпрыгивает и считается находкой
  document.addEventListener('click', (e) => {
    const bear = e.target.closest('.bear');
    if (!bear) return;
    bear.classList.remove('is-jelly'); void bear.getBoundingClientRect(); bear.classList.add('is-jelly');
    find('bear');
  });
}

/* ================= Уведомление о cookie ================= */
function initCookie() {
  const box = document.querySelector('[data-cookie]');
  if (!box || load('cookie-ok', false)) return;
  box.hidden = false;
  box.querySelector('[data-cookie-ok]').addEventListener('click', () => {
    save('cookie-ok', true);
    box.hidden = true;
  });
}

initCookie();
initStylist();
initLeadPop();
initFinds();
