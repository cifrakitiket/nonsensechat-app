const fs = require('fs');
const path = 'd:/messenger/public/index.html';

let content = fs.readFileSync(path, 'utf8');

console.log('Original length:', content.length);

// 1. Add CSS rules for .mobile-brand-header and hiding .profile-row on mobile
const cssToInsert = `
    /* Brand header for mobile (hidden on desktop) */
    .mobile-brand-header {
      display: none;
    }

    @media (max-width: 768px) {
      /* Скрываем блок профиля только на мобильной версии */
      .profile-row {
        display: none !important;
      }

      /* Не кликабельный логотип и название приложения на мобильной версии */
      .mobile-brand-header {
        display: flex !important;
        align-items: center;
        gap: 11px;
        padding: 12px 14px 4px;
        margin-bottom: 2px;
        pointer-events: none !important;
        user-select: none !important;
        cursor: default !important;
      }

      .mobile-brand-logo {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        object-fit: cover;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
        pointer-events: none !important;
        user-select: none !important;
        flex-shrink: 0;
      }

      .mobile-brand-title {
        font-size: 19px;
        font-weight: 800;
        color: var(--text, #ffffff);
        letter-spacing: 0.25px;
        line-height: 1.2;
        pointer-events: none !important;
        user-select: none !important;
        cursor: default !important;
      }
    }
`;

const sidebarTopAnchor = `    /* HIDE TOP HEADER: logo, app title, folders button, theme button, lang button are now only in Profile settings */
    .sidebar-top {`;

if (!content.includes('.mobile-brand-header {')) {
  if (content.includes(sidebarTopAnchor)) {
    content = content.replace(sidebarTopAnchor, cssToInsert + '\n    ' + sidebarTopAnchor);
    console.log('✓ Added CSS for .mobile-brand-header and mobile-only .profile-row hide');
  } else {
    console.warn('⚠ Could not find sidebarTopAnchor');
  }
}

// 2. Add .mobile-brand-header in HTML right before .profile-row in #tgChatsContent
const oldChatsHtml = `    <!-- CHATS VIEW (default) -->
    <div class="tg-chats-content" id="tgChatsContent">
      <div class="profile-row" onclick="openMyProfile()">`;

const newChatsHtml = `    <!-- CHATS VIEW (default) -->
    <div class="tg-chats-content" id="tgChatsContent">
      <!-- Не кликабельные логотип и название только для мобильной версии -->
      <div class="mobile-brand-header">
        <img src="logo.png" class="mobile-brand-logo" alt="Logo" draggable="false">
        <span class="mobile-brand-title" data-i18n="appTitle">Беспонтовый Чат</span>
      </div>
      <div class="profile-row" onclick="openMyProfile()">`;

if (!content.includes('class="mobile-brand-header"')) {
  if (content.includes(oldChatsHtml)) {
    content = content.replace(oldChatsHtml, newChatsHtml);
    console.log('✓ Injected .mobile-brand-header into HTML');
  } else {
    console.warn('⚠ Could not find oldChatsHtml directly');
  }
}

// 3. Update setLanguage to update .mobile-brand-title explicitly
const oldLogosSelect = `      const logos = document.querySelectorAll('.logo-text-name, .auth-logo-name');`;
const newLogosSelect = `      const logos = document.querySelectorAll('.logo-text-name, .auth-logo-name, .mobile-brand-title');`;

if (content.includes(oldLogosSelect)) {
  content = content.replace(oldLogosSelect, newLogosSelect);
  console.log('✓ Added .mobile-brand-title to setLanguage selector');
}

fs.writeFileSync(path, content, 'utf8');
console.log('File length after:', content.length);
console.log('Done applying mobile brand header!');
