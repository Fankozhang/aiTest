<template>
  <div class="skills-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="card-title-area">
        <span class="card-icon"> </span>
        <span class="card-title">技能标签</span>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="card-body">
      <!-- 添加技能输入框 -->
      <div class="add-skill-row">
        <a-input
          v-model:value="newSkill"
          placeholder="输入技能名称，按回车添加"
          @pressEnter="addSkill"
          class="skill-input"
        />
        <a-button type="primary" @click="addSkill" :disabled="!newSkill.trim()">
          添加
        </a-button>
      </div>

      <!-- 技能标签列表 -->
      <div class="skills-list">
        <a-tag
          v-for="(skill, index) in localSkills"
          :key="index"
          closable
          @close="removeSkill(index)"
          class="skill-tag"
        >
          {{ skill.skill_name }}
        </a-tag>
      </div>

      <div v-if="localSkills.length === 0" class="empty-tip">
        暂无技能标签，请在上方输入框添加
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  skills: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update'])

const localSkills = ref([])
const newSkill = ref('')

// 监听外部数据变化
watch(() => props.skills, (newVal) => {
  localSkills.value = JSON.parse(JSON.stringify(newVal || []))
}, { immediate: true, deep: true })

// 添加技能
function addSkill() {
  const skillName = newSkill.value.trim()
  if (!skillName) return

  // 检查是否已存在
  const exists = localSkills.value.some(s => s.skill_name === skillName)
  if (exists) {
    newSkill.value = ''
    return
  }

  localSkills.value.push({
    skill_name: skillName
  })
  newSkill.value = ''
  emitUpdate()
}

// 删除技能
function removeSkill(index) {
  localSkills.value.splice(index, 1)
  emitUpdate()
}

// 发送更新事件
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localSkills.value)))
}
</script>

<style scoped>
.skills-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.card-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.card-title-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-icon {
  font-size: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dark);
}

.card-body {
  padding: 20px;
}

.add-skill-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.skill-input {
  flex: 1;
  height: 44px;
  border-radius: 8px;
}

.add-skill-row :deep(.ant-btn) {
  height: 44px;
  border-radius: 8px;
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 13px;
  background: var(--primary-color);
  border: none;
  border-radius: 4px;
  color: #fff;
}

.skill-tag :deep(.anticon-close) {
  color: rgba(255, 255, 255, 0.8);
  margin-left: 6px;
}

.skill-tag :deep(.anticon-close:hover) {
  color: #fff;
}

.empty-tip {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
  font-size: 13px;
}
</style>
