// popup.js – LeetGuide Multi-Provider Extension Logic

const $ = id => document.getElementById(id);

// ─── AI Providers & Models Registry ────────────────────────────────────────
const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    shortName: 'Gemini',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Fast & Free' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: 'Deep Reasoning' }
    ],
    keyPlaceholder: 'AIzaSy...',
    keyHelpUrl: 'https://aistudio.google.com/app/apikey',
    desc: 'Fast, accurate, and generous free tier via Google AI Studio.'
  },
  openai: {
    name: 'OpenAI',
    shortName: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Fast & Smart' },
      { id: 'gpt-4o', name: 'GPT-4o', badge: 'Flagship' }
    ],
    keyPlaceholder: 'sk-proj-... or sk-...',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    desc: 'Official OpenAI API. High code comprehension and reasoning capability.'
  },
  anthropic: {
    name: 'Anthropic Claude',
    shortName: 'Claude',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: [
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', badge: 'Fastest' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', badge: 'Top Tier' }
    ],
    keyPlaceholder: 'sk-ant-...',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    desc: 'Anthropic Claude API. Exceptional programming guidance and Socratic tone.'
  },
  groq: {
    name: 'Groq Cloud',
    shortName: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', badge: 'Ultra Fast' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', badge: 'Fast' }
    ],
    keyPlaceholder: 'gsk_...',
    keyHelpUrl: 'https://console.groq.com/keys',
    desc: 'Groq LPUs deliver blazing fast responses (hundreds of tokens/sec).'
  },
  openrouter: {
    name: 'OpenRouter',
    shortName: 'Router',
    defaultModel: 'deepseek/deepseek-chat',
    models: [
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', badge: 'Popular' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', badge: 'Reasoning' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', badge: 'Open' }
    ],
    keyPlaceholder: 'sk-or-...',
    keyHelpUrl: 'https://openrouter.ai/keys',
    desc: 'Unified gateway providing access to DeepSeek, Llama, and more.'
  }
};

// ─── Storage Abstraction (Chrome Storage with LocalStorage fallback) ────────
const storage = {
  get: async (keys) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return await chrome.storage.local.get(keys);
    }
    const result = {};
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => {
      const val = localStorage.getItem(k);
      if (val !== null) {
        try {
          result[k] = JSON.parse(val);
        } catch {
          result[k] = val;
        }
      }
    });
    return result;
  },
  set: async (obj) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return await chrome.storage.local.set(obj);
    }
    Object.entries(obj).forEach(([k, v]) => {
      localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : v);
    });
  },
  remove: async (keys) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return await chrome.storage.local.remove(keys);
    }
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => localStorage.removeItem(k));
  }
};

// ─── State ────────────────────────────────────────────────────────────────
let state = {
  apiKeys: {
    gemini: '',
    openai: '',
    anthropic: '',
    groq: '',
    openrouter: ''
  },
  activeProvider: 'gemini',
  providerModels: {
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'deepseek/deepseek-chat'
  },
  currentSettingsTab: 'gemini',
  maxHints: 7,
  coachingStyle: 'socratic',
  problem: null,
  messages: [], // [{role, content}]
  hintCount: 0,
  isLoading: false,
  isDemoMode: false,
  editorCode: '',
  editorLanguage: '',
};

// ─── Solution Request Detection (Case-Insensitive) ─────────────────────────
function isSolutionRequest(text) {
  if (!text) return false;
  const t = text.trim();
  const patterns = [
    /\bgive\s*(me)?\s*(the)?\s*solution\b/i,
    /\bshow\s*(me)?\s*(the)?\s*solution\b/i,
    /\bprovide\s*(the)?\s*solution\b/i,
    /\b(full|complete)\s+solution\b/i,
    /\b(tell|give)\s*(me)?\s*(the)?\s*answer\b/i,
    /\b(show|give)\s*(me)?\s*(the)?\s*code\b/i,
    /\bjust\s*tell\s*me\s*the\s*(answer|solution|code)\b/i,
    /\bwant\s*(the)?\s*solution\b/i,
    /\bneed\s*(the)?\s*solution\b/i,
  ];
  return patterns.some(p => p.test(t));
}

// ─── Toast System ─────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconSvg = type === 'success'
    ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : type === 'error'
    ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 220);
  }, 2300);
}

