// server/test-mentions.js
function testProcessLinks(text) {
  text = text.replace(/<span class="mention-chip"([^>]*)>@?([a-zA-Z0-9_.-]+)<\/span>/g, (m, attrs, nick) => {
    return `<span class="mention-chip"${attrs} style="cursor:pointer" onclick="event.stopPropagation();openProfileByNick('${nick}')" title="Профиль @${nick}">@${nick}</span>`;
  });
  text = text.replace(/<[^>]+>|(https?:\/\/[^\s<>"]+)/g, (m, url) =>
    url ? `<a href="${url}" target="_blank" rel="noopener" onclick="return handleLink('${url}',event)" style="color:var(--acc3);word-break:break-all">${url}</a>` : m);
  text = text.replace(/<[^>]+>|((?:^|[^\w@]))@([a-zA-Z0-9_.-]+)/g, (m, pre, nick) => {
    if (!nick) return m;
    return (pre || '') + `<span class="mention-link" style="color:var(--acc3,#5b8fb9);font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px;" onclick="event.stopPropagation();openProfileByNick('${nick}')" title="Профиль @${nick}">@${nick}</span>`;
  });
  return text;
}

function formatMentionsHtml(text) {
  if (!text) return '';
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  let res = escaped.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener" onclick="event.stopPropagation();" style="color:var(--acc3,#5b8fb9);text-decoration:underline;">$1</a>');

  res = res.replace(/(^|[^\w@])@([a-zA-Z0-9_.-]+)/g, (match, prefix, username) => {
    return prefix + '<span class="mention-link" style="color:var(--acc3,#5b8fb9);font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px;" onclick="event.stopPropagation();openProfileByNick(\'' + username + '\')" title="Профиль @' + username + '">@' + username + '</span>';
  });

  return res.replace(/\n/g, '<br>');
}

console.log('--- testProcessLinks ---');
console.log('1:', testProcessLinks('hello @world!'));
console.log('2:', testProcessLinks('<img src="https://test.com/img.png"> @alex'));
console.log('3:', testProcessLinks('email is test@example.com don\'t touch'));
console.log('4:', testProcessLinks('<span class="mention-chip" data-uid="123">@user1</span>'));

console.log('\n--- formatMentionsHtml ---');
console.log('1:', formatMentionsHtml('Привет! Мой второй акк: @alex_dev, пишите туда.'));
console.log('2:', formatMentionsHtml('Сайт: https://google.com и телега @durov'));
console.log('3:', formatMentionsHtml('Почта test@mail.ru не должна матчиться'));
console.log('4:', formatMentionsHtml('@first @second_user @user.name'));
