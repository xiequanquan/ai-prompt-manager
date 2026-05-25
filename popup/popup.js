// ==================== State ====================
let prompts = [];
let currentCategory = 'all';
let searchQuery = '';
let editingId = null;
let editingCategory = '通用';

// ==================== Default Prompts ====================
const DEFAULT_PROMPTS = [
  {
    id: genId(),
    title: '请用中文回复',
    content: '请用中文回答我的问题。',
    category: '通用',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '简洁解释',
    content: '请用简洁的语言解释下面的内容，避免使用专业术语，让非技术人员能听懂。',
    category: '通用',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '深度分析',
    content: '请对以下内容进行深度分析，从多个角度探讨，给出见解和结论。',
    category: '通用',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: 'Code Review',
    content: '请对以下代码进行 Code Review，指出潜在的 bug、性能问题、安全漏洞和改进建议：\n\n```\n[选中文字]\n```',
    category: '编程',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '写单元测试',
    content: '请为以下代码编写全面的单元测试（使用合适的测试框架），覆盖正常情况、边界情况和错误情况：\n\n```\n[选中文字]\n```',
    category: '编程',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '解释这段代码',
    content: '请逐行解释以下代码的工作原理：\n\n```\n[选中文字]\n```',
    category: '编程',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: 'Debug 分析',
    content: '以下是我的代码和报错信息，请帮我分析原因并给出修复方案：\n\n```\n[选中文字]\n```',
    category: '编程',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '性能优化',
    content: '请分析以下代码的性能瓶颈，并提出优化方案：\n\n```\n[选中文字]\n```',
    category: '编程',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '润色文字',
    content: '请润色以下内容，使其更专业、流畅、易读：\n\n[选中文字]',
    category: '写作',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '总结要点',
    content: '请总结以下内容的核心要点，以条目的形式列出：\n\n[选中文字]',
    category: '写作',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '翻译成英文',
    content: '请将以下内容翻译成英文，保持原意的同时让表达自然：\n\n[选中文字]',
    category: '写作',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: genId(),
    title: '翻译成中文',
    content: '请将以下内容翻译成中文：\n\n[选中文字]',
    category: '写作',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// ==================== Helpers ====================
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getCategories() {
  const cats = new Set(prompts.map(p => p.category));
  return ['通用', '编程', '写作', '自定义'].filter(c => cats.has(c));
}

function getCategoryIcon(category) {
  const icons = { '通用': '💬', '编程': '💻', '写作': '✍️', '自定义': '📌' };
  return icons[category] || '📋';
}

// ==================== Storage ====================
async function loadPrompts() {
  const result = await chrome.storage.sync.get('prompts');
  if (!result.prompts || result.prompts.length === 0) {
    prompts = DEFAULT_PROMPTS;
    await chrome.storage.sync.set({ prompts });
  } else {
    prompts = result.prompts;
  }
}

async function savePrompts() {
  await chrome.storage.sync.set({ prompts });
}

// ==================== Render ====================
function render() {
  renderCategories();
  renderList();
  updateBadge();
}

function renderCategories() {
  const container = document.getElementById('categories');
  const cats = ['all', ...new Set(prompts.map(p => p.category))];

  container.innerHTML = cats.map(cat => `
    <button class="cat-tab ${currentCategory === cat ? 'active' : ''}" data-cat="${cat}">
      ${cat === 'all' ? '全部' : cat}
    </button>
  `).join('');

  // Bind category clicks
  container.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      render();
    });
  });
}

