const RTDB_URL = 'https://nonsensechattm-e5d18-default-rtdb.firebaseio.com';
const SHOP_ID = process.env.YOOKASSA_SHOP_ID || '1528725';
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || 'live_9kiIulxU1SM4zNPlFwyOg7e5p23rOpIMdNpbu5OJ9Bg';

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

    // 1. Успешная оплата (начисление пирожков)
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
          console.error('[RTDB Payment Update Error]', dbErr);
        }
      }
    }

    // 2. Успешный возврат денег через ЮKassa (списание пирожков)
    if (event && event.event === 'refund.succeeded' && event.object) {
      const refundObj = event.object;
      const paymentId = refundObj.payment_id;

      if (paymentId) {
        try {
          // Запрашиваем данные оригинального платежа из ЮKassa для получения uid и pirozhki
          const pRes = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            headers: {
              'Authorization': 'Basic ' + Buffer.from(SHOP_ID + ':' + SECRET_KEY).toString('base64')
            }
          });
          const paymentData = await pRes.json();
          const uid = paymentData && paymentData.metadata && paymentData.metadata.uid;
          const pirozhki = parseInt(paymentData && paymentData.metadata && paymentData.metadata.pirozhki, 10);

          if (uid && uid !== 'guest' && pirozhki > 0) {
            const getRes = await fetch(`${RTDB_URL}/users/${uid}/pirozhki.json`);
            const cur = (await getRes.json()) || 0;
            const nextVal = Math.max(0, (typeof cur === 'number' ? cur : 0) - pirozhki);

            await fetch(`${RTDB_URL}/users/${uid}/pirozhki.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(nextVal)
            });

            await fetch(`${RTDB_URL}/users/${uid}/pirozhki_history/ref_${Date.now()}.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: -pirozhki,
                rub: refundObj.amount && refundObj.amount.value,
                timestamp: Date.now(),
                type: 'refund',
                refundId: refundObj.id,
                paymentId
              })
            });

            console.log(`[YooKassa Refund] Success: deducted ${pirozhki} pirozhki from user ${uid}`);
          }
        } catch (rErr) {
          console.error('[Refund Processing Error]', rErr);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook error]', err);
    return res.status(500).json({ error: err.message });
  }
};
