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
      service: 'NonsenseChat Resend Email Endpoint',
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'RESEND_API_KEY is not configured in Vercel environment variables',
    });
  }

  try {
    const body = req.body || {};
    const action = String(body.action || 'otp').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const link = String(body.link || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }

    let subject = 'NonsenseChat';
    let html = '';

    if (action === 'otp') {
      if (!code || code.length < 4) {
        return res.status(400).json({ error: 'Не указан одноразовый код' });
      }
      subject = `🔐 Ваш одноразовый код для входа: ${code} | NonsenseChat`;
      html = `
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f1923;color:#e8f0f9;border-radius:16px;">
          <h2 style="margin:0 0 12px;color:#fff;font-size:22px;">Одноразовый код для входа</h2>
          <p style="font-size:14px;color:#8aabb8;line-height:1.5;margin-bottom:20px;">
            Вы запросили вход в <b>NonsenseChat</b> без пароля. Введите этот 6-значный код в окне приложения:
          </p>
          <div style="background:#1b2838;border:2px dashed #3b82f6;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
            <span style="font-size:32px;letter-spacing:6px;font-weight:700;color:#60a5fa;font-family:monospace;">${code}</span>
          </div>
          <p style="font-size:12px;color:#8aabb8;margin:0;">
            Код действителен в течение 10 минут. Если вы не запрашивали вход, просто проигнорируйте это письмо.
          </p>
        </div>
      `;
    } else if (action === 'verify') {
      if (!link) {
        return res.status(400).json({ error: 'Не указана ссылка подтверждения' });
      }
      subject = '✨ Подтвердите адрес электронной почты | NonsenseChat';
      html = `
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f1923;color:#e8f0f9;border-radius:16px;">
          <h2 style="margin:0 0 12px;color:#fff;font-size:22px;">Подтвердите почту</h2>
          <p style="font-size:14px;color:#8aabb8;line-height:1.5;margin-bottom:20px;">
            Нажмите на кнопку ниже, чтобы подтвердить ваш адрес <b>${email}</b> в NonsenseChat:
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${link}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;">
              Подтвердить email
            </a>
          </div>
        </div>
      `;
    } else if (action === 'reset') {
      if (!link) {
        return res.status(400).json({ error: 'Не указана ссылка сброса пароля' });
      }
      subject = '🔑 Сброс пароля | NonsenseChat';
      html = `
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f1923;color:#e8f0f9;border-radius:16px;">
          <h2 style="margin:0 0 12px;color:#fff;font-size:22px;">Сброс пароля в NonsenseChat</h2>
          <p style="font-size:14px;color:#8aabb8;line-height:1.5;margin-bottom:20px;">
            Нажмите на кнопку ниже, чтобы задать новый пароль для аккаунта <b>${email}</b>:
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${link}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;">
              Сбросить пароль
            </a>
          </div>
        </div>
      `;
    } else {
      return res.status(400).json({ error: 'Неизвестное действие (action)' });
    }

    const from = process.env.RESEND_FROM || 'NonsenseChat <noreply@nonsensechat.ru>';
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [email], subject, html }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data.message || 'Ошибка Resend API' });
    }

    return res.status(200).json({ ok: true, id: data.id || null });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
