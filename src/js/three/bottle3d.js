// 3D-флаконы новой линейки на Three.js.
// Форма — точный силуэт продукта с рендера, «выточенный» вокруг оси (LatheGeometry).
// Поверхность — развёртка фронтального кадра рендера без перерисовки цвета (MeshBasicMaterial),
// поэтому цвета и логотип совпадают с картинками и видео упаковки.
// Флакон всегда смотрит логотипом на зрителя: только наклон до 12–15° и «подпрыгивание».
import * as THREE from 'three';
import { gsap } from 'gsap';
import cfg from '../../data/bottle3d.json';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const MAX_TURN = THREE.MathUtils.degToRad(12);   // поворот за курсором
const MAX_DRAG = THREE.MathUtils.degToRad(15);   // поворот пальцем/мышью

export const ORDER = cfg.order;

/** Можно ли показывать 3D: WebGL есть, движение не запрещено, устройство не слишком слабое. */
export function can3D() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (navigator.connection?.saveData) return false;
  if ((navigator.hardwareConcurrency || 4) <= 2) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const loader = new THREE.TextureLoader();
const cache = {};

/** Геометрия и материал продукта (кэшируются). Высота флакона = 10 * относительная высота. */
async function buildProduct(key, renderer) {
  if (cache[key]) return cache[key];
  const p = cfg.products[key];
  const H = 10 * p.height;
  const scale = H / p.aspect;            // 1 «диаметр корпуса» в единицах сцены
  const pts = [new THREE.Vector2(0, 0)];
  for (const [r, y] of p.profile) pts.push(new THREE.Vector2((r * scale) / 2, y * scale));
  pts.push(new THREE.Vector2(0, p.profile[p.profile.length - 1][1] * scale));
  // u = 0.5 смотрит на камеру (+z), рост u — вправо
  const geo = new THREE.LatheGeometry(pts, 160, -Math.PI, Math.PI * 2);
  const tex = await loader.loadAsync(BASE + p.texture);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  // v у Lathe идёт по точкам профиля снизу вверх; первая и последняя точки — центры дна и макушки
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  cache[key] = { geo, mat, H };
  return cache[key];
}

/**
 * Создать флакон в контейнере.
 * @returns {Promise<{ setProduct(key), destroy(), el, product }>}
 */
