// popup.js – LeetGuide Extension Logic

const $ = id => document.getElementById(id);

// ─── State ────────────────────────────────────────────────────────────────
let state = {
  apiKey: '',
  maxHints: 7,
  coachingStyle: 'socratic',
  problem: null,
  messages: [],   // [{role, content}]
  hintCount: 0,
  isLoading: false,
};

// ─── Init ─────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get(['apiKey', 'maxHints', 'coachingStyle']);
  state.apiKey = stored.apiKey || '';
  state.maxHints = stored.maxHints || 7;
  state.coachingStyle = stored.coachingStyle || 'socratic';

  // Populate settings UI
  $('apiKeyInput').value = state.apiKey;
  updateHintCountUI();
  updateStyleUI();

  // Try to grab problem from active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes('leetcode.com/problems/')) {
      showView('notLeetcodeView');
      return;
    }

    if (!state.apiKey) {
      showView('noKeyView');
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProblemData' });
    state.problem = response;

    // Load persisted chat for this problem
    const cacheKey = 'chat_' + (state.problem.slug || 'unknown');
    const cached = await chrome.storage.local.get([cacheKey, cacheKey + '_hints']);
    if (cached[cacheKey]) {
      state.messages = JSON.parse(cached[cacheKey]);
      state.hintCount = cached[cacheKey + '_hints'] || 0;
      renderMessages();
    } else {
      addWelcomeMessage();
    }

    updateProblemBar();
    showView('chatView');
  } catch (e) {
    showView('notLeetcodeView');
  }
}

// ─── Views ────────────────────────────────────────────────────────────────
function showView(viewId) {
  ['settingsView', 'notLeetcodeView', 'noKeyView', 'chatView'].forEach(v => {
    $(v).classList.toggle('active', v === viewId);
  });
}

// ─── Problem Bar ──────────────────────────────────────────────────────────
function updateProblemBar() {
  const p = state.problem;
  $('problemTitle').textContent = p.title || p.slug || 'Unknown Problem';
  const badge = $('diffBadge');
  badge.textContent = p.difficulty || '—';
  badge.className = 'diff-badge ' + (p.difficulty || 'Unknown');
  $('hintUsed').textContent = state.hintCount;
  $('hintMax').textContent = state.maxHints;
}

// ─── Chat UI ─────────────────────────────────────────────────────────────
function addWelcomeMessage() {
  const p = state.problem;
  const styleDesc = {
    socratic: 'ask you guiding questions to help you discover the solution yourself',
    direct: 'give you clear, concise directional hints',
    gentle: 'gently guide you step-by-step with encouragement',
  }[state.coachingStyle];

  const welcome = `👋 Hey! I'm your coding coach for **${p.title || p.slug}**.

I'll ${styleDesc} — without ever revealing the solution directly.

You have **${state.maxHints} hints** available. Use them wisely! 

Try a quick action below, or ask me anything about your approach.`;

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

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? 'You' : 'Coach';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = formatContent(content);

  div.appendChild(label);
  div.appendChild(bubble);
  area.appendChild(div);
}

function renderMessages() {
  $('chatArea').innerHTML = '';
  state.messages.forEach(m => renderSingleMessage(m.role, m.content));
  scrollChat();
}

function formatContent(text) {
  // Basic markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function showThinking() {
  const area = $('chatArea');
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = 'thinkingMsg';

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = 'Coach';

  const bubble = document.createElement('div');
  bubble.className = 'thinking';
  bubble.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

  div.appendChild(label);
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

// ─── API Call ─────────────────────────────────────────────────────────────
async function sendMessage(userText) {
  if (state.isLoading) return;
  if (!userText.trim()) return;

  if (state.hintCount >= state.maxHints) {
    appendMessage('assistant', `⚠️ You've used all **${state.maxHints}** hints for this problem. Try solving it yourself now — you've got this! If you're truly stuck, consider resetting the hint counter in settings.`);
    return;
  }

  state.isLoading = true;
  $('sendBtn').disabled = true;

  appendMessage('user', userText);
  showThinking();

  state.hintCount++;
  const isLastHint = state.hintCount >= state.maxHints;
  $('hintUsed').textContent = state.hintCount;

  try {
    const systemPrompt = buildSystemPrompt(isLastHint);
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...state.messages.slice(0, -1) // exclude the just-added user message (we add it next)
        .filter(m => m.role !== 'assistant' || !m.content.startsWith('👋')) // skip welcome
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `API error ${res.status}`);
    }

    const reply = data.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a hint right now.';
    removeThinking();
    appendMessage('assistant', reply);
    persistChat();

  } catch (err) {
    removeThinking();
    appendMessage('assistant', `❌ **Error:** ${err.message}\n\nPlease check your API key in settings.`);
    state.hintCount = Math.max(0, state.hintCount - 1);
    $('hintUsed').textContent = state.hintCount;
  }

  state.isLoading = false;
  $('sendBtn').disabled = false;
}

