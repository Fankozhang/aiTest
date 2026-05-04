<template>
  <div class="settings-section">
    <div class="card-secondary setting-card">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
        通知设置
      </div>
      <p class="hint-text">配置录制过程中的系统通知和提示行为。</p>

      <!-- 录制开始通知 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">录制开始通知</span>
          <span class="setting-desc">开始录制时向系统发送通知</span>
        </div>
        <div class="toggle" :class="{ active: config.notifications.onStart }" @click="config.notifications.onStart = !config.notifications.onStart"></div>
      </div>

      <!-- 录制结束通知 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">录制结束通知</span>
          <span class="setting-desc">录制结束时推送通知，包含文件保存路径</span>
        </div>
        <div class="toggle" :class="{ active: config.notifications.onStop }" @click="config.notifications.onStop = !config.notifications.onStop"></div>
      </div>

      <!-- 存储空间提醒 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">存储空间提醒</span>
          <span class="setting-desc">磁盘剩余空间低于 500MB 时发出警告</span>
        </div>
        <div class="toggle" :class="{ active: config.notifications.storageWarning }" @click="config.notifications.storageWarning = !config.notifications.storageWarning"></div>
      </div>

      <!-- 声音提示 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">声音提示</span>
          <span class="setting-desc">录制开始和结束时播放提示音效</span>
        </div>
        <div class="toggle" :class="{ active: config.notifications.sound }" @click="config.notifications.sound = !config.notifications.sound"></div>
      </div>

      <!-- 通知时长 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">通知显示时长</span>
          <span class="setting-desc">通知气泡自动消失前的停留时长</span>
        </div>
        <div class="btn-group">
          <button class="btn-seg" :class="{ active: config.notifications.duration === 3 }" @click="config.notifications.duration = 3">3秒</button>
          <button class="btn-seg" :class="{ active: config.notifications.duration === 5 }" @click="config.notifications.duration = 5">5秒</button>
          <button class="btn-seg" :class="{ active: config.notifications.duration === 10 }" @click="config.notifications.duration = 10">10秒</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ config: { type: Object, required: true } })
</script>

<style scoped>
.settings-section { display: flex; flex-direction: column; gap: 20px; }
.setting-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border); }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text-primary); padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.hint-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.setting-label-group { display: flex; flex-direction: column; gap: 3px; }
.setting-label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-secondary); }
</style>
