const fs = require('fs');
const path = require('path');
const vm = require('vm');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('Original index.html length:', html.length);

// 1. ADD CSS
const cssMarker = '</style>';
const lastStyleIdx = html.lastIndexOf(cssMarker);
if (lastStyleIdx === -1) {
  console.error('Cannot find </style>');
  process.exit(1);
}

const AI_CSS = `
    /* ═══ ИИ ХАБ (AI HUB) & БЫСТРЫЕ КОМАНДЫ (GEMINI, GROK, CLAUDE) ═══ */
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
    .ai-badge {
      background: linear-gradient(135deg, #0ea5e9, #a855f7);
      color: #fff;
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      margin-left: 5px;
      letter-spacing: 0.5px;
    }
    .ai-author-wrap {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #38bdf8 !important;
      font-weight: 700;
    }
    .ai-author-wrap:hover {
      text-decoration: underline;
    }
    .msg.ai-bubble {
      border-left: 3px solid #0ea5e9;
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

if (!html.includes('.ai-quick-bubble')) {
  html = html.slice(0, lastStyleIdx) + AI_CSS + '\n' + html.slice(lastStyleIdx);
  console.log('Appended AI CSS');
}

// 2. ADD AI QUICK BUBBLE HTML
const calcBubbleMarker = 'id="calcBubble"';
const calcBubbleIdx = html.indexOf(calcBubbleMarker);
if (calcBubbleIdx !== -1 && !html.includes('id="aiQuickBubble"')) {
  const endTagIdx = html.indexOf('>', calcBubbleIdx) + 1;
  const bubbleHtml = '\n      <div class="ai-quick-bubble hidden" id="aiQuickBubble"></div>';
  html = html.slice(0, endTagIdx) + bubbleHtml + html.slice(endTagIdx);
  console.log('Added #aiQuickBubble element');
}

// 3. ADD HEADER AI SETTINGS BUTTON
const hdrCallBtnMarker = 'id="hdrCallBtn"';
const hdrCallBtnIdx = html.indexOf(hdrCallBtnMarker);
if (hdrCallBtnIdx !== -1 && !html.includes('id="hdrAiSettingsBtn"')) {
  const btnTagEnd = html.lastIndexOf('<button', hdrCallBtnIdx);
  const aiBtnHtml = `<button type="button" class="hdr-ai-btn" id="hdrAiSettingsBtn" onclick="openAiHubSettings()" style="display:none" title="Настройки ИИ Хаба"><i class="fa-solid fa-robot"></i> <span>Настройки ИИ</span></button>\n        `;
  html = html.slice(0, btnTagEnd) + aiBtnHtml + html.slice(btnTagEnd);
  console.log('Added #hdrAiSettingsBtn to chat header');
}

// 4. ADD MODAL: AI HUB SETTINGS
const modalAppInfoMarker = 'id="modal-appinfo"';
const modalAppInfoIdx = html.indexOf(modalAppInfoMarker);
if (modalAppInfoIdx !== -1 && !html.includes('id="modal-aihub-settings"')) {
  const modalContainerIdx = html.lastIndexOf('<div class="modal', modalAppInfoIdx);
  const MODAL_HTML = `
  <!-- ═══ MODAL: AI HUB SETTINGS ═══ -->
  <div class="modal hidden" id="modal-aihub-settings">
    <div class="mcard" style="width:520px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column">
      <div class="mhead">
        <h3 style="display:flex;align-items:center;gap:8px"><i class="fa-solid fa-robot" style="color:#0ea5e9"></i> Настройки ИИ Хаба</h3>
        <button class="mclose" onclick="closeModal('modal-aihub-settings')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="mbody" style="overflow-y:auto;flex:1;padding-right:6px">
        <div class="aihub-settings-grid">
          <!-- Status Banner -->
          <div class="aihub-status-box info" id="aiSetStatusBox">
            <i class="fa-solid fa-circle-info"></i>
            <span>Выберите провайдера и введите ваш API-ключ. Для быстрых команд пишите <code>gemini:</code>, <code>grok:</code>, <code>claude:</code> и нажимайте <b>TAB</b> (до 200 симв.).</span>
          </div>

          <!-- Provider Tabs -->
          <div class="aihub-field-group">
            <label>Активный провайдер ИИ</label>
            <div class="aihub-provider-tabs">
              <button type="button" class="aihub-provider-tab active" data-provider="gemini" onclick="selectAiProviderTab('gemini')">✨ Gemini</button>
              <button type="button" class="aihub-provider-tab" data-provider="grok" onclick="selectAiProviderTab('grok')">⚡ Grok</button>
              <button type="button" class="aihub-provider-tab" data-provider="claude" onclick="selectAiProviderTab('claude')">🧠 Claude</button>
              <button type="button" class="aihub-provider-tab" data-provider="openai" onclick="selectAiProviderTab('openai')">🤖 OpenAI</button>
              <button type="button" class="aihub-provider-tab" data-provider="deepseek" onclick="selectAiProviderTab('deepseek')">🐋 DeepSeek</button>
              <button type="button" class="aihub-provider-tab" data-provider="openrouter" onclick="selectAiProviderTab('openrouter')">🌐 OpenRouter</button>
              <button type="button" class="aihub-provider-tab" data-provider="custom" onclick="selectAiProviderTab('custom')">💻 Local/Ollama</button>
            </div>
          </div>

          <!-- 1. Google Gemini -->
          <div class="aihub-provider-section" id="aiSec-gemini">
            <div class="aihub-field-group">
              <label>API-ключ Google Gemini <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Получить ключ бесплатно ↗</a></label>
              <div class="aihub-input-wrap">
                <input type="password" id="aiSetGeminiKey" placeholder="Вставьте ключ AIzaSy... (или оставьте пустым для общего API)">
                <button type="button" class="aihub-eye-btn" onclick="toggleAiKeyVisibility('aiSetGeminiKey', this)"><i class="fa-solid fa-eye"></i></button>
              </div>
              <span style="font-size:11.5px;color:var(--text2);margin-top:2px">Бесплатный ключ разработчика выдаётся мгновенно на Google AI Studio. Если ключ не введён, используется общий dev-эндпоинт.</span>
            </div>
            <div class="aihub-field-group" style="margin-top:8px">
              <label>Модель Gemini</label>
              <div class="aihub-input-wrap">
                <select id="aiSetGeminiModel">
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (быстрая, рекомендуется)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (глубокий анализ)</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (экспериментальная)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 2. xAI Grok -->
          <div class="aihub-provider-section" id="aiSec-grok" style="display:none">
            <div class="aihub-field-group">
              <label>API-ключ xAI Grok <a href="https://console.x.ai/" target="_blank" rel="noopener">Консоль xAI ↗</a></label>
              <div class="aihub-input-wrap">
                <input type="password" id="aiSetGrokKey" placeholder="Вставьте ключ xai-...">
                <button type="button" class="aihub-eye-btn" onclick="toggleAiKeyVisibility('aiSetGrokKey', this)"><i class="fa-solid fa-eye"></i></button>
              </div>
            </div>
            <div class="aihub-field-group" style="margin-top:8px">
              <label>Модель Grok</label>
              <div class="aihub-input-wrap">
                <select id="aiSetGrokModel">
                  <option value="grok-beta">grok-beta</option>
                  <option value="grok-2">grok-2</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 3. Anthropic Claude -->
          <div class="aihub-provider-section" id="aiSec-claude" style="display:none">
            <div class="aihub-field-group">
              <label>API-ключ Anthropic Claude <a href="https://console.anthropic.com/" target="_blank" rel="noopener">Anthropic Console ↗</a></label>
              <div class="aihub-input-wrap">
                <input type="password" id="aiSetClaudeKey" placeholder="Вставьте ключ sk-ant-...">
                <button type="button" class="aihub-eye-btn" onclick="toggleAiKeyVisibility('aiSetClaudeKey', this)"><i class="fa-solid fa-eye"></i></button>
              </div>
            </div>
            <div class="aihub-field-group" style="margin-top:8px">
              <label>Модель Claude</label>
              <div class="aihub-input-wrap">
                <select id="aiSetClaudeModel">
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (быстрая, легкая)</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (продвинутая логика)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 4. OpenAI -->
          <div class="aihub-provider-section" id="aiSec-openai" style="display:none">
            <div class="aihub-field-group">
              <label>API-ключ OpenAI <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">OpenAI Keys ↗</a></label>
              <div class="aihub-input-wrap">
                <input type="password" id="aiSetOpenaiKey" placeholder="Вставьте ключ sk-...">
                <button type="button" class="aihub-eye-btn" onclick="toggleAiKeyVisibility('aiSetOpenaiKey', this)"><i class="fa-solid fa-eye"></i></button>
              </div>
            </div>
            <div class="aihub-field-group" style="margin-top:8px">
              <label>Модель GPT</label>
              <div class="aihub-input-wrap">
                <select id="aiSetOpenaiModel">
                  <option value="gpt-4o-mini">GPT-4o Mini (быстрая и экономичная)</option>
                  <option value="gpt-4o">GPT-4o (флагман)</option>
                  <option value="o3-mini">o3-mini (логическое мышление)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 5. DeepSeek -->
          <div class="aihub-provider-section" id="aiSec-deepseek" style="display:none">
            <div class="aihub-field-group">
              <label>API-ключ DeepSeek <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">DeepSeek Platform ↗</a></label>
              <div class="aihub-input-wrap">
                <input type="password" id="aiSetDeepseekKey" placeholder="Вставьте ключ sk-...">
                <button type="button" class="aihub-eye-btn" onclick="toggleAiKeyVisibility('aiSetDeepseekKey', this)"><i class="fa-solid fa-eye"></i></button>
              </div>
            </div>
          </div>

          <!-- 6. OpenRouter -->
          <div class="aihub-provider-section" id="aiSec-openrouter" style="display:none">
            <div class="aihub-field-group">
              <label>API-ключ OpenRouter <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">OpenRouter ↗</a></label>
              <div class="aihub-input-wrap">
                <input type="password" id="aiSetOpenrouterKey" placeholder="Вставьте ключ sk-or-...">
                <button type="button" class="aihub-eye-btn" onclick="toggleAiKeyVisibility('aiSetOpenrouterKey', this)"><i class="fa-solid fa-eye"></i></button>
              </div>
            </div>
          </div>

          <!-- 7. Custom / Ollama -->
          <div class="aihub-provider-section" id="aiSec-custom" style="display:none">
            <div class="aihub-field-group">
              <label>URL эндпоинта (Base URL)</label>
              <div class="aihub-input-wrap">
                <input type="text" id="aiSetCustomUrl" placeholder="http://localhost:11434/v1">
              </div>
            </div>
            <div class="aihub-field-group" style="margin-top:8px">
              <label>Название модели</label>
              <div class="aihub-input-wrap">
                <input type="text" id="aiSetCustomModel" placeholder="llama3 / mistral / qwen2.5">
              </div>
            </div>
            <div class="aihub-field-group" style="margin-top:8px">
              <label>Токен авторизации (опционально)</label>
              <div class="aihub-input-wrap">
                <input type="password" id="aiSetCustomKey" placeholder="Bearer токен, если требуется">
              </div>
            </div>
          </div>

          <!-- Connection Test Button -->
          <div style="display:flex;gap:10px">
            <button type="button" class="mbtn sec" style="flex:1" onclick="testCurrentAiConnection()">
              <i class="fa-solid fa-flask"></i> Проверить подключение
            </button>
          </div>

          <hr style="border:none;border-top:1px solid var(--border);margin:4px 0">

          <!-- Other Settings ("другие вещи") -->
          <div class="aihub-field-group">
            <label>
              <span>Системная роль / Промпт</span>
              <select style="width:auto;padding:2px 8px;font-size:11px;border-radius:6px;background:var(--card2);color:var(--text);border:1px solid var(--border)" onchange="applyAiPromptPreset(this.value)">
                <option value="default">Пресет: Помощник</option>
                <option value="coder">Пресет: Кодер</option>
                <option value="creative">Пресет: Копирайтер</option>
                <option value="concise">Пресет: Краткий</option>
                <option value="mate">Пресет: Собеседник БЧ</option>
              </select>
            </label>
            <div class="aihub-input-wrap">
              <textarea id="aiSetSystemPrompt" rows="3" style="resize:vertical" placeholder="Инструкция для поведения ИИ..."></textarea>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="aihub-field-group">
              <label>Температура: <span class="aihub-range-val" id="aiSetTempVal">0.7</span></label>
              <input type="range" id="aiSetTempRange" min="0" max="1" step="0.1" value="0.7" oninput="document.getElementById('aiSetTempVal').innerText=this.value" style="width:100%;accent-color:#0ea5e9">
              <span style="font-size:11px;color:var(--text2)">0.0 = точно, 1.0 = креативно</span>
            </div>
            <div class="aihub-field-group">
              <label>Память (сообщений): <span class="aihub-range-val" id="aiSetHistVal">10</span></label>
              <input type="range" id="aiSetHistRange" min="1" max="20" step="1" value="10" oninput="document.getElementById('aiSetHistVal').innerText=this.value" style="width:100%;accent-color:#0ea5e9">
              <span style="font-size:11px;color:var(--text2)">Глубина контекста диалога</span>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end">
            <button type="button" class="mbtn sec" style="color:#ef4444;font-size:12px;padding:6px 12px" onclick="clearAiHubHistory()">
              <i class="fa-solid fa-trash-can"></i> Очистить историю ИИ
            </button>
          </div>
        </div>
      </div>
      <div class="mfoot" style="display:flex;justify-content:flex-end;gap:10px">
        <button type="button" class="mbtn sec" onclick="closeModal('modal-aihub-settings')">Отмена</button>
        <button type="button" class="mbtn primary" onclick="saveAiHubSettingsFromForm(true)"><i class="fa-solid fa-check"></i> Сохранить</button>
      </div>
    </div>
  </div>\n`;
  html = html.slice(0, modalContainerIdx) + MODAL_HTML + html.slice(modalContainerIdx);
  console.log('Added #modal-aihub-settings');
}

// 5. UPDATE renderChatList TO RENDER AI HUB ITEM
const favListMarker = 'renderFavItem(list, favChat);';
const favListIdx = html.indexOf(favListMarker);
if (favListIdx !== -1 && !html.includes('renderAiHubItem(list, aiChat)')) {
  const insertPos = html.indexOf('}', favListIdx) + 1;
  const aiListSnippet = `\n\n      // ── ИИ ХАБ (Нейросетевой ассистент) ──
      if (activeTab === 'all' && (!q || 'ии хаб ai нейросеть bot assistant gpt gemini grok claude'.includes(q))) {
        const aiChat = (allChats || []).find(c => c.type === 'ai_hub' || c.id === 'aihub_' + me?.uid);
        renderAiHubItem(list, aiChat);
      }`;
  html = html.slice(0, insertPos) + aiListSnippet + html.slice(insertPos);
  console.log('Added renderAiHubItem call in renderChatList');
}

// 6. UPDATE openChat HEADER TITLE & SUBTITLE FOR AI HUB
const favOpenChatMarker = `data.type === 'fav'`;
const favOpenChatIdx = html.indexOf(favOpenChatMarker);
if (favOpenChatIdx !== -1 && !html.includes(`data.type === 'ai_hub'`)) {
  const endFavBlock = html.indexOf('} else if (data.type === \'dm\') {', favOpenChatIdx);
  if (endFavBlock !== -1) {
    const aiHubHeaderSnippet = `} else if (data.type === 'ai_hub' || id.startsWith('aihub_')) {
        window._chatPeerUser = null;
        name = '🤖 ИИ Хаб';
        ava = AI_HUB_AVA;
        const s = getAiSettings();
        sub = 'Провайдер: ' + getAiProviderTitle(s.activeProvider) + ' • Онлайн';`;
    html = html.slice(0, endFavBlock) + aiHubHeaderSnippet + html.slice(endFavBlock + 1);
    console.log('Updated openChat header for AI Hub');
  }
}

// Also toggle header buttons in openChat
const hdrCallBtnDisplayMarker = `hdrCallBtn.style.display = (data.type === 'fav' || data.type === 'channel') ? 'none' : '';`;
if (html.includes(hdrCallBtnDisplayMarker)) {
  html = html.replace(
    hdrCallBtnDisplayMarker,
    `hdrCallBtn.style.display = (data.type === 'fav' || data.type === 'channel' || data.type === 'ai_hub' || id.startsWith('aihub_')) ? 'none' : '';
      const hdrAiBtn = document.getElementById('hdrAiSettingsBtn');
      if (hdrAiBtn) hdrAiBtn.style.display = (data.type === 'ai_hub' || id.startsWith('aihub_')) ? 'inline-flex' : 'none';`
  );
  console.log('Updated hdrCallBtn & hdrAiBtn visibility in openChat');
}

// 7. HOOK triggerAiHubReply INTO sendMsg
const sendMsgAddMarker = `await db.collection('chats').doc(activeId).collection('messages').add(data);`;
const sendMsgAddIdx = html.indexOf(sendMsgAddMarker);
if (sendMsgAddIdx !== -1 && !html.includes('triggerAiHubReply(activeId,')) {
  const insertPos = sendMsgAddIdx + sendMsgAddMarker.length;
  const aiTriggerSnippet = `\n        if (activeId === 'aihub_' + me.uid || (activeChat && activeChat.type === 'ai_hub')) {
          triggerAiHubReply(activeId, plainText(data.text));
        }`;
  html = html.slice(0, insertPos) + aiTriggerSnippet + html.slice(insertPos);
  console.log('Hooked triggerAiHubReply into sendMsg');
}

// 8. HOOK onAiQuickInput INTO input event listeners
const onCalcInputCall = `onCalcInput();onTyping();`;
if (html.includes(onCalcInputCall) && !html.includes('onAiQuickInput();')) {
  html = html.replace(onCalcInputCall, `onAiQuickInput();onCalcInput();onTyping();`);
  console.log('Hooked onAiQuickInput into input handlers');
}

// Also hook into other listeners
const keyupArr = `['keyup', 'cut', 'drop', 'focus', 'input'].forEach(ev => minp().addEventListener(ev, () => { onCalcInput();`;
if (html.includes(keyupArr) && !html.includes('onAiQuickInput(); onCalcInput();')) {
  html = html.replace(keyupArr, `['keyup', 'cut', 'drop', 'focus', 'input'].forEach(ev => minp().addEventListener(ev, () => { onAiQuickInput(); onCalcInput();`);
  console.log('Hooked onAiQuickInput into keyup/cut/drop listeners');
}

// 9. HOOK TAB KEY HANDLING INTO minp keydown
const enterKeydownMarker = `minp().addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); sendMsg(); } });`;
if (html.includes(enterKeydownMarker) && !html.includes('handleAiQuickTab(e)')) {
  const newKeydown = `minp().addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        if (handleAiQuickTab(e)) {
          e.preventDefault();
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        sendMsg();
      }
    });`;
  html = html.replace(enterKeydownMarker, newKeydown);
  console.log('Hooked Tab keydown listener onto minp');
}

// 10. HOOK MESSAGE RENDERING FOR AI MESSAGES
// Look for `const isOut = m.uid === me.uid;`
const isOutMarker = `const isOut = m.uid === me.uid;`;
if (html.includes(isOutMarker) && !html.includes('m.isAi || m.senderRole === \'ai\'')) {
  const newIsOut = `const isAiMsg = !!(m.isAi || m.senderRole === 'ai');
          const isOut = isAiMsg ? false : (m.uid === me.uid);`;
  html = html.replace(isOutMarker, newIsOut);
  console.log('Updated isOut to handle AI messages');
}

// Mini avatar & author in row.innerHTML
const miniAvaMarker = `<img src="\${optImg(u?.avatar, 80) || ''}" class="msg-mini-ava" alt="\${(m.author || '').replace(/"/g, '')}" onclick="viewProfile('\${m.uid}')" onerror="this.src=''">`;
if (html.includes(miniAvaMarker) && !html.includes('isAiMsg ? AI_HUB_AVA')) {
  const newMiniAva = `<img src="\${isAiMsg ? AI_HUB_AVA : (optImg(u?.avatar, 80) || '')}" class="msg-mini-ava\${isAiMsg ? ' ai-mini-ava' : ''}" alt="\${(m.author || '').replace(/"/g, '')}" onclick="\${isAiMsg ? 'openAiHubSettings()' : \`viewProfile('\${m.uid}')\`}" onerror="this.src=''">`;
  html = html.replace(miniAvaMarker, newMiniAva);
  console.log('Updated mini avatar for AI messages');
}

