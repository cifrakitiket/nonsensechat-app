const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

const bucket = admin.storage().bucket();

exports.getUploadUrl = functions.https.onCall(async (data, context) => {
  // Проверка авторизации
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { fileName, chatId } = data;

  if (!fileName || !chatId) {
    throw new functions.https.HttpsError('invalid-argument', 'fileName and chatId are required');
  }

  try {
    const file = bucket.file(`chats/${chatId}/${Date.now()}_${fileName}`);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'application/octet-stream',
    });

    return { 
      uploadUrl: url,
      fileName: file.name
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate upload URL');
  }
});

exports.getDownloadUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { filePath } = data;

  if (!filePath) {
    throw new functions.https.HttpsError('invalid-argument', 'filePath is required');
  }

  try {
    const file = bucket.file(filePath);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { downloadUrl: url };
  } catch (error) {
    console.error('Error generating download URL:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate download URL');
  }
});

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {}

exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  const email = (data && data.email) || (context.auth && context.auth.token && context.auth.token.email);
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  const returnUrl = (data && data.url) || 'https://nonsensechat.ru/?emailVerified=true';
  const actionCodeSettings = {
    url: returnUrl,
    handleCodeInApp: false
  };

  try {
    const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    const smtpHost = process.env.SMTP_HOST || (functions.config().smtp && functions.config().smtp.host);
    const smtpUser = process.env.SMTP_USER || (functions.config().smtp && functions.config().smtp.user);
    const smtpPass = process.env.SMTP_PASS || (functions.config().smtp && functions.config().smtp.pass);
    const smtpPort = parseInt(process.env.SMTP_PORT || (functions.config().smtp && functions.config().smtp.port) || '465', 10);
    const smtpFrom = process.env.SMTP_FROM || (functions.config().smtp && functions.config().smtp.from) || '"NonsenseChat" <noreply@nonsensechat.ru>';

    if (smtpHost && smtpUser && smtpPass && nodemailer) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      const fs = require('fs');
      const path = require('path');
      let html = '';
      try {
        html = fs.readFileSync(path.join(__dirname, 'email-verification-template.html'), 'utf8');
        html = html.replace(/%LINK%/g, link).replace(/%EMAIL%/g, email);
      } catch (fErr) {
        html = `<p>Подтвердите ваш email в NonsenseChat, перейдя по ссылке: <a href="${link}">${link}</a></p>`;
      }

      await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: '✨ Подтвердите адрес электронной почты | NonsenseChat',
        html: html
      });

      return { success: true, customSent: true };
    }

    return { success: true, customSent: false, link };
  } catch (err) {
    console.error('Error generating/sending verification email:', err);
    throw new functions.https.HttpsError('internal', err.message || 'Failed to send verification email');
  }
});



/* ════════════════════════════════════════════════════════════════════════
   OFFICIAL FIREBASE CLOUD MESSAGING (FCM) PUSH NOTIFICATIONS
   ════════════════════════════════════════════════════════════════════════ */

