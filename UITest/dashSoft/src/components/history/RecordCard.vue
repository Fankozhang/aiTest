<template>
  <div class="rec-card" :class="{ selected }" @click="$emit('click')">
    <!-- 缩略图 -->
    <div class="thumb" :style="{ background: thumbGradient }">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"><polygon points="5,3 19,12 5,21"/></svg>
      <span class="thumb-duration">{{ formatDuration(record.duration) }}</span>
    </div>

    <!-- 信息区 -->
    <div class="info">
      <div class="file-name">{{ record.fileName }}</div>
      <div class="meta-row">
        <span class="meta-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {{ formatDate(record.createdAt) }}
        </span>
        <span class="meta-item">{{ formatSize(record.fileSize) }}</span>
        <span class="meta-item">{{ record.resolution }}</span>
      </div>
      <div class="tags-row">
        <span class="tag tag-fps">{{ record.fps }} FPS</span>
        <span v-for="tag in (record.tags || [])" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions" @click.stop>
      <button class="action-btn" @click="$emit('play')" title="播放">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
      </button>
      <button class="action-btn" @click="$emit('edit')" title="编辑">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="action-btn action-btn-danger" @click="$emit('delete')" title="删除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  record: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})
defineEmits(['click', 'play', 'edit', 'delete'])

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
]

const thumbGradient = gradients[Math.abs(hashStr(props.record.fileName || '')) % gradients.length]

function hashStr(s) {
  let h = 0
  for (let c of s) h = (h << 5) - h + c.charCodeAt(0)
  return h
}

function formatDuration(s) {
  if (!s) return '00:00'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function formatSize(bytes) {
  if (!bytes) return '--'
  if (bytes > 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB'
  if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
  return (bytes / 1024).toFixed(0) + ' KB'
}

function formatDate(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toTimeString().slice(0, 5)
}
</script>

<style scoped>
.rec-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s;
}
.rec-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(59,130,246,0.1); }
.rec-card.selected { border-color: var(--accent); background: var(--accent-light); }

.thumb {
  width: 96px;
  height: 60px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.thumb-duration {
  position: absolute;
  bottom: 4px; right: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(0,0,0,0.5);
  padding: 1px 5px;
  border-radius: 4px;
}

.info { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 4px; }
.file-name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta-row { display: flex; align-items: center; gap: 10px; }
.meta-item { display: flex; align-items: center; gap: 3px; font-size: 12px; color: var(--text-secondary); }
.tags-row { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 11px; padding: 1px 7px; border-radius: 20px; background: var(--bg-card-secondary); color: var(--text-secondary); border: 1px solid var(--border); }
.tag-fps { background: rgba(59,130,246,0.1); color: var(--accent); border-color: var(--accent-border); }

.actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.action-btn {
  width: 30px; height: 30px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.action-btn:hover { background: var(--bg-card-secondary); color: var(--accent); border-color: var(--accent); }
.action-btn-danger:hover { background: rgba(239,68,68,0.1); color: var(--danger); border-color: var(--danger); }
</style>
