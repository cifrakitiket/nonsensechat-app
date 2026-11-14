const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const start = html.indexOf('function esc(s) {');
const end = html.indexOf('function fmtCalcNum(n) {', start);
const code = html.slice(start, end);

const context = {
  activeId: null,
  me: { uid: 'test_uid' },
  allChats: [],
  document: {
    createElement: () => ({
      classList: { remove: () => {}, add: () => {} },
      appendChild: () => {}
    }),
    querySelectorAll: () => []
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  asDate: (d) => new Date(),
  fmtTime: (d) => '12:00'
};

const fn = new Function('ctx', 'with(ctx) { ' + code + '; return { esc, renderAiHubItem, getAiSettings }; }')(context);
console.log('esc test:', fn.esc('<b>test</b> & "more"'));
const dummyList = { appendChild: (el) => console.log('Appended el with HTML length:', el.innerHTML?.length) };
fn.renderAiHubItem(dummyList, { id: 'aihub_test_uid', lastMsg: 'Привет!' });
console.log('renderAiHubItem executed with 0 errors!');
