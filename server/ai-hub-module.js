// AI Hub Module - CSS, HTML and JS logic for NonsenseChat
const fs = require('fs');

const AI_HUB_CSS = `
    /* ═══ ИИ ХАБ (AI HUB) & БЫСТРЫЕ КОМАНДЫ ═══ */
    .ai-hub-item .chat-ava {
      background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
    }
    .ai-hub-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 6px;
      background: linear-gradient(135deg, #0284c7, #7c3aed);
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      vertical-align: middle;
      margin-left: 5px;
    }
    .msg-author .ai-badge {
      background: linear-gradient(135deg, #0ea5e9, #a855f7);
      color: #fff;
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      margin-left: 5px;
      letter-spacing: 0.5px;
    }
    .msg.ai-bubble {
      border-left: 3px solid #0ea5e9;
      background: var(--card, #1e293b);
    }
    .msg-ai-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      color: #38bdf8;
      font-weight: 600;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px dashed rgba(56, 189, 248, 0.25);
    }
    .ai-copy-btn {
      background: transparent;
      border: none;
      color: var(--text2, #94a3b8);
      cursor: pointer;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s, color 0.15s;
    }
    .ai-copy-btn:hover {
      background: var(--hover, rgba(255,255,255,0.08));
      color: var(--text, #fff);
    }

    /* Всплывающая подсказка для Tab-команд (gemini:, grok:, claude:) */
    .ai-quick-bubble {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 12px;
      right: 12px;
      z-index: 85;
      background: var(--card, #1e293b);
      border: 1px solid #0ea5e9;
      border-radius: 12px;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(14, 165, 233, 0.25);
      font-size: 13px;
      color: var(--text, #f1f5f9);
      backdrop-filter: blur(14px);
      animation: slideUpAiQuick 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUpAiQuick {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ai-quick-bubble.hidden {
      display: none !important;
    }
    .ai-quick-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }
    .ai-quick-tag {
      background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
      color: #fff;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
    .ai-quick-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text, #e2e8f0);
    }
    .ai-quick-text b {
      color: #38bdf8;
    }
    .ai-quick-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .ai-quick-btn {
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .ai-quick-btn:hover {
      transform: scale(1.03);
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.4);
    }
    .ai-quick-close {
      background: transparent;
      border: none;
      color: var(--text2, #94a3b8);
      font-size: 14px;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
    }
    .ai-quick-close:hover {
      color: var(--text, #fff);
      background: var(--hover, rgba(255,255,255,0.08));
    }

    /* Кнопка настроек ИИ в шапке чата */
    .hdr-ai-btn {
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(14, 165, 233, 0.35);
      color: #38bdf8;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s, border-color 0.15s;
    }
    .hdr-ai-btn:hover {
      background: rgba(14, 165, 233, 0.25);
      border-color: #38bdf8;
    }

    /* Модальное окно настроек ИИ Хаба */
    .aihub-settings-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 4px 0;
    }
    .aihub-field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .aihub-field-group label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text2, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .aihub-field-group label a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 500;
      text-transform: none;
      font-size: 11px;
    }
    .aihub-field-group label a:hover {
      text-decoration: underline;
    }
    .aihub-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .aihub-input-wrap input,
    .aihub-input-wrap select,
    .aihub-input-wrap textarea {
      width: 100%;
      background: var(--card2, #0f172a);
      border: 1px solid var(--border, #334155);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text, #f8fafc);
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .aihub-input-wrap input:focus,
    .aihub-input-wrap select:focus,
    .aihub-input-wrap textarea:focus {
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
    }
    .aihub-input-wrap .aihub-eye-btn {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--text2, #94a3b8);
      cursor: pointer;
      padding: 4px;
      font-size: 13px;
    }
    .aihub-provider-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      background: var(--card2, #0f172a);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--border, #334155);
    }
    .aihub-provider-tab {
      flex: 1;
      min-width: 90px;
      text-align: center;
      padding: 8px 10px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text2, #94a3b8);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .aihub-provider-tab.active {
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: #fff;
      box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
    }
    .aihub-status-box {
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 12.5px;
      line-height: 1.5;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .aihub-status-box.info {
      background: rgba(14, 165, 233, 0.1);
      border: 1px solid rgba(14, 165, 233, 0.3);
      color: #38bdf8;
    }
    .aihub-status-box.success {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #22c55e;
    }
    .aihub-status-box.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }
    .aihub-range-val {
      font-size: 12px;
      color: #38bdf8;
      font-weight: 700;
    }
`;