exports.sendLoginOtp = functions.https.onCall(async (data, context) => {
  const emailOrLogin = String((data && data.emailOrLogin) || '').trim().toLowerCase();
  if (!emailOrLogin) {
    throw new functions.https.HttpsError('invalid-argument', 'Email или логин обязателен');
  }

  let email = emailOrLogin;
  if (!email.includes('@')) {
    const cleanNick = email.replace(/^@+/, '');
    const unDoc = await admin.firestore().collection('usernames').doc(cleanNick).get();
    if (unDoc.exists && unDoc.data() && unDoc.data().email) {
      email = unDoc.data().email;
    } else {
      const uSnap = await admin.firestore().collection('users').where('nickLower', '==', cleanNick).limit(1).get();
      if (!uSnap.empty && uSnap.docs[0].data() && uSnap.docs[0].data().email) {
        email = uSnap.docs[0].data().email;
      } else {
        throw new functions.https.HttpsError('not-found', `Пользователь с логином "@${cleanNick}" не найден`);
      }
    }
  }

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (e) {
    throw new functions.https.HttpsError('not-found', 'Пользователь с таким email не найден');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const docId = email.replace(/[^a-z0-9]/g, '_');

  await admin.firestore().collection('login_otps').doc(docId).set({
    code,
    uid: userRecord.uid,
    email,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Отправка через SMTP если настроен
  try {
    const smtpHost = process.env.SMTP_HOST || (functions.config().smtp && functions.config().smtp.host);
    const smtpUser = process.env.SMTP_USER || (functions.config().smtp && functions.config().smtp.user);
    const smtpPass = process.env.SMTP_PASS || (functions.config().smtp && functions.config().smtp.pass);
    const smtpPort = parseInt(process.env.SMTP_PORT || (functions.config().smtp && functions.config().smtp.port) || '465', 10);
    const smtpFrom = process.env.SMTP_FROM || (functions.config().smtp && functions.config().smtp.from) || '"NonsenseChat" <noreply@nonsensechat.ru>';

    if (smtpHost && smtpUser && smtpPass && nodemailer) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: `🔐 Ваш одноразовый код для входа: ${code} | NonsenseChat`,
        html: `
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
        `
      });
      return { success: true, email, method: 'smtp' };
    }
  } catch (mailErr) {
    console.warn('sendLoginOtp mail transport error:', mailErr);
  }

  return { success: true, email, method: 'code_saved' };
});

exports.verifyLoginOtp = functions.https.onCall(async (data, context) => {
  const emailOrLogin = String((data && data.emailOrLogin) || '').trim().toLowerCase();
  const code = String((data && data.code) || '').trim();

  if (!emailOrLogin || !code) {
    throw new functions.https.HttpsError('invalid-argument', 'Email/логин и код обязательны');
  }

  let email = emailOrLogin;
  if (!email.includes('@')) {
    const cleanNick = email.replace(/^@+/, '');
    const unDoc = await admin.firestore().collection('usernames').doc(cleanNick).get();
    if (unDoc.exists && unDoc.data() && unDoc.data().email) {
      email = unDoc.data().email;
    }
  }

  const docId = email.replace(/[^a-z0-9]/g, '_');
  const docRef = admin.firestore().collection('login_otps').doc(docId);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Код не найден или истёк. Запросите новый код.');
  }

  const rec = snap.data();
  if (Date.now() > rec.expiresAt) {
    await docRef.delete().catch(() => {});
    throw new functions.https.HttpsError('deadline-exceeded', 'Срок действия кода истёк. Запросите новый.');
  }

  if (rec.attempts >= 5) {
    await docRef.delete().catch(() => {});
    throw new functions.https.HttpsError('resource-exhausted', 'Слишком много неверных попыток. Запросите код заново.');
  }

  if (rec.code !== code) {
    await docRef.update({ attempts: (rec.attempts || 0) + 1 }).catch(() => {});
    throw new functions.https.HttpsError('invalid-argument', 'Неверный 6-значный код');
  }

  await docRef.delete().catch(() => {});
  const customToken = await admin.auth().createCustomToken(rec.uid);
  return { success: true, customToken, uid: rec.uid };
});

