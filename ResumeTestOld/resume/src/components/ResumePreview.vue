<template>
  <main class="preview-panel" id="previewPanel">
    <!-- 固定头部 -->
    <div class="preview-header">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-xl font-semibold text-slate-800">简历预览</h2>
        <button 
          @click="downloadResume"
          class="bg-blue-500 hover:bg-blue-600 text-white border border-blue-500 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200"
        >
          <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
          下载简历
        </button>
      </div>
      <p class="text-sm text-slate-600 mb-3">实时展示您的简历效果</p>
      <div class="w-30 h-1 rounded-sm bg-gradient-to-r from-blue-500 to-violet-500"></div>
    </div>
    
    <!-- 占位符，确保简历卡片不被固定头部遮挡 -->
    <div style="height: 160px;"></div>
    
    <!-- 简历卡片 - 用于显示和PDF导出 -->
    <div class="resume-card" ref="resumeRef" id="resumeCard">
      <!-- PDF专用渲染区域 - 固定尺寸，确保内容完整显示 -->
      <div class="pdf-render-area">
        <div class="rounded-xl overflow-hidden">
          <!-- 渐变顶部 -->
          <div class="gradient-blue-purple" style="height: 80px; border-radius: 16px 16px 0 0;"></div>
          
          <!-- 简历内容 -->
          <div class="bg-white p-4 md:p-8">
            <!-- 个人信息 -->
            <section class="pb-4 text-center flex flex-col gap-2 items-center" v-if="resumeData.name || resumeData.title || resumeData.email || resumeData.phone">
              <h1 class="text-2xl font-bold text-slate-800" v-if="resumeData.name">
                {{ resumeData.name }}
              </h1>
              
              <div class="bg-blue-50 px-4 py-1 rounded-md inline-block" v-if="resumeData.title">
                <span class="text-sm font-semibold text-blue-500">
                  {{ resumeData.title }}
                </span>
              </div>
              
              <div class="w-full h-px bg-gray-200" v-if="(resumeData.name || resumeData.title) && (resumeData.email || resumeData.phone)"></div>
              
              <div class="flex gap-6 justify-center" v-if="resumeData.email || resumeData.phone">
                <div class="flex gap-2 items-center" v-if="resumeData.email">
                  <div class="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center">
                    <span class="material-symbols-outlined text-blue-500" style="font-size: 16px;">mail</span>
                  </div>
                  <span class="text-sm text-slate-600">
                    {{ resumeData.email }}
                  </span>
                </div>
                
                <div class="flex gap-2 items-center" v-if="resumeData.phone">
                  <div class="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center">
                    <span class="material-symbols-outlined text-blue-500" style="font-size: 16px;">phone</span>
                  </div>
                  <span class="text-sm text-slate-600">
                    {{ resumeData.phone }}
                  </span>
                </div>
              </div>
            </section>
            
            <!-- 个人简介 -->
            <section class="flex flex-col gap-3 mb-6">
              <div class="flex gap-2 items-center">
                <div class="gradient-blue-violet w-7 h-7 rounded-md flex items-center justify-center">
                  <span class="material-symbols-outlined text-white" style="font-size: 14px;">person</span>
                </div>
                <h3 class="text-base font-bold text-slate-800">个人简介</h3>
              </div>
              
              <div class="bg-gray-50 p-3 rounded-md">
                <p class="text-sm text-slate-700 leading-relaxed">
                  {{ resumeData.summary || '资深前端开发工程师，5 年以上开发经验，擅长现代化 Web 应用开发。熟练掌握 React、Vue 等主流框架。' }}
                </p>
              </div>
            </section>
            
            <!-- 工作经验 -->
            <section class="flex flex-col gap-3 mb-6" v-if="hasWorkExperience">
              <div class="flex gap-2 items-center">
                <div class="gradient-blue-violet w-7 h-7 rounded-md flex items-center justify-center">
                  <span class="material-symbols-outlined text-white" style="font-size: 14px;">work</span>
                </div>
                <h3 class="text-base font-bold text-slate-800">工作经验</h3>
              </div>
              
              <div 
                v-for="(work, index) in filteredWorkExperiences" 
                :key="index"
                class="border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
              >
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <h4 style="font-size: 14px; font-weight: 700; color: #1E293B; margin: 0;" v-if="work.company">
                      {{ work.company }}
                    </h4>
                  </div>
                  
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 12px; font-weight: 600; color: #3B82F6;" v-if="work.role">
                      {{ work.role }}
                    </span>
                    <div style="background: #DBEAFE; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center;" v-if="work.period">
                      <span style="font-size: 10px; font-weight: 600; color: #3B82F6;">
                        {{ work.period }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p class="text-xs text-slate-600 leading-relaxed" v-if="work.description">
                  {{ work.description }}
                </p>
              </div>
            </section>
            
            <!-- 专业技能 -->
            <section class="flex flex-col gap-3 mb-6" v-if="skillTags.length > 0">
              <div class="flex gap-2 items-center">
                <div class="gradient-blue-violet w-7 h-7 rounded-md flex items-center justify-center">
                  <span class="material-symbols-outlined text-white" style="font-size: 14px;">bolt</span>
                </div>
                <h3 class="text-base font-bold text-slate-800">专业技能</h3>
              </div>
              
              <div class="flex gap-2 flex-wrap">
                <span 
                  v-for="skill in skillTags" 
                  :key="skill"
                  class="skill-tag"
                  style="padding: 6px 12px; font-size: 12px;"
                >
                  {{ skill }}
                </span>
              </div>
            </section>
            
            <!-- 学习经历 -->
            <section class="flex flex-col gap-3" v-if="hasEducation">
              <div class="flex gap-2 items-center">
                <div class="gradient-blue-violet w-7 h-7 rounded-md flex items-center justify-center">
                  <span class="material-symbols-outlined text-white" style="font-size: 14px;">school</span>
                </div>
                <h3 class="text-base font-bold text-slate-800">学习经历</h3>
              </div>
              
              <div 
                v-for="(edu, index) in filteredEducation" 
                :key="index"
                class="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
              >
                <div class="flex justify-between">
                  <div class="flex flex-col gap-1">
                    <h4 class="text-sm font-semibold text-slate-800" v-if="edu.school">
                      {{ edu.school }}
                    </h4>
                  </div>
                  
                  <div class="flex flex-col gap-1 items-end">
                    <span class="text-xs text-slate-600" v-if="edu.time">
                      {{ edu.time }}
                    </span>
                  </div>
                </div>
                
                <p class="text-xs font-medium text-blue-500" v-if="getEduDetail(edu)">
                  {{ getEduDetail(edu) }}
                </p>
                
                <div v-if="edu.experience" class="mt-1">
                  <p class="text-xs text-slate-600 leading-relaxed">
                    {{ edu.experience }}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  resumeData: {
    type: Object,
    required: true
  }
})

