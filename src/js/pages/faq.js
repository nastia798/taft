// Вопросы и ответы: форма «задай вопрос / перезвоним» (концепт — данные никуда не отправляются).
import '../../styles/pages/content.css';
import '../../styles/pages/product.css';

const form = document.querySelector('[data-callback]');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = form.querySelector('[data-form-msg]');
  if (!form.checkValidity()) { msg.textContent = 'Заполни имя, контакт и вопрос — и поставь галочку согласия.'; form.reportValidity(); return; }
  msg.textContent = `Спасибо, ${form.name.value.trim()}! Ответим в течение дня ✦`;
  form.reset();
});
// открыть вопрос по ссылке с якорем
if (location.hash) document.querySelector(`details${CSS.escape(location.hash)}`)?.setAttribute('open', '');
