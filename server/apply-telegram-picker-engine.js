// server/apply-telegram-picker-engine.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

// SVG Outline icons for subcategories matching Telegram (Image 2)
const SVG_ICONS = {
  recent: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>`,
  smileys: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9.5" r="1.2" fill="currentColor"/><circle cx="15" cy="9.5" r="1.2" fill="currentColor"/></svg>`,
  animals: `<svg viewBox="0 0 24 24"><path d="M12 5c-4 0-7 2.7-7 6 0 2.5 1.7 4.7 4.2 5.5L8 20l3.6-1.5c.8.2 1.6.3 2.4.3 4 0 7-2.7 7-6s-3-6-7-6z"/><path d="M5 8L3 3l5 2M19 8l2-5-5 2"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/></svg>`,
  food: `<svg viewBox="0 0 24 24"><path d="M12 6.5c-1.5-1.5-3.5-1.5-5 0-2.5 2.5-2.5 7 0 10.5 1.5 2 3.5 3 5 3s3.5-1 5-3c2.5-3.5 2.5-8 0-10.5-1.5-1.5-3.5-1.5-5 0z"/><path d="M12 2c0 2-1 4-3 4"/></svg>`,
  activity: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="12 8 8 11 9.5 16 14.5 16 16 11"/></svg>`,
  travel: `<svg viewBox="0 0 24 24"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M3 11h18v6a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1H8v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/><circle cx="7" cy="14" r="1.5" fill="currentColor"/><circle cx="17" cy="14" r="1.5" fill="currentColor"/></svg>`,
  objects: `<svg viewBox="0 0 24 24"><path d="M9 18h6m-4 3h2M12 2a7 7 0 0 0-7 7c0 2.5 1.3 4.5 3 5.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3c1.7-1.2 3-3.2 3-5.7a7 7 0 0 0-7-7z"/></svg>`,
  symbols: `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  flags: `<svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`
};