console.log('AI Hub CSS length:', AI_HUB_CSS.length);
const fs = require('fs');

const AI_HUB_JS = `
    /* ═══ ИИ ХАБ (AI HUB) & БЫСТРЫЕ КОМАНДЫ (GEMINI, GROK, CLAUDE) ═══ */
    const AI_HUB_AVA = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="gAi" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect width="48" height="48" rx="24" fill="url(#gAi)"/><circle cx="24" cy="24" r="16" fill="rgba(255,255,255,0.15)"/><path d="M16 20a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V20z" fill="#ffffff"/><circle cx="21" cy="24" r="2" fill="#0ea5e9"/><circle cx="27" cy="24" r="2" fill="#0ea5e9"/><path d="M21 28h6" stroke="#0ea5e9" stroke-width="1.8" stroke-linecap="round"/><path d="M24 14v4M13 25h3M32 25h3M24 32v3" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="13" r="1.5" fill="#38bdf8"/><circle cx="12" cy="25" r="1.5" fill="#38bdf8"/><circle cx="36" cy="25" r="1.5" fill="#38bdf8"/></svg>');

    const BCH_AI_STORAGE_KEY = 'bch_ai_settings';

    function getAiSettings() {
      const def = {
        activeProvider: 'gemini',
        geminiKey: '',
        geminiModel: 'gemini-1.5-flash',
        grokKey: '',
        grokModel: 'grok-beta',
        claudeKey: '',
        claudeModel: 'claude-3-5-haiku-20241022',
        openaiKey: '',
        openaiModel: 'gpt-4o-mini',
        deepseekKey: '',
        deepseekModel: 'deepseek-chat',
        openrouterKey: '',
        openrouterModel: 'google/gemini-2.0-flash-exp:free',
        customUrl: 'http://localhost:11434/v1',
        customModel: 'llama3',
        customKey: '',
        systemPrompt: 'Ты дружелюбный, умный и лаконичный ИИ-ассистент в NonsenseChat. Отвечай структурированно, понятно и по делу.',
        temperature: 0.7,
        historyLimit: 10
      };
      try {
        const raw = localStorage.getItem(BCH_AI_STORAGE_KEY);
        if (raw) return { ...def, ...JSON.parse(raw) };
      } catch (_) {}
      return def;
    }

    function saveAiSettings(s) {
      try {
        localStorage.setItem(BCH_AI_STORAGE_KEY, JSON.stringify(s));
      } catch (_) {}
    }

    function getAiProviderTitle(p) {
      switch ((p || '').toLowerCase()) {
        case 'gemini': return 'Google Gemini';
        case 'grok': return 'xAI Grok';
        case 'claude': return 'Anthropic Claude';
        case 'openai': return 'OpenAI GPT';
        case 'deepseek': return 'DeepSeek';
        case 'openrouter': return 'OpenRouter';
        case 'custom': return 'Свой API / Ollama';
        default: return 'ИИ Хаб';
      }
    }

    function renderAiHubItem(list, aiChat) {
      if (!list) return;
      const el = document.createElement('div');
      const isAct = (typeof activeId !== 'undefined' && activeId && (activeId === 'aihub_' + me?.uid || (aiChat && aiChat.id === activeId)));
      el.className = 'chat-item ai-hub-item' + (isAct ? ' active' : '');
      const lastMsgAt = aiChat ? asDate(aiChat.lastMsgAt) : null;
      const time = (lastMsgAt && aiChat.lastMsg) ? fmtTime(lastMsgAt) : '';
      const s = getAiSettings();
      const pTitle = getAiProviderTitle(s.activeProvider);
      const preview = aiChat?.lastMsg || ('Нейросеть • ' + pTitle);
      el.innerHTML = '<div class="chat-ava-wrap"><img src="' + AI_HUB_AVA + '" class="chat-ava" alt="ИИ Хаб"></div><div class="chat-info"><div class="chat-name">🤖 ИИ Хаб <span class="ai-hub-badge">AI</span></div><div class="chat-preview">' + esc(preview) + '</div></div><div class="chat-meta"><div class="chat-time">' + time + '</div></div>';
      el.onclick = () => {
        document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        openAiHub();
      };
      list.appendChild(el);
    }

    async function openAiHub() {
      if (!me || !me.uid) return;
      const chatId = 'aihub_' + me.uid;
      let c = (allChats || []).find(x => x.id === chatId);
      if (!c) {
        const s = getAiSettings();
        await db.collection('chats').doc(chatId).set({
          type: 'ai_hub',
          members: [me.uid],
          name: '🤖 ИИ Хаб',
          desc: 'Персональный ИИ-ассистент',
          lastMsg: 'Готов к работе. Задайте вопрос или используйте команды gemini:, grok:, claude:',
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        const d = await db.collection('chats').doc(chatId).get();
        c = { id: chatId, ...d.data() };
      }
      openChat(chatId, c);
    }

    /* ═══ БЫСТРЫЕ КОМАНДЫ (gemini:, grok:, claude: + TAB) ═══ */
    let _aiQuickLastMatch = null;
    let _aiQuickGenerating = false;

    function getAiQuickMatch(text) {
      if (!text) return null;
      const clean = text.replace(/[\u00a0\u200b\u200c\u200d\ufeff]/g, ' ').trimStart();
      const m = /^(gemini|grok|claude|gpt|ai)\s*:\s*(.*)$/is.exec(clean);
      if (!m) return null;
      return {
        provider: m[1].toLowerCase(),
        prompt: m[2].trim()
      };
    }

    function hideAiQuickBubble() {
      const b = document.getElementById('aiQuickBubble');
      if (b) { b.classList.add('hidden'); b.innerHTML = ''; }
      _aiQuickLastMatch = null;
    }

    function onAiQuickInput() {
      if (_aiQuickGenerating) return;
      const inp = minp();
      if (!inp) { hideAiQuickBubble(); return; }
      const text = inp.innerText || '';
      const match = getAiQuickMatch(text);
      if (!match) {
        hideAiQuickBubble();
        return;
      }
      _aiQuickLastMatch = match;
      const b = document.getElementById('aiQuickBubble');
      if (!b) return;

      const pTitle = match.provider.toUpperCase();
      const safePrompt = match.prompt ? ('«' + esc(match.prompt.slice(0, 35)) + (match.prompt.length > 35 ? '...' : '') + '»') : '';
      b.innerHTML = '<div class="ai-quick-left"><span class="ai-quick-tag">✨ ' + pTitle + '</span><span class="ai-quick-text">Нажмите <b>Tab</b> для генерации (макс. 200 симв.) ' + safePrompt + '</span></div><div class="ai-quick-actions"><button type="button" class="ai-quick-btn" onclick="executeAiQuickTab(event)"><i class="fa-solid fa-wand-magic-sparkles"></i> ⇥ Tab</button><button type="button" class="ai-quick-close" onclick="hideAiQuickBubble()"><i class="fa-solid fa-xmark"></i></button></div>';
      b.classList.remove('hidden');
    }

    async function handleAiQuickTab(e) {
      const inp = minp();
      if (!inp) return false;
      const text = inp.innerText || '';
      const match = getAiQuickMatch(text);
      if (!match) return false;

      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      await executeAiQuickTab();
      return true;
    }

    async function executeAiQuickTab(ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      const inp = minp();
      if (!inp) return;
      const text = inp.innerText || '';
      const match = getAiQuickMatch(text);
      if (!match) return;

      if (!match.prompt) {
        if (typeof showToast === 'function') {
          showToast('ИИ Команда', 'Введите текст запроса после ' + match.provider + ': (например, ' + match.provider + ': напиши поздравление) и нажмите Tab', 'info');
        }
        return;
      }

      const b = document.getElementById('aiQuickBubble');
      _aiQuickGenerating = true;
      if (b) {
        b.innerHTML = '<div class="ai-quick-left"><span class="ai-quick-tag"><i class="fa-solid fa-spinner fa-spin"></i> ' + match.provider.toUpperCase() + '</span><span class="ai-quick-text">Генерирую краткий ответ (до 200 симв.)...</span></div>';
        b.classList.remove('hidden');
      }

      try {
        const reply = await callAiProvider(match.provider, match.prompt, { maxChars: 200, isQuick: true });
        let cleanReply = (reply || '').trim();
        // Жесткое ограничение в 200 символов по требованию
        if (cleanReply.length > 200) {
          cleanReply = cleanReply.slice(0, 197).trim() + '...';
        }
        inp.innerText = cleanReply;
        hideAiQuickBubble();
        if (typeof onCalcInput === 'function') onCalcInput();
        if (typeof updateSendButtonVisibility === 'function') updateSendButtonVisibility();

        // Поставить курсор в конец
        try {
          inp.focus();
          const range = document.createRange();
          range.selectNodeContents(inp);
          range.collapse(false);
          const sel = window.getSelection();
          if (sel) { sel.removeAllRanges(); sel.addRange(range); }
        } catch (_) {}

        if (typeof showToast === 'function') {
          showToast('✨ Сгенерировано', cleanReply.length + ' симв. Нажмите Enter для отправки', 'success');
        }
      } catch (err) {
        console.error('executeAiQuickTab error:', err);
        if (b) {
          b.innerHTML = '<div class="ai-quick-left"><span class="ai-quick-tag" style="background:#ef4444">Ошибка</span><span class="ai-quick-text">' + esc(err.message || 'Сбой генерации') + '</span></div><div class="ai-quick-actions"><button type="button" class="ai-quick-btn" onclick="openAiHubSettings()"><i class="fa-solid fa-gear"></i> Настроить API</button><button type="button" class="ai-quick-close" onclick="hideAiQuickBubble()"><i class="fa-solid fa-xmark"></i></button></div>';
        }
        if (typeof showToast === 'function') {
          showToast('Ошибка ИИ', err.message || 'Проверьте API ключ в настройках ИИ Хаба', 'error');
        }
      } finally {
        _aiQuickGenerating = false;
      }
    }

    /* ═══ ВЫЗОВЫ API ИИ (GEMINI, GROK, CLAUDE, OPENAI, ETC.) ═══ */
    async function callAiProvider(provider, prompt, options = {}) {
      const p = (provider || 'gemini').toLowerCase().trim();
      const s = getAiSettings();
      const maxChars = options.maxChars || 200;
      const sysInstruction = options.systemPrompt || ('Ответь кратко, емко и по существу на русском языке. Ответ ОБЯЗАТЕЛЬНО должен быть не более ' + maxChars + ' символов. Без лишних предисловий.');

      // ── 1. GOOGLE GEMINI ──
      if (p === 'gemini') {
        const key = s.geminiKey ? s.geminiKey.trim() : '';
        const model = s.geminiModel || 'gemini-1.5-flash';

        if (key) {
          // Вызов по своему API-ключу пользователя из Google AI Studio
          const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
          const payload = {
            systemInstruction: { parts: [{ text: sysInstruction }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: s.temperature || 0.7,
              maxOutputTokens: 140
            }
          };
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            const msg = errData?.error?.message || ('Gemini HTTP ' + resp.status);
            throw new Error('Gemini: ' + msg);
          }
          const resJson = await resp.json();
          const txt = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!txt) throw new Error('Пустой ответ от Gemini');
          return txt;
        } else {
          // Общий API / Dev-прокси для разработчиков
          return await callPublicDevAi(prompt, sysInstruction, 'gemini');
        }
      }

      // ── 2. XAI GROK ──
      if (p === 'grok') {
        const key = s.grokKey ? s.grokKey.trim() : '';
        const model = s.grokModel || 'grok-beta';
        if (!key) {
          throw new Error('Укажите xAI Grok API-ключ в Настройках ИИ Хаба');
        }
        const url = 'https://api.x.ai/v1/chat/completions';
        const payload = {
          model: model,
          messages: [
            { role: 'system', content: sysInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: s.temperature || 0.7,
          max_tokens: 140
        };
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
          },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error('Grok: ' + (errData?.error?.message || ('HTTP ' + resp.status)));
        }
        const resJson = await resp.json();
        const txt = resJson.choices?.[0]?.message?.content;
        if (!txt) throw new Error('Пустой ответ от Grok');
        return txt;
      }

      // ── 3. ANTHROPIC CLAUDE ──
      if (p === 'claude') {
        const key = s.claudeKey ? s.claudeKey.trim() : '';
        const model = s.claudeModel || 'claude-3-5-haiku-20241022';
        if (!key) {
          throw new Error('Укажите Anthropic Claude API-ключ в Настройках ИИ Хаба');
        }
        const url = 'https://api.anthropic.com/v1/messages';
        const payload = {
          model: model,
          max_tokens: 140,
          system: sysInstruction,
          messages: [{ role: 'user', content: prompt }]
        };
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true'
          },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error('Claude: ' + (errData?.error?.message || ('HTTP ' + resp.status)));
        }
        const resJson = await resp.json();
        const txt = resJson.content?.[0]?.text;
        if (!txt) throw new Error('Пустой ответ от Claude');
        return txt;
      }

      // ── 4. OPENAI / DEEPSEEK / OPENROUTER / CUSTOM ──
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      let bearer = s.openaiKey;
      let model = s.openaiModel || 'gpt-4o-mini';

      if (p === 'deepseek') {
        endpoint = 'https://api.deepseek.com/chat/completions';
        bearer = s.deepseekKey;
        model = s.deepseekModel || 'deepseek-chat';
      } else if (p === 'openrouter') {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        bearer = s.openrouterKey;
        model = s.openrouterModel || 'google/gemini-2.0-flash-exp:free';
      } else if (p === 'custom') {
        endpoint = (s.customUrl || 'http://localhost:11434/v1').replace(/\\/+$/, '') + '/chat/completions';
        bearer = s.customKey;
        model = s.customModel || 'llama3';
      }

      if (!bearer && p !== 'custom') {
        throw new Error('Укажите API-ключ для ' + getAiProviderTitle(p) + ' в Настройках ИИ Хаба');
      }

      const headers = { 'Content-Type': 'application/json' };
      if (bearer) headers['Authorization'] = 'Bearer ' + bearer;

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: sysInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: s.temperature || 0.7,
          max_tokens: 140
        })
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(getAiProviderTitle(p) + ': ' + (errData?.error?.message || ('HTTP ' + resp.status)));
      }
      const resJson = await resp.json();
      return resJson.choices?.[0]?.message?.content || '';
    }

    // Общий бесплатный шлюз для разработчиков (fallback)
    async function callPublicDevAi(prompt, sysInstruction, fallbackProvider) {
      try {
        const q = encodeURIComponent('[Системная инструкция: ' + sysInstruction + '] Запрос пользователя: ' + prompt);
        const resp = await fetch('https://text.pollinations.ai/' + q, { method: 'GET' });
        if (resp.ok) {
          const txt = await resp.text();
          if (txt && txt.trim()) return txt.trim();
        }
      } catch (_) {}

      // Если общий шлюз недоступен, даём понятное сообщение о настройке API
      throw new Error('Для генерации через ' + fallbackProvider + ' вставьте свой API-ключ в Настройках ИИ Хаба (бесплатно на aistudio.google.com)');
    }

    /* ═══ ОТВЕТЫ ИИ ВНУТРИ ЧАТА «ИИ ХАБ» ═══ */
    let _aiHubReplying = false;

    async function triggerAiHubReply(chatId, userText) {
      if (_aiHubReplying || !chatId || !userText) return;
      _aiHubReplying = true;
      const s = getAiSettings();
      const p = s.activeProvider || 'gemini';

      // Показываем статус "ИИ печатает..."
      const chatSub = document.getElementById('chSub');
      const origSub = chatSub ? chatSub.innerText : '';
      if (chatSub) chatSub.innerHTML = '<span style="color:#38bdf8"><i class="fa-solid fa-spinner fa-spin"></i> ' + getAiProviderTitle(p) + ' генерирует ответ...</span>';

      try {
        // Подгружаем последние сообщения для контекста памяти диалога
        const histLimit = Math.max(1, Math.min(20, parseInt(s.historyLimit, 10) || 10));
        let messages = [];
        try {
          const snap = await db.collection('chats').doc(chatId).collection('messages').orderBy('at', 'desc').limit(histLimit).get();
          const docs = snap.docs.reverse();
          messages = docs.map(d => {
            const data = d.data();
            return {
              role: (data.isAi || data.senderRole === 'ai') ? 'assistant' : 'user',
              content: data.text || ''
            };
          });
        } catch (_) {}

        if (!messages.length) {
          messages = [{ role: 'user', content: userText }];
        }

        const sysPrompt = s.systemPrompt || 'Ты полезный, умный и лаконичный ИИ-ассистент в NonsenseChat.';

        let replyText = '';
        if (p === 'gemini') {
          replyText = await callAiProvider('gemini', userText, { systemPrompt: sysPrompt, maxChars: 1500 });
        } else if (p === 'grok') {
          replyText = await callAiProvider('grok', userText, { systemPrompt: sysPrompt, maxChars: 1500 });
        } else if (p === 'claude') {
          replyText = await callAiProvider('claude', userText, { systemPrompt: sysPrompt, maxChars: 1500 });
        } else {
          replyText = await callAiProvider(p, userText, { systemPrompt: sysPrompt, maxChars: 1500 });
        }

        replyText = (replyText || '').trim();
        if (!replyText) replyText = 'Не удалось получить ответ от нейросети.';

        // Сохраняем сообщение ИИ в чат (uid: me.uid для прохождения правил безопасности Firestore)
        const aiMsgData = {
          uid: me.uid,
          isAi: true,
          senderRole: 'ai',
          author: getAiProviderTitle(p),
          text: replyText,
          at: firebase.firestore.FieldValue.serverTimestamp(),
          type: 'text'
        };

        await db.collection('chats').doc(chatId).collection('messages').add(aiMsgData);
        await db.collection('chats').doc(chatId).update({
          lastMsg: '🤖 ' + replyText.slice(0, 50),
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        });

      } catch (err) {
        console.error('triggerAiHubReply error:', err);
        const errMsg = '⚠️ Ошибка ИИ: ' + (err.message || 'Сбой генерации') + '\\n\\nНажмите на кнопку настроек в шапке чата ⚙️, чтобы указать рабочий API-ключ.';
        await db.collection('chats').doc(chatId).collection('messages').add({
          uid: me.uid,
          isAi: true,
          senderRole: 'ai',
          author: 'ИИ Хаб (Ошибка)',
          text: errMsg,
          at: firebase.firestore.FieldValue.serverTimestamp(),
          type: 'text'
        });
      } finally {
        _aiHubReplying = false;
        if (chatSub) chatSub.innerText = origSub || ('Провайдер: ' + getAiProviderTitle(s.activeProvider));
      }
    }

    /* ═══ МОДАЛЬНОЕ ОКНО НАСТРОЕК ИИ ХАБА ═══ */
    function openAiHubSettings() {
      const s = getAiSettings();
      // Устанавливаем значения в форму
      selectAiProviderTab(s.activeProvider || 'gemini');
      const gKey = document.getElementById('aiSetGeminiKey'); if (gKey) gKey.value = s.geminiKey || '';
      const gMod = document.getElementById('aiSetGeminiModel'); if (gMod) gMod.value = s.geminiModel || 'gemini-1.5-flash';
      const grKey = document.getElementById('aiSetGrokKey'); if (grKey) grKey.value = s.grokKey || '';
      const grMod = document.getElementById('aiSetGrokModel'); if (grMod) grMod.value = s.grokModel || 'grok-beta';
      const cKey = document.getElementById('aiSetClaudeKey'); if (cKey) cKey.value = s.claudeKey || '';
      const cMod = document.getElementById('aiSetClaudeModel'); if (cMod) cMod.value = s.claudeModel || 'claude-3-5-haiku-20241022';
      const oKey = document.getElementById('aiSetOpenaiKey'); if (oKey) oKey.value = s.openaiKey || '';
      const oMod = document.getElementById('aiSetOpenaiModel'); if (oMod) oMod.value = s.openaiModel || 'gpt-4o-mini';
      const dKey = document.getElementById('aiSetDeepseekKey'); if (dKey) dKey.value = s.deepseekKey || '';
      const orKey = document.getElementById('aiSetOpenrouterKey'); if (orKey) orKey.value = s.openrouterKey || '';
      const custUrl = document.getElementById('aiSetCustomUrl'); if (custUrl) custUrl.value = s.customUrl || 'http://localhost:11434/v1';
      const custMod = document.getElementById('aiSetCustomModel'); if (custMod) custMod.value = s.customModel || 'llama3';
      const custKey = document.getElementById('aiSetCustomKey'); if (custKey) custKey.value = s.customKey || '';

      const sysPr = document.getElementById('aiSetSystemPrompt'); if (sysPr) sysPr.value = s.systemPrompt || '';
      const tempRange = document.getElementById('aiSetTempRange'); if (tempRange) tempRange.value = s.temperature || 0.7;
      const tempVal = document.getElementById('aiSetTempVal'); if (tempVal) tempVal.innerText = s.temperature || 0.7;
      const histRange = document.getElementById('aiSetHistRange'); if (histRange) histRange.value = s.historyLimit || 10;
      const histVal = document.getElementById('aiSetHistVal'); if (histVal) histVal.innerText = s.historyLimit || 10;

      const stBox = document.getElementById('aiSetStatusBox');
      if (stBox) { stBox.className = 'aihub-status-box info'; stBox.innerHTML = '<i class=\"fa-solid fa-circle-info\"></i> Вставьте API-ключ выбранного провайдера или используйте общее API Google для разработчиков.'; }

      openModal('modal-aihub-settings');
    }

    let _currentAiTab = 'gemini';
    function selectAiProviderTab(prov) {
      _currentAiTab = prov;
      document.querySelectorAll('.aihub-provider-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.provider === prov);
      });
      // Показываем соответствующую секцию настроек провайдера
      ['gemini', 'grok', 'claude', 'openai', 'deepseek', 'openrouter', 'custom'].forEach(p => {
        const sec = document.getElementById('aiSec-' + p);
        if (sec) sec.style.display = (p === prov) ? 'block' : 'none';
      });
    }

    function toggleAiKeyVisibility(inpId, btnEl) {
      const inp = document.getElementById(inpId);
      if (!inp) return;
      if (inp.type === 'password') {
        inp.type = 'text';
        if (btnEl) btnEl.innerHTML = '<i class=\"fa-solid fa-eye-slash\"></i>';
      } else {
        inp.type = 'password';
        if (btnEl) btnEl.innerHTML = '<i class=\"fa-solid fa-eye\"></i>';
      }
    }

    function applyAiPromptPreset(val) {
      const field = document.getElementById('aiSetSystemPrompt');
      if (!field) return;
      switch (val) {
        case 'coder':
          field.value = 'Ты опытный Senior Full-Stack разработчик. Пиши чистый, надежный код, давай емкие архитектурные пояснения и указывай лучшие практики.';
          break;
        case 'creative':
          field.value = 'Ты талантливый копирайтер и креативный редактор. Пиши ярко, увлекательно, без штампов и с отличным чувством слога.';
          break;
        case 'concise':
          field.value = 'Отвечай строго по делу, кратко и максимально емко (1-3 предложения), без лишних вводных слов и воды.';
          break;
        case 'mate':
          field.value = 'Ты забавный и остроумный собеседник NonsenseChat. Общайся легко, с юмором, дружелюбно и современно.';
          break;
        default:
          field.value = 'Ты дружелюбный, умный и лаконичный ИИ-ассистент в NonsenseChat. Отвечай структурированно, понятно и по делу.';
          break;
      }
    }

    async function testCurrentAiConnection() {
      const stBox = document.getElementById('aiSetStatusBox');
      if (stBox) {
        stBox.className = 'aihub-status-box info';
        stBox.innerHTML = '<i class=\"fa-solid fa-spinner fa-spin\"></i> Проверяем подключение к ' + getAiProviderTitle(_currentAiTab) + '...';
      }
      // Временно сохраняем поля
      saveAiHubSettingsFromForm(false);
      try {
        const reply = await callAiProvider(_currentAiTab, 'Привет! Ответь одним словом: Работает', { maxChars: 60 });
        if (stBox) {
          stBox.className = 'aihub-status-box success';
          stBox.innerHTML = '<i class=\"fa-solid fa-circle-check\"></i> <b>Подключение успешно!</b> Ответ: ' + esc(reply.slice(0, 100));
        }
      } catch (err) {
        if (stBox) {
          stBox.className = 'aihub-status-box error';
          stBox.innerHTML = '<i class=\"fa-solid fa-triangle-exclamation\"></i> <b>Ошибка подключения:</b> ' + esc(err.message || 'Не удалось связаться с API');
        }
      }
    }

    function saveAiHubSettingsFromForm(close = true) {
      const s = getAiSettings();
      s.activeProvider = _currentAiTab;
      s.geminiKey = document.getElementById('aiSetGeminiKey')?.value.trim() || '';
      s.geminiModel = document.getElementById('aiSetGeminiModel')?.value || 'gemini-1.5-flash';
      s.grokKey = document.getElementById('aiSetGrokKey')?.value.trim() || '';
      s.grokModel = document.getElementById('aiSetGrokModel')?.value || 'grok-beta';
      s.claudeKey = document.getElementById('aiSetClaudeKey')?.value.trim() || '';
      s.claudeModel = document.getElementById('aiSetClaudeModel')?.value || 'claude-3-5-haiku-20241022';
      s.openaiKey = document.getElementById('aiSetOpenaiKey')?.value.trim() || '';
      s.openaiModel = document.getElementById('aiSetOpenaiModel')?.value || 'gpt-4o-mini';
      s.deepseekKey = document.getElementById('aiSetDeepseekKey')?.value.trim() || '';
      s.openrouterKey = document.getElementById('aiSetOpenrouterKey')?.value.trim() || '';
      s.customUrl = document.getElementById('aiSetCustomUrl')?.value.trim() || 'http://localhost:11434/v1';
      s.customModel = document.getElementById('aiSetCustomModel')?.value.trim() || 'llama3';
      s.customKey = document.getElementById('aiSetCustomKey')?.value.trim() || '';

      s.systemPrompt = document.getElementById('aiSetSystemPrompt')?.value.trim() || '';
      s.temperature = parseFloat(document.getElementById('aiSetTempRange')?.value) || 0.7;
      s.historyLimit = parseInt(document.getElementById('aiSetHistRange')?.value, 10) || 10;

      saveAiSettings(s);
      if (close) {
        closeModal('modal-aihub-settings');
        if (typeof showToast === 'function') {
          showToast('ИИ Хаб', 'Настройки сохранены (' + getAiProviderTitle(s.activeProvider) + ')', 'success');
        }
        // Обновить подзаголовок шапки, если открыт ИИ Хаб
        if (activeId && activeId.startsWith('aihub_')) {
          const subEl = document.getElementById('chSub');
          if (subEl) subEl.innerText = 'Провайдер: ' + getAiProviderTitle(s.activeProvider) + ' • Онлайн';
        }
      }
    }

    async function clearAiHubHistory() {
      if (!activeId || !activeId.startsWith('aihub_')) {
        if (typeof showToast === 'function') showToast('ИИ Хаб', 'Откройте чат ИИ Хаба для очистки', 'info');
        return;
      }
      const ok = await (typeof customConfirm === 'function' ? customConfirm('Очистить диалог', 'Вся история переписки с ИИ будет удалена.', 'Очистить', 'red') : confirm('Очистить диалог с ИИ?'));
      if (!ok) return;

      try {
        const snap = await db.collection('chats').doc(activeId).collection('messages').get();
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        await db.collection('chats').doc(activeId).update({
          lastMsg: 'Диалог очищен. Готов к новым вопросам.',
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (typeof showToast === 'function') showToast('ИИ Хаб', 'История диалога очищена', 'success');
        closeModal('modal-aihub-settings');
      } catch (err) {
        console.error('clearAiHubHistory:', err);
        if (typeof showToast === 'function') showToast('Ошибка', 'Не удалось очистить историю', 'error');
      }
    }
`;

console.log('AI HUB JS length:', AI_HUB_JS.length);
