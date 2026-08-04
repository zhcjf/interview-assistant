import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { readFileToText, validateFile, parseQAPairs } from '../utils/fileParser.js'
import {
  INTERVIEW_ROUNDS,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from './ui.jsx'
import { useToast } from './Toast.jsx'
import { IconUpload, IconFile, IconPlus, IconTrash, IconClose, IconCheck } from './Icons.jsx'
import { saveInterview } from '../utils/storage.js'

const STEPS = { UPLOAD: 'upload', PREVIEW: 'preview' }

export default function UploadModal({ open, onClose, jobs }) {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [mode, setMode] = useState('file') // file | paste
  const [file, setFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [rawText, setRawText] = useState('')
  const [pairs, setPairs] = useState([])
  const [parsing, setParsing] = useState(false)
  const [recognized, setRecognized] = useState(true)
  const [meta, setMeta] = useState({
    jobId: '',
    interviewTime: new Date().toISOString(),
    round: '初面',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const toast = useToast()
  const navigate = useNavigate()

  const reset = () => {
    setStep(STEPS.UPLOAD)
    setMode('file')
    setFile(null)
    setPasteText('')
    setRawText('')
    setPairs([])
    setRecognized(true)
    setMeta({ jobId: '', interviewTime: new Date().toISOString(), round: '初面', notes: '' })
    setErrors({})
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (f) => {
    const v = validateFile(f)
    if (!v.ok) {
      toast.error(v.error)
      return
    }
    setFile(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const parse = async () => {
    let text = ''
    if (mode === 'file') {
      if (!file) {
        toast.error('请先选择文件')
        return
      }
      setParsing(true)
      try {
        text = await readFileToText(file)
      } catch (e) {
        toast.error('文件解析失败：' + (e.message || '未知错误'))
        setParsing(false)
        return
      }
      setParsing(false)
    } else {
      text = pasteText
      if (!text.trim()) {
        toast.error('请粘贴面试记录内容')
        return
      }
    }

    const result = parseQAPairs(text)
    setRawText(text)
    setRecognized(result.recognized)
    if (result.pairs.length === 0) {
      // No pairs detected, show raw text as single editable pair
      setPairs([{ question: '', answer: text }])
      toast.info('未能自动识别问答结构，已显示原始内容，请手动整理')
    } else {
      setPairs(result.pairs)
      if (!result.recognized) {
        toast.info('未能自动识别问答结构，已显示原始内容，请手动整理')
      } else {
        toast.success(`识别到 ${result.pairs.length} 个问答对`)
      }
    }
    setStep(STEPS.PREVIEW)
  }

  const updatePair = (idx, field, val) => {
    setPairs((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const addPair = () => {
    setPairs((prev) => [...prev, { question: '', answer: '' }])
  }

  const removePair = (idx) => {
    setPairs((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    const errs = {}
    if (!meta.jobId) errs.jobId = '请选择关联岗位'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const cleanPairs = pairs.filter((p) => p.question.trim() || p.answer.trim())
    if (cleanPairs.length === 0) {
      toast.error('请至少填写一个问答对')
      return
    }

    setSaving(true)
    const interview = {
      jobId: meta.jobId,
      interviewTime: fromDatetimeLocalValue(meta.interviewTime) || meta.interviewTime,
      round: meta.round,
      interviewer: '',
      format: '',
      questions: cleanPairs.map((p) => p.question.trim()),
      answers: cleanPairs.map((p) => p.answer.trim()),
      feeling: meta.notes || '',
      result: '待定',
      hasAttachment: mode === 'file',
      attachmentText: rawText,
      attachmentFileName: file?.name || '',
    }
    const saved = saveInterview(interview)
    setSaving(false)
    toast.success('保存成功')
    reset()
    onClose()
    navigate(`/interviews/${saved.id}`)
  }

  const backToUpload = () => {
    setStep(STEPS.UPLOAD)
    setPairs([])
    setRawText('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
              <IconUpload width={16} height={16} />
            </span>
            <h3 className="text-lg font-semibold text-text-primary">
              {step === STEPS.UPLOAD ? '上传面试文字记录' : '识别完成'}
            </h3>
            {step === STEPS.PREVIEW && (
              <span className="ml-2 text-xs text-text-tertiary">
                共识别到 {pairs.length} 个问答对
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-gray-100 hover:text-text-primary transition-colors"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === STEPS.UPLOAD ? (
            <div className="space-y-5">
              {/* Mode tabs */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => setMode('file')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mode === 'file' ? 'bg-white text-brand shadow-sm' : 'text-text-tertiary'
                  }`}
                >
                  📁 上传文件
                </button>
                <button
                  onClick={() => setMode('paste')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mode === 'paste' ? 'bg-white text-brand shadow-sm' : 'text-text-tertiary'
                  }`}
                >
                  ✏️ 粘贴文字
                </button>
              </div>

              {mode === 'file' ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl py-10 px-6 text-center cursor-pointer transition-colors ${
                    dragging ? 'border-brand bg-brand/5' : 'border-border hover:border-brand hover:bg-gray-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.docx,.pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                        <IconFile width={20} height={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-text-primary">{file.name}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB · 点击重新选择
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand mx-auto mb-3">
                        <IconUpload width={24} height={24} />
                      </div>
                      <p className="text-sm text-text-primary">点击或拖拽上传文件</p>
                      <p className="text-xs text-text-tertiary mt-1">支持 .txt / .docx / .pdf，大小 ≤ 10MB</p>
                    </>
                  )}
                </div>
              ) : (
                <textarea
                  className="textarea min-h-[200px] font-mono text-sm"
                  placeholder={`面试官：请做一个自我介绍\n我：我是张一航...\n\n---支持格式---\n面试官：问题 / 我：回答\nQ：问题 / A：回答\n问：问题 / 答：回答\n1. 问题 / 回答`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
              )}

              <div className="text-xs text-text-tertiary bg-blue-50 rounded-lg p-3">
                <p className="font-medium text-info mb-1">支持的识别格式：</p>
                <p>• 面试官：xxx / 我：xxx</p>
                <p>• Q：xxx / A：xxx</p>
                <p>• 问：xxx / 答：xxx</p>
                <p>• 1. xxx（下一行为回答）</p>
              </div>

              {/* Meta */}
              <div className="border-t border-border pt-5">
                <p className="text-sm font-semibold text-text-primary mb-3">关联信息</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label label-required">岗位</label>
                    <select
                      className={`input ${errors.jobId ? 'input-error' : ''}`}
                      value={meta.jobId}
                      onChange={(e) => {
                        setMeta({ ...meta, jobId: e.target.value })
                        if (errors.jobId) setErrors({ ...errors, jobId: '' })
                      }}
                    >
                      <option value="">请选择</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.company} · {j.title}
                        </option>
                      ))}
                    </select>
                    {errors.jobId && <p className="mt-1 text-xs text-danger">{errors.jobId}</p>}
                  </div>
                  <div>
                    <label className="label">面试时间</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={toDatetimeLocalValue(meta.interviewTime)}
                      onChange={(e) => setMeta({ ...meta, interviewTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">轮次</label>
                    <select
                      className="input"
                      value={meta.round}
                      onChange={(e) => setMeta({ ...meta, round: e.target.value })}
                    >
                      {INTERVIEW_ROUNDS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!recognized && (
                <div className="px-4 py-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
                  <span className="text-warning text-sm">⚠️</span>
                  <p className="text-sm text-text-secondary">
                    未能自动识别问答结构，已显示原始内容，请手动整理
                  </p>
                </div>
              )}
              {pairs.map((p, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-gray-50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-tertiary">Q{idx + 1}</span>
                    <button
                      onClick={() => removePair(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-red-50 hover:text-danger transition-colors"
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                  <input
                    className="input mb-2"
                    placeholder="问题"
                    value={p.question}
                    onChange={(e) => updatePair(idx, 'question', e.target.value)}
                  />
                  <textarea
                    className="textarea min-h-[80px]"
                    placeholder="回答"
                    value={p.answer}
                    onChange={(e) => updatePair(idx, 'answer', e.target.value)}
                  />
                </div>
              ))}
              <button
                onClick={addPair}
                className="w-full py-2.5 rounded-lg border border-dashed border-brand text-brand text-sm font-medium hover:bg-brand/5 transition-colors flex items-center justify-center gap-1.5"
              >
                <IconPlus width={16} height={16} />
                手动添加一个问答对
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          {step === STEPS.UPLOAD ? (
            <>
              <span className="text-xs text-text-tertiary">
                {parsing ? '正在解析文件，请稍候...' : ''}
              </span>
              <div className="flex items-center gap-3">
                <button className="btn-secondary" onClick={handleClose}>取消</button>
                <button className="btn-primary" onClick={parse} disabled={parsing}>
                  {parsing ? '解析中...' : '解析并预览'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button className="btn-text" onClick={backToUpload}>← 重新上传</button>
              <div className="flex items-center gap-3">
                <button className="btn-secondary" onClick={handleClose}>取消</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中...' : '确认保存'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