exports.sendPushOnMessage = functions.firestore
  .document('chats/{chatId}/messages/{msgId}')
  .onCreate(async (snap, context) => {
    const msg = snap.data();
    if (!msg) return;

    // Do not notify on silent typing indicators or specific system events if not needed
    if (msg.silent) return;

    const chatId = context.params.chatId;
    const senderId = msg.sender || msg.senderId || msg.uid || '';
    const rawText = msg.text || (msg.mediaUrl ? '📷 Вложение' : (msg.voiceUrl ? '🎤 Голосовое сообщение' : 'Новое сообщение'));
    const safeText = String(rawText).slice(0, 160);

    try {
      // 1. Load Chat details
      const chatDoc = await admin.firestore().collection('chats').doc(chatId).get();
      if (!chatDoc.exists) return;
      const chatData = chatDoc.data() || {};
      const members = chatData.members || [];
      const recipients = members.filter(uid => uid && uid !== senderId);
      if (!recipients.length) return;

      // 2. Load Sender profile
      let senderName = msg.senderNick || 'NonsenseChat';
      if (senderId) {
        try {
          const senderDoc = await admin.firestore().collection('users').doc(senderId).get();
          if (senderDoc.exists) {
            const u = senderDoc.data();
            senderName = u.nick ? ('@' + u.nick) : (u.displayName || (u.fname ? u.fname + ' ' + (u.lname || '') : senderName));
          }
        } catch (_) {}
      }

      // Title formatting
      const isGroupOrChannel = (chatData.type === 'group' || chatData.type === 'channel');
      const notifTitle = isGroupOrChannel 
        ? (chatData.name || 'Группа') + ' · ' + senderName 
        : senderName;

      // 3. Gather FCM tokens for recipients from Firestore: users/{rUid}/fcmTokens
      const tokenSet = new Set();
      for (const rUid of recipients) {
        try {
          const tokensSnap = await admin.firestore().collection('users').doc(rUid).collection('fcmTokens').get();
          tokensSnap.forEach(tDoc => {
            const tok = tDoc.data()?.token || tDoc.id;
            if (tok && typeof tok === 'string' && tok.length > 20) tokenSet.add(tok);
          });
          // Check direct field
          const uDoc = await admin.firestore().collection('users').doc(rUid).get();
          if (uDoc.exists && uDoc.data()?.fcmToken && typeof uDoc.data().fcmToken === 'string') {
            tokenSet.add(uDoc.data().fcmToken);
          }
        } catch (e) {
          console.warn('[FCM] Error reading tokens for user:', rUid, e.message);
        }
      }

      const allTokens = Array.from(tokenSet);
      if (!allTokens.length) {
        console.log('[FCM] No recipient tokens for chat:', chatId);
        return;
      }

      // 4. Send official Firebase Cloud Messaging Multicast
      const payload = {
        notification: {
          title: notifTitle,
          body: safeText
        },
        data: {
          chatId: String(chatId),
          senderId: String(senderId),
          title: String(notifTitle),
          body: String(safeText),
          openChat: String(chatId)
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'nonsense_chat_channel',
            sound: 'default',
            priority: 'max',
            visibility: 'public',
            icon: 'ic_launcher'
          }
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title: notifTitle,
            body: safeText,
            icon: '/logo.png',
            badge: '/favicon-96x96.png',
            tag: 'chat-' + chatId
          },
          fcmOptions: {
            link: 'https://nonsensechat.ru/?openChat=' + encodeURIComponent(chatId)
          }
        },
        tokens: allTokens
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log(`[FCM] Sent message to chat ${chatId}: ${response.successCount} success, ${response.failureCount} failed`);

      // Cleanup invalid tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered') {
              const badToken = allTokens[idx];
              recipients.forEach(rUid => {
                admin.firestore().collection('users').doc(rUid).collection('fcmTokens').doc(badToken).delete().catch(() => {});
              });
            }
          }
        });
      }
    } catch (err) {
      console.error('[FCM] sendPushOnMessage fatal error:', err);
    }
  });

