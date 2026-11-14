const https = require('https');
const http = require('http');

// Default built-in dev endpoints and models
const AI_DEFAULTS = {
  geminiModel: 'gemini-1.5-flash',
  grokModel: 'grok-beta',
  claudeModel: 'claude-3-5-haiku-20241022',
  openaiModel: 'gpt-4o-mini',
  deepseekModel: 'deepseek-chat',
  publicGeminiUrl: 'https://text.pollinations.ai/'
};

async function fetchHttp(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error('Превышено время ожидания ответа ИИ (таймаут 25с)'));
    });
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Generate quick AI response with max 200 characters limit.
 * Used for "gemini:", "grok:", "claude:" commands triggered by TAB.
 */
async function generateAiQuick(provider, prompt, settings = {}) {
  const p = (provider || 'gemini').toLowerCase().trim();
  const cleanPrompt = (prompt || '').trim();
  if (!cleanPrompt) {
    throw new Error('Укажите запрос после команды (например: ' + p + ': напиши шутку)');
  }

  const sysInstruction = 'Ответь кратко, емко и по сути. Твой ответ ОБЯЗАТЕЛЬНО должен быть не длиннее 200 символов.';

  let reply = '';

  // 1. Check if user configured their own API key for this provider
  if (p === 'gemini') {
    const key = settings.geminiKey || '';
    if (key) {
      // User's own Gemini API Key from Google AI Studio
      const model = settings.geminiModel || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const payload = JSON.stringify({
        systemInstruction: { parts: [{ text: sysInstruction }] },
        contents: [{ parts: [{ text: cleanPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 120
        }
      });
      const res = await fetchHttp(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, payload);

      if (res.status === 200) {
        const json = JSON.parse(res.data);
        reply = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        throw new Error('Gemini API Error (' + res.status + '): ' + res.data);
      }
    } else {
      // Shared Google Dev / Public fallback
      const q = encodeURIComponent(`[System: ${sysInstruction}] Request: ${cleanPrompt}`);
      const res = await fetchHttp(`https://text.pollinations.ai/${q}?model=openai`);
      if (res.status === 200) {
        reply = res.data;
      } else {
        throw new Error('Ошибка общего шлюза Google Gemini');
      }
    }
  } else if (p === 'grok') {
    const key = settings.grokKey || '';
    if (key) {
      const model = settings.grokModel || 'grok-beta';
      const url = 'https://api.x.ai/v1/chat/completions';
      const payload = JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: sysInstruction },
          { role: 'user', content: cleanPrompt }
        ],
        temperature: 0.7,
        max_tokens: 120
      });
      const res = await fetchHttp(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        }
      }, payload);

      if (res.status === 200) {
        const json = JSON.parse(res.data);
        reply = json.choices?.[0]?.message?.content || '';
      } else {
        throw new Error('Grok API Error (' + res.status + ')');
      }
    } else {
      // Dev fallback with grok style
      const q = encodeURIComponent(`[System: ${sysInstruction} Be witty like Grok.] Request: ${cleanPrompt}`);
      const res = await fetchHttp(`https://text.pollinations.ai/${q}`);
      if (res.status === 200) {
        reply = res.data;
      } else {
        throw new Error('Grok API ключ не настроен в ИИ Хабе');
      }
    }
  } else if (p === 'claude') {
    const key = settings.claudeKey || '';
    if (key) {
      const model = settings.claudeModel || 'claude-3-5-haiku-20241022';
      const url = 'https://api.anthropic.com/v1/messages';
      const payload = JSON.stringify({
        model: model,
        max_tokens: 120,
        system: sysInstruction,
        messages: [{ role: 'user', content: cleanPrompt }]
      });
      const res = await fetchHttp(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        }
      }, payload);

      if (res.status === 200) {
        const json = JSON.parse(res.data);
        reply = json.content?.[0]?.text || '';
      } else {
        throw new Error('Claude API Error (' + res.status + ')');
      }
    } else {
      // Dev fallback with claude style
      const q = encodeURIComponent(`[System: ${sysInstruction} Be helpful and thoughtful like Claude.] Request: ${cleanPrompt}`);
      const res = await fetchHttp(`https://text.pollinations.ai/${q}`);
      if (res.status === 200) {
        reply = res.data;
      } else {
        throw new Error('Claude API ключ не настроен в ИИ Хабе');
      }
    }
  }

  // Enforce the 200 characters limit
  reply = (reply || '').trim();
  if (reply.length > 200) {
    reply = reply.slice(0, 197).trim() + '...';
  }
  return reply;
}

// Test runner
async function runTests() {
  console.log('Testing gemini: ...');
  const r1 = await generateAiQuick('gemini', 'Привет! Назови 3 быстрых цвета');
  console.log('Gemini reply (len ' + r1.length + '):', r1);

  console.log('\nTesting grok: ...');
  const r2 = await generateAiQuick('grok', 'Скажи короткий факт');
  console.log('Grok reply (len ' + r2.length + '):', r2);

  console.log('\nTesting claude: ...');
  const r3 = await generateAiQuick('claude', 'Пожелай хорошего дня');
  console.log('Claude reply (len ' + r3.length + '):', r3);

  console.log('\nAll quick generation tests passed!');
}

runTests().catch(err => console.error('Test error:', err));
