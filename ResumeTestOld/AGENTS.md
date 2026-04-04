# AGENTS.md

本文件为在此代码仓库中工作的 AI 编程代理提供指导。

## 项目概述

本仓库包含两个项目：
1. **简历编辑器应用** (`resume/`) - 基于 Vue 3 + Vite 构建的简历编辑器，支持实时预览和 PDF 导出
2. **独立 HTML 简历** (`index.html`) - 原生 JavaScript 版本的简历编辑器（无需构建步骤）

## 构建/开发命令

所有命令需在 `resume/` 目录下运行：

```bash
# 启动开发服务器 (http://localhost:3000，自动打开浏览器)
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

**当前未配置 lint、test 或 typecheck 命令。** 项目未集成 ESLint、Prettier、Vitest 或 TypeScript。如果后续添加了这些工具，请同步更新此文件。

## 项目架构

```
resume/
├── src/
│   ├── App.vue              # 根组件，数据初始化，布局管理
│   ├── main.js              # 入口文件，挂载应用
│   └── components/
│       ├── ResumeEditor.vue  # 左侧面板：简历数据表单输入
│       └── ResumePreview.vue # 右侧面板：实时预览 + PDF 导出
├── index.html               # 通过 CDN 加载 Tailwind CSS、Google Fonts
├── vite.config.js           # Vite + Vue 插件配置，端口 3000
└── tailwind.config.js       # Tailwind 配置，自定义颜色/字体
```

### 数据流

- 简历数据存储在 `localStorage` 中（保存时自动持久化，加载时自动恢复）
- `App.vue` 通过 `reactive()` 拥有响应式的 `resumeData` 对象
- `ResumeEditor.vue` 使用 `v-model`（配合 `defineProps`/`defineEmits` 的计算属性 getter/setter 模式）
- `ResumePreview.vue` 以 prop 形式接收数据，渲染只读预览

### 数据结构

```js
{
  name: '',                    // 姓名
  title: '',                   // 职位
  email: '',                   // 邮箱
  phone: '',                   // 电话
  summary: '',                 // 个人简介
  skills: '',                  // 技能（逗号分隔的字符串）
  workExperiences: [{          // 工作经历数组
    company: '',               // 公司名称
    role: '',                  // 职位
    period: '',                // 时间段
    description: ''            // 工作描述
  }],
  education: [{                // 教育经历数组
    school: '',                // 学校名称
    degree: '',                // 学历
    major: '',                 // 专业
    time: '',                  // 在校时间
    experience: ''             // 在校经历
  }]
}
```

## 代码风格指南

### Vue 组件

- **仅使用 Composition API**，搭配 `<script setup>` 语法
- 直接使用 `defineProps` / `defineEmits` / `defineExpose`（在 `<script setup>` 中无需导入）
- Props：使用 type 和 `required` 属性定义；命名使用 camelCase
- 双向绑定：使用 `v-model` 配合 computed getter/setter 模式

### 导入规范

- Vue 导入：`import { ref, computed, reactive } from 'vue'`
- 组件导入：使用相对路径，包含 `.vue` 扩展名
- 未配置路径别名（`@/` 不可用）

### 命名规范

- 组件文件：PascalCase（`ResumeEditor.vue`）
- 变量/函数：camelCase（`resumeData`、`loadResumeData`）
- CSS 类名：kebab-case（`input-field`、`editor-panel`）
- 计算属性：描述性名词（`skillTags`、`filteredWorkExperiences`）

### 样式规范

- **Tailwind CSS v4**：在独立 HTML 版本中通过 CDN 加载
- **Tailwind CSS v4**：在 Vue 应用中通过 `@tailwindcss/postcss` 加载
- 模板中优先使用 Tailwind 工具类
- 自定义样式写在 `<style scoped>` 块中
- 谨慎使用 `!important`，但可用于覆盖浏览器默认样式
- 常用颜色使用 CSS 变量：`#3B82F6`、`#1E293B`、`#E2E8F0`

### 错误处理

- localStorage 操作使用 try/catch 包裹
- 捕获的错误使用 `console.error()` 输出
- 用户提示使用 `alert()`（未安装 toast 库）
- 破坏性操作使用 `confirm()` 确认（如清空数据）

### 通用模式

- 访问可能为 null 的 DOM 元素时使用可选链（`?.`）
- 渲染前过滤空项目（参考 `filteredWorkExperiences`、`filteredEducation`）
- 默认值：在模板中使用 `|| '默认文本'` 提供回退文本
- 数组：使用 `v-for` 配合 `:key`（本地数据可使用 index）

## 重要说明

- **未配置测试框架**。不要假设 Vitest/Jest 存在。
- **无 TypeScript** - 所有代码均为纯 JavaScript。
- **无路由** - 单页面应用，无导航功能。
- **PDF 导出**：Vue 版本使用 `window.print()`；独立 `index.html` 版本使用 `html2pdf.js`。
- 独立 `index.html` 是独立实现，不由 Vite 构建。Vue 应用的更改不会影响它。
