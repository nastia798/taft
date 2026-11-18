// Туториалы: ретро-телевизор с переключением каналов.
import '../../styles/pages/content.css';
import { initTV } from '../tv.js';

initTV(document.querySelector('[data-tv]'), JSON.parse(document.querySelector('[data-tutorials]').textContent));