// Author line in row.innerHTML
const authorLineMarker = `<div class="msg-author" onclick="viewProfile('\${m.uid}')">\${(data.type === 'channel' || m.isChannelPost) ? \`<span style="color:#38bdf8;font-weight:700"><i class="fa-solid fa-bullhorn" style="font-size:11px;margin-right:4px"></i> \${m.author || data.name || 'Канал'}</span>\` : (isOut ? 'Вы' : '@' + (m.author || ''))}\${u?.verified && !isOut ? '<span class="verified-badge" title="Верифицированный аккаунт"></span>' : ''}\${m.uid === CREATOR_UID && !isOut ? '<span class="dev-badge" title="Разработчик">&lt;/&gt;</span>' : ''}\${isFemaleUser(u, m.uid) && !isOut ? '<span class="female-badge" title="Девушка"></span>' : ''}</div>`;
if (html.includes(authorLineMarker) && !html.includes('ai-author-wrap')) {
  const newAuthorLine = `<div class="msg-author">\${isAiMsg ? \`<span class="ai-author-wrap" onclick="openAiHubSettings()"><i class="fa-solid fa-robot"></i> \${m.author || 'ИИ Хаб'} <span class="ai-badge">AI</span></span>\` : ((data.type === 'channel' || m.isChannelPost) ? \`<span style="color:#38bdf8;font-weight:700" onclick="viewProfile('\${m.uid}')"><i class="fa-solid fa-bullhorn" style="font-size:11px;margin-right:4px"></i> \${m.author || data.name || 'Канал'}</span>\` : (isOut ? 'Вы' : \`<span onclick="viewProfile('\${m.uid}')">@\${m.author || ''}</span>\`))\${u?.verified && !isOut && !isAiMsg ? '<span class="verified-badge" title="Верифицированный аккаунт"></span>' : ''}\${m.uid === CREATOR_UID && !isOut && !isAiMsg ? '<span class="dev-badge" title="Разработчик">&lt;/&gt;</span>' : ''}\${isFemaleUser(u, m.uid) && !isOut && !isAiMsg ? '<span class="female-badge" title="Девушка"></span>' : ''}</div>`;
  html = html.replace(authorLineMarker, newAuthorLine);
  console.log('Updated msg-author line for AI messages');
}

// 11. APPEND AI HUB JAVASCRIPT FUNCTIONS
// Insert right after calcBubble functions, e.g. after onCalcInput
const fmtCalcMarker = 'function fmtCalcNum(n) {';
const fmtCalcIdx = html.indexOf(fmtCalcMarker);
if (fmtCalcIdx !== -1 && !html.includes('AI_HUB_AVA')) {
  // Read JS code from server/ai-hub-module.js
  const moduleCode = fs.readFileSync(path.join(__dirname, 'ai-hub-module.js'), 'utf8');
  // Extract the JS part
  const jsPartIdx = moduleCode.indexOf('const AI_HUB_JS = `');
  const jsStart = jsPartIdx + 'const AI_HUB_JS = `'.length;
  const jsEnd = moduleCode.lastIndexOf('`;');
  const jsCode = moduleCode.slice(jsStart, jsEnd);

  html = html.slice(0, fmtCalcIdx) + jsCode + '\n\n    ' + html.slice(fmtCalcIdx);
  console.log('Injected AI Hub JS functions before fmtCalcNum');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated public/index.html with AI Hub & Quick TAB commands!');
