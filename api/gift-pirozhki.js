const RTDB_URL = 'https://nonsensechattm-e5d18-default-rtdb.firebaseio.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({
      ok: true,
      service: 'NonsenseChat Pirozhki Transfer / Gift API'
    });
  }

  try {
    const body = req.body || {};
    const { fromUid, toUid, count, comment, fromNick, toNick } = body;

    if (!fromUid || typeof fromUid !== 'string') {
      return res.status(400).json({ error: 'Не указан отправитель (fromUid)' });
    }
    if (!toUid || typeof toUid !== 'string') {
      return res.status(400).json({ error: 'Не указан получатель (toUid)' });
    }
    if (fromUid === toUid) {
      return res.status(400).json({ error: 'Нельзя дарить пирожки самому себе' });
    }

    const giftCount = parseInt(count, 10);
    if (!giftCount || giftCount <= 0) {
      return res.status(400).json({ error: 'Количество пирожков должно быть больше нуля' });
    }
    if (giftCount > 50000) {
      return res.status(400).json({ error: 'Превышен лимит разового перевода (50 000 шт.)' });
    }

    // 1. Читаем текущий баланс отправителя
    const senderRes = await fetch(`${RTDB_URL}/users/${fromUid}/pirozhki.json`);
    const senderBalRaw = await senderRes.json();
    const senderBal = typeof senderBalRaw === 'number' ? senderBalRaw : 0;

    if (senderBal < giftCount) {
      return res.status(400).json({
        error: `Недостаточно пирожков. Баланс: ${senderBal} 🥟, требуется: ${giftCount} 🥟`,
        currentBalance: senderBal
      });
    }

    // 2. Читаем баланс получателя
    const recipientRes = await fetch(`${RTDB_URL}/users/${toUid}/pirozhki.json`);
    const recipientBalRaw = await recipientRes.json();
    const recipientBal = typeof recipientBalRaw === 'number' ? recipientBalRaw : 0;

    const newSenderBal = senderBal - giftCount;
    const newRecipientBal = recipientBal + giftCount;
    const txId = 'gift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 150) : '';

    // 3. Атомарно обновляем балансы в RTDB
    await fetch(`${RTDB_URL}/users/${fromUid}/pirozhki.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSenderBal)
    });

    await fetch(`${RTDB_URL}/users/${toUid}/pirozhki.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecipientBal)
    });

    // 4. Записываем историю транзакций обоим пользователям
    const now = Date.now();
    await fetch(`${RTDB_URL}/users/${fromUid}/pirozhki_history/${txId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: -giftCount,
        timestamp: now,
        type: 'gift_sent',
        toUid,
        toNick: toNick || '',
        note: cleanComment || 'Угощение пирожками 🥟'
      })
    });

    await fetch(`${RTDB_URL}/users/${toUid}/pirozhki_history/${txId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: giftCount,
        timestamp: now,
        type: 'gift_received',
        fromUid,
        fromNick: fromNick || '',
        note: cleanComment || 'Угощение пирожками 🥟'
      })
    });

    console.log(`[Pirozhki Gift] Success: ${fromUid} -> ${toUid} (${giftCount} pcs)`);

    return res.status(200).json({
      ok: true,
      txId,
      giftCount,
      newSenderBalance: newSenderBal,
      fromUid,
      toUid
    });
  } catch (err) {
    console.error('[Pirozhki Gift Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера: ' + (err.message || err) });
  }
};
