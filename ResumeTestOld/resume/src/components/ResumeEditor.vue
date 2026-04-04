<template>
  <aside class="editor-panel no-print">
    <!-- 固定头部 -->
    <div class="editor-header">
      <h1 class="text-xl font-semibold text-slate-800 mb-2">编辑简历</h1>
      <p class="text-sm text-slate-600">填写以下信息，右侧实时预览简历效果</p>
      <div class="editor-buttons mt-3">
        <button 
          @click="saveResume"
          class="bg-blue-500 hover:bg-blue-600 text-white border border-blue-500 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 mr-2"
        >
          <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
          保存简历
        </button>
        <button 
          @click="clearResume"
          class="bg-red-500 hover:bg-red-600 text-white border border-red-500 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200"
        >
          <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
          清空简历
        </button>
      </div>
    </div>
    
    <!-- Form Container -->
    <div class="form-container px-6 py-6 flex flex-col gap-6">
      <!-- 基本信息 -->
      <section class="flex flex-col gap-4">
        <h2 class="section-title">基本信息</h2>
        
        <div class="flex flex-col gap-2">
          <label class="input-label">姓名</label>
          <input 
            type="text" 
            class="input-field" 
            placeholder="请输入姓名" 
            v-model="formData.name"
          >
        </div>
        
        <div class="flex flex-col gap-2">
          <label class="input-label">职位</label>
          <input 
            type="text" 
            class="input-field" 
            placeholder="请输入职位" 
            v-model="formData.title"
          >
        </div>
        
        <div class="flex flex-col gap-2">
          <label class="input-label">邮箱</label>
          <input 
            type="email" 
            class="input-field" 
            placeholder="example@email.com" 
            v-model="formData.email"
          >
        </div>
        
        <div class="flex flex-col gap-2">
          <label class="input-label">电话</label>
          <input 
            type="tel" 
            class="input-field" 
            placeholder="请输入联系电话" 
            v-model="formData.phone"
          >
        </div>
      </section>
      
      <!-- 个人简介 -->
      <section class="flex flex-col gap-4">
        <h2 class="section-title">个人简介</h2>
        
        <div class="flex flex-col gap-2">
          <label class="input-label">工作简介</label>
          <textarea 
            class="input-field" 
            style="height: 120px; padding: 12px; resize: none;"
            placeholder="简述你的工作经验、专业能力和职业目标..."
            v-model="formData.summary"
          ></textarea>
        </div>
      </section>
      
      <!-- 专业技能 -->
      <section class="flex flex-col gap-4">
        <h2 class="section-title">专业技能</h2>
        
        <div class="flex flex-col gap-2">
          <label class="input-label">技能标签（用逗号分隔）</label>
          <input 
            type="text" 
            class="input-field" 
            placeholder="JavaScript, React, Node.js, Python..."
            v-model="formData.skills"
          >
        </div>
      </section>
      
      <!-- 工作经验 -->
      <section class="flex flex-col gap-4">
        <div class="flex justify-between items-center">
          <h2 class="section-title">工作经验</h2>
          <button 
            @click="addWorkExperience"
            class="text-blue-500 hover:text-blue-600 text-sm font-medium"
            :disabled="formData.workExperiences.length >= 10"
          >
            + 添加
          </button>
        </div>
        
        <div class="flex flex-col gap-4">
          <div 
            v-for="(work, index) in formData.workExperiences" 
            :key="index"
            class="border border-gray-200 rounded-lg p-4 relative"
          >
            <div class="absolute top-2 right-2">
              <button
                v-if="formData.workExperiences.length > 1"
                @click="removeWorkExperience(index)"
                class="text-red-500 hover:text-red-600 text-sm"
              >
                删除
              </button>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="input-label">公司名称</label>
              <input 
                type="text" 
                class="input-field" 
                placeholder="请输入公司名称" 
                v-model="work.company"
              >
            </div>
            
            <div class="flex gap-3 mt-3">
              <div class="flex-1 flex flex-col gap-2">
                <label class="input-label">职位</label>
                <input 
                  type="text" 
                  class="input-field" 
                  placeholder="请输入职位" 
                  v-model="work.role"
                >
              </div>
              
              <div class="flex-1 flex flex-col gap-2">
                <label class="input-label">时间</label>
                <input 
                  type="text" 
                  class="input-field" 
                  placeholder="2020-2024" 
                  v-model="work.period"
                >
              </div>
            </div>
            
            <div class="flex flex-col gap-2 mt-3">
              <label class="input-label">工作描述</label>
              <textarea 
                class="input-field" 
                style="height: 80px; padding: 12px; resize: vertical;"
                placeholder="描述您的工作职责和成就..."
                v-model="work.description"
              ></textarea>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 学习履历 -->
      <section class="flex flex-col gap-4">
        <div class="flex justify-between items-center">
          <h2 class="section-title">学习履历</h2>
          <button 
            @click="addEducation"
            class="text-blue-500 hover:text-blue-600 text-sm font-medium"
            :disabled="formData.education.length >= 10"
          >
            + 添加
          </button>
        </div>
        
        <div class="flex flex-col gap-4">
          <div 
            v-for="(edu, index) in formData.education" 
            :key="index"
            class="border border-gray-200 rounded-lg p-4 relative"
          >
            <div class="absolute top-2 right-2">
              <button
                v-if="formData.education.length > 1"
                @click="removeEducation(index)"
                class="text-red-500 hover:text-red-600 text-sm"
              >
                删除
              </button>
            </div>
            
            <div class="flex gap-3">
              <div class="flex-1 flex flex-col gap-2">
                <label class="input-label">学校名称</label>
                <input 
                  type="text" 
                  class="input-field" 
                  placeholder="请输入学校名称" 
                  v-model="edu.school"
                >
              </div>
              
              <div class="flex-1 flex flex-col gap-2">
                <label class="input-label">学历</label>
                <input 
                  type="text" 
                  class="input-field" 
                  placeholder="请输入学历" 
                  v-model="edu.degree"
                >
              </div>
            </div>
            
            <div class="flex gap-3 mt-3">
              <div class="flex-1 flex flex-col gap-2">
                <label class="input-label">所学专业</label>
                <input 
                  type="text" 
                  class="input-field" 
                  placeholder="请输入专业" 
                  v-model="edu.major"
                >
              </div>
              
              <div class="flex-1 flex flex-col gap-2">
                <label class="input-label">在校时间</label>
                <input 
                  type="text" 
                  class="input-field" 
                  placeholder="例如：2016.09 - 2020.06" 
                  v-model="edu.time"
                >
              </div>
            </div>
            
            <div class="flex flex-col gap-2 mt-3">
              <label class="input-label">在校经历</label>
              <textarea 
                class="input-field" 
                style="height: 80px; padding: 12px; resize: vertical;"
                placeholder="描述您的在校经历、项目经验或获奖情况..."
                v-model="edu.experience"
              ></textarea>
            </div>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

