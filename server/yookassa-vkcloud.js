/**
 * NonsenseChat — YooKassa Payment Backend for VK Cloud
 * ====================================================
 * Поддерживает:
 *   1) Запуск на ВМ / Cloud Server в VK Cloud (через Node.js / PM2 / Docker)
 *   2) Запуск в качестве VK Cloud Serverless Function (Cloud Functions)
 */

'use strict';

const http = require('http');
const crypto = require('crypto');

const SHOP_ID = process.env.YOOKASSA_SHOP_ID || '1528725';
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || 'live_9kiIulxU1SM4zNPlFwyOg7e5p23rOpIMdNpbu5OJ9Bg';
const PORT = process.env.PORT || 8787;
const HOST = process.env.HOST || '0.0.0.0';
const RTDB_URL = 'https://nonsensechattm-e5d18-default-rtdb.firebaseio.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json'
};

async function handleCreatePayment(body) {
  const { amount, pirozhki, uid, returnUrl, description } = body || {};
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

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': orderId,
      'Authorization': 'Basic ' + Buffer.from(SHOP_ID + ':' + SECRET_KEY).toString('base64')
    },
    body: JSON.stringify(ykPayload)
  });

  const data = await res.json();
  if (res.ok && data && data.confirmation && data.confirmation.confirmation_url) {
    return {
      status: 200,
      data: {
        success: true,
        orderId,
        paymentId: data.id,
        confirmationUrl: data.confirmation.confirmation_url,
        paymentStatus: data.status
      }
    };
  } else {
    console.error('[YooKassa Error]', data);
    return {
      status: res.status || 400,
      data: {
        success: false,
        error: (data && (data.description || data.code)) || 'Ошибка создания платежа в ЮKassa'
      }
    };
  }
}

async function handleWebhook(body) {
  try {
    const event = body;
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
    return { status: 200, data: { ok: true } };
  } catch (err) {
    console.error('[Webhook error]', err);
    return { status: 500, data: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// Standalone HTTP Server
// ---------------------------------------------------------------------------
function createServer() {
  const server = http.createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Health check
    if (pathname === '/' || pathname === '/health') {
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({
        ok: true,
        service: 'NonsenseChat YooKassa VK Cloud Gateway',
        shopId: SHOP_ID,
        time: new Date().toISOString()
      }));
      return;
    }

    // Read JSON body
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', async () => {
      let body = {};
      try {
        if (rawBody) body = JSON.parse(rawBody);
      } catch (_) {}

      if (pathname === '/api/payment/yookassa/create' || pathname === '/payment/create') {
        const result = await handleCreatePayment(body);
        res.writeHead(result.status, CORS_HEADERS);
        res.end(JSON.stringify(result.data));
        return;
      }

      if (pathname === '/api/payment/yookassa/webhook' || pathname === '/payment/webhook' || pathname === '/webhook') {
        const result = await handleWebhook(body);
        res.writeHead(result.status, CORS_HEADERS);
        res.end(JSON.stringify(result.data));
        return;
      }

      res.writeHead(404, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Not found' }));
    });
  });

  return server;
}

// Serverless Handler for VK Cloud / Yandex Cloud Functions
module.exports = async function (event, context) {
  const method = (event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method) || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const path = event.path || (event.requestContext && event.requestContext.http && event.requestContext.http.path) || '/';
  let body = {};
  try {
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : event.body;
    }
  } catch (_) {}

  if (path.includes('webhook')) {
    const res = await handleWebhook(body);
    return { statusCode: res.status, headers: CORS_HEADERS, body: JSON.stringify(res.data) };
  }

  if (path.includes('create')) {
    const res = await handleCreatePayment(body);
    return { statusCode: res.status, headers: CORS_HEADERS, body: JSON.stringify(res.data) };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ ok: true, service: 'NonsenseChat YooKassa VK Cloud Function', shopId: SHOP_ID })
  };
};

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`[YooKassa VK Cloud] Gateway running on http://${HOST}:${PORT}`);
    console.log(`ShopID: ${SHOP_ID}`);
  });
}