/* ── Callable Direct FCM Notification (Fallback & Manual) ── */
exports.sendFcmNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { chatId, previewText } = data;
  if (!chatId) {
    throw new functions.https.HttpsError('invalid-argument', 'chatId is required');
  }

  const senderId = context.auth.uid;
  const safeText = String(previewText || 'Новое сообщение').slice(0, 160);

  try {
    const chatDoc = await admin.firestore().collection('chats').doc(chatId).get();
    if (!chatDoc.exists) return { success: false, reason: 'chat_not_found' };

    const chatData = chatDoc.data() || {};
    const members = chatData.members || [];
    const recipients = members.filter(uid => uid && uid !== senderId);
    if (!recipients.length) return { success: true, count: 0 };

    let senderName = 'NonsenseChat';
    const senderDoc = await admin.firestore().collection('users').doc(senderId).get();
    if (senderDoc.exists) {
      const u = senderDoc.data();
      senderName = u.nick ? ('@' + u.nick) : (u.displayName || senderName);
    }

    const isGroupOrChannel = (chatData.type === 'group' || chatData.type === 'channel');
    const notifTitle = isGroupOrChannel ? (chatData.name || 'Группа') + ' · ' + senderName : senderName;

    const tokenSet = new Set();
    for (const rUid of recipients) {
      const tokensSnap = await admin.firestore().collection('users').doc(rUid).collection('fcmTokens').get();
      tokensSnap.forEach(tDoc => {
        const tok = tDoc.data()?.token || tDoc.id;
        if (tok && typeof tok === 'string') tokenSet.add(tok);
      });
    }

    const allTokens = Array.from(tokenSet);
    if (!allTokens.length) return { success: true, count: 0 };

    const payload = {
      notification: { title: notifTitle, body: safeText },
      data: { chatId: String(chatId), senderId: String(senderId), openChat: String(chatId) },
      android: {
        priority: 'high',
        notification: { channelId: 'nonsense_chat_channel', sound: 'default' }
      },
      tokens: allTokens
    };

    const res = await admin.messaging().sendEachForMulticast(payload);
    return { success: true, count: res.successCount };
  } catch (err) {
    console.error('[FCM] sendFcmNotification error:', err);
    throw new functions.https.HttpsError('internal', err.message || 'FCM error');
  }
});


// ── YooKassa Payment Functions ──
exports.createYooKassaPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { amount, pirozhki, description, returnUrl } = data || {};
  const uid = context.auth.uid;
  const shopId = process.env.YOOKASSA_SHOP_ID || (functions.config().yookassa && functions.config().yookassa.shop_id);
  const secretKey = process.env.YOOKASSA_SECRET_KEY || (functions.config().yookassa && functions.config().yookassa.secret_key);
  const orderId = 'bch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const fallbackConfirmationUrl = (returnUrl || 'https://nonsensechattm-e5d18.web.app') + 
    '?paymentSuccess=true&orderId=' + encodeURIComponent(orderId) + 
    '&pirozhki=' + encodeURIComponent(pirozhki || 100);

  if (shopId && secretKey) {
    try {
      const ykPayload = {
        amount: { value: parseFloat(amount || 42).toFixed(2), currency: 'RUB' },
        confirmation: {
          type: 'redirect',
          return_url: fallbackConfirmationUrl
        },
        capture: true,
        description: description || ('Пополнение баланса (' + (pirozhki || 100) + ' пирожков) в NonsenseChat'),
        metadata: { orderId, uid, pirozhki: pirozhki || 100 }
      };

      const res = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotence-Key': orderId,
          'Authorization': 'Basic ' + Buffer.from(shopId + ':' + secretKey).toString('base64')
        },
        body: JSON.stringify(ykPayload)
      });
      const ykData = await res.json();
      return {
        success: true,
        orderId,
        paymentId: ykData.id,
        confirmationUrl: ykData.confirmation ? ykData.confirmation.confirmation_url : fallbackConfirmationUrl,
        status: ykData.status
      };
    } catch (e) {
      console.error('YooKassa Function API Error:', e);
    }
  }

  return {
    success: true,
    orderId,
    paymentId: 'demo_' + orderId,
    confirmationUrl: fallbackConfirmationUrl,
    isDemo: true
  };
});

exports.yookassaWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const event = req.body;
    if (event && event.event === 'payment.succeeded' && event.object) {
      const { metadata, amount } = event.object;
      const uid = metadata && metadata.uid;
      const pirozhki = parseInt(metadata && metadata.pirozhki, 10);
      if (uid && pirozhki > 0) {
        const uRef = admin.firestore().collection('users').doc(uid);
        await uRef.set({
          pirozhki: admin.firestore.FieldValue.increment(pirozhki),
          lastDepositAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await admin.firestore().collection('payments').doc(metadata.orderId || event.object.id).set({
          uid,
          amountRub: amount && amount.value,
          pirozhki,
          paymentId: event.object.id,
          status: 'succeeded',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    res.status(200).send({ ok: true });
  } catch (err) {
    console.error('yookassaWebhook error:', err);
    res.status(400).send({ error: err.message });
  }
});
