// Анимации на GSAP + ScrollTrigger. Загружается только если пользователь не просил уменьшить движение.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Параллакс: любой элемент с data-speed="0.3" (−1…1) едет с другой скоростью, чем страница.
 * data-rotate="10" — дополнительно поворачивается за прокрутку на N градусов.
 * Вешай атрибут на обёртку (.px), а не на стикер: у стикера свой transform при наведении.
 */
function initParallax() {
  const mobile = window.matchMedia('(max-width: 860px)').matches;
  gsap.utils.toArray('[data-speed]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed) || 0;
    const rot = parseFloat(el.dataset.rotate) || 0;
    const dist = (mobile ? 90 : 160) * speed;
    gsap.fromTo(el,
      { y: -dist, rotation: -rot / 2 },
      {
        y: dist,
        rotation: rot / 2,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section, .spread, footer') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      });
  });
}

/** Бегущие строки ускоряются, когда листаешь быстрее. */
function initMarqueeBoost() {
  const tracks = gsap.utils.toArray('.marquee__track');
  if (!tracks.length) return;
  ScrollTrigger.create({
    onUpdate(self) {
      const v = Math.min(4, 1 + Math.abs(self.getVelocity()) / 900);
      tracks.forEach((t) => t.getAnimations().forEach((a) => { a.playbackRate = v; }));
      clearTimeout(initMarqueeBoost.t);
      initMarqueeBoost.t = setTimeout(() => tracks.forEach((t) => t.getAnimations().forEach((a) => { a.playbackRate = 1; })), 160);
    },
  });
}

export function initMotion() {
  initParallax();
  initMarqueeBoost();
  // пересчитать позиции, когда догрузились шрифты и картинки
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}
