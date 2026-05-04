<template>
  <div class="settings-section">
    <div class="card-secondary setting-card">
      <div class="card-title-row">
        <div class="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 7H9a6 6 0 000 12h1M15 7a6 6 0 010 12h-1"/></svg>
          快捷键设置
        </div>
        <button class="btn btn-secondary" style="height:30px;font-size:12px;" @click="resetDefaults">恢复默认快捷键</button>
      </div>
      <p class="hint-text">自定义操作对应的全局快捷键，保证在任意窗口下均可触发。</p>

      <div class="sc-table">
        <div class="sc-table-head">
          <span>操作</span>
          <span>快捷键</span>
          <span>编辑</span>
        </div>

        <div v-for="sc in shortcuts" :key="sc.key" class="sc-table-row">
          <span class="sc-name">{{ sc.label }}</span>
          <div class="sc-key-cell">
            <input
              v-if="editing === sc.key"
              class="sc-input"
              :value="config.shortcuts[sc.key]"
              placeholder="按下按键组合..."
              readonly
              @keydown.prevent="onKeyDown($event, sc.key)"
              ref="keyInput"
            />
            <kbd v-else>{{ config.shortcuts[sc.key] }}</kbd>
          </div>
          <button class="btn btn-secondary" style="height:30px;font-size:12px;" @click="startEdit(sc.key)">
            {{ editing === sc.key ? '取消' : '修改' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 冲突提示 -->
    <Transition name="fade">
      <div v-if="conflictTip" class="conflict-tip">
        {{ conflictTip }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({ config: { type: Object, required: true } })

const editing = ref(null)
const conflictTip = ref('')
const keyInput = ref(null)

const shortcuts = [
  { key: 'startStop', label: '开始 / 停止录制', default: 'F9' },
  { key: 'pause', label: '暂停 / 继续录制', default: 'F10' },
  { key: 'screenshot', label: '截图', default: 'F11' },
  { key: 'toggleToolbar', label: '显示 / 隐藏工具栏', default: 'Ctrl+T' },
  { key: 'minimize', label: '最小化到系统托盘', default: 'Ctrl+M' },
  { key: 'areaRecord', label: '区域选择录制', default: 'Ctrl+R' }
]

async function startEdit(key) {
  if (editing.value === key) {
    editing.value = null
    return
  }
  editing.value = key
  await nextTick()
  keyInput.value?.[0]?.focus()
}

function onKeyDown(e, key) {
  const parts = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Meta')

  const mainKey = e.key
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(mainKey)) {
    parts.push(mainKey.length === 1 ? mainKey.toUpperCase() : mainKey)
  }

  if (parts.length === 0) return
  const combo = parts.join('+')

  // 检查冲突
  const conflict = shortcuts.find(s => s.key !== key && props.config.shortcuts[s.key] === combo)
  if (conflict) {
    conflictTip.value = `与「${conflict.label}」冲突，请重新设置`
    setTimeout(() => conflictTip.value = '', 3000)
    return
  }

  props.config.shortcuts[key] = combo
  editing.value = null
}

function resetDefaults() {
  if (!confirm('确定要恢复所有快捷键的默认设置吗？')) return
  shortcuts.forEach(s => {
    props.config.shortcuts[s.key] = s.default
  })
}
</script>

<style scoped>
.settings-section { display: flex; flex-direction: column; gap: 20px; }
.setting-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border); }
.card-title-row { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text-primary); }
.hint-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

.sc-table { display: flex; flex-direction: column; }
.sc-table-head {
  display: grid; grid-template-columns: 1fr 160px 80px;
  padding: 8px 16px;
  font-size: 12px; font-weight: 600; color: var(--text-secondary);
  background: var(--bg-card-secondary);
  border-radius: 6px; margin-bottom: 4px;
}
.sc-table-row {
  display: grid; grid-template-columns: 1fr 160px 80px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.sc-table-row:last-child { border-bottom: none; }
.sc-name { font-size: 14px; color: var(--text-primary); }
.sc-key-cell { display: flex; align-items: center; }
kbd {
  display: inline-flex; align-items: center; padding: 4px 12px;
  border-radius: 6px; background: var(--bg-card-secondary);
  border: 1px solid var(--border); font-size: 13px; font-weight: 600;
  font-family: 'Geist Mono', monospace; color: var(--text-primary);
}
.sc-input {
  height: 32px; padding: 0 10px; border-radius: 6px;
  border: 2px solid var(--accent); background: var(--accent-light);
  font-size: 13px; font-family: 'Geist Mono', monospace;
  color: var(--accent); outline: none; width: 140px;
  cursor: default;
}

.conflict-tip {
  background: rgba(239,68,68,0.1); color: var(--danger);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 8px; padding: 10px 14px;
  font-size: 13px;
}
.fade-enter-active, .fade-leave-active { transition: all 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
