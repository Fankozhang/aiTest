import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRecordingStore } from '../stores/recording'
import { useHistoryStore } from '../stores/history'
import { useConfigStore } from '../stores/config'

export function useRecordingController() {
  const recordingStore = useRecordingStore()
  const historyStore = useHistoryStore()
  const configStore = useConfigStore()
  const router = useRouter()

  const showWindowPicker = ref(false)
  const windowSources = ref([])
  const selectedSourceId = ref('')
  const selectedArea = ref(null)
  const isActionBusy = ref(false)

  let mediaRecorder = null
  let recordedChunks = []
  let mediaStream = null

  async function hideAreaIndicator() {
    if (window.electronAPI?.hideRecordAreaIndicator) {
      await window.electronAPI.hideRecordAreaIndicator()
    }
  }

  async function selectMode(mode) {
    if (recordingStore.recordingMode === 'area' && mode !== 'area') {
      await hideAreaIndicator()
    }
    recordingStore.recordingMode = mode

    if (mode === 'window') {
      if (window.electronAPI) {
        windowSources.value = await window.electronAPI.getScreenSources()
        showWindowPicker.value = true
      }
    } else if (mode === 'area') {
      await pickRecordArea()
    }
  }

  async function pickRecordArea() {
    if (!window.electronAPI?.selectRecordArea) {
      alert('当前环境不支持区域框选')
      return
    }
    const area = await window.electronAPI.selectRecordArea()
    if (area) {
      selectedArea.value = area
    }
  }

  async function cancelSelectedArea() {
    selectedArea.value = null
    await hideAreaIndicator()
  }

  function confirmWindow() {
    showWindowPicker.value = false
  }

  async function toggleRecord() {
    if (isActionBusy.value) return
    isActionBusy.value = true
    try {
      if (recordingStore.isIdle) {
        await startRecording()
      } else {
        await stopRecord()
      }
    } finally {
      isActionBusy.value = false
    }
  }

  async function startRecording() {
    try {
      let stream
      const config = configStore.config

      if (recordingStore.recordingMode === 'fullscreen' || recordingStore.recordingMode === 'window') {
        if (window.electronAPI) {
          const sources = await window.electronAPI.getScreenSources()
          const sourceId = selectedSourceId.value || sources.find((s) => s.name === 'Entire Screen')?.id || sources[0]?.id

          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                maxWidth: 1920,
                maxHeight: 1080,
                maxFrameRate: config?.video?.fps || 60
              }
            }
          })
        } else {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: config?.audio?.enabled })
        }
      } else {
        if (!selectedArea.value) {
          alert('请先选择录制区域')
          await pickRecordArea()
          if (!selectedArea.value) return
        }

        if (window.electronAPI) {
          const sources = await window.electronAPI.getScreenSources()
          const screenSource = sources.find((s) => s.id.startsWith('screen:')) || sources[0]
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: screenSource.id,
                maxWidth: 3840,
                maxHeight: 2160,
                maxFrameRate: config?.video?.fps || 60
              }
            }
          })
        } else {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        }

        const sourceVideo = document.createElement('video')
        sourceVideo.srcObject = stream
        sourceVideo.muted = true
        sourceVideo.playsInline = true
        await sourceVideo.play()

        const canvas = document.createElement('canvas')
        canvas.width = selectedArea.value.width
        canvas.height = selectedArea.value.height
        const ctx = canvas.getContext('2d')
        const fps = config?.video?.fps || 60

        let rafId = 0
        const drawFrame = () => {
          if (!stream || stream.getVideoTracks().length === 0) return
          ctx.drawImage(
            sourceVideo,
            selectedArea.value.x,
            selectedArea.value.y,
            selectedArea.value.width,
            selectedArea.value.height,
            0,
            0,
            selectedArea.value.width,
            selectedArea.value.height
          )
          rafId = requestAnimationFrame(drawFrame)
        }
        drawFrame()

        const croppedStream = canvas.captureStream(fps)
        const stopDraw = () => {
          if (rafId) cancelAnimationFrame(rafId)
        }
        stream.getVideoTracks()[0].addEventListener('ended', stopDraw, { once: true })
        const rawStream = stream
        stream = croppedStream
        stream._rawScreenStream = rawStream
      }

      if (!stream) return

      if (config?.audio?.enabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          const audioTracks = micStream.getAudioTracks()
          audioTracks.forEach((t) => stream.addTrack(t))
        } catch (e) {
          // 麦克风权限被拒绝时忽略
        }
      }

      mediaStream = stream
      recordedChunks = []

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'

      mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data)
      }
      mediaRecorder.onstop = handleRecordingStop

      mediaRecorder.start(1000)
      recordingStore.startRecording()
      document.dispatchEvent(new CustomEvent('recording-preview-start', { detail: { stream } }))

      stream.getVideoTracks()[0].onended = () => {
        if (!recordingStore.isIdle) stopRecord()
      }
    } catch (e) {
      console.error('录制失败:', e)
      alert('无法启动录制，请检查权限：' + e.message)
    }
  }

  async function stopRecord() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop())
      if (mediaStream._rawScreenStream) {
        mediaStream._rawScreenStream.getTracks().forEach((t) => t.stop())
      }
      mediaStream = null
    }
    document.dispatchEvent(new CustomEvent('recording-preview-stop'))
    recordingStore.stopRecording()
  }

  async function handleRecordingStop() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
    const fileName = `录制_${dateStr}_${timeStr}.webm`

    const record = {
      fileName,
      filePath: '',
      duration: recordingStore.seconds,
      fileSize: blob.size,
      resolution: recordingStore.recordingMode === 'area' && selectedArea.value
        ? `${selectedArea.value.width}x${selectedArea.value.height}`
        : (configStore.config?.video?.resolution || '1920x1080'),
      fps: configStore.config?.video?.fps || 60,
      createdAt: now.toISOString(),
      tags: []
    }

    if (window.electronAPI) {
      const arrayBuffer = await blob.arrayBuffer()
      const result = await window.electronAPI.saveRecordingFile({
        buffer: Array.from(new Uint8Array(arrayBuffer)),
        fileName
      })
      if (result.success) {
        record.filePath = result.filePath
      }
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      record.filePath = fileName
    }

    await historyStore.addRecording(record)
    recordedChunks = []
  }

  function pauseRecord() {
    if (recordingStore.isIdle || !mediaRecorder) return
    if (recordingStore.isRecording) {
      if (mediaRecorder.state === 'recording') mediaRecorder.pause()
      recordingStore.pauseRecording()
    } else {
      if (mediaRecorder.state === 'paused') mediaRecorder.resume()
      recordingStore.pauseRecording()
    }
  }

  async function takeScreenshot() {
    try {
      let stream
      if (window.electronAPI) {
        const sources = await window.electronAPI.getScreenSources()
        const src = sources.find((s) => s.name === 'Entire Screen') || sources[0]
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: src.id } }
        })
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      }

      const track = stream.getVideoTracks()[0]
      const cap = new ImageCapture(track)
      const bitmap = await cap.grabFrame()
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      canvas.getContext('2d').drawImage(bitmap, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      stream.getTracks().forEach((t) => t.stop())

      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
      const fileName = `截图_${dateStr}_${timeStr}.png`

      const rec = { fileName, filePath: '', dataUrl, createdAt: now.toISOString() }

      if (window.electronAPI) {
        const result = await window.electronAPI.saveScreenshotFile({ dataUrl, fileName })
        if (result.success) rec.filePath = result.filePath
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = fileName
        a.click()
        rec.filePath = fileName
      }

      await historyStore.addScreenshot(rec)
      router.push('/screenshot')
    } catch (e) {
      console.error('截图失败:', e)
    }
  }

  function onShortcutPause() { pauseRecord() }
  function onShortcutScreenshot() { takeScreenshot() }
  function onRecordAreaCleared() { selectedArea.value = null }
  function onRecordToggleRequest() { toggleRecord() }
  function onRecordAreaUpdated(area) {
    if (area && area.width > 0 && area.height > 0) {
      selectedArea.value = area
    }
  }

  onMounted(() => {
    document.addEventListener('shortcut-pause-record', onShortcutPause)
    document.addEventListener('shortcut-screenshot', onShortcutScreenshot)
    document.addEventListener('shortcut-toggle-record', toggleRecord)
    document.addEventListener('record-toggle-request', onRecordToggleRequest)
    window.electronAPI?.onRecordAreaCleared?.(onRecordAreaCleared)
    window.electronAPI?.onRecordAreaUpdated?.(onRecordAreaUpdated)
  })

  onUnmounted(() => {
    document.removeEventListener('shortcut-pause-record', onShortcutPause)
    document.removeEventListener('shortcut-screenshot', onShortcutScreenshot)
    document.removeEventListener('shortcut-toggle-record', toggleRecord)
    document.removeEventListener('record-toggle-request', onRecordToggleRequest)
    window.electronAPI?.offRecordAreaCleared?.()
    window.electronAPI?.offRecordAreaUpdated?.()
  })

  return {
    recordingStore,
    showWindowPicker,
    windowSources,
    selectedSourceId,
    selectedArea,
    selectMode,
    pickRecordArea,
    cancelSelectedArea,
    confirmWindow,
    toggleRecord,
    pauseRecord,
    stopRecord,
    takeScreenshot
  }
}
