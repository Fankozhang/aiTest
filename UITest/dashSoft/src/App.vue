<template>
  <div class="app-layout">
    <!-- 自定义标题栏 -->
    <div class="title-bar drag-region">
      <span class="title-bar-title no-drag">ScreenRec</span>
      <div class="title-bar-controls no-drag">
        <button class="wbtn" @click="minimize" title="最小化">
          <svg width="10" height="2" viewBox="0 0 10 2"><rect width="10" height="2" rx="1" fill="currentColor"/></svg>
        </button>
        <button class="wbtn" @click="maximize" title="最大化">
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor"/></svg>
        </button>
        <button class="wbtn wbtn-close" @click="close" title="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="app-body">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div class="sidebar-top">
          <!-- Logo -->
          <div class="logo-area">
            <div class="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <circle cx="12" cy="12" r="8"/>
                <circle cx="12" cy="12" r="3" fill="#fff" stroke="none"/>
              </svg>
            </div>
            <div class="logo-text">
              <span class="logo-name">ScreenRec</span>
              <span class="logo-sub">专业录制工具</span>
            </div>
          </div>

          <!-- 导航 -->
          <nav class="nav-menu">
            <router-link to="/" class="nav-item" :class="{ active: $route.path === '/' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>
              <span>录制中心</span>
            </router-link>
            <router-link to="/history" class="nav-item" :class="{ active: $route.path === '/history' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              <span>录制历史</span>
            </router-link>
            <router-link to="/screenshot" class="nav-item" :class="{ active: $route.path === '/screenshot' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>截图工具</span>
            </router-link>
            <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span>系统设置</span>
            </router-link>
          </nav>
        </div>

        <!-- 用户信息 -->
        <div class="sidebar-bottom">
          <div class="user-card">
            <div class="user-avatar">张</div>
            <div class="user-info">
              <span class="user-name">张帆</span>
              <span class="user-plan">专业版用户</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 页面内容 -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useConfigStore } from './stores/config'
import { useHistoryStore } from './stores/history'

const configStore = useConfigStore()
const historyStore = useHistoryStore()

onMounted(async () => {
  await configStore.load()
  await historyStore.loadRecordings()
  await historyStore.loadScreenshots()
})

function minimize() { window.electronAPI?.windowMinimize() }
function maximize() { window.electronAPI?.windowMaximize() }
function close() { window.electronAPI?.windowClose() }
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-page);
}

/* 标题栏 */
.title-bar {
  height: 32px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  z-index: 100;
}
.title-bar-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}
.title-bar-controls {
  display: flex;
  gap: 6px;
}
.wbtn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: var(--bg-card-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.wbtn:hover { background: var(--border); color: var(--text-primary); }
.wbtn-close:hover { background: var(--danger); color: #fff; }

/* 主体布局 */
.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 220px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px 0;
  flex-shrink: 0;
}
.sidebar-top { display: flex; flex-direction: column; gap: 8px; }

/* Logo */
.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px 16px;
}
.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.logo-text { display: flex; flex-direction: column; gap: 2px; }
.logo-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.logo-sub { font-size: 11px; color: var(--text-secondary); }

/* 导航 */
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  margin: 0 8px;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}
.nav-item:hover { background: var(--bg-card-secondary); color: var(--text-primary); }
.nav-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }

/* 用户卡片 */
.sidebar-bottom { padding: 0 16px; }
.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #F1F5F9;
  border-radius: 10px;
  border: 1px solid var(--border);
  cursor: pointer;
}
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-info { display: flex; flex-direction: column; gap: 2px; }
.user-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.user-plan { font-size: 11px; color: var(--text-secondary); }

/* 主内容 */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
