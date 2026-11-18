// Мыльные пузыри: плавают, лопаются по клику/тапу, внутри — фразы бренда.
// Контейнер: <div data-bubbles data-count="7"></div>. Событие 'taft:bubble-pop' пригодится для счётчика находок.

const PHRASES = [
  'Ты не ожидала? Тафт тоже.',
  'Объём есть, склеенных прядей нет',
  'Классика и новинки — на одной полке',
  'Лёгкая укладка, которая держится',
  'Удивительно, на что способен Тафт',
  'Некоторые вещи стоит увидеть заново',
  'У нас кое-что новенькое. Ты заметила?',
];

const rand = (a, b) => a + Math.random() * (b - a);
let phraseIdx = Math.floor(Math.random() * PHRASES.length);

function makeBubble(box, i, total) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'soap';
  b.setAttribute('aria-label', 'Лопнуть мыльный пузырь');
  if (i > 0) b.tabIndex = -1; // в порядок табуляции попадает только один пузырь
  const mobile = window.innerWidth < 700;
  const size = rand(mobile ? 38 : 48, mobile ? 92 : 140);
  // раскладываем по зонам, чтобы не слипались
  const col = i % Math.ceil(total / 2);
  const zoneW = 100 / Math.ceil(total / 2);
  b.style.setProperty('--size', `${size}px`);
  b.style.left = `${rand(col * zoneW, (col + 1) * zoneW - 6)}%`;
  b.style.top = `${i % 2 ? rand(52, 82) : rand(4, 40)}%`;
  b.style.setProperty('--dur', `${rand(7, 13).toFixed(1)}s`);
  b.style.setProperty('--delay', `${-rand(0, 10).toFixed(1)}s`);
  b.style.setProperty('--dx', `${rand(-26, 26).toFixed(0)}px`);
  b.style.setProperty('--dy', `${rand(-40, -14).toFixed(0)}px`);
  b.style.setProperty('--hue', `${rand(-25, 25).toFixed(0)}deg`);
  b.innerHTML = '<span class="soap__body" aria-hidden="true"></span>';
  b.addEventListener('click', () => pop(b, box));
  return b;
}

function pop(b, box) {
  if (b.classList.contains('is-popped')) return;
  b.classList.add('is-popped');

  // брызги
  const burst = document.createElement('span');
  burst.className = 'soap__burst';
  burst.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < 8; k++) {
    const d = document.createElement('i');
    d.style.setProperty('--a', `${k * 45 + rand(-10, 10)}deg`);
    burst.append(d);
  }
  b.append(burst);

  // фраза
  const msg = document.createElement('span');
  msg.className = 'soap__msg';
  msg.setAttribute('role', 'status');
  msg.textContent = PHRASES[phraseIdx++ % PHRASES.length];
  const r = b.getBoundingClientRect();
  const br = box.getBoundingClientRect();
  msg.style.left = `${Math.min(Math.max(r.left - br.left + r.width / 2, 110), br.width - 110)}px`;
  msg.style.top = `${r.top - br.top + r.height / 2}px`;
  box.append(msg);

  document.dispatchEvent(new CustomEvent('taft:bubble-pop'));

  setTimeout(() => msg.remove(), 2600);
  setTimeout(() => {
    const total = box.querySelectorAll('.soap').length;
    const nb = makeBubble(box, total, total);
    nb.tabIndex = b.tabIndex;
    b.replaceWith(nb);
  }, 3200);
}

export function initBubbles() {
  document.querySelectorAll('[data-bubbles]').forEach((box) => {
    const n = parseInt(box.dataset.count, 10) || 6;
    const total = window.innerWidth < 700 ? Math.max(3, Math.round(n * 0.6)) : n;
    for (let i = 0; i < total; i++) box.append(makeBubble(box, i, total));
  });
}