function buildSystemPrompt(isLastHint = false) {
  const p = state.problem;
  const styleInstructions = {
    socratic: `Use the Socratic method: ask probing questions that lead the user to discover the answer themselves. Never state a solution. Guide with "What if you considered...?", "Have you thought about...?", "What happens when...?" style prompts.`,
    direct: `Give clear, direct hints that point toward the right approach without giving the solution. Be concise and precise. Focus on the key insight needed.`,
    gentle: `Be warm and encouraging. Break down the problem into smaller, manageable questions. Celebrate their thinking. Use supportive language and build their confidence.`,
  }[state.coachingStyle];

  return `You are LeetGuide, an expert coding coach specializing in algorithm and data structure problems.

CURRENT PROBLEM:
Title: ${p.title || p.slug}
Difficulty: ${p.difficulty}
Description: ${p.description ? p.description.slice(0, 1500) : 'Not available'}

YOUR ROLE:
- By default, guide the user toward solving this problem themselves using hints and questions
- If they share their approach, give targeted feedback on it
- Keep hint responses concise (2-4 sentences or a short list at most)

COACHING STYLE: ${styleInstructions}

${isLastHint ? `⚠️ LAST HINT — This is the user's final hint. Regardless of what they asked, you MUST now reveal the complete step-by-step process to solve this problem. Structure your response as:
1. The core insight / key observation
2. The algorithm/approach to use and why
3. A numbered step-by-step walkthrough of the logic
4. Time and space complexity
Do NOT write any code. Explain purely in plain English. End with an encouraging message.

` : ''}SOLUTION POLICY:
- If the user EXPLICITLY asks for the solution, the full answer, or complete code (e.g. "give me the solution", "show me the code", "just tell me the answer"), provide a complete, well-commented solution in their preferred language (default to Python if not specified)
- After giving the solution, briefly explain the approach, time complexity, and space complexity
- If they haven't explicitly asked for the solution, continue guiding with hints only

HINTS RULES:
1. Do not write complete code solutions unless explicitly asked
2. Do not name the exact algorithm until the user has nearly figured it out
3. If they're completely wrong in approach, gently redirect with a question
4. Encourage them when they're on the right track
5. Adapt to their level — respond to the complexity of their questions`;
}

// ─── Persistence ──────────────────────────────────────────────────────────
async function persistChat() {
  if (!state.problem) return;
  const key = 'chat_' + (state.problem.slug || 'unknown');
  await chrome.storage.local.set({
    [key]: JSON.stringify(state.messages.slice(-20)), // keep last 20 msgs
    [key + '_hints']: state.hintCount,
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────
function updateHintCountUI() {
  document.querySelectorAll('#hintCountRow .count-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.val) === state.maxHints);
  });
}

function updateStyleUI() {
  document.querySelectorAll('#styleRow .count-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style === state.coachingStyle);
  });
}

// ─── Event Listeners ──────────────────────────────────────────────────────
$('settingsToggle').addEventListener('click', () => {
  const isSettings = $('settingsView').classList.contains('active');
  if (isSettings) {
    // go back
    if (!state.apiKey) showView('noKeyView');
    else if (!state.problem) showView('notLeetcodeView');
    else showView('chatView');
  } else {
    showView('settingsView');
  }
});

$('backToChat').addEventListener('click', () => {
  if (!state.apiKey) showView('noKeyView');
  else if (!state.problem) showView('notLeetcodeView');
  else showView('chatView');
});

$('goToSettings').addEventListener('click', () => showView('settingsView'));

// Hint count selection
document.querySelectorAll('#hintCountRow .count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.maxHints = parseInt(btn.dataset.val);
    updateHintCountUI();
  });
});

// Style selection
document.querySelectorAll('#styleRow .count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.coachingStyle = btn.dataset.style;
    updateStyleUI();
  });
});

$('saveSettings').addEventListener('click', async () => {
  const key = $('apiKeyInput').value.trim();
  state.apiKey = key;
  await chrome.storage.local.set({
    apiKey: key,
    maxHints: state.maxHints,
    coachingStyle: state.coachingStyle,
  });
  $('saveSettings').textContent = '✓ Saved!';
  setTimeout(() => {
    $('saveSettings').textContent = 'Save Settings';
    init();
  }, 800);
});

// Quick action buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.dataset.prompt;
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

// ─── Start ─────────────────────────────────────────────────────────────────
init();
