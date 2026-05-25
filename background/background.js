// ==================== AI Prompt 管家 - Background Service Worker ====================

const SUPPORTED_DOMAINS = [
  'chat.openai.com', 'chatgpt.com', 'claude.ai',
  'chat.deepseek.com', 'kimi.moonshot.cn',
  'yuanbao.tencent.com', 'tongyi.aliyun.com',
  'chatglm.cn', 'doubao.com'
];

function isSupportedPage(url) {
  try {
    const u = new URL(url);
    return SUPPORTED_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

async function sendToggleToContent(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_PROMPT_PICKER' });
    return true;
  } catch {
    return false;
  }
}

// Named command: toggle inline prompt picker on AI chat pages
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-prompt-picker') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && isSupportedPage(tab.url)) {
      sendToggleToContent(tab.id);
    }
  }
});

// Extension icon click: on AI pages → toggle picker; elsewhere → open popup
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url) return;
  if (isSupportedPage(tab.url)) {
    // On AI page: toggle inline picker instead of popup
    const sent = await sendToggleToContent(tab.id);
    if (!sent) {
      // Content script not ready, open popup as fallback
      chrome.action.openPopup();
    }
  }
  // On non-AI pages: default behavior opens popup (handled by Chrome)
});

// Listen for storage changes to notify content scripts
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.prompts) {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_PROMPTS' }).catch(() => {});
      }
    });
  }
});

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    const DEFAULT_PROMPTS = [
      {
        id: 'd1', title: '请用中文回复',
        content: '请用中文回答我的问题。',
        category: '通用', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd2', title: '简洁解释',
        content: '请用简洁的语言解释下面的内容，避免使用专业术语。',
        category: '通用', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd3', title: 'Code Review',
        content: '请对以下代码进行 Code Review，指出潜在的 bug、性能问题、安全漏洞和改进建议：\n\n```\n[选中文字]\n```',
        category: '编程', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd4', title: '写单元测试',
        content: '请为以下代码编写全面的单元测试：\n\n```\n[选中文字]\n```',
        category: '编程', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd5', title: '解释这段代码',
        content: '请逐行解释以下代码的工作原理：\n\n```\n[选中文字]\n```',
        category: '编程', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd6', title: '润色文字',
        content: '请润色以下内容，使其更专业、流畅、易读：\n\n[选中文字]',
        category: '写作', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd7', title: '总结要点',
        content: '请总结以下内容的核心要点：\n\n[选中文字]',
        category: '写作', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd8', title: '翻译成英文',
        content: '请将以下内容翻译成英文：\n\n[选中文字]',
        category: '写作', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd9', title: 'Debug 分析',
        content: '以下是我的代码和报错信息，请帮我分析原因并给出修复方案：\n\n[选中文字]',
        category: '编程', createdAt: Date.now(), updatedAt: Date.now()
      },
      {
        id: 'd10', title: '性能优化',
        content: '请分析以下代码的性能瓶颈并提出优化方案：\n\n```\n[选中文字]\n```',
        category: '编程', createdAt: Date.now(), updatedAt: Date.now()
      }
    ];

    chrome.storage.sync.get('prompts', (result) => {
      if (!result.prompts || result.prompts.length === 0) {
        chrome.storage.sync.set({ prompts: DEFAULT_PROMPTS });
      }
    });
  }
});