// ─── Init ─────────────────────────────────────────────────────────────────
async function init() {
  const stored = await storage.get([
    'apiKey',
    'apiKeys',
    'activeProvider',
    'providerModels',
    'maxHints',
    'coachingStyle'
  ]);

  // Backwards compatibility migration for single apiKey
  if (stored.apiKeys) {
    state.apiKeys = { ...state.apiKeys, ...stored.apiKeys };
  } else if (stored.apiKey) {
    state.apiKeys.gemini = stored.apiKey;
  }

  if (stored.activeProvider && PROVIDERS[stored.activeProvider]) {
    state.activeProvider = stored.activeProvider;
  }

  if (stored.providerModels) {
    state.providerModels = { ...state.providerModels, ...stored.providerModels };
  }

  state.maxHints = stored.maxHints || 7;
  state.coachingStyle = stored.coachingStyle || 'socratic';

  // Initialize UI components
  updateActiveModelUI();
  renderModelPickerDropdown();
  renderSettingsProviderUI(state.currentSettingsTab);
  updateHintCountUI();
  updateStyleUI();

  // If in demo mode already, load demo problem
  if (state.isDemoMode) {
    loadDemoProblem();
    return;
  }

  // Check active key for current provider
  const activeKey = state.apiKeys[state.activeProvider];

  // Try to grab problem from active Chrome tab
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      loadDemoProblem();
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('leetcode.com/problems/')) {
      showView('notLeetcodeView');
      return;
    }

    if (!activeKey) {
      // Check if any key is available; if so, switch to it, otherwise show noKeyView
      const firstAvailable = Object.keys(state.apiKeys).find(k => state.apiKeys[k]?.trim());
      if (firstAvailable) {
        state.activeProvider = firstAvailable;
        updateActiveModelUI();
      } else {
        showView('noKeyView');
        return;
      }
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProblemData' });
    state.problem = response || {
      title: 'Active LeetCode Problem',
      difficulty: 'Medium',
      slug: tab.url.split('/problems/')[1]?.split('/')[0] || 'active-problem',
      url: tab.url,
      description: ''
    };

    if (response) {
      state.editorCode = response.code || '';
      state.editorLanguage = response.language || 'Unknown';
    }

    await loadChatForProblem();
  } catch (e) {
    showView('notLeetcodeView');
  }
}

async function loadDemoProblem() {
  state.isDemoMode = true;
  state.problem = {
    title: 'Two Sum',
    difficulty: 'Easy',
    slug: 'two-sum',
    url: 'https://leetcode.com/problems/two-sum/',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.'
  };

  state.editorCode = 'def twoSum(nums, target):\n    # My current approach\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []';
  state.editorLanguage = 'Python3';

  await loadChatForProblem();
}

async function loadChatForProblem() {
  const cacheKey = 'chat_' + (state.problem.slug || 'unknown');
  const cached = await storage.get([cacheKey, cacheKey + '_hints']);

  if (cached[cacheKey]) {
    try {
      state.messages = typeof cached[cacheKey] === 'string' ? JSON.parse(cached[cacheKey]) : cached[cacheKey];
    } catch {
      state.messages = [];
    }
    state.hintCount = cached[cacheKey + '_hints'] || 0;
    renderMessages();
  } else {
    state.messages = [];
    state.hintCount = 0;
    addWelcomeMessage();
  }

  updateProblemBar();
  showView('chatView');
}

// ─── Views ────────────────────────────────────────────────────────────────
function showView(viewId) {
  ['settingsView', 'notLeetcodeView', 'noKeyView', 'chatView'].forEach(v => {
    const el = $(v);
    if (el) {
      el.classList.toggle('active', v === viewId);
    }
  });

  const isSettings = viewId === 'settingsView';
  $('settingsToggle').classList.toggle('active', isSettings);
}

// ─── Model Picker Dropdown (Before Query Selection) ───────────────────────
function updateActiveModelUI() {
  const pConfig = PROVIDERS[state.activeProvider] || PROVIDERS.gemini;
  const currentModelId = state.providerModels[state.activeProvider] || pConfig.defaultModel;
  const modelObj = pConfig.models.find(m => m.id === currentModelId) || pConfig.models[0];

  const dot = $('activeProviderDot');
  dot.className = `provider-pill-dot ${state.activeProvider}`;

  const text = $('activeModelText');
  text.textContent = modelObj ? modelObj.name : pConfig.shortName;
}

