<template>
  <div class="settings-layout">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <span class="page-title">系统设置</span>
      <button class="btn btn-primary" @click="saveSettings">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13"/><polyline points="7,3 7,8 15,8"/></svg>
        保存设置
      </button>
    </div>

    <!-- 内容区 -->
    <div class="content-area" v-if="config">
      <!-- 分类侧栏 -->
      <div class="category-panel">
        <span class="cat-title">设置分类</span>
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="cat-item"
          :class="{ active: activeCategory === cat.value }"
          @click="activeCategory = cat.value"
        >
          <component :is="cat.iconComp" />
          {{ cat.label }}
        </button>
      </div>

      <!-- 设置内容 -->
      <div class="settings-content">
        <!-- 录制设置 -->
        <RecordSettings v-if="activeCategory === 'record'" :config="config" @goto-shortcut="activeCategory = 'shortcuts'" />
        <!-- 音频设置 -->
        <AudioSettings v-else-if="activeCategory === 'audio'" :config="config" />
        <!-- 快捷键 -->
        <ShortcutSettings v-else-if="activeCategory === 'shortcuts'" :config="config" />
        <!-- 存储路径 -->
        <StorageSettings v-else-if="activeCategory === 'storage'" :config="config" />
        <!-- 通知设置 -->
        <NotifySettings v-else-if="activeCategory === 'notify'" :config="config" />
      </div>
    </div>

    <!-- 保存提示 -->
    <Transition name="fade">
      <div v-if="savedTip" class="save-tip">设置已保存</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useConfigStore } from '../stores/config'
import RecordSettings from '../components/settings/RecordSettings.vue'
import AudioSettings from '../components/settings/AudioSettings.vue'
import ShortcutSettings from '../components/settings/ShortcutSettings.vue'
import StorageSettings from '../components/settings/StorageSettings.vue'
import NotifySettings from '../components/settings/NotifySettings.vue'

const configStore = useConfigStore()
const config = computed(() => configStore.config)
const activeCategory = ref('record')
const savedTip = ref(false)

// 分类图标
const VideoIcon = { render: () => h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }), h('path', { d: 'M8 21h8M12 17v4' })]) }
const AudioIcon = { render: () => h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('path', { d: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z' }), h('path', { d: 'M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8' })]) }
const KeyIcon = { render: () => h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('path', { d: 'M15 7H9a6 6 0 000 12h1M15 7a6 6 0 010 12h-1M9 13h6' })]) }
const FolderIcon = { render: () => h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('path', { d: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z' })]) }
const BellIcon = { render: () => h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('path', { d: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' })]) }

const categories = [
  { value: 'record', label: '录制设置', iconComp: VideoIcon },
  { value: 'audio', label: '音频设置', iconComp: AudioIcon },
  { value: 'shortcuts', label: '快捷键', iconComp: KeyIcon },
  { value: 'storage', label: '存储路径', iconComp: FolderIcon },
  { value: 'notify', label: '通知设置', iconComp: BellIcon }
]

async function saveSettings() {
  // 先显示提示，再执行保存，避免IPC延迟导致toast看不到
  savedTip.value = true
  setTimeout(() => savedTip.value = false, 2500)
  await configStore.save()
}
</script>

<style scoped>
.settings-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-page);
  position: relative;
}

.top-bar {
  height: 60px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }

.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 分类面板 */
.category-panel {
  width: 200px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
.cat-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  padding: 0 4px;
}
.cat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  background: var(--bg-card-secondary);
  color: var(--text-secondary);
  transition: all 0.15s;
  text-align: left;
}
.cat-item:hover { background: var(--border); color: var(--text-primary); }
.cat-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; border: 1px solid var(--accent-border); }

/* 设置内容 */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 保存提示 */
.save-tip {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--text-primary);
  color: #fff;
  font-size: 13px;
  padding: 8px 20px;
  border-radius: 20px;
  z-index: 999;
  pointer-events: none;
}
.fade-enter-active, .fade-leave-active { transition: all 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
