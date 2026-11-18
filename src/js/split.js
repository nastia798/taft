// Разбивка заголовков на слова/буквы для анимации появления.
// Структура (em, .hand-word) сохраняется, исходный текст доступен скринридерам через aria-label.
//   h1 / .display      → по словам (слово «выезжает» из-под маски)
//   h2 (короткие)      → по буквам
//   data-split="words|chars|none" — переопределить вручную

const AUTO = 'h1, h2, .display, [data-split]';

export function splitHeadings(root = document) {
  root.querySelectorAll(AUTO).forEach((el) => {
    if (el.dataset.split === 'none' || el.classList.contains('split') || el.closest('.no-split, dialog, .drawer, .pcard, .faq-item, .tcard, .stylist, .leadpop, .buy-dialog')) return;
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const mode = el.dataset.split || (el.tagName === 'H1' || el.classList.contains('display') || text.length > 34 ? 'words' : 'chars');
    split(el, mode);
    el.setAttribute('aria-label', text);
    el.classList.add('split', `split--${mode}`);
  });
}

function split(el, mode) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.setAttribute('aria-hidden', 'true');
          if (mode === 'chars') {
            [...part].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'c';
              c.style.setProperty('--i', i++);
              c.textContent = ch;
              w.append(c);
            });
          } else {
            const s = document.createElement('span');
            s.className = 'wi';
            s.style.setProperty('--i', i++);
            s.textContent = part;
            w.append(s);
          }
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'BR' && n.tagName !== 'svg') {
        walk(n);
      }
    });
  };
  walk(el);
}
