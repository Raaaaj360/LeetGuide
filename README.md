# 🎯 LeetGuide – AI Problem Coach

A Chrome extension that reads your active LeetCode problem and gives you **Socratic hints** powered by Gemini — guiding your thinking without ever spoiling the solution.

---

## ✨ Features

- **Auto-reads the problem** — title, difficulty, and description extracted from the page
- **Guided hints only** — the AI is instructed never to reveal the solution
- **3 coaching styles**: Socratic (question-based), Direct (concise nudges), Gentle (step-by-step)
- **Hint budget** — set a max of 3–10 hints per problem to keep yourself accountable the detailed breakdown is given on the last hint
- **Quick actions** — one-click prompts for first hint, data structure suggestions, complexity targets
- **Persistent chat** — your conversation is saved per-problem, pick up where you left off
- **Gemini-1.5-flash powered** — fast and affordable

---

## 🚀 Installation

### Step 1: Download / Clone
```
git clone https://github.com/yourrepo/leetguide-extension
# or extract the zip
```

### Step 2: Load in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `leetcode-guide-extension` folder

### Step 3: Add your API Key
1. Click the LeetGuide icon in your Chrome toolbar
2. Click **⚙ Settings**
3. Paste your [LLM API key]([https://aistudio.google.com/api-keys](https://aistudio.google.com)
4. Click **Save Settings**

---

## 🧠 How to Use

1. Navigate to any LeetCode problem, e.g. `https://leetcode.com/problems/two-sum/`
2. Click the **LeetGuide** extension icon
3. The problem is automatically loaded
4. Use quick-action buttons or type your own question
5. The AI will guide you — asking questions, pointing you toward the right data structures, nudging your thinking — **without giving away the answer**

---

## ⚙️ Settings

| Setting | Options | Description |
|---|---|---|
| API Key | Your LLM key | Required to power the AI coach |
| Hints per problem | 3 / 5 / 7 / 10 | Your hint budget for each problem |
| Coaching style | Socratic / Direct / Gentle | How the AI communicates |

---

## 💡 Example Interactions

**You**: Give me my first hint  
**Coach**: What's the most expensive operation in a naive brute-force approach? What if you could avoid repeating it?

**You**: Should I use a hash map?  
**Coach**: What would you store in it, and what would you look up? What's the relationship between what you're searching for and what you've already seen?

**You**: I'm totally stuck  
**Coach**: Let's break it down — if you saw the first number in a pair, what would you need to know about the second number to confirm they form a valid answer?

---

## 📁 File Structure

```
leetcode-guide-extension/
├── manifest.json       # Chrome extension config
├── content.js          # Extracts problem from LeetCode page
├── popup.html          # Extension popup UI
├── popup.js            # Full application logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 🔒 Privacy

- Your API key is stored locally in Chrome's storage (`chrome.storage.local`)
- Problem data is sent to Gemini's API to generate hints
- No data is sent to any other server

---

## 🛠 Requirements

- Google Chrome (or Chromium-based browser)
- A Gemini API key with access to `gemini-1.5-flash`

---

*Built to make you a better problem solver — not to solve problems for you.* 🧩