function renderModelPickerDropdown() {
  const list = $('modelOptionsList');
  if (!list) return;
  list.innerHTML = '';

  Object.entries(PROVIDERS).forEach(([providerKey, pConfig]) => {
    const currentModelId = state.providerModels[providerKey] || pConfig.defaultModel;
    const modelObj = pConfig.models.find(m => m.id === currentModelId) || pConfig.models[0];
    const hasKey = !!state.apiKeys[providerKey]?.trim();
    const isSelected = state.activeProvider === providerKey;

    const item = document.createElement('button');
    item.className = `model-option-item ${isSelected ? 'selected' : ''}`;
    item.type = 'button';

    item.innerHTML = `
      <div class="model-option-left">
        <span class="model-option-dot" style="background: ${pConfig.iconColor};"></span>
        <div class="model-option-info">
          <span class="model-option-title">${modelObj.name}</span>
          <span class="model-option-sub">${pConfig.shortName}</span>
        </div>
      </div>
      <span class="model-option-badge ${hasKey ? 'ready' : 'missing'}">
        ${hasKey ? 'Ready' : 'Key Needed'}
      </span>
    `;

    item.addEventListener('click', async () => {
      state.activeProvider = providerKey;
      updateActiveModelUI();
      renderModelPickerDropdown();
      $('modelPickerDropdown').classList.remove('active');
      $('modelPickerBtn').classList.remove('open');

      await storage.set({ activeProvider: providerKey });

      if (!hasKey) {
        showToast(`${pConfig.name} key needed. Configure in settings`, 'info');
        state.currentSettingsTab = providerKey;
        renderSettingsProviderUI(providerKey);
        showView('settingsView');
      } else {
        showToast(`Switched model to ${modelObj.name}`, 'info');
      }
    });

    list.appendChild(item);
  });
}

// Toggle Dropdown
$('modelPickerBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const dropdown = $('modelPickerDropdown');
  const btn = $('modelPickerBtn');
  const isOpen = dropdown.classList.contains('active');

  dropdown.classList.toggle('active', !isOpen);
  btn.classList.toggle('open', !isOpen);
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('#modelPickerWrapper')) {
    const dropdown = $('modelPickerDropdown');
    if (dropdown && dropdown.classList.contains('active')) {
      dropdown.classList.remove('active');
      $('modelPickerBtn').classList.remove('open');
    }
  }
});

// Manage keys shortcut in dropdown
$('manageKeysShortcutBtn').addEventListener('click', () => {
  $('modelPickerDropdown').classList.remove('active');
  $('modelPickerBtn').classList.remove('open');
  showView('settingsView');
});

