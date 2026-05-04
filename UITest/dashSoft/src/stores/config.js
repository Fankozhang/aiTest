import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const config = ref(null)
  const loaded = ref(false)

  async function load() {
    if (window.electronAPI) {
      config.value = await window.electronAPI.getConfig()
    } else {
      // 浏览器开发模式默认配置
      config.value = {
        video: { quality: 'hd', fps: 60, resolution: '1920x1080', format: 'mp4', cursor: { show: true, highlight: false, size: 'default' } },
        audio: { enabled: true, micDevice: 'default', micVolume: 80, systemAudio: true, noiseReduction: true, format: 'aac' },
        camera: { enabled: false, device: 'default' },
        storage: { videoPath: '~/Videos/ScreenRec', screenshotPath: '~/Pictures/ScreenRec', autoOpenFolder: true, namingRule: '{日期}_{时间}_{序号}' },
        shortcuts: { startStop: 'F9', pause: 'F10', screenshot: 'F11', toggleToolbar: 'Ctrl+T', minimize: 'Ctrl+M', areaRecord: 'Ctrl+R' },
        notifications: { onStart: true, onStop: true, storageWarning: true, sound: false, duration: 5 }
      }
    }
    loaded.value = true
  }

  async function save() {
    if (window.electronAPI && config.value) {
      await window.electronAPI.saveConfig(config.value)
    }
  }

  return { config, loaded, load, save }
})
