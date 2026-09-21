# 🎯 LeetGuide – AI Problem Coach

A modern, production-grade Chrome extension that reads your active LeetCode problem and **live code from your editor**, providing **Socratic hints** powered by your choice of AI: **Google Gemini**, **OpenAI GPT-4o**, **Anthropic Claude**, **Groq Llama 3.3**, or **OpenRouter** — guiding your thinking without ever spoiling the solution until you ask.

---

## ✨ Key Features

- 🧠 **Auto-reads the Problem & Live Code**:
  - Automatically extracts problem title, difficulty, and description.
  - **Real-time editor sync**: Extracts the latest iteration of your code and language directly from the LeetCode Monaco editor on every query.
  - Understands your current approach and adapts as you write or modify code.
- 🔀 **Multi-Provider & Live Model Selector**:
  - Add API keys for **Google Gemini**, **OpenAI**, **Anthropic Claude**, **Groq**, or **OpenRouter**.
  - **Switch models on the fly**: Use the dropdown directly in the chat header to pick your preferred model right before asking a question.
  - Manage all keys and custom model preferences neatly in Settings with dedicated provider tabs.
- 💬 **Socratic Coaching & Code Review**:
  - Point out bugs, missing edge cases, and algorithmic bottlenecks in your current attempt without giving away the answer.
  - 3 customizable coaching styles: **Socratic** (question-driven), **Direct** (concise nudges), and **Gentle** (step-by-step encouragement).
- 🎯 **Hint Budget & Visual Progress Meter**:
  - Set a budget of 3, 5, 7, or 10 hints per problem with a sleek segmented pip meter.
  - On your final hint, the full conceptual walkthrough is revealed.
- 🔓 **Instant Solution Bypass ("Give Solution")**:
  - At any point—**even when your hint budget is exhausted**—simply prompt **"give solution"** (case-insensitive: e.g. `"GiVE SoLuTioN"`, `"give me the solution"`, etc.) or click the **✨ Give Solution** chip.
  - Instantly reveals the complete, optimal, well-commented solution in your language, compares it against your code attempt, and details time/space complexity.
- 🎨 **Modern SaaS Interface & Polish**:
  - Refined dark theme design system built with [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono).
  - Code syntax cards with **one-click copy-to-clipboard**.
  - Password visibility toggle for all your API keys.
  - Non-intrusive floating toast notifications and smooth micro-interactions.
  - Standalone **Demo Mode** to test the extension anywhere.

---

## 🚀 Installation

### Step 1: Clone or Download
```bash
git clone https://github.com/Raaaaj360/LeetGuide.git
```

### Step 2: Load into Google Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `leetcode-guide-extension` folder.

### Step 3: Add Your API Key(s)
1. Click the **LeetGuide** extension icon in your toolbar.
2. Click **⚙ Settings**.
3. Select your provider tab (**Gemini**, **OpenAI**, **Claude**, **Groq**, or **Router**).
4. Paste your API Key and select your default model.
5. Click **Save Preferences**.

### 🔄 Updating / Reloading the Extension
Whenever updates are made to the extension:
1. Open `chrome://extensions/`.
2. Click the circular **Reload** icon on **LeetGuide – AI Problem Coach**.
3. Refresh your open LeetCode tab (`Ctrl+R` or `F5`).

---

## 🤖 Supported AI Providers & Models

| Provider | Supported Models | Description | Get Key |
|---|---|---|---|
| **Google Gemini** | `gemini-2.5-flash`, `gemini-1.5-pro` | Default engine. Fast, highly capable, free tier. | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **OpenAI** | `gpt-4o-mini`, `gpt-4o` | High reasoning capability and code comprehension. | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Anthropic Claude** | `claude-3-5-haiku`, `claude-3-5-sonnet` | Renowned for coding nuance and natural Socratic tone. | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| **Groq Cloud** | `llama-3.3-70b-versatile`, `mixtral-8x7b` | Ultra-fast inference on LPUs (hundreds of tokens/sec). | [Groq Console](https://console.groq.com/keys) |
| **OpenRouter** | `deepseek/deepseek-chat`, `deepseek/deepseek-r1` | Unified gateway to open models like DeepSeek V3 and R1. | [OpenRouter](https://openrouter.ai/keys) |

---

## 🧠 How to Use

1. Navigate to any LeetCode problem, e.g. `https://leetcode.com/problems/two-sum/`.
2. Click the **LeetGuide** extension icon.
3. Choose your preferred AI model from the top dropdown (e.g. `Gemini 2.5`, `GPT-4o Mini`, `Claude 3.5`).
4. Interact using the quick-action chips or ask custom questions:
   - `💡 First Step` — Get an initial nudge on where to begin.
   - `🔍 Review Code` — Ask the coach to review your current code in the editor and evaluate your logic.
   - `🗂 Data Structure` — Inquire about optimal data structures.
   - `⏱ Complexity` — Check the target time/space complexity.
   - `✨ Give Solution` — Type `"give solution"` (or `"GiVE SoLuTioN"`) at any time to receive the full solution and comparison against your attempt.

---

## 💡 Example Interactions

### 1. Asking for a Nudge
**You**: Give me my first hint  
**Coach**: *What's the most expensive operation in a naive brute-force approach? What if you could avoid repeating it with a lookup structure?*

### 2. Live Code Evaluation
**You**: (After writing a two-pointer loop in the LeetCode editor) *Does my current code look good?*  
**Coach**: *Looking at your `twoSum` function: you're incrementing `left` and `right` simultaneously inside the while loop, which could skip valid pairs. What condition should decide which pointer moves?*

### 3. Requesting the Solution (Bypasses Hint Limits)
**You**: *GiVE SoLuTioN*  
**Coach**: *Here is the complete optimal solution in Python3 using a hash map...* (provides clean code block with copy button, explains what was sub-optimal in the user's attempt, and details $O(n)$ time and space).

---

## 📁 File Structure

```
leetcode-guide-extension/
├── manifest.json       # Extension config with host permissions for all AI endpoints
├── content.js          # Extracts problem info & live Monaco editor code from LeetCode
├── popup.html          # Extension popup UI, model selector dropdown, provider tabs
├── popup.css           # Centralized modern dark design system & tokens
├── popup.js            # Core logic, multi-provider API dispatchers & markdown parser
├── icons/              # Extension icons (16px, 48px, 128px)
└── README.md           # Documentation
```

---

## 🔒 Privacy & Security

- Your API keys are stored locally on your device via `chrome.storage.local`.
- Requests are dispatched directly from your browser to the chosen provider's official API endpoint.
- No intermediate servers, proxies, or analytics collect your keys or prompts.

---

## 🛠 Requirements

- Google Chrome (or Chromium-based browser like Brave, Edge).
- At least one API key from any of the supported providers (Google Gemini, OpenAI, Anthropic, Groq, or OpenRouter).

---

*Built to make you a better problem solver — not to solve problems for you.* 🧩