// ─── Settings View: Multi-Provider Key Tabs ───────────────────────────────
function renderSettingsProviderUI(providerKey) {
  state.currentSettingsTab = providerKey;
  const pConfig = PROVIDERS[providerKey] || PROVIDERS.gemini;

  // 1. Update Tab Buttons Active State & Dots
  document.querySelectorAll('#providerTabsBar .provider-tab-btn').forEach(btn => {
    const p = btn.dataset.provider;
    btn.classList.toggle('active', p === providerKey);

    const dot = $(`dot-${p}`);
    if (dot) {
      dot.classList.toggle('configured', !!state.apiKeys[p]?.trim());
    }
  });

  // 2. Update Labels & Links
  $('providerKeyLabel').textContent = `${pConfig.name} API Key`;
  $('providerHelperLink').textContent = `Get ${pConfig.shortName} Key ↗`;
  $('providerHelperLink').href = pConfig.keyHelpUrl;
  $('providerDesc').textContent = pConfig.desc;

  // 3. Update Input Value & Placeholder
  const input = $('apiKeyInput');
  input.value = state.apiKeys[providerKey] || '';
  input.placeholder = pConfig.keyPlaceholder;

  // 4. Update Model Select Dropdown for this provider
  const select = $('providerModelSelect');
  select.innerHTML = '';
  pConfig.models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.badge})`;
    opt.selected = m.id === (state.providerModels[providerKey] || pConfig.defaultModel);
    select.appendChild(opt);
  });
}

// Provider tab switching
document.querySelectorAll('#providerTabsBar .provider-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Save current input before switching
    state.apiKeys[state.currentSettingsTab] = $('apiKeyInput').value.trim();
    renderSettingsProviderUI(btn.dataset.provider);
  });
});

// Live update of active tab's API key
$('apiKeyInput').addEventListener('input', () => {
  state.apiKeys[state.currentSettingsTab] = $('apiKeyInput').value.trim();
  const dot = $(`dot-${state.currentSettingsTab}`);
  if (dot) {
    dot.classList.toggle('configured', !!state.apiKeys[state.currentSettingsTab]);
  }
  renderModelPickerDropdown();
});

// Provider Model Select change
$('providerModelSelect').addEventListener('change', () => {
  state.providerModels[state.currentSettingsTab] = $('providerModelSelect').value;
  if (state.activeProvider === state.currentSettingsTab) {
    updateActiveModelUI();
    renderModelPickerDropdown();
  }
});

// ─── Problem Bar ──────────────────────────────────────────────────────────
function updateProblemBar() {
  const p = state.problem;
  if (!p) return;

  const titleEl = $('problemTitle');
  titleEl.textContent = p.title || p.slug || 'Unknown Problem';
  titleEl.setAttribute('title', p.title || p.slug || '');

  const extLink = $('problemExternalLink');
  if (p.url) {
    extLink.href = p.url;
    extLink.style.display = 'inline-flex';
  } else {
    extLink.style.display = 'none';
  }

  const badge = $('diffBadge');
  const diff = p.difficulty || 'Unknown';
  badge.textContent = diff;
  badge.className = 'diff-badge ' + diff;

  updateCodeSyncBadge(!!state.editorCode.trim(), state.editorLanguage);
  updateHintMeter();
}

function updateCodeSyncBadge(hasCode, language) {
  const badge = $('codeSyncBadge');
  const textEl = $('codeSyncText');
  if (!badge || !textEl) return;

  if (hasCode) {
    badge.classList.add('has-code');
    const langLabel = language && language !== 'Unknown' ? language : 'Synced';
    textEl.textContent = `Code (${langLabel})`;
  } else {
    badge.classList.remove('has-code');
    textEl.textContent = 'No Code';
  }
}

async function fetchLatestEditorCode() {
  if (state.isDemoMode) {
    return {
      code: state.editorCode || 'def twoSum(nums, target):\n    # My current approach\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []',
      language: state.editorLanguage || 'Python3'
    };
  }

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        // 1. Try messaging content.js
        const response = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(null), 600);
          try {
            chrome.tabs.sendMessage(tab.id, { action: 'getEditorCode' }, res => {
              clearTimeout(timer);
              resolve(res);
            });
          } catch {
            clearTimeout(timer);
            resolve(null);
          }
        });

        if (response && (response.code || response.language)) {
          return response;
        }

        // 2. Direct scripting execution fallback in MAIN world
        if (chrome.scripting && chrome.scripting.executeScript) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: () => {
              if (window.monaco && window.monaco.editor) {
                const models = window.monaco.editor.getModels();
                if (models && models.length > 0) {
                  for (let i = models.length - 1; i >= 0; i--) {
                    const uri = models[i].uri ? models[i].uri.toString() : '';
                    if (!uri.includes('test') && !uri.includes('input') && !uri.includes('console')) {
                      const val = models[i].getValue();
                      if (val && val.trim().length > 0) {
                        return {
                          code: val,
                          language: models[i].getLanguageId ? models[i].getLanguageId() : ''
                        };
                      }
                    }
                  }
                  return {
                    code: models[0].getValue(),
                    language: models[0].getLanguageId ? models[0].getLanguageId() : ''
                  };
                }
              }
              return null;
            }
          });
          if (results && results[0]?.result) {
            return results[0].result;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch editor code:', err);
  }

  return { code: state.editorCode || '', language: state.editorLanguage || 'Unknown' };
}

function updateHintMeter() {
  $('hintUsed').textContent = state.hintCount;
  $('hintMax').textContent = state.maxHints;

  const container = $('hintSegments');
  if (!container) return;
  container.innerHTML = '';

  const isWarning = (state.maxHints - state.hintCount) <= 1 && state.hintCount > 0;

  for (let i = 0; i < state.maxHints; i++) {
    const pip = document.createElement('div');
    pip.className = 'hint-pip';
    if (i < state.hintCount) {
      pip.classList.add(isWarning ? 'warning' : 'used');
    }
    container.appendChild(pip);
  }
}

// ─── Chat UI ─────────────────────────────────────────────────────────────
function addWelcomeMessage() {
  const p = state.problem;
  const styleDesc = {
    socratic: 'ask you guiding questions to help you discover the solution yourself',
    direct: 'give you concise, targeted directional nudges toward the optimal pattern',
    gentle: 'gently guide you step-by-step with structured encouragement',
  }[state.coachingStyle] || 'guide you step-by-step';

  const welcome = `👋 **Welcome!** I'm your coding coach for **${p.title || p.slug}**.

I will ${styleDesc} — without spoiling the final answer.

• **Hint budget:** **${state.maxHints} hints** allocated.
• On your final hint, the full step-by-step logic will be broken down.
• You can switch AI models anytime from the top dropdown or prompt **"give solution"** for the full code.