function renderList() {
  const container = document.getElementById('promptList');
  const query = searchQuery.toLowerCase().trim();

  let filtered = prompts;
  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }
  if (query) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${query ? '🔍' : '📭'}</div>
        <p>${query ? '没有匹配的提示词' : '还没有提示词'}</p>
        <p class="empty-hint">${query ? '试试其他关键词' : '点击下方「+ 添加」开始创建'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="prompt-item" data-id="${p.id}">
      <div class="prompt-icon">${getCategoryIcon(p.category)}</div>
      <div class="prompt-info">
        <div class="prompt-title">${escapeHtml(p.title)}</div>
        <div class="prompt-preview">${escapeHtml(p.content.slice(0, 60))}${p.content.length > 60 ? '...' : ''}</div>
      </div>
      <span class="prompt-category">${escapeHtml(p.category)}</span>
    </div>
  `).join('');

  // Bind item clicks
  container.querySelectorAll('.prompt-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const prompt = prompts.find(p => p.id === id);
      if (prompt) {
        copyToClipboard(prompt);
      }
    });
    item.addEventListener('dblclick', () => {
      const id = item.dataset.id;
      openEditModal(id);
    });
  });
}

function updateBadge() {
  document.getElementById('count').textContent = prompts.length;
}

// ==================== Clipboard ====================
async function copyToClipboard(prompt) {
  try {
    await navigator.clipboard.writeText(prompt.content);
    showToast(`✅ 已复制「${prompt.title}」`);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = prompt.content;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`✅ 已复制「${prompt.title}」`);
  }
}

// ==================== Toast ====================
let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.hidden = false;
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = '';
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 1800);
}

// ==================== Modal ====================
function openAddModal() {
  editingId = null;
  editingCategory = '通用';
  document.getElementById('modalTitle').textContent = '添加提示词';
  document.getElementById('promptTitle').value = '';
  document.getElementById('promptContent').value = '';
  document.getElementById('deleteBtn').hidden = true;
  resetCategorySelect('通用');
  document.getElementById('modal').hidden = false;
  document.getElementById('promptTitle').focus();
}

function openEditModal(id) {
  const prompt = prompts.find(p => p.id === id);
  if (!prompt) return;
  editingId = id;
  editingCategory = prompt.category;
  document.getElementById('modalTitle').textContent = '编辑提示词';
  document.getElementById('promptTitle').value = prompt.title;
  document.getElementById('promptContent').value = prompt.content;
  document.getElementById('deleteBtn').hidden = false;
  resetCategorySelect(prompt.category);
  document.getElementById('modal').hidden = false;
  document.getElementById('promptTitle').focus();
}

function resetCategorySelect(cat) {
  editingCategory = cat;
  document.querySelectorAll('.cat-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
}

function closeModal() {
  document.getElementById('modal').hidden = true;
}

async function savePrompt() {
  const title = document.getElementById('promptTitle').value.trim();
  const content = document.getElementById('promptContent').value.trim();

  if (!title) {
    showToast('⚠️ 请输入标题');
    return;
  }
  if (!content) {
    showToast('⚠️ 请输入提示词内容');
    return;
  }

  if (editingId) {
    // Update existing
    const idx = prompts.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      prompts[idx] = {
        ...prompts[idx],
        title,
        content,
        category: editingCategory,
        updatedAt: Date.now()
      };
    }
    await savePrompts();
    closeModal();
    render();
    showToast('✅ 已更新');
  } else {
    // Add new
    prompts.unshift({
      id: genId(),
      title,
      content,
      category: editingCategory,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await savePrompts();
    closeModal();
    render();
    showToast('✅ 已添加');
  }
}

async function deletePrompt() {
  if (!editingId) return;
  if (!confirm('确定删除这个提示词吗？')) return;
  prompts = prompts.filter(p => p.id !== editingId);
  await savePrompts();
  closeModal();
  render();
  showToast('🗑️ 已删除');
}

// ==================== Import / Export ====================
function openImportModal() {
  document.getElementById('importData').value = '';
  document.getElementById('importModal').hidden = false;
}

function closeImportModal() {
  document.getElementById('importModal').hidden = true;
}

function exportPrompts() {
  const data = prompts.map(p => ({
    title: p.title,
    content: p.content,
    category: p.category
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompts-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 已导出');
}

async function importPrompts() {
  const raw = document.getElementById('importData').value.trim();
  if (!raw) {
    showToast('⚠️ 请粘贴数据');
    return;
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('需要数组格式');
    const imported = data.map(item => ({
      id: genId(),
      title: item.title || '未命名',
      content: item.content || '',
      category: item.category || '自定义',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    prompts = [...imported, ...prompts];
    await savePrompts();
    closeImportModal();
    render();
    showToast(`📥 已导入 ${imported.length} 条`);
  } catch (e) {
    showToast('⚠️ JSON 格式错误');
  }
}

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadPrompts();
  render();

  // Search
  const searchInput = document.getElementById('search');
  const clearBtn = document.getElementById('clearSearch');

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    clearBtn.hidden = !searchQuery;
    render();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.hidden = true;
    render();
    searchInput.focus();
  });

  // Buttons
  document.getElementById('addBtn').addEventListener('click', openAddModal);
  document.getElementById('exportBtn').addEventListener('click', exportPrompts);
  document.getElementById('importBtn').addEventListener('click', openImportModal);

  // Modal buttons
  document.getElementById('saveBtn').addEventListener('click', savePrompt);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('deleteBtn').addEventListener('click', deletePrompt);

  // Category select in modal
  document.querySelectorAll('.cat-option').forEach(btn => {
    btn.addEventListener('click', () => {
      resetCategorySelect(btn.dataset.cat);
    });
  });

  // Import modal
  document.getElementById('confirmImportBtn').addEventListener('click', importPrompts);
  document.getElementById('cancelImportBtn').addEventListener('click', closeImportModal);
  document.getElementById('closeImportBtn').addEventListener('click', closeImportModal);

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.hidden = true;
      }
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modal').hidden) closeModal();
      if (!document.getElementById('importModal').hidden) closeImportModal();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (!document.getElementById('modal').hidden) savePrompt();
    }
  });
});
