<template>
  <div class="resume-editor">
    <!-- 头部区域 -->
    <div class="editor-header">
      <div class="header-top">
        <h1 class="editor-title">编辑简历</h1>
        <span class="editor-desc">填写您的个人信息，实时预览简历效果</span>
      </div>
      <div class="btn-row">
        <a-button type="primary" class="save-btn" @click="$emit('save')" :loading="saving">
          <span> </span>
          <span>保存简历信息</span>
        </a-button>
        <a-button class="delete-btn" @click="$emit('delete')">
          <span> </span>
          <span>删除简历信息</span>
        </a-button>
      </div>
    </div>

    <!-- 卡片区域 -->
    <div class="cards-container">
      <PersonalCard
        :data="resumeData"
        @update="(field, value) => updateField(field, value)"
      />

      <WorkCard
        :experiences="resumeData.work_experiences"
        @update="updateWorkExperiences"
      />

      <EducationCard
        :education="resumeData.education"
        @update="updateEducation"
      />

      <SkillsCard
        :skills="resumeData.skills"
        @update="updateSkills"
      />
    </div>
  </div>
</template>

<script setup>
import PersonalCard from './PersonalCard.vue'
import WorkCard from './WorkCard.vue'
import EducationCard from './EducationCard.vue'
import SkillsCard from './SkillsCard.vue'

const props = defineProps({
  resumeData: {
    type: Object,
    required: true
  },
  saving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'save', 'delete'])

// 更新单个字段
function updateField(field, value) {
  emit('update', { [field]: value })
}

// 更新工作经历
function updateWorkExperiences(experiences) {
  emit('update', { work_experiences: experiences })
}

// 更新教育背景
function updateEducation(education) {
  emit('update', { education })
}

// 更新技能标签
function updateSkills(skills) {
  emit('update', { skills })
}
</script>

<style scoped>
.resume-editor {
  padding: 24px;
}

.editor-header {
  margin-bottom: 20px;
  padding-top: 20px;
}

.header-top {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.editor-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.editor-desc {
  font-size: 13px;
  color: #888888;
}

.btn-row {
  display: flex;
  gap: 10px;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  height: auto;
  font-size: 13px;
  font-weight: 500;
}

.delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  height: auto;
  font-size: 13px;
  font-weight: 500;
  background: #fff;
  border: 1px solid #E5E5E5;
  color: #888888;
}

.delete-btn:hover {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.cards-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
