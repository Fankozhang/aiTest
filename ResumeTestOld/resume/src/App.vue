<template>
  <div class="editor-container">
    <ResumeEditor v-model="resumeData" />
    <ResumePreview :resume-data="resumeData" />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import ResumeEditor from './components/ResumeEditor.vue'
import ResumePreview from './components/ResumePreview.vue'

// 从 localStorage 加载简历数据，如果存在的话
const loadResumeData = () => {
  try {
    const savedData = localStorage.getItem('resumeData')
    if (savedData) {
      return JSON.parse(savedData)
    }
  } catch (error) {
    console.error('加载简历数据失败:', error)
  }
  
  // 返回默认数据结构
  return {
    name: '',
    title: '',
    email: '',
    phone: '',
    summary: '',
    skills: '',
    workExperiences: [{
      company: '',
      role: '',
      period: '',
      description: ''
    }],
    education: [{
      school: '',
      degree: '',
      major: '',
      time: '',
      experience: ''
    }]
  }
}

// 初始化简历数据
const resumeData = reactive(loadResumeData())
</script>

<style>
* {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

body {
  margin: 0;
  padding: 0;
  background-color: #F8FAFC;
}

.editor-container {
  display: flex;
  min-height: 100vh;
}

/* 大屏幕：保持左右分栏 */
@media (min-width: 1024px) {
  .editor-container {
    display: flex;
  }
}

/* 中等屏幕：编辑器宽度调整 */
@media (min-width: 768px) and (max-width: 1023px) {
  .editor-container {
    display: flex;
  }
  
  .editor-panel {
    width: 400px !important;
  }
  
  .preview-panel {
    margin-left: 400px !important;
  }
  
  .editor-header {
    width: 400px !important;
  }
}

/* 小屏幕：垂直堆叠 */
@media (max-width: 767px) {
  .editor-container {
    flex-direction: column;
  }
  
  .editor-panel {
    position: relative !important;
    left: auto !important;
    top: auto !important;
    bottom: auto !important;
    width: 100% !important;
    border-right: none !important;
    border-bottom: 1px solid #E2E8F0;
  }
  
  .editor-header {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    width: 100% !important;
    padding: 16px 16px !important;
  }
  
  .preview-panel {
    margin-left: 0 !important;
    padding: 16px !important;
  }
  
  .form-container {
    padding: 16px !important;
    margin-top: 0 !important;
    padding-top: 0 !important;
  }
  
  /* 预览头部在小屏幕上也调整 */
  .preview-header {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    width: 100% !important;
    padding: 16px 16px 8px 16px !important;
    background: transparent !important;
    border-bottom: none !important;
  }
  
  .resume-card {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
  }
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 2px;
  height: 2px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #94A3B8;
  border-radius: 1px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748B;
}

/* 确保编辑区域和预览区域使用自定义滚动条 */
.editor-panel,
.preview-panel {
  scrollbar-width: thin;
  scrollbar-color: #94A3B8 transparent;
}

/* 打印样式 - 支持多页打印 */
@media print {
  /* 隐藏编辑器面板 */
  .editor-panel,
  .editor-container > div:first-child {
    display: none !important;
  }

  /* 预览区域占满整个页面，支持多页 */
  .preview-panel {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    position: static !important;
    left: auto !important;
    top: auto !important;
    overflow: visible !important;
    height: auto !important;
  }

  /* 隐藏预览头部和占位符 */
  .preview-header,
  .preview-panel > div:not(.resume-card) {
    display: none !important;
  }

  /* 简历卡片支持多页 */
  .resume-card {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
    min-height: auto !important;
    height: auto !important;
  }

  /* 整个容器支持多页 */
  .editor-container {
    display: block !important;
    height: auto !important;
    min-height: auto !important;
  }

  /* 确保背景色和渐变打印 */
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 优化页面背景 */
  body, html {
    background: white !important;
    height: auto !important;
  }

  /* 页面设置 */
  @page {
    margin: 15mm;
    size: A4 portrait;
  }
}
</style>