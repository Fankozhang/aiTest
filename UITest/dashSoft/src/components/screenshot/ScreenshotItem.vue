<template>
  <div class="sc-item" @click="$emit('preview')">
    <div class="sc-thumb">
      <img v-if="screenshot.dataUrl" :src="screenshot.dataUrl" class="thumb-img" />
      <div v-else class="thumb-placeholder">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
      </div>
    </div>
    <div class="sc-info">
      <span class="sc-name">{{ screenshot.fileName }}</span>
      <span class="sc-time">{{ formatDate(screenshot.createdAt) }}</span>
    </div>
    <div class="sc-actions" @click.stop>
      <button class="sc-btn" @click="$emit('copy')" title="复制">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      </button>
      <button class="sc-btn" @click="$emit('open')" title="打开">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
      </button>
      <button class="sc-btn sc-btn-danger" @click="$emit('delete')" title="删除">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({ screenshot: { type: Object, required: true } })
defineEmits(['copy', 'open', 'delete', 'preview'])

function formatDate(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.sc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.sc-item:hover { border-color: var(--accent); background: var(--accent-light); }

.sc-thumb {
  width: 48px; height: 36px;
  border-radius: 4px;
  overflow: hidden;
  background: #F1F5F9;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.thumb-placeholder { display: flex; align-items: center; justify-content: center; }

.sc-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 3px; }
.sc-name { font-size: 12px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-time { font-size: 11px; color: var(--text-secondary); }

.sc-actions { display: flex; gap: 4px; flex-shrink: 0; }
.sc-btn {
  width: 24px; height: 24px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.sc-btn:hover { border-color: var(--accent); color: var(--accent); }
.sc-btn-danger:hover { border-color: var(--danger); color: var(--danger); background: rgba(239,68,68,0.05); }
</style>