export async function createBottle(container, { product = ORDER[0], fit = 'tallest' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;   // цвета 1:1 как на рендере
  const canvas = renderer.domElement;
  canvas.className = 'bottle3d';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.touchAction = 'pan-y';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);

  const first = await buildProduct(product, renderer);
  const mesh = new THREE.Mesh(first.geo, first.mat);
  const hop = new THREE.Group();   // подпрыгивание
  const tilt = new THREE.Group();  // наклон и поворот (пивот у дна — флакон «стоит»)
  hop.add(mesh);
  tilt.add(hop);
  scene.add(tilt);
  mesh.position.y = 0;
  // fit: 'tallest' — общий масштаб (видно, что мусс ниже лака), 'product' — флакон во весь кадр
  const fitTo = fit === 'product' ? first.H : 10;
  tilt.position.y = -fitTo / 2;

  container.append(canvas);

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // в кадр помещается самый высокий продукт (10) с запасом сверху на прыжок
    const fitH = fitTo * 1.16;
    const dist = fitH / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = 3.4 / camera.aspect;
    camera.position.set(0, 0.5, Math.max(dist, fitW / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    camera.lookAt(0, 0.2, 0);
    camera.updateProjectionMatrix();
    render();
  };

  /* ---------- Взаимодействие ---------- */
  const st = { aimX: 0, aimY: 0, drag: false, dragX: 0, startX: 0, turn: 0 };
  const hero = container.closest('section') || container;

  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || st.drag) return;
    const r = container.getBoundingClientRect();
    st.aimX = THREE.MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 1.5), -1, 1);
    st.aimY = THREE.MathUtils.clamp((e.clientY - (r.top + r.height / 2)) / r.height, -1, 1);
    wake();
  };
  const onLeave = () => { st.aimX = 0; st.aimY = 0; wake(); };
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', onLeave);

  const down = (e) => { st.drag = true; st.startX = e.clientX; canvas.setPointerCapture?.(e.pointerId); container.classList.add('is-grabbing'); };
  const move = (e) => {
    if (!st.drag) return;
    st.dragX = THREE.MathUtils.clamp((e.clientX - st.startX) / 160, -1, 1);
    wake();
  };
  const up = () => {
    if (!st.drag) return;
    st.drag = false;
    st.dragX = 0;              // пружинкой возвращается лицом
    container.classList.remove('is-grabbing');
    wake();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  // наклон телефона (где не нужен отдельный запрос разрешения) — тоже не больше 12°
  const onTilt = (e) => {
    if (e.gamma == null || st.drag) return;
    st.aimX = THREE.MathUtils.clamp(e.gamma / 40, -1, 1);
    wake();
  };
  if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', onTilt);
  }

  // «подпрыгивание» с лёгким наклоном
  let hopping = false;
  const bounce = () => {
    if (hopping) return;
    hopping = true;
    const dir = Math.random() < 0.5 ? -1 : 1;
    gsap.timeline({ onUpdate: wake, onComplete: () => { hopping = false; } })
      .to(hop.scale, { x: 1.04, y: 0.95, z: 1.04, duration: 0.12, ease: 'power2.out' })
      .to(hop.position, { y: 1.1, duration: 0.32, ease: 'power2.out' }, '>')
      .to(hop.scale, { x: 0.97, y: 1.04, z: 0.97, duration: 0.32, ease: 'power2.out' }, '<')
      .to(hop.rotation, { z: dir * THREE.MathUtils.degToRad(6), duration: 0.32, ease: 'power2.out' }, '<')
      .to(hop.position, { y: 0, duration: 0.36, ease: 'bounce.out' })
      .to(hop.rotation, { z: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' }, '<')
      .to(hop.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, '<');
  };
  canvas.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') bounce(); });
  canvas.addEventListener('click', bounce);

  /* ---------- Рендер: кадр рисуется только когда что-то движется ---------- */
  let raf = 0;
  let visible = true;
  let last = performance.now();
  function render() { renderer.render(scene, camera); }
  function wake() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop() {
    raf = 0;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const targetY = st.drag ? st.dragX * MAX_DRAG : st.aimX * MAX_TURN;
    const targetX = st.drag ? 0 : st.aimY * THREE.MathUtils.degToRad(5);
    const k = 1 - Math.pow(0.0015, dt);  // плавное приближение к цели
    tilt.rotation.y += (targetY - tilt.rotation.y) * k;
    tilt.rotation.x += (targetX - tilt.rotation.x) * k;
    render();
    // в покое цикл останавливается: кадры рисуются только пока флакон движется
    const settling = Math.abs(targetY - tilt.rotation.y) > 0.0008 || Math.abs(targetX - tilt.rotation.x) > 0.0008 || st.drag || hopping;
    if (settling && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); });
  io.observe(container);
  const onVis = () => { if (!document.hidden) wake(); };
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  wake();

  let current = product;
  return {
    el: canvas,
    get product() { return current; },
    /** Смена продукта: флакон «приседает», меняется в прыжке и приземляется */
    async setProduct(next) {
      if (!cfg.products[next] || next === current) return;
      current = next;
      const nextP = await buildProduct(next, renderer);
      if (current !== next) return;
      gsap.timeline({ onUpdate: wake })
        .to(hop.scale, { x: 1.06, y: 0.9, z: 1.06, duration: 0.14, ease: 'power2.in' })
        .to(hop.position, { y: 1.4, duration: 0.26, ease: 'power2.out' })
        .to(hop.scale, { x: 0.2, y: 1.15, z: 0.2, duration: 0.18, ease: 'power2.in' }, '<+0.08')
        .add(() => { mesh.geometry = nextP.geo; mesh.material = nextP.mat; })
        .to(hop.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
        .to(hop.position, { y: 0, duration: 0.4, ease: 'bounce.out' }, '<');
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
      renderer.dispose();
      canvas.remove();
    },
  };
}