const NEW_EMOJI_ENGINE = `
/* ═══ EMOJI & TELEGRAM PICKER ENGINE ═══ */

// Recent Emojis persistence
function getRecentEmojis() {
  try {
    const raw = JSON.parse(localStorage.getItem('tgpRecentEmojis') || '[]');
    if (Array.isArray(raw) && raw.length) return raw;
  } catch (_) {}
  return ['👍','❤️','😂','🔥','😊','🎉','😎','🙏','🙌','✨','😍','😭','🥰','😘','🤔','😅','👀','💯','👏','🥳'];
}

function pushRecentEmoji(e) {
  try {
    let raw = getRecentEmojis();
    if (typeof e === 'object' && e.url) {
      raw = raw.filter(x => !(typeof x === 'object' && x.url === e.url));
    } else {
      raw = raw.filter(x => x !== e);
    }
    raw.unshift(e);
    raw = raw.slice(0, 32);
    localStorage.setItem('tgpRecentEmojis', JSON.stringify(raw));
  } catch (_) {}
}

// Full Classic Emoji Data categorized by Telegram subcategories
const TG_EMOJI_SUBCATS = [
  { id: 'recent', name: 'Часто используемые' },
  { id: 'smileys', name: 'Смайлы и люди' },
  { id: 'animals', name: 'Животные и природа' },
  { id: 'food', name: 'Еда и напитки' },
  { id: 'activity', name: 'Спорт и активность' },
  { id: 'travel', name: 'Путешествия и транспорт' },
  { id: 'objects', name: 'Предметы' },
  { id: 'symbols', name: 'Символы' },
  { id: 'flags', name: 'Флаги' }
];

const ED = {
  smileys: [
    '😀','😃','😄','😁','😆','🥹','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
    '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖',
    '😫','😩','🥺','😢','😭','😮‍💨','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🫣',
    '🤭','🫢','🫡','🤫','🫠','🤥','😶','😶‍🌫️','😐','😑','😬','🫨','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪',
    '😵','😵‍💫','🫥','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️',
    '👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴',
    '👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜',
    '👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪'
  ],
  animals: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔',
    '🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲',
    '🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋',
    '🦈','🦭','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖',
    '🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨',
    '🦡','🦦','🦥','🐁','🐀','🐿️','🦔','🌲','🌳','🌴','🌵','🌾','🌿','☘️','🍀','🍁','🍂','🍃','🍄','🪨','🪵'
  ],
  food: [
    '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬',
    '🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓',
    '🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥣','🍝','🍜','🍲',
    '🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🍢','🥠','🥡','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧',
    '🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🥤','🧋','🧃','🧉','🧊'
  ],
  activity: [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹',
    '🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️',
    '🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹',
    '🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'
  ],
  travel: [
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🚨','🚔','🚍','🚘',
    '🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️',
    '🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚥','🚦','🚏','🗺️','🗿','🗽','🗼','🏰',
    '🏯','🏟️','🎡','🎢','🎠','⛲','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🏠','🏡','🏘️','🏚️','🏗️','🏢','🏬'
  ],
  objects: [
    '💡','🔦','🕯️','🪔','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹',
    '🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌',
    '💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤',
    '🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️',
    '🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀'
  ],
  symbols: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
    '✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒',
    '♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹',
    '🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵',
    '🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','❇️','✳️','❎','🌐','💠','Ⓜ️'
  ],
  flags: [
    '🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇷🇺','🇧🇾','🇺🇦','🇰🇿','🇦🇲','🇦🇿','🇬🇪','🇲🇩','🇺🇿','🇹🇯','🇰🇬','🇹🇲','🇺🇸',
    '🇬🇧','🇩🇪','🇫🇷','🇮🇹','🇪🇸','🇵🇹','🇨🇳','🇯🇵','🇰🇷','🇮🇳','🇹🇷','🇸🇦','🇦🇪','🇮🇱','🇪🇬','🇧🇷','🇦🇷','🇨🇦','🇦🇺'
  ]
};

const CK = Object.keys(ED);
const CAT_NAMES = {
  recent: 'Часто используемые',
  smileys: 'Смайлы и люди',
  animals: 'Животные и природа',
  food: 'Еда и напитки',
  activity: 'Спорт и активность',
  travel: 'Путешествия и транспорт',
  objects: 'Предметы',
  symbols: 'Символы',
  flags: 'Флаги'
};

const TG_SVG_ICONS = ${JSON.stringify(SVG_ICONS)};

/* ═══ Tenor (GIF) ═══ */
const _TENOR = (window.NONSENSE_TENOR || {});
const GIPHY_KEY = _TENOR.key || 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
const GIPHY_LANG = (_TENOR.locale || 'ru_RU').split('_')[0] || 'ru';

/* ═══ Unified Picker (Emoji / Stickers / GIF) ═══ */
var tgpMode = 'emoji', tgpOpen = false, tgpGifTimer = null, tgpGifQuery = '';
window.tgpOpen = false;

function tgpEl() {
  return document.getElementById('tgPicker');
}

function installedStickerPacks() {
  return (installedPackIds || []).map(id => stickerPacksCache[id]).filter(p => p && p.kind !== 'emoji');
}

function installedEmojiPacks() {
  return (installedPackIds || []).map(id => stickerPacksCache[id]).filter(p => p && p.kind === 'emoji');
}

function customEmojiList() {
  const out = [];
  for (const p of installedEmojiPacks()) {
    for (const s of (p.stickers || [])) {
      out.push({ url: s.url, packId: p.id, name: s.emoji || '' });
    }
  }
  return out;
}

function packIcon(p) {
  return (p && p.icon) || (p && p.stickers && p.stickers[0] && p.stickers[0].url) || '';
}

function packIconImg(p) {
  const u = packIcon(p);
  if (!u) return '📦';
  return stickerMedia(u, 'tgp-sec-ic', '', p && p.stickers && p.stickers[0] && p.stickers[0].vid);
}

function openTgp(mode) {
  if (typeof hideAttachMenu === 'function') hideAttachMenu();
  const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');
  const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
  tgpOpen = true;
  window.tgpOpen = true;
  const el = tgpEl();
  if (el) el.classList.add('open');
  tgpSetMode(mode || tgpMode);
}

function closeTgp() {
  tgpOpen = false;
  window.tgpOpen = false;
  const el = tgpEl();
  if (el) el.classList.remove('open');
}

function toggleTgp(mode, ev) {
  if (ev) ev.stopPropagation();
  const el = tgpEl();
  if (el && el.classList.contains('open') && tgpMode === mode) closeTgp();
  else openTgp(mode);
}

function toggleEmoji(ev) { toggleTgp('emoji', ev); }
function toggleStickerPanel(ev) { toggleTgp('stickers', ev); }
function closeStickerPanel() { closeTgp(); }
function renderStickerPanel() { if (tgpOpen) { renderTgpBody(); renderTgpFoot(); } }
function afterPackChange() { if (tgpOpen) { renderTgpBody(); renderTgpFoot(); } }

function tgpSetMode(mode) {
  tgpMode = mode;
  document.querySelectorAll('.tgp-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  const top = tgpEl() ? tgpEl().querySelector('.tgp-top') : null;
  const search = document.getElementById('tgpSearch');
  const subcatsBar = document.getElementById('tgpSubcatsBar');

  if (mode === 'stickers') {
    if (top) top.classList.add('hidden');
    if (subcatsBar) subcatsBar.classList.add('hidden');
  } else if (mode === 'gif') {
    if (top) top.classList.remove('hidden');
    if (subcatsBar) subcatsBar.classList.add('hidden');
    if (search) {
      search.value = tgpGifQuery;
      search.placeholder = typeof t === 'function' ? t('searchGifPh', 'Поиск GIF') : 'Поиск GIF';
    }
  } else {
    // Emoji mode
    if (top) top.classList.remove('hidden');
    if (subcatsBar) subcatsBar.classList.remove('hidden');
    if (search) {
      search.value = '';
      search.placeholder = typeof t === 'function' ? t('searchEmojiPh', 'Поиск эмодзи') : 'Поиск эмодзи';
    }
    renderTgpSubcats();
  }

  renderTgpBody();
  renderTgpFoot();
}

function tgpOnSearch(q) {
  if (tgpMode === 'emoji') renderTgpEmoji(q);
  else if (tgpMode === 'gif') {
    tgpGifQuery = q;
    clearTimeout(tgpGifTimer);
    tgpGifTimer = setTimeout(() => loadTgpGif(q), 350);
  }
}

function renderTgpBody() {
  if (tgpMode === 'emoji') renderTgpEmoji(document.getElementById('tgpSearch') ? document.getElementById('tgpSearch').value : '');
  else if (tgpMode === 'stickers') renderTgpStickers();
  else renderTgpGif();
}

function tgpSection(id, iconHtml, title, inner) {
  return \`<div class="tgp-sec" id="tgp-sec-\${id}"><div class="tgp-sec-head">\${iconHtml}<span class="tgp-sec-title">\${title}</span></div>\${inner}</div>\`;
}

function tgpJump(secId) {
  const el = document.getElementById('tgp-sec-' + secId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function tgpJumpSubcat(catId) {
  const el = document.getElementById('tgp-sec-cat-' + catId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.tgp-subcat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === catId);
  });
}

/* ── SUBCATEGORIES PILL BAR (Image 2) ── */
function renderTgpSubcats() {
  const pill = document.getElementById('tgpSubcatsPill');
  if (!pill) return;
  let html = '';
  for (const cat of TG_EMOJI_SUBCATS) {
    const svg = TG_SVG_ICONS[cat.id] || '';
    html += \`<button class="tgp-subcat-btn \${cat.id === 'smileys' ? 'active' : ''}" data-cat="\${cat.id}" onclick="tgpJumpSubcat('\${cat.id}')" title="\${cat.name}">\${svg}</button>\`;
  }
  pill.innerHTML = html;
}

/* ── EMOJI RENDERER ── */
function emojiUniCell(e) {
  return \`<div class="emoji-cell" onclick="insEmoji('\${e}')">\${e}</div>\`;
}

function emojiCustomCell(c) {
  return \`<div class="emoji-cell" title="\${stkEsc(c.name)}" onclick="insCustomEmoji('\${encodeURIComponent(c.url)}','\${c.packId}','\${stkEsc((c.name||'').replace(/'/g,''))}')">\${stickerMedia(c.url,'ce-pick')}</div>\`;
}

function renderTgpEmoji(q) {
  const body = document.getElementById('tgpBody');
  if (!body) return;
  q = (q || '').trim().toLowerCase();

  if (q) {
    const allUni = Object.values(ED).flat();
    const uni = Array.from(new Set(allUni)).filter(e => e.includes(q));
    const cust = customEmojiList().filter(c => (c.name || '').toLowerCase().includes(q));
    const cells = cust.map(emojiCustomCell).join('') + uni.map(emojiUniCell).join('');
    body.innerHTML = cells ? \`<div class="tgp-emoji-grid">\${cells}</div>\` : \`<div class="tgp-empty">Ничего не найдено</div>\`;
    return;
  }

  let html = '';

  // 1. Recent Emojis Section (Clock)
  const recents = getRecentEmojis();
  if (recents && recents.length) {
    const recentCells = recents.map(item => {
      if (typeof item === 'object' && item.url) {
        return emojiCustomCell({ url: item.url, packId: item.packId || '', name: item.name || '' });
      }
      return emojiUniCell(item);
    }).join('');
    html += tgpSection('cat-recent', TG_SVG_ICONS.recent, 'Часто используемые', \`<div class="tgp-emoji-grid">\${recentCells}</div>\`);
  }

  // 2. Installed Custom Emoji Packs
  for (const p of installedEmojiPacks()) {
    const cells = (p.stickers || []).map(s => emojiCustomCell({ url: s.url, packId: p.id, name: s.emoji || '' })).join('');
    html += tgpSection('emoji-pack-' + p.id, packIconImg(p), stkEsc(p.title || 'Эмодзи'), \`<div class="tgp-emoji-grid">\${cells}</div>\`);
  }

  // 3. Standard Classic Emojis by Subcategory (Image 2)
  for (const cat of TG_EMOJI_SUBCATS) {
    if (cat.id === 'recent') continue;
    const list = ED[cat.id] || [];
    if (!list.length) continue;
    const cells = list.map(emojiUniCell).join('');
    const svg = TG_SVG_ICONS[cat.id] || '';
    html += tgpSection('cat-' + cat.id, svg, cat.name, \`<div class="tgp-emoji-grid">\${cells}</div>\`);
  }

  body.innerHTML = html;
  initTgpScrollSpy();
}

/* ── STICKERS ── */
function renderTgpStickers() {
  const body = document.getElementById('tgpBody');
  if (!body) return;
  const packs = installedStickerPacks();
  if (!packs.length) {
    body.innerHTML = \`<div class="tgp-empty">\${typeof t === 'function' ? t('emptyStickers', 'У вас пока нет стикеров.') : 'У вас пока нет стикеров.'}</div>\`;
    return;
  }
  body.innerHTML = packs.map(p => {
    const cells = (p.stickers || []).map(s => \`<div class="stk-cell" title="\${stkEsc(s.emoji||'')}" onclick="sendSticker('\${p.id}','\${encodeURIComponent(s.url)}','\${stkEsc((s.emoji||'').replace(/'/g,''))}',\${s.vid?1:0})">\${stickerMedia(s.url,'','',s.vid)}</div>\`).join('');
    const mine = p.authorUid === (me ? me.uid : '');
    const editBtn = mine ? \`<button class="stk-pack-del" title="Редактировать" onclick="openEditPack('\${p.id}')">✏️</button>\` : '';
    const head = \`\${packIconImg(p)}<span class="tgp-sec-title">\${stkEsc(p.title||'Пак')}</span><span style="display:flex;gap:2px">\${editBtn}<button class="stk-pack-del" title="Убрать" onclick="uninstallPack('\${p.id}')">✕</button></span>\`;
    return \`<div class="tgp-sec" id="tgp-sec-stk-\${p.id}"><div class="tgp-sec-head">\${head}</div><div class="tgp-stk-grid">\${cells}</div></div>\`;
  }).join('');
}

/* ── GIF (GIPHY) ── */
function getRecentGifs() {
  try { return JSON.parse(localStorage.getItem('tgpRecentGifs') || '[]'); } catch (_) { return []; }
}
function pushRecentGif(g) {
  try {
    let a = getRecentGifs().filter(x => x.send !== g.send);
    a.unshift(g);
    a = a.slice(0, 24);
    localStorage.setItem('tgpRecentGifs', JSON.stringify(a));
  } catch (_) {}
}
async function tenorFetch(kind, q) {
  const base = 'https://api.giphy.com/v1/gifs/' + (kind === 'search' ? 'search' : 'trending');
  const params = new URLSearchParams({ api_key: GIPHY_KEY, limit: '24', rating: 'pg-13', lang: GIPHY_LANG, bundle: 'messaging_non_clips' });
  if (kind === 'search') params.set('q', q);
  const r = await fetch(base + '?' + params.toString());
  if (!r.ok) throw new Error('giphy ' + r.status);
  const j = await r.json();
  return (j.data || []).map(res => {
    const im = res.images || {};
    const preview = (im.fixed_width && im.fixed_width.url) || (im.fixed_width_small && im.fixed_width_small.url) || (im.downsized && im.downsized.url) || '';
    const send = (im.downsized_medium && im.downsized_medium.url) || (im.downsized && im.downsized.url) || (im.original && im.original.url) || preview;
    return preview ? { preview, send } : null;
  }).filter(Boolean);
}
function renderTgpGif() { loadTgpGif(tgpGifQuery); }
async function loadTgpGif(q) {
  const body = document.getElementById('tgpBody');
  if (!body || tgpMode !== 'gif') return;
  body.innerHTML = \`<div class="tgp-loading">\${typeof t === 'function' ? t('loading', 'Загрузка…') : 'Загрузка…'}</div>\`;
  try {
    let items;
    if (q && q.trim()) items = await tenorFetch('search', q.trim());
    else items = getRecentGifs().concat(await tenorFetch('trending', ''));
    if (tgpMode !== 'gif') return;
    if (!items.length) { body.innerHTML = \`<div class="tgp-empty">Ничего не найдено</div>\`; return; }
    body.innerHTML = \`<div class="tgp-gif-grid">\` + items.map(g => \`<div class="tgp-gif-cell" onclick="sendGif('\${encodeURIComponent(g.send)}','\${encodeURIComponent(g.preview)}')"><img src="\${g.preview}" onerror="this.parentNode.remove()"></div>\`).join('') + \`</div>\`;
  } catch (e) {
    console.warn('giphy', e);
    body.innerHTML = \`<div class="tgp-empty">GIF недоступны.<br>Проверьте интернет</div>\`;
  }
}
async function sendGif(sendEnc, previewEnc) {
  const url = decodeURIComponent(sendEnc), preview = decodeURIComponent(previewEnc || sendEnc);
  if (!activeId) { alert(typeof t === 'function' ? t('selectChatHint', 'Сначала откройте чат') : 'Сначала откройте чат'); return; }
  const cid = activeId;
  pushRecentGif({ send: url, preview });
  const data = { uid: me.uid, author: me.nick, at: firebase.firestore.FieldValue.serverTimestamp(), type: 'sticker', stickerUrl: url, gif: true, emoji: '' };
  if (typeof replyTo !== 'undefined' && replyTo) { data.replyTo = replyTo; cancelReply(); }
  closeTgp();
  await db.collection('chats').doc(cid).collection('messages').add(data);
  db.collection('chats').doc(cid).update({ lastMsg: 'GIF', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid }).catch(() => {});
  const box = document.getElementById('messages'); if (box) box.scrollTop = box.scrollHeight;
}

/* ── FOOTER PACK SELECTOR (Image 1) ── */
function renderTgpFoot() {
  const foot = document.getElementById('tgpFootIcons');
  if (!foot) return;
  if (tgpMode === 'gif') { foot.innerHTML = ''; return; }
  let html = '';

  if (tgpMode === 'emoji') {
    // 1. Clock (Recent) button
    html += \`<button class="tgp-fic" data-jump="cat-recent" title="Часто используемые" onclick="tgpJump('cat-recent')">\${TG_SVG_ICONS.recent}</button>\`;
    // 2. Classic Emoji button
    html += \`<button class="tgp-fic active" data-jump="cat-smileys" title="Смайлы и эмодзи" onclick="tgpJump('cat-smileys')">\${TG_SVG_ICONS.smileys}</button>\`;
    // 3. Custom Emoji Packs (Thumbnails in rounded square cards, matching Image 1)
    for (const p of installedEmojiPacks()) {
      html += \`<button class="tgp-fic" data-jump="emoji-pack-\${p.id}" title="\${stkEsc(p.title||'')}" onclick="tgpJump('emoji-pack-\${p.id}')">\${packIconImg(p)}</button>\`;
    }
    // 4. Add/create emoji pack button
    html += \`<button class="tgp-fic" style="font-size:20px;font-weight:700" title="Создать набор эмодзи" onclick="openCreatePack('emoji')">＋</button>\`;
  } else {
    // Stickers mode
    for (const p of installedStickerPacks()) {
      html += \`<button class="tgp-fic" data-jump="stk-\${p.id}" title="\${stkEsc(p.title||'')}" onclick="tgpJump('stk-\${p.id}')">\${packIconImg(p)}</button>\`;
    }
    html += \`<button class="tgp-fic" style="font-size:20px;font-weight:700" title="Создать пак" onclick="openCreatePack('sticker')">＋</button>\`;
  }
  foot.innerHTML = html;
}

/* ── SCROLL SPY FOR SUBCATS & PACKS ── */
function initTgpScrollSpy() {
  const body = document.getElementById('tgpBody');
  if (!body) return;
  body.onscroll = () => {
    if (tgpMode !== 'emoji') return;
    const secs = body.querySelectorAll('.tgp-sec');
    const bodyTop = body.scrollTop + 30;
    let currentId = null;
    secs.forEach(sec => {
      if (sec.offsetTop <= bodyTop) {
        currentId = sec.id;
      }
    });
    if (!currentId && secs.length > 0) currentId = secs[0].id;
    if (currentId) {
      // Subcategories highlight
      const catMatch = currentId.match(/tgp-sec-cat-(.+)/);
      if (catMatch) {
        const catKey = catMatch[1];
        document.querySelectorAll('.tgp-subcat-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.cat === catKey);
        });
        document.querySelectorAll('.tgp-fic').forEach(f => {
          if (catKey === 'recent') f.classList.toggle('active', f.dataset.jump === 'cat-recent');
          else f.classList.toggle('active', f.dataset.jump === 'cat-smileys');
        });
      }
      // Pack highlight
      const packMatch = currentId.match(/tgp-sec-(emoji-pack-.+)/);
      if (packMatch) {
        const packSecId = packMatch[1];
        document.querySelectorAll('.tgp-subcat-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tgp-fic').forEach(f => {
          f.classList.toggle('active', f.dataset.jump === packSecId);
        });
      }
    }
  };
}

function insEmoji(e) {
  pushRecentEmoji(e);
  minp().focus();
  document.execCommand('insertText', false, e);
}

function insCustomEmoji(urlEnc, packId, name) {
  const url = decodeURIComponent(urlEnc);
  pushRecentEmoji({ url, packId, name, custom: true });
  minp().focus();
  const alt = name ? (':' + name.replace(/[:<>"']/g, '') + ':') : '';
  const html = \`<img class="ce" data-ce="1" data-pack="\${(packId || '').replace(/"/g, '')}" src="\${url.replace(/"/g, '&quot;')}" alt="\${alt}">\`;
  document.execCommand('insertHTML', false, html + '&#8203;');
}
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  const startMarker = '/* ═══ EMOJI ═══ */';
  const endMarker = '/* ═══ UTILS ═══ */';

  const startIdx = code.indexOf(startMarker);
  const endIdx = code.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.error(`Markers not found in ${filePath}`);
    process.exit(1);
  }

  code = code.slice(0, startIdx) + NEW_EMOJI_ENGINE + '\n' + code.slice(endIdx);
  console.log(`✓ Replaced EMOJI block in ${filePath}`);

  // Validate scripts
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let scriptCount = 0;
  while ((m = scriptRegex.exec(code)) !== null) {
    scriptCount++;
    if (m[1].trim()) {
      try {
        new vm.Script(m[1].trim());
      } catch (err) {
        console.error(`Syntax error in script #${scriptCount} of ${filePath}:`, err.stack || err.message);
        process.exit(1);
      }
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Successfully validated and saved ${filePath} (${scriptCount} scripts valid)`);
}

console.log('\n🎉 TELEGRAM EMOJI PICKER ENGINE DEPLOYED TO ALL TARGETS!');
