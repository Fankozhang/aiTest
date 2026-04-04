<template>
  <div class="preview-container">
    <div class="a4-paper">
      <!-- 头部区域：姓名、职位 -->
      <div class="resume-header">
        <h1 class="resume-name">{{ resumeData.name || '您的姓名' }}</h1>
        <p class="resume-title">{{ resumeData.title || '职位名称' }}</p>
        <div class="contact-info">
          <span v-if="resumeData.email">  {{ resumeData.email }}</span>
          <span v-if="resumeData.phone">  {{ resumeData.phone }}</span>
          <span v-if="resumeData.age">  {{ resumeData.age }}岁</span>
          <span v-if="resumeData.work_years">  {{ resumeData.work_years }}年经验</span>
        </div>
      </div>

      <!-- 主体区域 -->
      <div class="resume-body">
        <!-- 左侧边栏 -->
        <div class="sidebar">
          <!-- 技能标签 -->
          <div class="section" v-if="resumeData.skills && resumeData.skills.length > 0">
            <h2 class="section-title">技能</h2>
            <div class="skills-list">
              <span
                v-for="(skill, index) in resumeData.skills"
                :key="index"
                class="skill-item"
              >
                {{ skill.skill_name }}
              </span>
            </div>
          </div>

          <!-- 教育背景 -->
          <div class="section" v-if="resumeData.education && resumeData.education.length > 0">
            <h2 class="section-title">教育</h2>
            <div
              v-for="(edu, index) in resumeData.education"
              :key="index"
              class="education-item"
            >
              <div class="edu-school">{{ edu.school }}</div>
              <div class="edu-degree">{{ edu.degree }} · {{ edu.major }}</div>
              <div class="edu-date">{{ formatDateRange(edu.start_date, edu.end_date) }}</div>
            </div>
          </div>
        </div>

        <!-- 右侧主内容 -->
        <div class="main-content">
          <!-- 个人简介 -->
          <div class="section" v-if="resumeData.summary">
            <h2 class="section-title">简介</h2>
            <p class="summary-text">{{ resumeData.summary }}</p>
          </div>

          <!-- 工作经历 -->
          <div class="section" v-if="resumeData.work_experiences && resumeData.work_experiences.length > 0">
            <h2 class="section-title">工作经历</h2>
            <div
              v-for="(exp, index) in resumeData.work_experiences"
              :key="index"
              class="work-item"
            >
              <div class="work-header">
                <div class="work-company">{{ exp.company }}</div>
                <div class="work-date">{{ formatDateRange(exp.start_date, exp.end_date) }}</div>
              </div>
              <div class="work-position">{{ exp.position }}</div>
              <div class="work-description" v-if="exp.description">
                {{ exp.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  resumeData: {
    type: Object,
    required: true
  }
})

// 格式化日期范围
function formatDateRange(startDate, endDate) {
  if (!startDate) return ''

  const start = formatDate(startDate)
  const end = endDate ? formatDate(endDate) : '至今'

  return `${start} - ${end}`
}

// 格式化单个日期
function formatDate(dateStr) {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}.${month}`
}
</script>

<style scoped>
.preview-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.a4-paper {
  width: 595px;
  min-height: 842px;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 头部区域 */
.resume-header {
  background: #1E293B;
  color: #fff;
  padding: 30px;
  text-align: center;
}

.resume-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  letter-spacing: 2px;
}

.resume-title {
  font-size: 14px;
  margin: 0 0 16px 0;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.contact-info {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.contact-info span {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 主体区域 */
.resume-body {
  display: flex;
  flex: 1;
}

/* 左侧边栏 */
.sidebar {
  width: 180px;
  background: #F8FAFC;
  padding: 20px;
  border-right: 1px solid #E2E8F0;
}

/* 右侧主内容 */
.main-content {
  flex: 1;
  padding: 20px;
}

/* 通用区块样式 */
.section {
  margin-bottom: 20px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid #3B82F6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 技能标签 */
.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-item {
  display: inline-block;
  padding: 4px 10px;
  background: #3B82F6;
  color: #fff;
  font-size: 11px;
  border-radius: 3px;
}

/* 教育背景 */
.education-item {
  margin-bottom: 12px;
}

.education-item:last-child {
  margin-bottom: 0;
}

.edu-school {
  font-size: 12px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 2px;
}

.edu-degree {
  font-size: 11px;
  color: #64748B;
  margin-bottom: 2px;
}

.edu-date {
  font-size: 10px;
  color: #94A3B8;
}

/* 个人简介 */
.summary-text {
  font-size: 12px;
  line-height: 1.7;
  color: #475569;
  margin: 0;
}

/* 工作经历 */
.work-item {
  margin-bottom: 16px;
}

.work-item:last-child {
  margin-bottom: 0;
}

.work-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.work-company {
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
}

.work-date {
  font-size: 11px;
  color: #94A3B8;
}

.work-position {
  font-size: 12px;
  color: #3B82F6;
  margin-bottom: 8px;
}

.work-description {
  font-size: 12px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-line;
}
</style>
