// File parsing utilities: txt / docx / pdf -> text -> QA pairs
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&inline'

// Use bundled inline worker so it works under file:// protocol too
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB for text files
const MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25MB (Groq Whisper 限制)
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB for source video (will extract audio)

const TEXT_EXTS = ['txt', 'docx', 'pdf']
const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'oga', 'flac', 'opus', 'aac']
const VIDEO_EXTS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']

export function validateFile(file) {
  if (!file) return { ok: false, error: '请选择文件' }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: '文件大小超过10MB，请精简后重试' }
  }
  const ext = file.name.toLowerCase().split('.').pop()
  if (!TEXT_EXTS.includes(ext)) {
    return { ok: false, error: '仅支持 .txt / .docx / .pdf 格式' }
  }
  return { ok: true }
}

export function validateAudioFile(file) {
  if (!file) return { ok: false, error: '请选择音频文件' }
  if (file.size > MAX_AUDIO_SIZE) {
    return { ok: false, error: '音频文件超过 25MB（Groq 限制），请压缩或裁剪后重试' }
  }
  const ext = file.name.toLowerCase().split('.').pop()
  if (!AUDIO_EXTS.includes(ext)) {
    return { ok: false, error: `仅支持音频格式：${AUDIO_EXTS.join(' / ')}` }
  }
  return { ok: true }
}

export function validateVideoFile(file) {
  if (!file) return { ok: false, error: '请选择视频文件' }
  if (file.size > MAX_VIDEO_SIZE) {
    return { ok: false, error: '视频文件超过 100MB，请压缩后重试' }
  }
  const ext = file.name.toLowerCase().split('.').pop()
  if (!VIDEO_EXTS.includes(ext)) {
    return { ok: false, error: `仅支持视频格式：${VIDEO_EXTS.join(' / ')}` }
  }
  return { ok: true }
}

export async function readFileToText(file) {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'txt') {
    return await file.text()
  }
  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value || ''
  }
  if (ext === 'pdf') {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((it) => it.str).join(' ')
      text += pageText + '\n'
    }
    return text
  }
  throw new Error('不支持的文件格式')
}

// ============ 音频提取（视频/音频文件 → WAV Blob）============
// 使用浏览器原生 AudioContext.decodeAudioData 解码媒体文件的音轨，
// 然后编码为 16-bit PCM WAV 喂给 Groq Whisper。
// 不需要引入 ffmpeg.wasm，体积小、速度快。

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function audioBufferToWavBlob(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const bitDepth = 16

  // 多声道交错
  let samples
  if (numChannels === 2) {
    const left = audioBuffer.getChannelData(0)
    const right = audioBuffer.getChannelData(1)
    const length = left.length + right.length
    samples = new Float32Array(length)
    let idx = 0
    for (let i = 0; i < left.length; i++) {
      samples[idx++] = left[i]
      samples[idx++] = right[i]
    }
  } else {
    // 单声道 / 多声道取首通道
    samples = audioBuffer.getChannelData(0)
  }

  const dataSize = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true) // byte rate
  view.setUint16(32, numChannels * 2, true) // block align
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // 写入采样（float → int16）
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

export async function extractAudioBlobFromFile(file, options = {}) {
  const arrayBuffer = await file.arrayBuffer()
  // 使用 OfflineAudioContext 以避免播放声音
  const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext
  if (!AudioCtx) {
    throw new Error('当前浏览器不支持音频解码（AudioContext 不可用）')
  }
  // 临时 ctx 仅用于 decodeAudioData
  const tmpCtx = new (window.AudioContext || window.webkitAudioContext)()
  let audioBuffer
  try {
    audioBuffer = await tmpCtx.decodeAudioData(arrayBuffer.slice(0))
  } catch (e) {
    throw new Error('音轨解码失败：' + (e.message || '文件可能无音轨或格式不支持'))
  } finally {
    if (tmpCtx.close) tmpCtx.close()
  }

  // 如果时长 > 60 分钟，先采样降采样到 16kHz 以减小体积
  const targetSampleRate = options.forceSampleRate || (audioBuffer.duration > 1800 ? 16000 : audioBuffer.sampleRate)
  let renderBuffer = audioBuffer
  if (targetSampleRate !== audioBuffer.sampleRate) {
    const offline = new AudioCtx(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate)
    const src = offline.createBufferSource()
    src.buffer = audioBuffer
    src.connect(offline.destination)
    src.start()
    renderBuffer = await offline.startRendering()
  }

  const wavBlob = audioBufferToWavBlob(renderBuffer)
  // 25MB 上限保护
  if (wavBlob.size > 25 * 1024 * 1024) {
    throw new Error(`提取的 WAV 过大（${(wavBlob.size / 1024 / 1024).toFixed(1)}MB），请上传时长更短的视频`)
  }
  return wavBlob
}

// ============ 兼容工具：检测文件类型分类 ============
export function detectMediaType(file) {
  if (!file) return 'unknown'
  const ext = file.name.toLowerCase().split('.').pop()
  if (TEXT_EXTS.includes(ext)) return 'text'
  if (AUDIO_EXTS.includes(ext)) return 'audio'
  if (VIDEO_EXTS.includes(ext)) return 'video'
  // 用 MIME 兜底
  if (file.type) {
    if (file.type.startsWith('audio/')) return 'audio'
    if (file.type.startsWith('video/')) return 'video'
  }
  return 'unknown'
}

// Parse QA pairs from text using multiple pattern rules
export function parseQAPairs(text) {
  if (!text || !text.trim()) return { pairs: [], raw: '', recognized: false }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const pairs = []

  // Pattern markers for question/answer roles
  const qMarkers = /^(面试官|q|问|question)[:：]/i
  const aMarkers = /^(我|a|答|answer)[:：]/i
  // Numbered question pattern: 1. / 1、 / 1)
  const numberedRe = /^(\d+)[.、)]\s*(.+)/

  let current = null

  const pushCurrent = () => {
    if (current && (current.question || current.answer)) {
      pairs.push({
        question: current.question || '',
        answer: current.answer || '',
      })
    }
    current = null
  }

  for (const line of lines) {
    if (qMarkers.test(line)) {
      pushCurrent()
      current = { question: line.replace(qMarkers, '').trim(), answer: '' }
    } else if (aMarkers.test(line)) {
      if (!current) {
        current = { question: '', answer: '' }
      }
      const ans = line.replace(aMarkers, '').trim()
      current.answer = current.answer ? current.answer + '\n' + ans : ans
    } else {
      const m = line.match(numberedRe)
      if (m) {
        // Numbered: treat as question, next line as answer
        pushCurrent()
        current = { question: m[2].trim(), answer: '' }
      } else {
        // continuation or stray line
        if (current) {
          if (!current.answer) {
            current.answer = line
          } else {
            current.answer += '\n' + line
          }
        } else {
          // start with no marker, treat as question
          current = { question: line, answer: '' }
        }
      }
    }
  }
  pushCurrent()

  const recognized = pairs.some((p) => p.question && p.answer)
  return { pairs, raw: text, recognized }
}