const resumeRef = ref(null)

// 计算技能标签数组
const skillTags = computed(() => {
  if (props.resumeData.skills) {
    return props.resumeData.skills.split(',').map(s => s.trim()).filter(s => s)
  }
  return []
})

// 获取教育详情
const getEduDetail = (edu) => {
  const { degree, major } = edu
  if (degree || major) {
    return `${degree}${degree && major ? ' · ' : ''}${major}`
  }
  return ''
}

// 过滤有内容的工作经验
const filteredWorkExperiences = computed(() => {
  return props.resumeData.workExperiences.filter(work =>
    work && (work.company || work.role || work.period || work.description)
  )
})

// 过滤有内容的学习经历
const filteredEducation = computed(() => {
  return props.resumeData.education.filter(edu =>
    edu && (edu.school || edu.degree || edu.major || edu.time || edu.experience)
  )
})

// 判断是否有工作经验
const hasWorkExperience = computed(() => {
  return filteredWorkExperiences.value.length > 0
})

// 判断是否有学习经历
const hasEducation = computed(() => {
  return filteredEducation.value.length > 0
})

// 下载简历功能 - 使用浏览器原生打印
const downloadResume = () => {
  if (!resumeRef.value) {
    alert('未找到简历内容')
    return
  }

  // 调用浏览器原生打印功能
  // 用户可以在打印对话框中选择"另存为PDF"
  window.print()
}
</script>

