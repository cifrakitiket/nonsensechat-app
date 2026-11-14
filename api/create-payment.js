const crypto = require('crypto');

const SHOP_ID = process.env.YOOKASSA_SHOP_ID || '1528725';
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || 'live_9kiIulxU1SM4zNPlFwyOg7e5p23rOpIMdNpbu5OJ9Bg';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({
      ok: true,
      service: 'NonsenseChat YooKassa Create Payment Endpoint',
      shopId: SHOP_ID
    });
  }

  try {
    const body = req.body || {};
    const { amount, pirozhki, uid, returnUrl, description } = body;
    const orderId = 'bch_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const count = parseInt(pirozhki, 10) || 100;
    const valRub = parseFloat(amount || (count * 0.42)).toFixed(2);

    const baseReturn = returnUrl || 'https://nonsensechat.ru';
    const sep = baseReturn.includes('?') ? '&' : '?';
    const finalReturnUrl = baseReturn + sep + 'paymentSuccess=true&orderId=' + encodeURIComponent(orderId) + '&pirozhki=' + count;

    const ykPayload = {
      amount: { value: valRub, currency: 'RUB' },
      confirmation: {
        type: 'redirect',
        return_url: finalReturnUrl
      },
      capture: true,
      description: description || ('Пополнение баланса (' + count + ' пирожков) в NonsenseChat'),
      metadata: {
        orderId,
        uid: uid || 'guest',
        pirozhki: count
      }
    };

    const ykRes = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': orderId,
        'Authorization': 'Basic ' + Buffer.from(SHOP_ID + ':' + SECRET_KEY).toString('base64')
      },
      body: JSON.stringify(ykPayload)
    });

    const data = await ykRes.json();
    if (ykRes.ok && data && data.confirmation && data.confirmation.confirmation_url) {
      return res.status(200).json({
        success: true,
        orderId,
        paymentId: data.id,
        confirmationUrl: data.confirmation.confirmation_url,
        paymentStatus: data.status
      });
    } else {
      console.error('[YooKassa Vercel API Error]', data);
      return res.status(ykRes.status || 400).json({
        success: false,
        error: (data && (data.description || data.code)) || 'Ошибка создания платежа в ЮKassa'
      });
    }
  } catch (err) {
    console.error('[Create Payment Handler Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
