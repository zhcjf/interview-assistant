import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getResumes, saveResume, deleteResume, getActiveResume, getAIConfig } from '../utils/storage.js'
import { parseResume } from '../utils/ai-client.js'
import { readFileToText, validateFile } from '../utils/fileParser.js'
import { useToast } from './Toast.jsx'
import { useConfirm } from './ConfirmDialog.jsx'
import { IconUpload, IconFileText, IconTrash, IconCheck, IconClose, IconSparkles, IconStar } from './Icons.jsx'

export default function ResumeUploader() {
  const navigate = useNavigate()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const fileInputRef = useRef(null)

  const [resumes, setResumes] = useState(getResumes())
  const [parsing, setParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState('')
  const [activeId, setActiveId] = useState(getActiveResume()?.id || null)

  const aiConfig = getAIConfig()
  const aiReady = !!(aiConfig.apiKey && aiConfig.model)

  const refresh = () => {
    setResumes(getResumes())
    setActiveId(getActiveResume()?.id || null)
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    // 校验文件
    const valid = validateFile(file)
    if (!valid.ok) {
      toast.error(valid.msg)
      return
    }

    if (!aiReady) {
      // 仅存储文本，不解析
      setParsing(true)
      try {
        const text = await readFileToText(file)
        saveResume({
          fileName: file.name,
          rawText: text,
          parsedJson: null,
          isActive: true,
        })
        toast.success('简历已上传，但 AI 未配置，未自动解析')
        refresh()
      } catch (err) {
        toast.error('文件读取失败：' + err.message)
      } finally {
        setParsing(false)
      }
      return
    }

    setParsing(true)
    setParseProgress('正在提取简历文本...')
    try {
      const text = await readFileToText(file)
      setParseProgress('AI 正在解析简历结构化信息...')
      const parsed = await parseResume(aiConfig, text.slice(0, 12000)) // 控制 token
      saveResume({
        fileName: file.name,
        rawText: text,
        parsedJson: parsed,
        isActive: true,
      })
      toast.success('简历上传并解析成功')
      refresh()
    } catch (err) {
      toast.error('简历解析失败：' + err.message)
      // 即使解析失败，也保存原始文本
      try {
        const text = await readFileToText(file)
        saveResume({
          fileName: file.name,
          rawText: text,
          parsedJson: null,
          isActive: true,
        })
        refresh()
      } catch {}
    } finally {
      setParsing(false)
      setParseProgress('')
    }
  }

  const handleSetActive = (id) => {
    const all = getResumes()
    all.forEach((r) => (r.isActive = r.id === id))
    localStorage.setItem('ia_resumes', JSON.stringify(all))
    refresh()
    toast.success('已设为当前简历')
  }

  const handleDelete = async (r) => {
    const ok = await confirm({
      title: '删除简历',
      message: `确认删除「${r.fileName}」吗？`,
      confirmText: '确认删除',
      danger: true,
    })
    if (ok) {
      deleteResume(r.id)
      refresh()
      toast.success('已删除')
    }
  }

  const renderParsedCard = (r) => {
    let parsed = r.parsedJson
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        return <p className="text-xs text-danger">解析数据格式异常</p>
      }
    }
    if (!parsed) return null

    return (
      <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
        {parsed.name && (
          <p>
            <span className="text-text-tertiary">姓名：</span>
            <span className="text-text-primary font-medium">{parsed.name}</span>
          </p>
        )}
        {parsed.summary && (
          <p>
            <span className="text-text-tertiary">摘要：</span>
            <span className="text-text-secondary">{parsed.summary}</span>
          </p>
        )}
        {Array.isArray(parsed.skills) && parsed.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {parsed.skills.slice(0, 8).map((s, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-brand/10 text-brand">
                {s}
              </span>
            ))}
          </div>
        )}
        {Array.isArray(parsed.experience) && parsed.experience.length > 0 && (
          <div>
            <p className="text-text-tertiary mb-1">工作经历：</p>
            {parsed.experience.slice(0, 3).map((e, i) => (
              <p key={i} className="text-text-secondary">
                · {e.company} · {e.title}（{e.duration}）
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
          <IconFileText width={20} height={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-text-primary">我的简历</h3>
          <p className="text-sm text-text-tertiary mt-0.5">
            上传 PDF/Word 简历，AI 自动解析为结构化数据，用于智能问答和岗位匹配分析
          </p>
        </div>
        <label className="btn-primary cursor-pointer flex items-center gap-1.5">
          <IconUpload width={16} height={16} />
          上传简历
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFile}
            disabled={parsing}
          />
        </label>
      </div>

      {parsing && parseProgress && (
        <div className="mb-3 p-3 rounded-lg bg-brand/5 border border-brand/20 text-xs text-brand flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          {parseProgress}
        </div>
      )}

      {!aiReady && resumes.length === 0 && (
        <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs text-text-secondary">
          ⚠️ AI 未配置，上传后仅保存文本不会自动解析。
          <button onClick={() => navigate('/settings')} className="ml-2 text-brand hover:underline">
            去配置 →
          </button>
        </div>
      )}

      {resumes.length === 0 && !parsing ? (
        <div className="p-6 rounded-lg bg-gray-50 border border-dashed border-border text-center">
          <IconFileText width={32} height={32} className="mx-auto text-text-tertiary mb-2" />
          <p className="text-sm text-text-tertiary">尚未上传简历</p>
          <p className="text-xs text-text-tertiary mt-1">支持 PDF、Word、TXT 格式</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((r) => (
              <div
                key={r.id}
                className={`p-4 rounded-lg border transition-colors ${
                  r.isActive ? 'border-brand bg-brand/5' : 'border-border bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <IconFileText width={16} height={16} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{r.fileName}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        上传于 {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                        {r.parsedJson ? ' · 已解析' : ' · 未解析'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.isActive ? (
                      <span className="text-xs text-brand flex items-center gap-1 px-2 py-1">
                        <IconCheck width={12} height={12} /> 当前
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetActive(r.id)}
                        className="text-xs text-text-tertiary hover:text-brand px-2 py-1"
                      >
                        设为当前
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(r)}
                      className="w-7 h-7 flex items-center justify-center rounded text-text-tertiary hover:bg-red-50 hover:text-danger"
                      title="删除"
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                </div>

                {r.parsedJson && renderParsedCard(r)}
              </div>
            ))}
        </div>
      )}

      {dialog}
    </div>
  )
}
