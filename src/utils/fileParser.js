// File parsing utilities: txt / docx / pdf -> text -> QA pairs
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&inline'

// Use bundled inline worker so it works under file:// protocol too
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function validateFile(file) {
  if (!file) return { ok: false, error: '请选择文件' }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: '文件大小超过10MB，请精简后重试' }
  }
  const ext = file.name.toLowerCase().split('.').pop()
  if (!['txt', 'docx', 'pdf'].includes(ext)) {
    return { ok: false, error: '仅支持 .txt / .docx / .pdf 格式' }
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