// 添加工作经验
const addWorkExperience = () => {
  formData.value.workExperiences.push({
    company: '',
    role: '',
    period: '',
    description: ''
  })
}

// 删除工作经验
const removeWorkExperience = (index) => {
  if (formData.value.workExperiences.length > 1) {
    formData.value.workExperiences.splice(index, 1)
  }
}

// 添加学习履历
const addEducation = () => {
  formData.value.education.push({
    school: '',
    degree: '',
    major: '',
    time: '',
    experience: ''
  })
}

// 删除学习履历
const removeEducation = (index) => {
  if (formData.value.education.length > 1) {
    formData.value.education.splice(index, 1)
  }
}

// 保存简历到 localStorage
const saveResume = () => {
  try {
    const resumeData = { ...formData.value }
    localStorage.setItem('resumeData', JSON.stringify(resumeData))
    // 使用系统默认弹框提示
    alert('简历信息保存成功')
  } catch (error) {
    console.error('保存简历失败:', error)
    alert('保存失败，请稍后重试')
  }
}

// 清空简历信息
const clearResume = () => {
  if (confirm('确定要清空所有简历信息吗？此操作不可恢复。')) {
    // 清除 localStorage
    localStorage.removeItem('resumeData')
    // 重置页面数据
    formData.value.name = ''
    formData.value.title = ''
    formData.value.email = ''
    formData.value.phone = ''
    formData.value.summary = ''
    formData.value.skills = ''
    // 重置工作经验为默认的一条空记录
    formData.value.workExperiences = [{
      company: '',
      role: '',
      period: '',
      description: ''
    }]
    // 重置学习履历为默认的一条空记录
    formData.value.education = [{
      school: '',
      degree: '',
      major: '',
      time: '',
      experience: ''
    }]
  }
}
</script>

