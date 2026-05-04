<template>
  <div class="detail-panel">
    <!-- 缩略图 -->
    <div class="detail-thumb" :style="{ background: thumbGradient }">
      <button class="play-overlay" @click="$emit('play')">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
      </button>
      <span class="thumb-duration">{{ formatDuration(record.duration) }}</span>
    </div>

    <!-- 文件名（可编辑） -->
    <div class="detail-name-row">
      <input
        v-if="editing"
        ref="nameInput"
        v-model="editName"
        class="name-input"
        @blur="saveName"
        @keyup.enter="saveName"
        @keyup.esc="editing = false"
      />
      <span v-else class="detail-name" @click="startEdit">{{ record.fileName }}</span>
      <button class="action-btn" @click="startEdit" title="重命名">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>

    <!-- 详情网格 -->
    <div class="detail-grid">
      <div class="detail-item">
        <span class="di-label">时长</span>
        <span class="di-value">{{ formatDuration(record.duration) }}</span>
      </div>
      <div class="detail-item">
        <span class="di-label">文件大小</span>
        <span class="di-value">{{ formatSize(record.fileSize) }}</span>
      </div>
      <div class="detail-item">
        <span class="di-label">分辨率</span>
        <span class="di-value">{{ record.resolution || '--' }}</span>
      </div>
      <div class="detail-item">
        <span class="di-label">帧率</span>
        <span class="di-value">{{ record.fps || '--' }} FPS</span>
      </div>
      <div class="detail-item" style="grid-column:1/-1">
        <span class="di-label">创建时间</span>
        <span class="di-value">{{ formatDate(record.createdAt) }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="detail-actions">
      <button class="btn btn-primary" style="flex:1" @click="$emit('play')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        播放
      </button>
      <button class="btn btn-secondary" style="flex:1" @click="$emit('edit')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        编辑
      </button>
      <button class="btn btn-danger" @click="$emit('delete')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  record: { type: Object, required: true }
})
const emit = defineEmits(['play', 'edit', 'delete', 'rename'])

const editing = ref(false)
const editName = ref('')
const nameInput = ref(null)

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
]
function hashStr(s) {
  let h = 0; for (let c of s) h = (h << 5) - h + c.charCodeAt(0); return h
}
const thumbGradient = gradients[Math.abs(hashStr(props.record.fileName || '')) % gradients.length]

async function startEdit() {
  editName.value = props.record.fileName
  editing.value = true
  await nextTick()
  nameInput.value?.focus()
}

function saveName() {
  if (editName.value.trim() && editName.value !== props.record.fileName) {
    emit('rename', { record: props.record, newName: editName.value.trim() })
  }
  editing.value = false
}

function formatDuration(s) {
  if (!s) return '00:00'
  const m = Math.floor(s / 60); const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function formatSize(b) {
  if (!b) return '--'
  if (b > 1073741824) return (b/1073741824).toFixed(1) + ' GB'
  if (b > 1048576) return (b/1048576).toFixed(1) + ' MB'
  return (b/1024).toFixed(0) + ' KB'
}
function formatDate(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleString('zh-CN')
}
</script>

<style scoped>
.detail-panel { display: flex; flex-direction: column; height: 100%; }

.detail-thumb {
  width: 100%;
  aspect-ratio: 16/9;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.play-overlay {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.play-overlay:hover { background: rgba(0,0,0,0.7); }
.thumb-duration {
  position: absolute;
  bottom: 8px; right: 10px;
  font-size: 12px; font-weight: 600; color: #fff;
  background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 4px;
}

.detail-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--border);
}
.detail-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.name-input {
  flex: 1;
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.action-btn {
  width: 26px; height: 26px;
  border-radius: 6px; border: 1px solid var(--border);
  background: transparent; color: var(--text-secondary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.action-btn:hover { border-color: var(--accent); color: var(--accent); }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
  flex: 1;
}
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.di-label { font-size: 11px; color: var(--text-secondary); font-weight: 500; }
.di-value { font-size: 13px; font-weight: 600; color: var(--text-primary); }

.detail-actions {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
</style>
