import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  readFileToText,
  validateFile,
  validateAudioFile,
  validateVideoFile,
  extractAudioBlobFromFile,
  parseQAPairs,
} from '../utils/fileParser.js'
import {
  INTERVIEW_ROUNDS,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from './ui.jsx'
import { useToast } from './Toast.jsx'
import { IconUpload, IconFile, IconPlus, IconTrash, IconClose, IconCheck, IconAI, IconSparkles } from './Icons.jsx'
import { saveInterview, getAIConfig, getJob } from '../utils/storage.js'
import { parseInterviewText, getAudioConfig, transcribeAudio } from '../utils/ai-client.js'

const STEPS = { UPLOAD: 'upload', PREVIEW: 'preview' }

const MODES = [
  { id: 'file', label: '文档', icon: '📄', desc: '.txt / .docx / .pdf' },
  { id: 'paste', label: '粘贴文字', icon: '✏️', desc: '任意格式自由粘贴' },
  { id: 'audio', label: '录音', icon: '🎵', desc: 'mp3 / wav / m4a / webm' },
  { id: 'video', label: '视频', icon: '🎬', desc: 'mp4 / mov / mkv / webm' },
]

export default function UploadModal({ open, onClose, jobs }) {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [mode, setMode] = useState('file') // file | paste | audio | video
  const [file, setFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [rawText, setRawText] = useState('')
  const [pairs, setPairs] = useState([])
  const [parsing, setParsing] = useState(false)
  const [parseStage, setParseStage] = useState('') // 'extracting' | 'transcribing' | 'parsing'
  const [parseStageMsg, setParseStageMsg] = useState('')
  const [recognized, setRecognized] = useState(true)
  const [parseMethod, setParseMethod] = useState('') // 'ai' | 'regex'
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

  const aiConfig = getAIConfig()
  const aiReady = !!(aiConfig.apiKey && aiConfig.model)
  const audioConfig = getAudioConfig()
  const audioReady = !!(audioConfig && audioConfig.apiKey)

  const acceptAttr = {
    file: '.txt,.docx,.pdf',
    audio: '.mp3,.wav,.m4a,.webm,.ogg,.oga,.flac,.opus,.aac',
    video: '.mp4,.mov,.mkv,.webm,.avi,.m4v',
  }[mode] || ''

  const reset = () => {
    setStep(STEPS.UPLOAD)
    setMode('file')
    setFile(null)
    setPasteText('')
    setRawText('')
    setPairs([])
    setRecognized(true)
    setParseMethod('')
    setParseStage('')
    setParseStageMsg('')
    setMeta({ jobId: '', interviewTime: new Date().toISOString(), round: '初面', notes: '' })
    setErrors({})
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (f) => {
    let v
    if (mode === 'audio') v = validateAudioFile(f)
    else if (mode === 'video') v = validateVideoFile(f)
    else v = validateFile(f)
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

  // 文本 → QA pairs：优先 AI，回退 regex
  const parseTextToPairs = async (text, jobContext) => {
    if (!text || !text.trim()) {
      return { pairs: [], recognized: false, method: 'none' }
    }
    if (aiReady) {
      try {
        setParseStage('parsing')
        setParseStageMsg('AI 正在解析面试记录结构...')
        const result = await parseInterviewText(aiConfig, text.slice(0, 12000), jobContext)
        const items = (result.items || []).map((it) => ({
          question: it.question || '',
          answer: it.answer || '',
        }))
        if (items.length > 0) {
          return { pairs: items, recognized: true, method: 'ai', summary: result.summary }
        }
      } catch (e) {
        toast.error('AI 解析失败，回退到规则解析：' + e.message)
      }
    }
    // 回退：旧 regex
    setParseStage('parsing')
    setParseStageMsg('使用规则解析面试记录...')
    const r = parseQAPairs(text)
    return { pairs: r.pairs, recognized: r.recognized, method: 'regex' }
  }

  const parse = async () => {
    let text = ''
    let transcriptionUsed = false
    const jobContext = {
      company: meta.jobId ? getJob(meta.jobId)?.company : '',
      jobTitle: meta.jobId ? getJob(meta.jobId)?.title : '',
      round: meta.round,
    }

    try {
      if (mode === 'file') {
        if (!file) {
          toast.error('请先选择文件')
          return
        }
        setParsing(true)
        setParseStage('extracting')
        setParseStageMsg('正在提取文档文本...')
        try {
          text = await readFileToText(file)
        } catch (e) {
          toast.error('文件解析失败：' + (e.message || '未知错误'))
          setParsing(false)
          setParseStage('')
          return
        }
      } else if (mode === 'paste') {
        text = pasteText
        if (!text.trim()) {
          toast.error('请粘贴面试记录内容')
          return
        }
        if (!aiReady) {
          toast.info('AI 未配置，将使用规则解析（可能不如 AI 准确）')
        }
        setParsing(true)
      } else if (mode === 'audio') {
        if (!file) {
          toast.error('请先选择音频文件')
          return
        }
        if (!audioReady) {
          toast.error('音频转录未配置，请先在设置页填入音频转录 API Key')
          setParsing(false)
          return
        }
        setParsing(true)
        setParseStage('transcribing')
        setParseStageMsg('正在用 Groq Whisper 转录音频，请耐心等待...')
        try {
          text = await transcribeAudio(audioConfig, file, { filename: file.name })
          transcriptionUsed = true
        } catch (e) {
          toast.error('音频转录失败：' + e.message)
          setParsing(false)
          setParseStage('')
          return
        }
      } else if (mode === 'video') {
        if (!file) {
          toast.error('请先选择视频文件')
          return
        }
        if (!audioReady) {
          toast.error('音频转录未配置，请先在设置页填入音频转录 API Key')
          setParsing(false)
          return
        }
        setParsing(true)
        setParseStage('extracting')
        setParseStageMsg('正在从视频中提取音轨...')
        let audioBlob
        try {
          audioBlob = await extractAudioBlobFromFile(file)
        } catch (e) {
          toast.error('音轨提取失败：' + e.message)
          setParsing(false)
          setParseStage('')
          return
        }
        setParseStage('transcribing')
        setParseStageMsg(`音轨提取完成（${(audioBlob.size / 1024 / 1024).toFixed(1)}MB），正在转录...`)
        try {
          text = await transcribeAudio(audioConfig, audioBlob, { filename: 'extracted.wav' })
          transcriptionUsed = true
        } catch (e) {
          toast.error('音频转录失败：' + e.message)
          setParsing(false)
          setParseStage('')
          return
        }
      }

      const result = await parseTextToPairs(text, jobContext)
      setRawText(text)
      setRecognized(result.recognized)
      setParseMethod(result.method)

      if (result.pairs.length === 0) {
        setPairs([{ question: '', answer: text }])
        toast.info('未能自动识别问答结构，已显示原始内容，请手动整理')
      } else {
        setPairs(result.pairs)
        if (result.method === 'ai') {
          toast.success(`AI 解析到 ${result.pairs.length} 个问答对${transcriptionUsed ? '（含音频转录）' : ''}`)
        } else {
          toast.info(`规则解析到 ${result.pairs.length} 个问答对${transcriptionUsed ? '（含音频转录）' : ''}`)
        }
      }
      if (result.summary && result.summary.trim()) {
        setMeta((prev) => ({ ...prev, notes: result.summary }))
      }
      setStep(STEPS.PREVIEW)
    } finally {
      setParsing(false)
      setParseStage('')
      setParseStageMsg('')
    }
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
      format: mode === 'audio' ? '录音' : mode === 'video' ? '视频' : mode === 'file' ? '文档' : '文字',
      questions: cleanPairs.map((p) => p.question.trim()),
      answers: cleanPairs.map((p) => p.answer.trim()),
      feeling: meta.notes || '',
      result: '待定',
      hasAttachment: mode !== 'paste',
      attachmentText: rawText,
      attachmentFileName: file?.name || '',
      parseMethod,
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
    setParseMethod('')
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
              {step === STEPS.UPLOAD ? '上传面试记录' : '识别完成'}
            </h3>
            {step === STEPS.PREVIEW && (
              <span className="ml-2 text-xs text-text-tertiary">
                共 {pairs.length} 个问答对 ·{' '}
                {parseMethod === 'ai' ? 'AI 解析' : parseMethod === 'regex' ? '规则解析' : '未解析'}
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
              <div className="flex gap-2 flex-wrap">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id)
                      setFile(null)
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      mode === m.id
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-text-secondary border-border hover:border-brand/40 hover:text-text-primary'
                    }`}
                  >
                    <span className="mr-1.5">{m.icon}</span>
                    {m.label}
                    <span className={`ml-2 text-xs ${mode === m.id ? 'text-white/70' : 'text-text-tertiary'}`}>
                      {m.desc}
                    </span>
                  </button>
                ))}
              </div>

              {/* AI / Audio status hint */}
              {!aiReady && (mode === 'file' || mode === 'paste') && (
                <div className="px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-text-secondary flex items-center gap-2">
                  <span>⚠️</span>
                  <span>
                    AI 未配置，将使用规则解析（仅识别 面试官:/我:/Q:/A: 等固定模板）。
                    <button onClick={() => navigate('/settings')} className="ml-1 text-brand hover:underline">
                      去配置 AI →
                    </button>
                  </span>
                </div>
              )}
              {(mode === 'audio' || mode === 'video') && !audioReady && (
                <div className="px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-text-secondary flex items-center gap-2">
                  <span>⚠️</span>
                  <span>
                    音频转录未配置（Groq Whisper）。请先在设置页填入 Groq API Key。
                    <button onClick={() => navigate('/settings')} className="ml-1 text-brand hover:underline">
                      去配置 →
                    </button>
                  </span>
                </div>
              )}

              {mode === 'paste' ? (
                <textarea
                  className="textarea min-h-[200px] font-mono text-sm"
                  placeholder={`可以自由粘贴任意格式的面试记录，AI 会智能识别问答关系：\n\n例如：\n面试官让我先自我介绍，我讲了大概三分钟，从教育背景聊到最近的项目...\n然后他问我为什么离职，我答得有点紧张...\n\n也可以是带标记的：\n面试官：请做一个自我介绍\n我：我是张一航...\n\nAI 会自动判断结构，无需严格格式。`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
              ) : (
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
                    accept={acceptAttr}
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
                      <p className="text-sm text-text-primary">
                        点击或拖拽上传{mode === 'audio' ? '音频' : mode === 'video' ? '视频' : '文件'}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {mode === 'audio' && '支持 mp3 / wav / m4a / webm 等，≤ 25MB'}
                        {mode === 'video' && '支持 mp4 / mov / mkv / webm 等，≤ 100MB（浏览器会提取音轨）'}
                        {mode === 'file' && '支持 .txt / .docx / .pdf，≤ 10MB'}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* 识别说明 */}
              <div className="text-xs text-text-tertiary bg-blue-50 rounded-lg p-3">
                <p className="font-medium text-info mb-1">
                  {mode === 'audio' || mode === 'video'
                    ? '🎙️ 处理流程'
                    : '🤖 解析方式'}
                </p>
                {mode === 'audio' || mode === 'video' ? (
                  <>
                    <p>1. 浏览器{mode === 'video' ? '提取视频音轨并' : ''}编码为 WAV</p>
                    <p>2. Groq Whisper 转录为文字（中文识别准确率 ~95%）</p>
                    <p>3. AI 把转录文字智能解析为问答对（{aiReady ? '已配置 AI' : '需配置 AI'}）</p>
                  </>
                ) : (
                  <>
                    <p>• AI 智能识别：不限制固定模板，自由格式的对话也能拆成问答对</p>
                    <p>• AI 未配置时回退到规则解析：识别 面试官:/我:/Q:/A:/问:/答: 等模板</p>
                    <p>• 解析后可手动增删改，再保存为面试记录</p>
                  </>
                )}
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
              {parseMethod === 'ai' && (
                <div className="px-4 py-3 rounded-lg bg-success/10 border border-success/20 flex items-start gap-2">
                  <IconSparkles width={16} height={16} className="text-success mt-0.5" />
                  <p className="text-sm text-text-secondary">
                    AI 智能解析完成，已识别 {pairs.length} 个问答对。你可以手动增删改后再保存
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
                    placeholder="问题（如没有具体问题，可留空，把话题作为回答）"
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
              <span className="text-xs text-text-tertiary flex items-center gap-2">
                {parsing && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                    {parseStageMsg || '正在解析，请稍候...'}
                  </>
                )}
                {!parsing && (
                  <>
                    {aiReady ? (
                      <span className="flex items-center gap-1 text-success">
                        <IconAI width={12} height={12} /> AI 已就绪
                      </span>
                    ) : (
                      <span className="text-warning">⚠ AI 未配置，使用规则解析</span>
                    )}
                  </>
                )}
              </span>
              <div className="flex items-center gap-3">
                <button className="btn-secondary" onClick={handleClose}>取消</button>
                <button className="btn-primary" onClick={parse} disabled={parsing}>
                  {parsing ? '解析中...' : aiReady ? 'AI 解析并预览' : '规则解析并预览'}
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
