import { createApp } from 'vue'
import App from './App.vue'

// 捕获并忽略不相关的错误
window.addEventListener('error', (event) => {
  // 忽略音频/视频相关的错误（通常来自浏览器插件）
  if (event.message && event.message.includes('play()')) {
    event.preventDefault()
    event.stopPropagation()
  }
})

// 捕获 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
  // 忽略音频/视频相关的 Promise 拒绝
  if (event.reason && event.reason.message && event.reason.message.includes('play()')) {
    event.preventDefault()
  }
})

createApp(App).mount('#app')