<style scoped>
.input-field {
  height: 40px;
  border-radius: 6px;
  border: 1px solid #E2E8F0 !important;
  padding: 0 12px;
  font-size: 14px;
  width: 100%;
  transition: all 0.2s;
  background-color: #FFFFFF !important;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* 小屏幕调整 */
@media (max-width: 767px) {
  .input-field {
    height: 44px;
    font-size: 16px; /* 防止 iOS 缩放 */
  }
  
  .input-label {
    font-size: 15px;
  }
  
  .section-title {
    font-size: 18px;
  }
}

.input-field:focus {
  outline: none;
  border-color: #3B82F6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-field::placeholder {
  color: #94A3B8;
}

/* 移除所有输入框的默认样式 */
input[type="text"],
input[type="email"],
input[type="tel"],
textarea {
  border: 1px solid #E2E8F0 !important;
  background-color: #FFFFFF !important;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 8px;
  display: block;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 16px;
}

.editor-panel {
  background: #FFFFFF;
  border-right: 1px solid #E2E8F0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 大屏幕：固定定位 */
@media (min-width: 1024px) {
  .editor-panel {
    width: 480px;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    padding-top: 80px;
  }
  
  .form-container {
    margin-top: 80px;
    padding-bottom: 40px;
  }
}

/* 中等屏幕 */
@media (min-width: 768px) and (max-width: 1023px) {
  .editor-panel {
    width: 400px;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    padding-top: 70px;
  }
  
  .form-container {
    margin-top: 70px;
    padding-bottom: 40px;
  }
}

/* 小屏幕 */
@media (max-width: 767px) {
  .editor-panel {
    position: relative;
    width: 100%;
    padding-top: 0;
  }
  
  .form-container {
    margin-top: 0;
    padding: 16px;
    padding-bottom: 40px;
  }
}

/* 固定编辑器头部 */
.editor-header {
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  z-index: 101;
  box-sizing: border-box;
}

/* 大屏幕 */
@media (min-width: 1024px) {
  .editor-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 480px;
    padding: 24px;
  }
}

/* 中等屏幕 */
@media (min-width: 768px) and (max-width: 1023px) {
  .editor-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 400px;
    padding: 20px;
  }
}

/* 小屏幕 */
@media (max-width: 767px) {
  .editor-header {
    position: relative;
    top: auto;
    left: auto;
    width: 100%;
    padding: 16px;
  }
}

/* 编辑器按钮区域 */
.editor-buttons {
  display: flex;
  gap: 8px;
}

/* 小屏幕按钮调整 */
@media (max-width: 767px) {
  .editor-buttons {
    flex-direction: column;
    gap: 12px;
  }
  
  .editor-buttons button {
    width: 100%;
    justify-content: center;
  }
}

/* 表单容器，确保在固定头部下方开始 */
.form-container {
  margin-top: 80px;
  padding-bottom: 40px; /* 防止底部内容被截断 */
}
</style>