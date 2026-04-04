<template>
  <div class="education-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="card-title-area">
        <span class="card-icon"> </span>
        <span class="card-title">教育背景</span>
      </div>
      <a-button type="primary" size="small" @click="addEducation" class="add-btn">
        <span>+</span>
        <span>添加</span>
      </a-button>
    </div>

    <!-- 卡片内容 -->
    <div class="card-body">
      <div v-if="localEducation.length === 0" class="empty-tip">
        暂无教育背景，点击上方"添加"按钮添加
      </div>

      <div
        v-for="(edu, index) in localEducation"
        :key="index"
        class="education-item"
      >
        <div class="item-header">
          <span class="item-number">#{{ index + 1 }}</span>
          <a-button type="text" danger size="small" @click="removeEducation(index)">
            删除
          </a-button>
        </div>

        <div class="form-grid">
          <!-- 学校、学历 -->
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">学校名称</label>
              <a-input
                :value="edu.school"
                @change="e => updateEducation(index, 'school', e.target.value)"
                placeholder="请输入学校名称"
              />
            </div>
            <div class="form-item">
              <label class="form-label">学历</label>
              <a-select
                :value="edu.degree"
                @change="val => updateEducation(index, 'degree', val)"
                placeholder="请选择学历"
                style="width: 100%"
              >
                <a-select-option value="高中">高中</a-select-option>
                <a-select-option value="大专">大专</a-select-option>
                <a-select-option value="本科">本科</a-select-option>
                <a-select-option value="硕士">硕士</a-select-option>
                <a-select-option value="博士">博士</a-select-option>
              </a-select>
            </div>
          </div>

          <!-- 专业 -->
          <div class="form-row full-width">
            <div class="form-item">
              <label class="form-label">专业</label>
              <a-input
                :value="edu.major"
                @change="e => updateEducation(index, 'major', e.target.value)"
                placeholder="请输入专业"
              />
            </div>
          </div>

          <!-- 开始日期、结束日期 -->
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">开始日期</label>
              <a-date-picker
                :value="edu.start_date ? dayjs(edu.start_date) : null"
                @change="date => updateEducation(index, 'start_date', date ? date.format('YYYY-MM-DD') : null)"
                placeholder="选择开始日期"
                style="width: 100%"
                format="YYYY-MM-DD"
              />
            </div>
            <div class="form-item">
              <label class="form-label">结束日期</label>
              <a-date-picker
                :value="edu.end_date ? dayjs(edu.end_date) : null"
                @change="date => updateEducation(index, 'end_date', date ? date.format('YYYY-MM-DD') : null)"
                placeholder="选择结束日期"
                style="width: 100%"
                format="YYYY-MM-DD"
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
  education: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update'])

const localEducation = ref([])

// 监听外部数据变化
watch(() => props.education, (newVal) => {
  localEducation.value = JSON.parse(JSON.stringify(newVal || []))
}, { immediate: true, deep: true })

// 添加教育背景
function addEducation() {
  localEducation.value.push({
    school: '',
    degree: '',
    major: '',
    start_date: null,
    end_date: null
  })
  emitUpdate()
}

// 删除教育背景
function removeEducation(index) {
  localEducation.value.splice(index, 1)
  emitUpdate()
}

// 更新教育背景字段
function updateEducation(index, field, value) {
  localEducation.value[index][field] = value
  emitUpdate()
}

// 发送更新事件
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localEducation.value)))
}
</script>

<style scoped>
.education-card {
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

.education-item {
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
.form-item :deep(.ant-picker),
.form-item :deep(.ant-select-selector) {
  height: 44px !important;
  border-radius: 8px !important;
}

.form-item :deep(.ant-select-single .ant-select-selector .ant-select-selection-item) {
  line-height: 44px;
}
</style>
