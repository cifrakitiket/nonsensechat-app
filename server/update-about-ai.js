const fs = require('fs');
let h = fs.readFileSync('public/index.html', 'utf8');

const target = '<span>Встроенный калькулятор с расчётом математических выражений в чате (квадратные и кубические корни, степени, дроби)</span></li>';
const addition = target + '\r\n              <li style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--acc3);flex-shrink:0">✦</span><span><b>ИИ Хаб и быстрые команды:</b> отдельный чат с нейросетью (Gemini, Grok, Claude, OpenAI), настройка своих API-ключей, выбор системного промпта и мгновенная генерация ответов до 200 символов по клавише <b>TAB</b> (<code>gemini:</code>, <code>grok:</code>, <code>claude:</code>)</span></li>';

if (h.includes(target) && !h.includes('<b>ИИ Хаб и быстрые команды:</b>')) {
  h = h.replace(target, addition);
  fs.writeFileSync('public/index.html', h, 'utf8');
  console.log('Added AI Hub to About features list');
} else {
  console.log('Target not found or already added');
}
