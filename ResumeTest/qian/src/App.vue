<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="logo-area">
        <div class="logo-icon">
          <span>📄</span>
        </div>
        <span class="logo-text">简历编辑器</span>
      </div>
      <a-button type="primary" class="download-btn" @click="handleDownload" :loading="downloading">
        <span>↓</span>
        <span>下载PDF</span>
      </a-button>
    </nav>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧编辑面板 -->
      <div class="left-panel">
        <ResumeEditor
          :resume-data="resumeData"
          @update="handleUpdate"
          @save="handleSave"
          @delete="handleDelete"
          :saving="saving"
        />
      </div>

      <!-- 右侧预览面板 -->
      <div class="right-panel">
        <ResumePreview :resume-data="resumeData" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import ResumeEditor from './components/ResumeEditor.vue'
import ResumePreview from './components/ResumePreview.vue'
import { getResume, createResume, saveResume, downloadPDF, deleteResume } from './api/resume'

// 简历数据
const resumeData = reactive({
  id: null,
  name: '',
  title: '',
  email: '',
  phone: '',
  age: null,
  work_years: null,
  summary: '',
  work_experiences: [],
  education: [],
  skills: []
})

const saving = ref(false)
const downloading = ref(false)

// 初始化加载数据
onMounted(async () => {
  try {
    // 尝试获取ID为1的简历
    const data = await getResume(1)
    Object.assign(resumeData, data)
    message.success('简历加载成功')
  } catch (error) {
    // 如果不存在，创建新简历
    try {
      const newResume = await createResume({
        name: '未命名',
        user_id: 1
      })
      Object.assign(resumeData, newResume)
      message.info('已创建新简历')
    } catch (err) {
      console.error('创建简历失败:', err)
      message.error('初始化失败，请刷新页面重试')
    }
  }
})

// 处理数据更新（实时预览）
function handleUpdate(data) {
  Object.assign(resumeData, data)
}

// 保存简历
async function handleSave() {
  if (!resumeData.id) {
    message.error('请先创建简历')
    return
  }

  saving.value = true
  try {
    const result = await saveResume(resumeData.id, resumeData)
    Object.assign(resumeData, result)
    message.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 删除简历
async function handleDelete() {
  if (!resumeData.id) {
    message.error('没有可删除的简历')
    return
  }

  Modal.confirm({
    title: '确认删除',
    content: '确定要删除当前简历吗？此操作不可恢复。',
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteResume(resumeData.id)
        message.success('删除成功')
        // 重新创建新简历
        const newResume = await createResume({
          name: '未命名',
          user_id: 1
        })
        Object.assign(resumeData, newResume)
      } catch (error) {
        console.error('删除失败:', error)
        message.error('删除失败，请重试')
      }
    }
  })
}

// 下载PDF（先保存确保数据最新，保存成功后再下载）
async function handleDownload() {
  if (!resumeData.id) {
    message.error('请先创建简历')
    return
  }

  downloading.value = true
  try {
    // 第一步：静默保存简历数据到数据库
    try {
      const result = await saveResume(resumeData.id, resumeData)
      Object.assign(resumeData, result)
    } catch (saveError) {
      console.error('保存失败:', saveError)
      message.error('保存失败，无法下载PDF，请检查网络后重试')
      return
    }

    // 第二步：保存成功后下载PDF
    const response = await downloadPDF(resumeData.id)
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${resumeData.name || '简历'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    message.success('下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    message.error('下载失败，请重试')
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 导航栏 */
.navbar {
  height: 64px;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: var(--primary-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  height: auto;
  font-size: 14px;
  font-weight: 500;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  width: var(--left-panel-width);
  background: var(--bg-main);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.right-panel {
  width: var(--right-panel-width);
  background: var(--bg-preview);
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 24px;
}
</style>
