<template>
  <div class="work-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="card-title-area">
        <span class="card-icon"> </span>
        <span class="card-title">工作经历</span>
      </div>
      <a-button type="primary" size="small" @click="addExperience" class="add-btn">
        <span>+</span>
        <span>添加</span>
      </a-button>
    </div>

    <!-- 卡片内容 -->
    <div class="card-body">
      <div v-if="localExperiences.length === 0" class="empty-tip">
        暂无工作经历，点击上方"添加"按钮添加
      </div>

      <div
        v-for="(exp, index) in localExperiences"
        :key="index"
        class="experience-item"
      >
        <div class="item-header">
          <span class="item-number">#{{ index + 1 }}</span>
          <a-button type="text" danger size="small" @click="removeExperience(index)">
            删除
          </a-button>
        </div>

        <div class="form-grid">
          <!-- 公司、职位 -->
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">公司名称</label>
              <a-input
                :value="exp.company"
                @change="e => updateExperience(index, 'company', e.target.value)"
                placeholder="请输入公司名称"
              />
            </div>
            <div class="form-item">
              <label class="form-label">职位</label>
              <a-input
                :value="exp.position"
                @change="e => updateExperience(index, 'position', e.target.value)"
                placeholder="请输入职位"
              />
            </div>
          </div>

          <!-- 开始日期、结束日期 -->
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">开始日期</label>
              <a-date-picker
                :value="exp.start_date ? dayjs(exp.start_date) : null"
                @change="date => updateExperience(index, 'start_date', date ? date.format('YYYY-MM-DD') : null)"
                placeholder="选择开始日期"
                style="width: 100%"
                format="YYYY-MM-DD"
              />
            </div>
            <div class="form-item">
              <label class="form-label">结束日期</label>
              <a-date-picker
                :value="exp.end_date ? dayjs(exp.end_date) : null"
                @change="date => updateExperience(index, 'end_date', date ? date.format('YYYY-MM-DD') : null)"
                placeholder="选择结束日期（留空表示至今）"
                style="width: 100%"
                format="YYYY-MM-DD"
              />
            </div>
          </div>

          <!-- 工作描述 -->
          <div class="form-row full-width">
            <div class="form-item">
              <label class="form-label">工作描述</label>
              <a-textarea
                :value="exp.description"
                @change="e => updateExperience(index, 'description', e.target.value)"
                placeholder="请描述您的工作内容和成就"
                :rows="3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  experiences: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update'])

const localExperiences = ref([])

// 监听外部数据变化
watch(() => props.experiences, (newVal) => {
  localExperiences.value = JSON.parse(JSON.stringify(newVal || []))
}, { immediate: true, deep: true })

// 添加工作经历
function addExperience() {
  localExperiences.value.push({
    company: '',
    position: '',
    start_date: null,
    end_date: null,
    description: ''
  })
  emitUpdate()
}

// 删除工作经历
function removeExperience(index) {
  localExperiences.value.splice(index, 1)
  emitUpdate()
}

// 更新工作经历字段
function updateExperience(index, field, value) {
  localExperiences.value[index][field] = value
  emitUpdate()
}

// 发送更新事件
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localExperiences.value)))
}
</script>

<style scoped>
.work-card {
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

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-tip {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
  font-size: 13px;
}

.experience-item {
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 14px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.item-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--primary-color);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row.full-width {
  flex-direction: column;
}

.form-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--label-color);
}

.form-item :deep(.ant-input),
.form-item :deep(.ant-picker) {
  height: 44px;
  border-radius: 8px;
}

.form-item :deep(.ant-picker-input > input) {
  height: auto;
}
</style>
