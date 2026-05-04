import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHistoryStore = defineStore('history', () => {
  const recordings = ref([])
  const screenshots = ref([])

  async function loadRecordings() {
    if (window.electronAPI) {
      recordings.value = await window.electronAPI.getRecordings() || []
    }
  }

  async function loadScreenshots() {
    if (window.electronAPI) {
      screenshots.value = await window.electronAPI.getScreenshots() || []
    }
  }

  async function addRecording(record) {
    recordings.value.unshift(record)
    if (window.electronAPI) await window.electronAPI.saveRecording(record)
  }

  async function removeRecording(filePath) {
    recordings.value = recordings.value.filter(r => r.filePath !== filePath)
    if (window.electronAPI) await window.electronAPI.deleteRecording(filePath)
  }

  async function addScreenshot(record) {
    screenshots.value.unshift(record)
    if (window.electronAPI) await window.electronAPI.saveScreenshotRecord(record)
  }

  async function removeScreenshot(filePath) {
    screenshots.value = screenshots.value.filter(r => r.filePath !== filePath)
    if (window.electronAPI) await window.electronAPI.deleteScreenshot(filePath)
  }

  return {
    recordings, screenshots,
    loadRecordings, loadScreenshots,
    addRecording, removeRecording,
    addScreenshot, removeScreenshot
  }
})
