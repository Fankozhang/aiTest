import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useRecordingStore = defineStore('recording', () => {
  // 状态：idle | recording | paused
  const status = ref('idle')
  const seconds = ref(0)
  const recordingMode = ref('fullscreen') // fullscreen | window | area
  let timer = null

  const isRecording = computed(() => status.value === 'recording')
  const isPaused = computed(() => status.value === 'paused')
  const isIdle = computed(() => status.value === 'idle')

  const timeDisplay = computed(() => {
    const h = Math.floor(seconds.value / 3600)
    const m = Math.floor((seconds.value % 3600) / 60)
    const s = seconds.value % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  function startTimer() {
    stopTimer()
    timer = setInterval(() => {
      if (status.value === 'recording') seconds.value++
    }, 1000)
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null }
  }

  function startRecording() {
    status.value = 'recording'
    seconds.value = 0
    startTimer()
    window.electronAPI?.notifyRecordingStarted()
  }

  function pauseRecording() {
    if (status.value === 'recording') {
      status.value = 'paused'
    } else if (status.value === 'paused') {
      status.value = 'recording'
    }
  }

  function stopRecording() {
    stopTimer()
    status.value = 'idle'
    window.electronAPI?.notifyRecordingStopped()
  }

  function reset() {
    stopTimer()
    status.value = 'idle'
    seconds.value = 0
  }

  return {
    status, seconds, recordingMode,
    isRecording, isPaused, isIdle,
    timeDisplay,
    startRecording, pauseRecording, stopRecording, reset
  }
})
