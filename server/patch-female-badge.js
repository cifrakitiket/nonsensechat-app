const fs = require('fs');
const path = require('path');

function patchFile(filePath, isElectron = false) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping non-existent file: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. CSS
  const femaleBadgeCss = `
    /* ═══ FEMALE BADGE ═══ */
    .female-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      background: linear-gradient(135deg, #ff4081, #e91e63);
      border-radius: 50%;
      font-size: 10px;
      font-weight: 900;
      color: #fff;
      margin-left: 3px;
      vertical-align: middle;
      flex-shrink: 0;
      cursor: default;
      position: relative;
      line-height: 1;
      box-shadow: 0 1px 4px rgba(233, 30, 99, .35);
    }

    .female-badge::after {
      content: '♀';
      font-weight: 900;
      font-size: 10.5px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateY(-0.5px);
    }

    .female-badge-lg {
      width: 20px;
      height: 20px;
      font-size: 13px;
      margin-left: 5px;
    }

    .female-badge-lg::after {
      font-size: 13.5px;
      transform: translateY(-0.5px);
    }

    .female-badge[title]:hover::before {
      content: attr(title);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 11px;
      color: var(--text);
      white-space: nowrap;
      z-index: 9999;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, .3);
      font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
      font-weight: 600;
      letter-spacing: 0;
    }

    .chat-name .female-badge,
    .msg-author .female-badge,
    .member-name .female-badge {
      width: 14px;
      height: 14px;
      font-size: 9px;
      margin-left: 3px;
    }

    .chat-name .female-badge::after,
    .msg-author .female-badge::after,
    .member-name .female-badge::after {
      font-size: 9.5px;
    }

    .ch-name .female-badge {
      width: 16px;
      height: 16px;
      font-size: 11px;
      margin-left: 5px;
    }

    .ch-name .female-badge::after {
      font-size: 11px;
    }
`;

  if (!content.includes('.female-badge {') && !content.includes('.female-badge{')) {
    const devBadgeTarget = isElectron 
      ? '.chat-name .dev-badge,.msg-author .dev-badge{height:14px;padding:0 4px;font-size:8px;border-radius:4px;margin-left:3px;}'
      : `.chat-name .dev-badge,
    .msg-author .dev-badge {
      height: 14px;
      padding: 0 4px;
      font-size: 8px;
      border-radius: 4px;
      margin-left: 3px;
    }`;

    if (content.includes(devBadgeTarget)) {
      content = content.replace(devBadgeTarget, devBadgeTarget + '\n' + femaleBadgeCss);
      modified = true;
      console.log(`✓ Added female-badge CSS to ${filePath}`);
    } else {
      // Regex fallback
      const cssRegex = /(\.chat-name \.dev-badge[\s\S]*?margin-left:\s*3px;\s*\})/;
      if (cssRegex.test(content)) {
        content = content.replace(cssRegex, '$1\n' + femaleBadgeCss);
        modified = true;
        console.log(`✓ Added female-badge CSS via regex to ${filePath}`);
      }
    }
  }

  // 2. CREATOR CONFIG & FEMALE_UIDS & isFemaleUser
  const femaleConfigJs = `
    // ═══ SPECIAL BADGES CONFIG ═══
    const FEMALE_UIDS = new Set([
      'ieg1YXWEzYNtxpFc7okSkhW041s1'
    ]);

    function isFemaleUser(u, uid) {
      const id = uid || (u && (u.uid || u.id));
      if (id && FEMALE_UIDS.has(id)) return true;
      if (u && (u.gender === 'female' || u.isFemale || u.sex === 'female')) return true;
      return false;
    }
`;

  if (!content.includes('FEMALE_UIDS')) {
    const creatorUidRegex = /(const CREATOR_UID\s*=\s*['"][^'"]+['"];)/;
    if (creatorUidRegex.test(content)) {
      content = content.replace(creatorUidRegex, '$1\n' + femaleConfigJs);
      modified = true;
      console.log(`✓ Added FEMALE_UIDS config to ${filePath}`);
    }
  }

  // 3. renderMyProfileHeader
  const oldHeaderPattern = /(if\s*\(\s*nickEl\s*\)\s*nickEl\.innerHTML\s*=\s*'@'\s*\+\s*p\.nick\s*\+\s*\(\s*p\.uid\s*===\s*CREATOR_UID\s*\?\s*' <span class="dev-badge"[^>]*>&lt;\/&gt;<\/span>'\s*:\s*''\s*\))([^;]*);/;
  if (oldHeaderPattern.test(content) && !content.includes('isFemaleUser(p, p.uid)')) {
    content = content.replace(oldHeaderPattern, `$1 + (isFemaleUser(p, p.uid) ? ' <span class="female-badge" title="Девушка"></span>' : '')$2;`);
    modified = true;
    console.log(`✓ Patched renderMyProfileHeader in ${filePath}`);
  }

  // 4. viewProfile
  const oldViewProfilePattern = /(const _devBadge\s*=\s*u\.uid\s*===\s*CREATOR_UID\s*\?\s*' <span class="dev-badge dev-badge-lg"[^>]*>&lt;\/&gt;<\/span>'\s*:\s*'';\s*const _verBadge\s*=\s*u\.verified\s*\?\s*' <span class="verified-badge verified-badge-lg"[^>]*><\/span>'\s*:\s*'';\s*nameEl\.innerHTML\s*=\s*dispName\s*\+\s*_verBadge\s*\+\s*_devBadge;)/;
  if (oldViewProfilePattern.test(content) && !content.includes('_femaleBadge')) {
    content = content.replace(oldViewProfilePattern, `const _devBadge = u.uid === CREATOR_UID ? ' <span class="dev-badge dev-badge-lg" title="Разработчик">&lt;/&gt;</span>' : '';
      const _verBadge = u.verified ? ' <span class="verified-badge verified-badge-lg" title="Верифицированный аккаунт"></span>' : '';
      const _femaleBadge = isFemaleUser(u, uid) ? ' <span class="female-badge female-badge-lg" title="Девушка"></span>' : '';
      nameEl.innerHTML = dispName + _verBadge + _devBadge + _femaleBadge;`);
    modified = true;
    console.log(`✓ Patched viewProfile in ${filePath}`);
  }

  // 5. toggleVerify
  if (!content.includes('isFemaleUser(u, vpUid)')) {
    const toggleVerifyRegex = /(document\.getElementById\('vpName'\)\.innerHTML\s*=\s*\(u\.fname\s*\?\s*u\.fname\s*\+\s*' '\s*\+\s*\(u\.lname\s*\|\|\s*''\)\s*:\s*u\.nick\)\s*\+\s*' <span class="verified-badge verified-badge-lg"[^>]*><\/span>'\s*\+\s*\(vpUid\s*===\s*CREATOR_UID\s*\?\s*' <span class="dev-badge dev-badge-lg"[^>]*>&lt;\/&gt;<\/span>'\s*:\s*''\);)/;
    if (toggleVerifyRegex.test(content)) {
      content = content.replace(toggleVerifyRegex, `$1\n        const _fBadge = isFemaleUser(u, vpUid) ? ' <span class="female-badge female-badge-lg" title="Девушка"></span>' : '';\n        document.getElementById('vpName').innerHTML += _fBadge;`);
      modified = true;
      console.log(`✓ Patched toggleVerify in ${filePath}`);
    }
  }

  // 6. renderChatList (chat-name)
  const oldChatListDevBadge = /(const devBadgeHtml\s*=\s*\(uid\s*===\s*CREATOR_UID\)\s*\?\s*'<span class="dev-badge" title="Разработчик">&lt;\/&gt;<\/span>'\s*:\s*'';)/;
  if (oldChatListDevBadge.test(content) && !content.includes('femaleBadgeHtml')) {
    content = content.replace(oldChatListDevBadge, `$1\n      const femaleBadgeHtml = (uid && isFemaleUser(uCache[uid], uid)) ? '<span class="female-badge" title="Девушка"></span>' : '';`);
    // And in the template string where @${name}${verifiedBadgeHtml}${devBadgeHtml} is
    content = content.replace(/(@\$\{name\}\$\{verifiedBadgeHtml\}\$\{devBadgeHtml\})/, '$1${femaleBadgeHtml}');
    modified = true;
    console.log(`✓ Patched renderChatList in ${filePath}`);
  }

  // 7. openChat header (chName)
  const oldChName1 = /(document\.getElementById\('chName'\)\.innerText\s*=\s*name;)/;
  if (oldChName1.test(content) && !content.includes('peerFemHtml')) {
    content = content.replace(oldChName1, `const peerPartner = dmPartnerUid ? uCache[dmPartnerUid] : null;
      const peerVerHtml = (data.type === 'dm' && peerPartner?.verified) ? ' <span class="verified-badge" title="Верифицированный аккаунт"></span>' : '';
      const peerDevHtml = (data.type === 'dm' && dmPartnerUid === CREATOR_UID) ? ' <span class="dev-badge" title="Разработчик">&lt;/&gt;</span>' : '';
      const peerFemHtml = (data.type === 'dm' && isFemaleUser(peerPartner, dmPartnerUid)) ? ' <span class="female-badge" title="Девушка"></span>' : '';
      document.getElementById('chName').innerHTML = (typeof escUp === 'function' ? escUp(name) : name) + peerVerHtml + peerDevHtml + peerFemHtml;`);
    modified = true;
    console.log(`✓ Patched openChat instant header in ${filePath}`);
  }

  const oldChName2 = /(document\.getElementById\('chName'\)\.innerText\s*=\s*u\.nick\s*\|\|\s*name;)/;
  if (oldChName2.test(content) && !content.includes('uFemHtml')) {
    content = content.replace(oldChName2, `const uVerHtml = u.verified ? ' <span class="verified-badge" title="Верифицированный аккаунт"></span>' : '';
              const uDevHtml = (dmPartnerUid === CREATOR_UID) ? ' <span class="dev-badge" title="Разработчик">&lt;/&gt;</span>' : '';
              const uFemHtml = isFemaleUser(u, dmPartnerUid) ? ' <span class="female-badge" title="Девушка"></span>' : '';
              document.getElementById('chName').innerHTML = (typeof escUp === 'function' ? escUp(u.nick || name) : (u.nick || name)) + uVerHtml + uDevHtml + uFemHtml;`);
    modified = true;
    console.log(`✓ Patched openChat async header in ${filePath}`);
  }

  // 8. msg-author in messages
  const oldMsgAuthor = /(\$\{m\.uid\s*===\s*CREATOR_UID\s*&&\s*!isOut\s*\?\s*'<span class="dev-badge" title="Разработчик">&lt;\/&gt;<\/span>'\s*:\s*''\})/;
  if (oldMsgAuthor.test(content) && !content.includes('isFemaleUser(u, m.uid)')) {
    content = content.replace(oldMsgAuthor, `$1\${isFemaleUser(u, m.uid) && !isOut ? '<span class="female-badge" title="Девушка"></span>' : ''}`);
    modified = true;
    console.log(`✓ Patched msg-author in ${filePath}`);
  }

  // 9. gsMembersList (group members)
  const oldGroupMember = /(<div class="member-name">@\$\{u\.nick\}<\/div>)/;
  if (oldGroupMember.test(content) && !content.includes('member-name">@${u.nick}${')) {
    content = content.replace(oldGroupMember, `<div class="member-name">@\${u.nick}\${u.verified ? ' <span class="verified-badge" title="Верифицированный аккаунт"></span>' : ''}\${uid === CREATOR_UID ? ' <span class="dev-badge" title="Разработчик">&lt;/&gt;</span>' : ''}\${isFemaleUser(u, uid) ? ' <span class="female-badge" title="Девушка"></span>' : ''}</div>`);
    modified = true;
    console.log(`✓ Patched gsMembersList in ${filePath}`);
  }

  // Fallback for electron openChat where oid is used instead of dmPartnerUid
  if (isElectron && content.includes('dmPartnerUid ? uCache[dmPartnerUid] : null;')) {
    content = content.replace(
      'const peerPartner = dmPartnerUid ? uCache[dmPartnerUid] : null;',
      'const targetOid = (typeof dmPartnerUid !== "undefined" && dmPartnerUid) || (typeof oid !== "undefined" && oid);\n      const peerPartner = targetOid ? uCache[targetOid] : null;'
    );
    content = content.replace(
      'const peerDevHtml = (data.type === \'dm\' && dmPartnerUid === CREATOR_UID)',
      'const peerDevHtml = (data.type === \'dm\' && targetOid === CREATOR_UID)'
    );
    content = content.replace(
      'const peerFemHtml = (data.type === \'dm\' && isFemaleUser(peerPartner, dmPartnerUid))',
      'const peerFemHtml = (data.type === \'dm\' && isFemaleUser(peerPartner, targetOid))'
    );
    modified = true;
    console.log(`✓ Fixed electron openChat targetOid in ${filePath}`);
  }

  // 10. friend requests (renderReqs)
  const oldReqs = /(<div class="chat-name">@\$\{r\.fromNick\}<\/div>)/;
  if (oldReqs.test(content) && !content.includes('isFemaleUser(null, r.from)')) {
    content = content.replace(oldReqs, `<div class="chat-name">@\${r.fromNick}\${isFemaleUser(null, r.from) ? ' <span class="female-badge" title="Девушка"></span>' : ''}</div>`);
    modified = true;
    console.log(`✓ Patched renderReqs in ${filePath}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully saved modifications to ${filePath}`);
  } else {
    console.log(`No changes made to ${filePath} (already patched or patterns not matched)`);
  }
}

console.log('=== Patching public/index.html ===');
patchFile(path.join(__dirname, '..', 'public', 'index.html'), false);

console.log('\n=== Patching electron-desktop/public/index.html ===');
patchFile(path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html'), true);
