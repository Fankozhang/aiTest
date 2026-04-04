<template>
  <div class="personal-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="card-title-area">
        <span class="card-icon"> </span>
        <span class="card-title">个人信息</span>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="card-body">
      <div class="form-grid">
        <!-- 第一行：姓名、职位 -->
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">姓名</label>
            <a-input
              :value="data.name"
              @change="e => updateField('name', e.target.value)"
              placeholder="请输入姓名"
            />
          </div>
          <div class="form-item">
            <label class="form-label">职位</label>
            <a-input
              :value="data.title"
              @change="e => updateField('title', e.target.value)"
              placeholder="请输入职位"
            />
          </div>
        </div>

        <!-- 第二行：邮箱、电话 -->
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">邮箱</label>
            <a-input
              :value="data.email"
              @change="e => updateField('email', e.target.value)"
              placeholder="请输入邮箱"
            />
          </div>
          <div class="form-item">
            <label class="form-label">电话</label>
            <a-input
              :value="data.phone"
              @change="e => updateField('phone', e.target.value)"
              placeholder="请输入电话"
            />
          </div>
        </div>

        <!-- 第三行：年龄、工作年限 -->
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">年龄</label>
            <a-input-number
              :value="data.age"
              @change="val => updateField('age', val)"
              placeholder="请输入年龄"
              :min="1"
              :max="100"
              style="width: 100%"
            />
          </div>
          <div class="form-item">
            <label class="form-label">工作年限</label>
            <a-input-number
              :value="data.work_years"
              @change="val => updateField('work_years', val)"
              placeholder="请输入工作年限"
              :min="0"
              :max="50"
              style="width: 100%"
            />
          </div>
        </div>

        <!-- 第四行：个人简介 -->
        <div class="form-row full-width">
          <div class="form-item">
            <label class="form-label">个人简介</label>
            <a-textarea
              :value="data.summary"
              @change="e => updateField('summary', e.target.value)"
              placeholder="请输入个人简介，简要描述您的专业背景和核心能力"
              :rows="4"
              :maxlength="500"
              show-count
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

function updateField(field, value) {
  emit('update', field, value)
}
</script>

<style scoped>
.personal-card {
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
.form-item :deep(.ant-input-number) {
  height: 44px;
  border-radius: 8px;
}

.form-item :deep(.ant-input-number-input) {
  height: 42px;
}

.form-item :deep(.ant-input-textarea) {
  border-radius: 8px;
}

.form-item :deep(.ant-input-textarea-show-count::after) {
  color: var(--text-secondary);
}
</style>
