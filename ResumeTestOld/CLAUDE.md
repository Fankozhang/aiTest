# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个使用 Vue 3 + Vite 构建的简历编辑器应用，支持实时预览和 PDF 导出功能。

## 常用命令

```bash
# 启动开发服务器 (在 http://localhost:3000)
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 项目架构

### 核心结构

应用采用左右分栏布局：
- **左侧编辑面板** (`ResumeEditor.vue`)：表单化的简历编辑界面
- **右侧预览面板** (`ResumePreview.vue`)：实时渲染的简历预览

### 数据流

- 简历数据保存在 `localStorage` 中，刷新页面后自动恢复
- 使用 `v-model` 在编辑器和预览组件间传递数据
- 数据结构包含：基本信息、工作经历、学历背景、技能等

### 技术栈

- **Vue 3**：使用 Composition API 和 `<script setup>` 语法
- **Vite**：构建工具和开发服务器
- **Tailwind CSS**：样式框架（通过 CDN 加载）
- **html2canvas + jspdf/html2pdf.js**：PDF 导出功能

### 响应式设计

- 大屏幕 (≥1024px)：左右分栏，固定编辑器宽度
- 中等屏幕 (768-1023px)：调整编辑器宽度为 400px
- 小屏幕 (<768px)：垂直堆叠布局

### 重要文件

- `src/App.vue`：根组件，包含整体布局和数据初始化逻辑
- `src/components/ResumeEditor.vue`：编辑表单组件
- `src/components/ResumePreview.vue`：预览和导出功能组件
- `index.html`：通过 CDN 加载 Tailwind CSS 和 Google Fonts