Select a quick prompt below or type your initial approach to get started!`;

  appendMessage('assistant', welcome);
  persistChat();
}

function appendMessage(role, content) {
  state.messages.push({ role, content });
  renderSingleMessage(role, content);
  scrollChat();
  persistChat();
}

function renderSingleMessage(role, content) {
  const area = $('chatArea');
  const div = document.createElement('div');
  div.className = `message ${role}`;

  const header = document.createElement('div');
  header.className = 'msg-header';

  const label = document.createElement('span');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? 'You' : 'Coach';
  header.appendChild(label);

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = formatContent(content);

  div.appendChild(header);
  div.appendChild(bubble);
  area.appendChild(div);
}

function renderMessages() {
  const area = $('chatArea');
  area.innerHTML = '';
  state.messages.forEach(m => renderSingleMessage(m.role, m.content));
  scrollChat();
}

// ─── Markdown & Content Formatter ─────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function formatContent(text) {
  if (!text) return '';

  // 1. Extract multi-line code blocks
  const codeBlocks = [];
  let formatted = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang: lang.trim() || 'code', code: code.trim() });
    return placeholder;
  });

  // 2. Escape standard HTML in the remaining text
  formatted = escapeHtml(formatted);

  // 3. Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 4. Bold and italics
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  // 5. Bullet items
  formatted = formatted.replace(/^[•\-\*]\s+(.+)$/gm, '<li class="bullet-item">$1</li>');
  formatted = formatted.replace(/((?:<li class="bullet-item">.*?<\/li>\s*)+)/g, match => {
    const cleanList = match.replace(/\n/g, '');
    return `<ul>${cleanList}</ul>`;
  });

  // 6. Numbered items
  formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="num-item"><strong>$1.</strong> $2</li>');
  formatted = formatted.replace(/((?:<li class="num-item">.*?<\/li>\s*)+)/g, match => {
    const cleanList = match.replace(/\n/g, '');
    return `<ol>${cleanList}</ol>`;
  });

  // 7. Line breaks
  formatted = formatted.replace(/\n{2,}/g, '<br><br>');
  formatted = formatted.replace(/\n/g, '<br>');

  // Clean <br> immediately adjacent to list blocks
  formatted = formatted.replace(/<br>\s*(<ul>|<ol>)/g, '$1');
  formatted = formatted.replace(/(<\/ul>|<\/ol>)\s*<br>/g, '$1');

  // 8. Restore code blocks with card markup & copy button
  codeBlocks.forEach((block, idx) => {
    const placeholder = `__CODE_BLOCK_${idx}__`;
    const escapedSnippet = escapeHtml(block.code);
    const cardHtml = `
      <div class="code-block-card">
        <div class="code-block-header">
          <span>${block.lang}</span>
          <button class="copy-btn" data-code="${encodeURIComponent(block.code)}" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
        <pre class="code-block-content"><code>${escapedSnippet}</code></pre>
      </div>
    `;
    formatted = formatted.replace(placeholder, cardHtml);
  });

  return formatted;
}

// ─── Thinking Indicator ───────────────────────────────────────────────────
function showThinking() {
  const area = $('chatArea');
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = 'thinkingMsg';

  const header = document.createElement('div');
  header.className = 'msg-header';
  const label = document.createElement('span');
  label.className = 'msg-label';
  label.textContent = 'Coach';
  header.appendChild(label);

  const bubble = document.createElement('div');
  bubble.className = 'thinking-card';
  bubble.innerHTML = `
    <div class="thinking-pulse-group">
      <div class="pulse-dot"></div>
      <div class="pulse-dot"></div>
      <div class="pulse-dot"></div>
    </div>
    <span class="thinking-text">Coach is analyzing problem...</span>
  `;

  div.appendChild(header);
  div.appendChild(bubble);
  area.appendChild(div);
  scrollChat();
}

function removeThinking() {
  const el = $('thinkingMsg');
  if (el) el.remove();
}

function scrollChat() {
  const area = $('chatArea');
  area.scrollTop = area.scrollHeight;
}

// ─── Multi-Provider API Callers ───────────────────────────────────────────

// 1. Google Gemini Caller
async function callGemini(apiKey, modelId, systemPrompt, messages, userText) {
  const contents = messages
    .filter(m => m.role !== 'assistant' || !m.content.startsWith('👋'))
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
  contents.push({ role: 'user', parts: [{ text: userText }] });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
      })
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Gemini API error ${res.status}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a hint right now.";
}

// 2. OpenAI-Compatible Caller (OpenAI, Groq, OpenRouter)
async function callOpenAICompatible(baseUrl, apiKey, modelId, systemPrompt, messages, userText, extraHeaders = {}) {
  const chatMessages = [{ role: 'system', content: systemPrompt }];
  messages
    .filter(m => m.role !== 'assistant' || !m.content.startsWith('👋'))
    .forEach(m => {
      chatMessages.push({ role: m.role, content: m.content });
    });
  chatMessages.push({ role: 'user', content: userText });

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...extraHeaders
    },
    body: JSON.stringify({
      model: modelId,
      messages: chatMessages,
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `API error ${res.status}`);
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a hint right now.";
}

// 3. Anthropic Claude Caller
async function callAnthropic(apiKey, modelId, systemPrompt, messages, userText) {
  const claudeMessages = [];
  messages
    .filter(m => m.role !== 'assistant' || !m.content.startsWith('👋'))
    .forEach(m => {
      claudeMessages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      });
    });
  claudeMessages.push({ role: 'user', content: userText });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: modelId,
      system: systemPrompt,
      messages: claudeMessages,
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Anthropic API error ${res.status}`);
  return data.content?.[0]?.text || "Sorry, I couldn't generate a hint right now.";
}

