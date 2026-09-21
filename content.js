// content.js – runs on leetcode.com/problems/* pages
// Extracts problem title, difficulty, description, and editor code/language safely without CSP violations

function extractProblemData() {
  const data = {};

  // Title
  const titleEl = document.querySelector('[data-cy="question-title"]') ||
                  document.querySelector('.mr-2.text-label-1') ||
                  document.querySelector('h4[data-cy="question-title"]') ||
                  document.querySelector('.text-title-large a') ||
                  document.querySelector('h4');
  data.title = titleEl ? titleEl.innerText.trim() : document.title.split('-')[0].trim();

  // Difficulty
  const diffEl = document.querySelector('[diff]') ||
                 document.querySelector('.difficulty-label') ||
                 document.querySelector('[class*="difficulty"]') ||
                 [...document.querySelectorAll('span')].find(el =>
                   ['Easy', 'Medium', 'Hard'].includes(el.innerText.trim())
                 );
  data.difficulty = diffEl ? diffEl.innerText.trim() : 'Unknown';

  // Problem description
  const descEl = document.querySelector('[data-track-load="description_content"]') ||
                 document.querySelector('.question-content') ||
                 document.querySelector('.content__u3I1') ||
                 document.querySelector('[class*="description"]');
  data.description = descEl ? descEl.innerText.trim().slice(0, 3000) : '';

  // URL slug as fallback identifier
  data.slug = window.location.pathname.split('/problems/')[1]?.split('/')[0] || '';
  data.url = window.location.href;

  return data;
}

// ─── Safe DOM Code & Language Extraction (100% CSP Compliant) ─────────────
function getCodeFromDOM() {
  try {
    const viewLines = document.querySelectorAll('.monaco-editor .view-lines .view-line, .view-lines .view-line');
    if (viewLines && viewLines.length > 0) {
      return Array.from(viewLines).map(line => line.innerText).join('\n');
    }
    const inputArea = document.querySelector('textarea.inputarea, .monaco-editor textarea');
    if (inputArea && inputArea.value) {
      return inputArea.value;
    }
  } catch (e) {
    console.warn('[LeetGuide] DOM code read:', e);
  }
  return '';
}

function getLanguageFromDOM() {
  try {
    const knownLangs = [
      'C++', 'Java', 'Python', 'Python3', 'C', 'C#', 'JavaScript', 'TypeScript',
      'PHP', 'Swift', 'Kotlin', 'Dart', 'Go', 'Ruby', 'Scala', 'Rust', 'Racket', 'Erlang', 'Elixir'
    ];

    // Check buttons in LeetCode editor toolbar
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const txt = btn.innerText.trim();
      if (knownLangs.includes(txt)) {
        return txt;
      }
    }

    const langEl = document.querySelector('[id*="headlessui-listbox-button"]') ||
                   document.querySelector('[data-cy="lang-select"]');
    if (langEl && langEl.innerText) {
      const match = knownLangs.find(l => langEl.innerText.includes(l));
      if (match) return match;
    }
  } catch (e) {
    console.warn('[LeetGuide] DOM language read:', e);
  }

  return '';
}

function extractEditorData() {
  const code = getCodeFromDOM();
  const language = getLanguageFromDOM();

  return {
    code: code ? code.trim() : '',
    language: language || 'Unknown'
  };
}

// ─── Listen for Messages from Popup ───────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getProblemData') {
      const probData = extractProblemData();
      const editorData = extractEditorData();
      sendResponse({
        ...probData,
        code: editorData.code,
        language: editorData.language
      });
      return true;
    }

    if (request.action === 'getEditorCode') {
      const editorData = extractEditorData();
      sendResponse(editorData);
      return true;
    }
  } catch (err) {
    console.warn('[LeetGuide] Message handler error:', err);
    sendResponse({ code: '', language: 'Unknown' });
  }

  return true;
});
