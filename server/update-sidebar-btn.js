const fs = require('fs');
let h = fs.readFileSync('public/index.html', 'utf8');
const target = '<button class="iBtn" onclick="openModal(\'modal-folders\')" title="Папки">📁</button>';
const addition = target + '\r\n      <button class="iBtn" id="aiHubSidebarBtn" onclick="openAiHub()" title="ИИ Хаб"><i class="fa-solid fa-robot" style="color:#0ea5e9"></i></button>';
if (h.includes(target) && !h.includes('id="aiHubSidebarBtn"')) {
  h = h.replace(target, addition);
  fs.writeFileSync('public/index.html', h, 'utf8');
  console.log('Successfully inserted aiHubSidebarBtn');
} else {
  console.log('Already present or target not found');
}
