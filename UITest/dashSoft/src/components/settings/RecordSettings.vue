<template>
  <div class="settings-section">
    <!-- 录制质量 -->
    <div class="card-secondary setting-card">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        录制质量
      </div>

      <!-- 画质 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">画质</span>
          <span class="setting-desc">影响文件大小和清晰度</span>
        </div>
        <div class="btn-group">
          <button class="btn-seg" :class="{ active: config.video.quality === 'sd' }" @click="config.video.quality = 'sd'">标准</button>
          <button class="btn-seg" :class="{ active: config.video.quality === 'hd' }" @click="config.video.quality = 'hd'">高清</button>
          <button class="btn-seg" :class="{ active: config.video.quality === 'ultra' }" @click="config.video.quality = 'ultra'">超清</button>
        </div>
      </div>

      <!-- 帧率 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">帧率 (FPS)</span>
          <span class="setting-desc">高帧率使动态内容更流畅</span>
        </div>
        <div class="btn-group">
          <button class="btn-seg" :class="{ active: config.video.fps === 24 }" @click="config.video.fps = 24">24</button>
          <button class="btn-seg" :class="{ active: config.video.fps === 30 }" @click="config.video.fps = 30">30</button>
          <button class="btn-seg" :class="{ active: config.video.fps === 60 }" @click="config.video.fps = 60">60</button>
        </div>
      </div>

      <!-- 分辨率 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">输出分辨率</span>
          <span class="setting-desc">输出视频的最大分辨率</span>
        </div>
        <select class="select" v-model="config.video.resolution" style="width:200px;">
          <option value="1280x720">1280 × 720 (720p)</option>
          <option value="1920x1080">1920 × 1080 (1080p)</option>
          <option value="2560x1440">2560 × 1440 (1440p)</option>
          <option value="3840x2160">3840 × 2160 (4K)</option>
        </select>
      </div>
    </div>

    <!-- 快捷键预览 -->
    <div class="card-secondary setting-card">
      <div class="card-title-row">
        <div class="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 7H9a6 6 0 000 12h1M15 7a6 6 0 010 12h-1"/></svg>
          快捷键设置
        </div>
        <button class="btn btn-secondary" style="height:30px;font-size:12px;" @click="$emit('goto-shortcut')">自定义</button>
      </div>
      <div class="shortcut-preview-list">
        <div class="sc-preview-row">
          <span class="sc-action">开始 / 停止录制</span>
          <kbd>{{ config.shortcuts.startStop }}</kbd>
        </div>
        <div class="sc-preview-row">
          <span class="sc-action">暂停 / 继续录制</span>
          <kbd>{{ config.shortcuts.pause }}</kbd>
        </div>
        <div class="sc-preview-row">
          <span class="sc-action">截图</span>
          <kbd>{{ config.shortcuts.screenshot }}</kbd>
        </div>
        <div class="sc-preview-row">
          <span class="sc-action">显示 / 隐藏工具栏</span>
          <kbd>{{ config.shortcuts.toggleToolbar }}</kbd>
        </div>
      </div>
    </div>

    <!-- 光标设置 -->
    <div class="card-secondary setting-card">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l16 16M4 20L20 4"/></svg>
        光标设置
      </div>

      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">显示鼠标光标</span>
          <span class="setting-desc">录制画面中包含鼠标指针</span>
        </div>
        <div class="toggle" :class="{ active: config.video.cursor.show }" @click="config.video.cursor.show = !config.video.cursor.show"></div>
      </div>

      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">点击高亮效果</span>
          <span class="setting-desc">鼠标点击位置显示高亮圆圈</span>
        </div>
        <div class="toggle" :class="{ active: config.video.cursor.highlight }" @click="config.video.cursor.highlight = !config.video.cursor.highlight"></div>
      </div>

      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">光标大小</span>
        </div>
        <div class="btn-group">
          <button class="btn-seg" :class="{ active: config.video.cursor.size === 'small' }" @click="config.video.cursor.size = 'small'">小</button>
          <button class="btn-seg" :class="{ active: config.video.cursor.size === 'default' }" @click="config.video.cursor.size = 'default'">默认</button>
          <button class="btn-seg" :class="{ active: config.video.cursor.size === 'large' }" @click="config.video.cursor.size = 'large'">大</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ config: { type: Object, required: true } })
defineEmits(['goto-shortcut'])
</script>

<style scoped>
.settings-section { display: flex; flex-direction: column; gap: 20px; }
.setting-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border); }
.card-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: var(--text-primary);
  padding-bottom: 12px; border-bottom: 1px solid var(--border);
}
.card-title-row { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.setting-label-group { display: flex; flex-direction: column; gap: 3px; }
.setting-label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-secondary); }

.shortcut-preview-list { display: flex; flex-direction: column; gap: 0; }
.sc-preview-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-bottom: 1px solid var(--border);
}
.sc-preview-row:last-child { border-bottom: none; }
.sc-action { font-size: 14px; color: var(--text-primary); }
kbd {
  display: inline-flex; align-items: center; padding: 3px 10px;
  border-radius: 6px; background: var(--bg-card-secondary);
  border: 1px solid var(--border); font-size: 13px; font-weight: 600;
  font-family: 'Geist Mono', monospace; color: var(--text-primary);
}
</style>
