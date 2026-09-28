// server/fix-poll-modal.js
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

const newSendPollCode = `let _sendingPoll = false;
    async function sendPoll() {
      if (_sendingPoll) return;
      if (!activeId || !me) {
        if (typeof showToast === 'function') showToast('Опрос', 'Выберите чат для отправки опроса', 'info');
        closeModal('modal-poll');
        return;
      }
      const optInputs = document.querySelectorAll('#pollOptions input');
      if (optInputs && optInputs.length) {
        optInputs.forEach((inp, idx) => {
          if (pollOptions[idx]) pollOptions[idx].text = inp.value;
        });
      }
      const q = document.getElementById('pollQuestion')?.value.trim() || '';
      if (!q) {
        if (typeof showToast === 'function') showToast('Опрос', 'Введите вопрос опроса', 'info');
        return;
      }
      const opts = pollOptions.map(o => o.text.trim()).filter(Boolean);
      if (opts.length < 2) {
        if (typeof showToast === 'function') showToast('Опрос', 'Добавьте хотя бы 2 варианта ответа', 'info');
        return;
      }
      const isQuiz = !!document.getElementById('pollQuiz')?.checked;
      const isMultiple = !!document.getElementById('pollMultiple')?.checked;
      const isAnonymous = !!document.getElementById('pollAnonymous')?.checked;
      const desc = document.getElementById('pollDesc')?.value.trim() || '';
      const validOpts = pollOptions.map((o, i) => ({ text: o.text.trim(), origIdx: i })).filter(o => o.text);
      const correctIdxs = isQuiz ? [...pollCorrectIdxs].filter(i => validOpts.find(o => o.origIdx === i)).map(i => validOpts.findIndex(o => o.origIdx === i)) : [];

      const pollData = {
        type: 'poll', uid: me.uid, author: me.nick, at: firebase.firestore.FieldValue.serverTimestamp(), text: '',
        poll: { question: q, desc, options: opts, isQuiz, isMultiple, isAnonymous, votes: {}, correctIdxs }
      };

      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      closeModal('modal-poll');

      _sendingPoll = true;
      try {
        await db.collection('chats').doc(activeId).collection('messages').add(pollData);
        await db.collection('chats').doc(activeId).update({
          lastMsg: '📊 ' + q,
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        });
        if (msgsUnsub && msgsUnsub._run) msgsUnsub._run();
      } catch (e) {
        console.error('[sendPoll] failed:', e);
        if (typeof showToast === 'function') {
          showToast('Ошибка', 'Не удалось отправить опрос: ' + (e && e.message || e), 'error');
        }
      } finally {
        _sendingPoll = false;
        closeModal('modal-poll');
      }
    }`;

const regex = /async function sendPoll\(\)\s*\{[\s\S]*?closeModal\('modal-poll'\);\s*\}/;

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  if (!regex.test(content)) {
    console.error('Regex did not match in:', f);
    process.exit(1);
  }
  content = content.replace(regex, newSendPollCode);
  fs.writeFileSync(f, content, 'utf8');
  console.log('Successfully patched sendPoll in:', f);
}
