<template>
  <div class="history-layout">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="top-bar-left">
        <span class="page-title">录制历史</span>
        <span class="badge" style="background:rgba(59,130,246,0.15);color:var(--accent);font-size:12px;padding:3px 8px;border-radius:20px;">
          {{ filteredRecordings.length }} 条
        </span>
      </div>
      <div class="top-bar-right">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input v-model="searchQuery" placeholder="搜索录制文件..." class="search-input" />
        </div>
        <button class="btn btn-secondary" style="height:36px;font-size:13px;" @click="showFilter = !showFilter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          筛选
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="content-area">
      <!-- 左侧列表 -->
      <div class="list-panel">
        <!-- Tab 栏 -->
        <div class="tab-row">
          <button v-for="tab in tabs" :key="tab.value" class="tab-btn" :class="{ active: activeTab === tab.value }" @click="activeTab = tab.value">
            {{ tab.label }}
          </button>
        </div>

        <!-- 录制列表 -->
        <div class="rec-list">
          <div v-if="filteredRecordings.length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M2 7h20M8 21h8M12 17v4"/></svg>
            <span>暂无录制记录</span>
          </div>
          <RecordCard
            v-for="rec in filteredRecordings"
            :key="rec.filePath || rec.createdAt"
            :record="rec"
            :selected="selectedRecord?.createdAt === rec.createdAt"
            @click="selectedRecord = rec"
            @play="playRecord(rec)"
            @edit="editRecord(rec)"
            @delete="deleteRecord(rec)"
          />
        </div>
      </div>

      <!-- 右侧详情面板 -->
      <div class="detail-panel card">
        <RecordDetail
          v-if="selectedRecord"
          :record="selectedRecord"
          @play="playRecord(selectedRecord)"
          @edit="editRecord(selectedRecord)"
          @delete="deleteRecord(selectedRecord)"
          @rename="renameRecord"
        />
        <div v-else class="detail-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M2 7h20M8 21h8M12 17v4"/></svg>
          <span>选择一条录制查看详情</span>
        </div>
      </div>
    </div>

    <!-- 视频播放器弹窗 -->
    <div v-if="playingRecord" class="modal-overlay" @click.self="playingRecord = null">
      <div class="player-modal card">
        <div class="player-header">
          <span>{{ playingRecord.fileName }}</span>
          <button class="btn-ghost" @click="playingRecord = null">✕</button>
        </div>
        <video
          v-if="playingRecord.filePath"
          :src="'file://' + playingRecord.filePath"
          controls
          class="player-video"
          autoplay
        ></video>
        <div v-else class="player-placeholder">无法播放：文件路径不存在</div>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="deletingRecord" class="modal-overlay" @click.self="deletingRecord = null">
      <div class="confirm-modal card">
        <div class="confirm-title">确认删除</div>
        <div class="confirm-body">确定要删除「{{ deletingRecord.fileName }}」吗？此操作不可恢复。</div>
        <div class="confirm-footer">
          <button class="btn btn-secondary" @click="deletingRecord = null">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useHistoryStore } from '../stores/history'
import RecordCard from '../components/history/RecordCard.vue'
import RecordDetail from '../components/history/RecordDetail.vue'

const historyStore = useHistoryStore()

const searchQuery = ref('')
const activeTab = ref('all')
const selectedRecord = ref(null)
const playingRecord = ref(null)
const deletingRecord = ref(null)
const showFilter = ref(false)

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' }
]

const filteredRecordings = computed(() => {
  let list = historyStore.recordings

  // 时间筛选
  if (activeTab.value !== 'all') {
    const now = new Date()
    list = list.filter(r => {
      const d = new Date(r.createdAt)
      if (activeTab.value === 'today') {
        return d.toDateString() === now.toDateString()
      } else if (activeTab.value === 'week') {
        const weekAgo = new Date(now - 7 * 86400000)
        return d >= weekAgo
      } else if (activeTab.value === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
    })
  }

  // 搜索筛选
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r => r.fileName?.toLowerCase().includes(q))
  }

  return list
})

function playRecord(rec) {
  playingRecord.value = rec
}

function editRecord(rec) {
  // 内置编辑（可扩展）
  alert('视频编辑功能开发中...')
}

function deleteRecord(rec) {
  deletingRecord.value = rec
}

async function confirmDelete() {
  if (!deletingRecord.value) return
  await historyStore.removeRecording(deletingRecord.value.filePath)
  if (selectedRecord.value?.filePath === deletingRecord.value.filePath) {
    selectedRecord.value = null
  }
  deletingRecord.value = null
}

async function renameRecord({ record, newName }) {
  record.fileName = newName
  // 持久化更新
  if (window.electronAPI) {
    const all = await window.electronAPI.getRecordings()
    const idx = all.findIndex(r => r.createdAt === record.createdAt)
    if (idx !== -1) {
      all[idx].fileName = newName
      await window.electronAPI.saveRecording(all[idx])
    }
  }
}
</script>

<style scoped>
.history-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-page);
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
.top-bar-left { display: flex; align-items: center; gap: 8px; }
.top-bar-right { display: flex; align-items: center; gap: 8px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-card-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}
.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  width: 180px;
}
.search-input::placeholder { color: var(--text-muted); }

.content-area {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 20px;
  overflow: hidden;
}

/* 左侧列表 */
.list-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.tab-row {
  display: flex;
  background: #F1F5F9;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
  flex-shrink: 0;
}
.tab-btn {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn.active {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}

.rec-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 右侧详情 */
.detail-panel {
  width: 300px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: var(--text-secondary);
  font-size: 13px;
}

/* 播放器 */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}
.player-modal { width: 800px; padding: 0; overflow: hidden; }
.player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}
.player-video { width: 100%; display: block; }
.player-placeholder {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

/* 删除确认 */
.confirm-modal { padding: 28px; width: 360px; display: flex; flex-direction: column; gap: 16px; }
.confirm-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.confirm-body { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }
.confirm-footer { display: flex; justify-content: flex-end; gap: 8px; }
</style>