// ─── Dispatch Active AI Model ─────────────────────────────────────────────
async function dispatchToActiveAI(systemPrompt, userText) {
  const provider = state.activeProvider;
  const pConfig = PROVIDERS[provider];
  const apiKey = state.apiKeys[provider]?.trim();
  const modelId = state.providerModels[provider] || pConfig.defaultModel;

  if (!apiKey) {
    throw new Error(`API key for ${pConfig.name} is missing. Please add it in Settings.`);
  }

  if (provider === 'gemini') {
    return await callGemini(apiKey, modelId, systemPrompt, state.messages, userText);
  } else if (provider === 'openai') {
    return await callOpenAICompatible('https://api.openai.com/v1/chat/completions', apiKey, modelId, systemPrompt, state.messages, userText);
  } else if (provider === 'anthropic') {
    return await callAnthropic(apiKey, modelId, systemPrompt, state.messages, userText);
  } else if (provider === 'groq') {
    return await callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', apiKey, modelId, systemPrompt, state.messages, userText);
  } else if (provider === 'openrouter') {
    return await callOpenAICompatible(
      'https://openrouter.ai/api/v1/chat/completions',
      apiKey,
      modelId,
      systemPrompt,
      state.messages,
      userText,
      { 'HTTP-Referer': 'https://leetcode.com', 'X-Title': 'LeetGuide' }
    );
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ─── Main Send Message ────────────────────────────────────────────────────
async function sendMessage(userText) {
  if (state.isLoading) return;
  if (!userText.trim()) return;

  const isSolution = isSolutionRequest(userText);

  // Check hint budget (bypassed if asking for solution!)
  if (state.hintCount >= state.maxHints && !isSolution) {
    appendMessage(
      'assistant',
      `⚠️ **Hint budget exhausted**: You've used all **${state.maxHints}** hints for this problem.\n\nYou have all the conceptual pieces to give it your best shot! If you need the complete code and walkthrough, simply ask **"give solution"**, or reset your session in Settings.`
    );
    return;
  }

  const activeKey = state.apiKeys[state.activeProvider]?.trim();
  if (!activeKey) {
    const pName = PROVIDERS[state.activeProvider]?.name || state.activeProvider;
    showToast(`Please enter your ${pName} API key in Settings`, 'error');
    state.currentSettingsTab = state.activeProvider;
    renderSettingsProviderUI(state.activeProvider);
    showView('settingsView');
    return;
  }

  state.isLoading = true;
  $('sendBtn').disabled = true;

  appendMessage('user', userText);
  showThinking();

  // Fetch the latest iteration of user code from editor
  try {
    const latestEditor = await fetchLatestEditorCode();
    if (latestEditor && (latestEditor.code || latestEditor.language)) {
      state.editorCode = latestEditor.code || state.editorCode || '';
      state.editorLanguage = latestEditor.language || state.editorLanguage || 'Unknown';
      updateCodeSyncBadge(!!state.editorCode.trim(), state.editorLanguage);
    }
  } catch (e) {
    console.warn('Editor fetch error:', e);
  }

  // Manage hint count
  if (!isSolution && state.hintCount < state.maxHints) {
    state.hintCount++;
  } else if (isSolution && state.hintCount < state.maxHints) {
    state.hintCount = state.maxHints; // Cap at max once solution is revealed
  }

  const isLastHint = state.hintCount >= state.maxHints;
  updateHintMeter();

  try {
    const systemPrompt = buildSystemPrompt(isLastHint, isSolution);
    const reply = await dispatchToActiveAI(systemPrompt, userText);

    removeThinking();
    appendMessage('assistant', reply);
    persistChat();

  } catch (err) {
    removeThinking();
    const pName = PROVIDERS[state.activeProvider]?.name || 'AI Provider';
    appendMessage(
      'assistant',
      `❌ **${pName} Error:** ${err.message}\n\nPlease verify your API key or model selection in **Settings**.`
    );
    state.hintCount = Math.max(0, state.hintCount - 1);
    updateHintMeter();
    showToast(`Failed to reach ${pName}`, 'error');
  }

  state.isLoading = false;
  $('sendBtn').disabled = false;
}

function buildSystemPrompt(isLastHint = false, isSolution = false) {
  const p = state.problem || {};
  const currentCode = state.editorCode ? state.editorCode.trim() : '';
  const currentLang = state.editorLanguage || 'Unknown';

  const styleInstructions = {
    socratic: `Use the Socratic method: ask probing questions that lead the user to discover the answer themselves. Never state a solution. Guide with "What if you considered...?", "Have you thought about...?", "What happens when...?" style prompts.`,
    direct: `Give clear, direct hints that point toward the right approach without giving the solution. Be concise and precise. Focus on the key insight needed.`,
    gentle: `Be warm and encouraging. Break down the problem into smaller, manageable questions. Celebrate their thinking. Use supportive language and build their confidence.`
  }[state.coachingStyle] || `Guide the user thoughtfully.`;

  return `You are LeetGuide, an expert coding coach specializing in algorithm and data structure problems.

CURRENT PROBLEM:
Title: ${p.title || p.slug || 'Unknown'}
Difficulty: ${p.difficulty || 'Medium'}
Description: ${p.description ? p.description.slice(0, 1500) : 'Not available'}

USER'S CURRENT CODE IN LEETCODE EDITOR (Language: ${currentLang}):
\`\`\`${currentLang.toLowerCase() === 'unknown' ? '' : currentLang.toLowerCase()}
${currentCode || '(The editor is currently empty or contains only the starting boilerplate)'}
\`\`\`

CODE & APPROACH AWARENESS:
- You have access to the user's latest code from their LeetCode editor above.
- When the user asks about their approach, changes, bugs, or "what should I do next?", directly evaluate their actual code above.
- Specifically comment on their approach, identify where their logic holds or fails, and highlight missing edge cases or inefficiencies without spoiling the full solution unless requested.

COACHING STYLE: ${styleInstructions}

${isSolution ? `🚨 EXPLICIT SOLUTION REQUEST DETECTED:
The user has explicitly asked for the solution (e.g. "give solution"). You MUST provide:
1. The complete, optimal, and thoroughly well-commented code solution in ${currentLang !== 'Unknown' ? currentLang : 'Python (or their editor language)'}.
2. Direct comparison with their code in the editor above (explain what was missing, buggy, or sub-optimal in their approach).
3. A step-by-step walkthrough of the algorithm and intuition.
4. Big-O Time and Space complexity analysis.
Always format code blocks cleanly with the language tag (e.g. \`\`\`${currentLang.toLowerCase() !== 'unknown' ? currentLang.toLowerCase() : 'python'}\n...\n\`\`\`).

` : isLastHint ? `⚠️ LAST HINT — This is the user's final hint. Regardless of what they asked, you MUST now reveal the complete step-by-step process to solve this problem. Structure your response as:
1. The core insight / key observation
2. The algorithm/approach to use and why
3. A numbered step-by-step walkthrough of the logic
4. Time and space complexity
Do NOT write any code. Explain purely in plain English. End with an encouraging message.

` : `HINTS RULES:
1. Do not write complete code solutions unless explicitly asked (e.g. "give solution")
2. Do not name the exact algorithm until the user has nearly figured it out
3. If they're completely wrong in approach, gently redirect with a question based on their editor code
4. Encourage them when they're on the right track
5. Adapt to their level — respond to the complexity of their questions`}
`;
}

// ─── Persistence ──────────────────────────────────────────────────────────
async function persistChat() {
  if (!state.problem) return;
  const key = 'chat_' + (state.problem.slug || 'unknown');
  await storage.set({
    [key]: JSON.stringify(state.messages.slice(-20)), // keep last 20 messages
    [key + '_hints']: state.hintCount
  });
}

// ─── Settings UI & Handlers ───────────────────────────────────────────────
function updateHintCountUI() {
  document.querySelectorAll('#hintCountRow .count-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.val) === state.maxHints);
  });
}

function updateStyleUI() {
  document.querySelectorAll('#styleRow .style-card').forEach(card => {
    card.classList.toggle('active', card.dataset.style === state.coachingStyle);
  });
}

// Settings Toggle
$('settingsToggle').addEventListener('click', () => {
  const isSettings = $('settingsView').classList.contains('active');
  if (isSettings) {
    const hasAnyKey = Object.values(state.apiKeys).some(k => k?.trim());
    if (!hasAnyKey) showView('noKeyView');
    else if (!state.problem) showView('notLeetcodeView');
    else showView('chatView');
  } else {
    showView('settingsView');
  }
});

// Back to chat
$('backToChat').addEventListener('click', () => {
  const hasAnyKey = Object.values(state.apiKeys).some(k => k?.trim());
  if (!hasAnyKey) showView('noKeyView');
  else if (!state.problem) showView('notLeetcodeView');
  else showView('chatView');
});

// Go to settings button in empty key screen
$('goToSettings').addEventListener('click', () => showView('settingsView'));

// Password visibility toggle
$('toggleKeyVisibility').addEventListener('click', () => {
  const input = $('apiKeyInput');
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';

  const eyeIcon = $('eyeIcon');
  if (isPass) {
    eyeIcon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    `;
  } else {
    eyeIcon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `;
  }
});

// Hint count selection
document.querySelectorAll('#hintCountRow .count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.maxHints = parseInt(btn.dataset.val);
    updateHintCountUI();
  });
});

// Style selection
document.querySelectorAll('#styleRow .style-card').forEach(card => {
  card.addEventListener('click', () => {
    state.coachingStyle = card.dataset.style;
    updateStyleUI();
  });
});

// Save settings button
$('saveSettings').addEventListener('click', async () => {
  // Capture current active tab's input
  state.apiKeys[state.currentSettingsTab] = $('apiKeyInput').value.trim();

  await storage.set({
    apiKeys: state.apiKeys,
    activeProvider: state.activeProvider,
    providerModels: state.providerModels,
    maxHints: state.maxHints,
    coachingStyle: state.coachingStyle
  });

  showToast('Settings & API Keys saved!', 'success');
  updateHintMeter();
  updateActiveModelUI();
  renderModelPickerDropdown();

  setTimeout(() => {
    if (state.problem) {
      showView('chatView');
    } else {
      init();
    }
  }, 400);
});

// Reset Chat & Hints for Current Problem
$('clearChatBtn').addEventListener('click', async () => {
  if (!state.problem) return;
  const key = 'chat_' + (state.problem.slug || 'unknown');
  await storage.remove([key, key + '_hints']);
  state.messages = [];
  state.hintCount = 0;
  $('chatArea').innerHTML = '';
  addWelcomeMessage();
  updateHintMeter();
  showToast('Session reset for current problem', 'success');
});

// Demo Mode button in notLeetcodeView
$('previewDemoBtn').addEventListener('click', () => {
  loadDemoProblem();
  showToast('Demo preview launched', 'info');
});

// Quick action buttons
document.querySelectorAll('#quickActions .quick-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const prompt = chip.dataset.prompt;
    sendMessage(prompt);
  });
});

// Send on button click
$('sendBtn').addEventListener('click', () => {
  const text = $('userInput').value.trim();
  $('userInput').value = '';
  autoResize($('userInput'));
  sendMessage(text);
});

// Send on Enter (not Shift+Enter)
$('userInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = $('userInput').value.trim();
    $('userInput').value = '';
    autoResize($('userInput'));
    sendMessage(text);
  }
});

// Auto-resize textarea
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 80) + 'px';
}
$('userInput').addEventListener('input', () => autoResize($('userInput')));

// Copy Code Snippets to Clipboard
document.addEventListener('click', e => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;

  const code = decodeURIComponent(btn.dataset.code || '');
  if (!code) return;

  navigator.clipboard.writeText(code).then(() => {
    const span = btn.querySelector('span');
    const originalText = span ? span.textContent : 'Copy';
    if (span) span.textContent = 'Copied!';
    btn.style.color = 'var(--easy)';
    showToast('Code snippet copied to clipboard', 'success');

    setTimeout(() => {
      if (span) span.textContent = originalText;
      btn.style.color = '';
    }, 1500);
  }).catch(() => {
    showToast('Failed to copy code', 'error');
  });
});

// ─── Start Application ─────────────────────────────────────────────────────
init();