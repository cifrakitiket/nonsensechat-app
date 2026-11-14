const RTDB_URL = 'https://nonsensechattm-e5d18-default-rtdb.firebaseio.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, endpoint: 'YooKassa Webhook Endpoint' });
  }

  try {
    const event = req.body || {};
    if (event && event.event === 'payment.succeeded' && event.object) {
      const { metadata, amount } = event.object;
      const uid = metadata && metadata.uid;
      const pirozhki = parseInt(metadata && metadata.pirozhki, 10);
      const orderId = metadata && metadata.orderId;

      if (uid && uid !== 'guest' && pirozhki > 0) {
        try {
          const getRes = await fetch(`${RTDB_URL}/users/${uid}/pirozhki.json`);
          const cur = (await getRes.json()) || 0;
          const nextVal = (typeof cur === 'number' ? cur : 0) + pirozhki;

          await fetch(`${RTDB_URL}/users/${uid}/pirozhki.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextVal)
          });

          await fetch(`${RTDB_URL}/users/${uid}/pirozhki_history/${orderId || Date.now()}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: pirozhki,
              rub: amount && amount.value,
              timestamp: Date.now(),
              type: 'yookassa',
              paymentId: event.object.id
            })
          });

          console.log(`[YooKassa Webhook] Success: +${pirozhki} pirozhki to user ${uid}`);
        } catch (dbErr) {
          console.error('[RTDB Update Error]', dbErr);
        }
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook error]', err);
    return res.status(500).json({ error: err.message });
  }
};
