# AI Prompt 管家

> Chrome 扩展：管理你的 AI Prompt 库，一键插入 ChatGPT / Claude / DeepSeek / Kimi 等 AI 聊天工具。

## 功能

- 📋 **Prompt 管理** — 在弹出窗口中浏览、搜索、添加、编辑、删除提示词
- 🏷️ **分类管理** — 通用 / 编程 / 写作 / 自定义 四大分类
- 🔗 **一键插入** — 在 AI 聊天页面点击提示词，自动填入输入框
- 🎯 **[选中文字] 占位符** — 在 prompt 中用 `[选中文字]` 表示选中文本插入位置
- ⌨️ **快捷键** — `Ctrl+Shift+P` 快速调出 Prompt 选择器（在 AI 聊天页）
- 🌙 **暗黑模式** — 自动跟随系统主题
- 💾 **云同步** — 通过 Chrome 账号同步 prompt 库
- 📤 **导入/导出** — JSON 格式备份与迁移

## 安装

1. 打开 Chrome，进入 `chrome://extensions/`
2. 打开右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `prompt-manager/` 目录

## 使用

### 管理 Prompt
- 点击扩展图标 → 弹出 Prompt 管家界面
- 搜索、按分类筛选、双击编辑、单击复制

### 在 AI 聊天页面使用
- 打开 ChatGPT / Claude / DeepSeek / Kimi 等对话页
- 页面右下角会出现蓝色 📋 悬浮按钮
- 点击按钮或按 `Ctrl+Shift+P` 打开 Prompt 选择器
- 点击任意 prompt → 自动填入输入框
- 如果选中了网页上的文字，prompt 中的 `[选中文字]` 会被替换

### Prompt 写法示例
```
请对以下代码进行 Code Review，指出潜在的 bug、性能问题和改进建议：

```
[选中文字]
```
```

## 文件结构

```
prompt-manager/
├── manifest.json        # 扩展配置 (Manifest V3)
├── popup/               # 弹出窗口（管理界面）
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/             # 注入到 AI 聊天页的脚本
│   ├── content.js
│   └── content.css
├── background/          # 后台 Service Worker
│   └── background.js
├── icons/               # 图标
└── README.md
```

## 技术栈

- Manifest V3
- Chrome Storage Sync API
- 原生 JavaScript（无框架依赖）
- 支持暗黑模式（prefers-color-scheme）