<style scoped>
.preview-panel {
  flex: 1;
  background: #F1F5F9;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 大屏幕 */
@media (min-width: 1024px) {
  .preview-panel {
    margin-left: 480px;
  }
}

/* 中等屏幕 */
@media (min-width: 768px) and (max-width: 1023px) {
  .preview-panel {
    margin-left: 400px;
  }
}

/* 小屏幕 */
@media (max-width: 767px) {
  .preview-panel {
    margin-left: 0;
  }
}

/* 固定预览头部 */
.preview-header {
  background: #F1F5F9;
  padding: 32px 32px 16px 32px;
  margin-bottom: 24px;
  border-bottom: 1px solid #E2E8F0;
}

/* 大屏幕 */
@media (min-width: 1024px) {
  .preview-header {
    position: fixed;
    top: 0;
    right: 0;
    left: 480px;
    z-index: 100;
  }
}

/* 中等屏幕 */
@media (min-width: 768px) and (max-width: 1023px) {
  .preview-header {
    position: fixed;
    top: 0;
    right: 0;
    left: 400px;
    z-index: 100;
    padding: 24px 24px 12px 24px;
  }
}

/* 小屏幕 */
@media (max-width: 767px) {
  .preview-header {
    position: relative;
    top: auto;
    right: auto;
    left: auto;
    width: 100%;
    padding: 16px 16px 8px 16px;
    background: transparent;
    border-bottom: none;
  }
}

.gradient-blue-purple {
  background: linear-gradient(180deg, #3B82F6 0%, #6366F1 100%);
}

.gradient-blue-violet {
  background: linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%);
}

.resume-card {
  width: 800px;
  max-width: 800px;
  background: #FFFFFF;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  margin: 0 auto;
}

/* 中等屏幕 */
@media (min-width: 768px) and (max-width: 1023px) {
  .resume-card {
    width: 720px;
    max-width: 720px;
  }
}

/* 小屏幕 */
@media (max-width: 767px) {
  .resume-card {
    width: 100%;
    max-width: 100%;
    margin: 0;
    border-radius: 8px;
  }
}

.skill-tag {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1.5px solid #3B82F6;
  color: #3B82F6;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

/* 打印样式 - 支持多页打印 */
@media print {
  /* 隐藏编辑器面板和所有非简历内容 */
  .editor-panel,
  .editor-container > div:first-child,
  .preview-panel > *:not(.resume-card),
  .preview-panel > div:not(.resume-card) {
    display: none !important;
  }

  /* 简历卡片自然流动，支持多页 */
  .resume-card {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  /* 简历卡片内部容器 */
  .resume-card > div,
  .pdf-render-area,
  .rounded-xl {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  /* 内容区域 */
  .bg-white.p-4,
  .bg-white.md\:p-8 {
    width: 100% !important;
    padding: 24px !important;
    box-sizing: border-box !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  /* 尽量避免在section中间分页 */
  section {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  /* 尽量避免在边框容器中间分页 */
  .border.rounded-lg {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  /* 修复边框样式 */
  .border,
  .border-gray-200 {
    border-width: 1px !important;
    border-style: solid !important;
    border-color: #e5e7eb !important;
  }

  /* 修复圆角 */
  .rounded-lg,
  .rounded-md,
  .rounded-xl {
    border-radius: 6px !important;
  }

  /* 确保所有元素的 box-sizing 正确 */
  * {
    box-sizing: border-box !important;
  }

  /* 确保背景色和渐变能打印 */
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 优化打印布局 - 关键：设置为auto允许自然分页 */
  body, html, .preview-panel {
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: white !important;
    width: 100% !important;
    height: auto !important;
    position: static !important;
  }

  /* 隐藏头部 */
  .preview-header {
    display: none !important;
  }

  /* 页面设置 */
  @page {
    margin: 15mm;
    size: A4 portrait;
  }
}

/* PDF导出专用样式 - 解决内容截断和偏移问题 */
.pdf-render-area {
  width: 100%;
  max-width: 100%;
  background: #FFFFFF;
}

/* 确保PDF容器中的内容正确显示 */
#pdf-export-container {
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
}

#pdf-export-container * {
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 !important;
}

#pdf-export-container .resume-card {
  width: 100% !important;
  max-width: 210mm !important;
  margin: 0 auto !important;
}

#pdf-export-container .bg-white {
  background-color: #ffffff !important;
}

#pdf-export-container .text-slate-800 {
  color: #1e293b !important;
}

#pdf-export-container .text-slate-600 {
  color: #475569 !important;
}

#pdf-export-container .text-slate-700 {
  color: #334155 !important;
}

#pdf-export-container .border-gray-200 {
  border-color: #e5e7eb !important;
}

#pdf-export-container .bg-gray-50 {
  background-color: #f9fafb !important;
}

#pdf-export-container .bg-blue-50 {
  background-color: #eff6ff !important;
}

#pdf-export-container .text-blue-500 {
  color: #3b82f6 !important;
}

#pdf-export-container .gradient-blue-purple {
  background: linear-gradient(180deg, #3B82F6 0%, #6366F1 100%) !important;
}

#pdf-export-container .gradient-blue-violet {
  background: linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%) !important;
}
</style>