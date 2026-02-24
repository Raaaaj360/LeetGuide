// content.js – runs on leetcode.com/problems/* pages
// Extracts problem title, difficulty, and description and makes it accessible to the popup

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

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProblemData') {
    sendResponse(extractProblemData());
  }
  return true;
});
