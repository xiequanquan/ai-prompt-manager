// ==================== AI Prompt 管家 - Content Script ====================
// Runs on supported AI chat pages. Adds a floating button and inline prompt picker.

// ==================== State ====================
let prompts = [];
let currentCategory = 'all';
let searchQuery = '';
let panelVisible = false;

// ==================== Category Icons ====================
const CATEGORY_ICONS = { '通用': '💬', '编程': '💻', '写作': '✍️', '自定义': '📌' };

// ==================== Init ====================
init();

async function init() {
  await loadPrompts();
  injectFloatingButton();
  listenForMessages();
}

// ==================== Storage ====================
async function loadPrompts() {
  try {
    const result = await chrome.storage.sync.get('prompts');
    prompts = result.prompts || [];
  } catch (e) {
    prompts = [];
  }
}

async function refreshPrompts() {
  await loadPrompts();
  if (panelVisible) {
    renderPanel();
  }
}

// ==================== Floating Button ====================
let floatBtn = null;

function injectFloatingButton() {
  if (floatBtn) return;
  floatBtn = document.createElement('button');
  floatBtn.className = 'prompt-picker-float-btn';
  floatBtn.textContent = '📋';
  floatBtn.title = '打开 Prompt 管家 (Ctrl+Shift+P)';
  floatBtn.addEventListener('click', togglePanel);
  document.body.appendChild(floatBtn);
}

// ==================== Message Listener ====================
function listenForMessages() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'TOGGLE_PROMPT_PICKER') {
      togglePanel();
      sendResponse({ ok: true });
    }
    if (msg.type === 'REFRESH_PROMPTS') {
      refreshPrompts();
      sendResponse({ ok: true });
    }
  });
}

// ==================== Panel ====================
let overlay = null;
let panel = null;

function togglePanel() {
  if (panelVisible) {
    hidePanel();
  } else {
    showPanel();
  }
}

function showPanel() {
  if (panelVisible) return;
  panelVisible = true;

  // Overlay
  overlay = document.createElement('div');
  overlay.className = 'prompt-picker-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hidePanel();
  });
  document.body.appendChild(overlay);

  // Panel
  panel = document.createElement('div');
  panel.className = 'prompt-picker-panel';
  panel.innerHTML = `
    <div class="prompt-picker-header">
      <span class="prompt-picker-title">📋 选择提示词</span>
      <button class="prompt-picker-close">✕</button>
    </div>
    <div class="prompt-picker-search">
      <input type="text" id="pp-search" placeholder="🔍 搜索提示词..." autocomplete="off" />
    </div>
    <div class="prompt-picker-categories" id="pp-categories"></div>
    <div class="prompt-picker-list" id="pp-list"></div>
  `;

  // Close button
  panel.querySelector('.prompt-picker-close').addEventListener('click', hidePanel);

  // Search
  const searchInput = panel.querySelector('#pp-search');
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderPanel();
  });

  document.body.appendChild(panel);
  renderPanel();

  // Focus search
  setTimeout(() => searchInput.focus(), 100);

  // Keyboard: escape to close
  document.addEventListener('keydown', handleKeydown);
}

function hidePanel() {
  if (!panelVisible) return;
  panelVisible = false;

  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  if (panel) {
    panel.remove();
    panel = null;
  }

  document.removeEventListener('keydown', handleKeydown);
  searchQuery = '';
  currentCategory = 'all';
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    hidePanel();
  }
}

// ==================== Render Panel ====================
function renderPanel() {
  if (!panel || !panelVisible) return;

  const categoriesContainer = panel.querySelector('#pp-categories');
  const listContainer = panel.querySelector('#pp-list');
  const query = searchQuery.toLowerCase().trim();

  // Get unique categories
  const cats = ['all', ...new Set(prompts.map(p => p.category).filter(Boolean))];

  categoriesContainer.innerHTML = cats.map(cat => `
    <button class="pp-cat-btn ${currentCategory === cat ? 'active' : ''}" data-cat="${cat}">
      ${cat === 'all' ? '全部' : cat}
    </button>
  `).join('');

  categoriesContainer.querySelectorAll('.pp-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      renderPanel();
      panel.querySelector('#pp-search').focus();
    });
  });

  // Filter
  let filtered = prompts;
  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }
  if (query) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `<div class="pp-empty">${query ? '🔍 没有匹配的提示词' : '📭 还没有提示词'}</div>`;
    return;
  }

  listContainer.innerHTML = filtered.map(p => {
    const icon = CATEGORY_ICONS[p.category] || '📋';
    const preview = p.content.replace(/\n/g, ' ').slice(0, 50);
    return `
      <div class="pp-item" data-id="${p.id}">
        <span class="pp-item-icon">${icon}</span>
        <div class="pp-item-info">
          <div class="pp-item-title">${escapeHtml(p.title)}</div>
          <div class="pp-item-preview">${escapeHtml(preview)}${p.content.length > 50 ? '...' : ''}</div>
        </div>
        <span class="pp-item-cat">${escapeHtml(p.category || '通用')}</span>
      </div>
    `;
  }).join('');

  // Bind click events
  listContainer.querySelectorAll('.pp-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const prompt = prompts.find(p => p.id === id);
      if (prompt) {
        insertPrompt(prompt);
      }
    });
  });
}

// ==================== Insert Prompt ====================
function insertPrompt(prompt) {
  let text = prompt.content;

  // Check if there's selected text on the page
  const selection = window.getSelection();
  let selectedText = (selection && selection.toString().trim()) || '';

  // If text is selected, replace [选中文字] placeholder
  if (selectedText && text.includes('[选中文字]')) {
    text = text.replace('[选中文字]', selectedText);
  }

  // Try to find and fill the chat input
  const input = findChatInput();
  if (input) {
    setInputValue(input, text);
    hidePanel();
  } else {
    // Fallback: copy to clipboard
    fallbackCopy(text);
    hidePanel();
  }
}

function findChatInput() {
  // Try common selectors for different AI chat platforms
  const selectors = [
    // ChatGPT
    'textarea#prompt-textarea',
    '#prompt-textarea',
    // Claude
    '[contenteditable="true"]',
    // DeepSeek
    '#chat-input textarea',
    'textarea[placeholder*="消息"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="输入"]',
    // Generic contenteditable (Claude, Perplexity etc.)
    '[contenteditable="plaintext-only"]',
    // General fallbacks
    'div[contenteditable="true"]',
    'textarea:not([hidden])',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }

  // Last resort: find the largest visible textarea
  const textareas = document.querySelectorAll('textarea');
  let best = null;
  let bestArea = 0;
  for (const ta of textareas) {
    const rect = ta.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > bestArea && rect.width > 100 && rect.height > 30) {
      bestArea = area;
      best = ta;
    }
  }
  return best;
}

function setInputValue(input, text) {
  if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
    // Also trigger React's synthetic event system
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else if (input.isContentEditable) {
    input.textContent = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }
}

function fallbackCopy(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show brief notification
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.8); color: #fff; padding: 8px 20px;
      border-radius: 20px; font-size: 14px; z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      animation: ppFadeIn 0.15s ease;
    `;
    notif.textContent = `✅ 已复制「${prompt.title}」`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 1500);
  }).catch(() => {});
}

// ==================== Utilities ====================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
