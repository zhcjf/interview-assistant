import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getJobs,
  getJob,
  getResumes,
  getActiveResume,
  getChatHistory,
  saveChatMessage,
  clearChatHistory,
  toggleFavoriteChat,
  getAIConfig,
} from '../utils/storage.js'
import { chatInterviewCoach, predictQuestions, getInterviewContextDebug } from '../utils/ai-client.js'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { IconPrep, IconSend, IconSparkles, IconStar, IconTrash, IconCheck, IconClose } from '../components/Icons.jsx'
import QuestionBank from '../components/QuestionBank.jsx'

const QUICK_PROMPTS = [
  { label: '自我介绍', text: '请帮我准备一段针对当前岗位的自我介绍框架' },
  { label: '优缺点', text: '如何回答"你最大的缺点是什么"？' },
  { label: '职业规划', text: '3-5年职业规划这道题怎么答最有说服力？' },
  { label: '离职原因', text: '如何回答离职原因，既真实又不踩雷？' },
  { label: '薪资期望', text: '如何回答薪资期望？我目前的预期是____' },
  { label: '反问环节', text: '面试最后的反问环节，应该问什么问题？' },
  { label: '压力测试', text: '面试官在给我施压，我应该如何应对？' },
  { label: '评价我的回答', text: '我刚才这样回答好不好：[粘贴你的回答]' },
]

const PRIORITY_STYLE = {
  high: { bg: 'bg-danger/10', text: 'text-danger', label: '高', icon: '🔥' },
  medium: { bg: 'bg-warning/10', text: 'text-warning', label: '中', icon: '⚡' },
  low: { bg: 'bg-success/10', text: 'text-success', label: '低', icon: '💡' },
}

export default function Preparation() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const navigate = useNavigate()

  const aiConfig = getAIConfig()
  const aiReady = !!(aiConfig.apiKey && aiConfig.model)
  const jobs = getJobs()
  const resumes = getResumes()
  const activeResume = getActiveResume()

  const [activeJobId, setActiveJobId] = useState(jobs[0]?.id || '')
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'bank'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [predictions, setPredictions] = useState([])
  const [predicting, setPredicting] = useState(false)
  const [expandedPrediction, setExpandedPrediction] = useState(null)
  const [favorites, setFavorites] = useState(new Set())
  const [contextDebug, setContextDebug] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // 加载历史对话
  useEffect(() => {
    if (activeJobId) {
      const history = getChatHistory(activeJobId)
      setMessages(history)
      setFavorites(new Set(history.filter((m) => m.isFavorite).map((m) => m.id)))
    } else {
      setMessages([])
      setFavorites(new Set())
    }
  }, [activeJobId])

  // 自动滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleJobChange = (e) => {
    setActiveJobId(e.target.value)
  }

  const handleQuickPrompt = (text) => {
    if (!aiReady) {
      toast.error('请先在设置页配置 AI')
      return
    }
    if (!activeJobId) {
      toast.error('请先选择一个岗位')
      return
    }
    setInput(text)
    inputRef.current?.focus()
  }

  const handleSend = async () => {
    if (streaming) return
    const text = input.trim()
    if (!text) return
    if (!aiReady) {
      toast.error('AI 未配置，请先在设置页填入 API Key')
      return
    }
    if (!activeJobId) {
      toast.error('请先选择岗位')
      return
    }

    const job = getJob(activeJobId)
    const contextInfo = getInterviewContextDebug(job, activeResume)
    setContextDebug(contextInfo)
    const userMsg = saveChatMessage({ jobId: activeJobId, role: 'user', content: text })
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamingContent('')

    try {
      const history = getChatHistory(activeJobId).map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const generator = chatInterviewCoach(aiConfig, history, job, activeResume, { maxTokens: 4000 })

      let fullContent = ''
      for await (const chunk of generator) {
        fullContent += chunk
        setStreamingContent(fullContent)
      }

      const aiMsg = saveChatMessage({ jobId: activeJobId, role: 'assistant', content: fullContent })
      setMessages((prev) => [...prev, aiMsg])
    } catch (e) {
      toast.error('AI 调用失败：' + e.message)
      const errorMsg = saveChatMessage({
        jobId: activeJobId,
        role: 'assistant',
        content: `⚠️ AI 调用失败：${e.message}\n\n请检查 API Key 是否有效、网络是否畅通，或前往设置页切换提供商。`,
      })
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setStreaming(false)
      setStreamingContent('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearHistory = async () => {
    if (!activeJobId) return
    const ok = await confirm({
      title: '清空当前岗位的对话历史',
      message: '确认清空吗？该岗位的所有对话记录将被删除。',
      confirmText: '确认清空',
      danger: true,
    })
    if (ok) {
      clearChatHistory(activeJobId)
      setMessages([])
      setFavorites(new Set())
      toast.success('对话已清空')
    }
  }

  const handleToggleFavorite = (msgId) => {
    const updated = toggleFavoriteChat(msgId)
    if (updated) {
      setFavorites((prev) => {
        const next = new Set(prev)
        if (updated.isFavorite) next.add(msgId)
        else next.delete(msgId)
        return next
      })
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, isFavorite: updated.isFavorite } : m)))
    }
  }

  const handlePredict = async () => {
    if (!aiReady) {
      toast.error('请先配置 AI')
      return
    }
    if (!activeJobId) {
      toast.error('请先选择岗位')
      return
    }
    if (!activeResume) {
      toast.error('请先上传简历')
      return
    }

    setPredicting(true)
    try {
      const job = getJob(activeJobId)
      let parsed = activeResume.parsedJson
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed)
        } catch {
          parsed = { summary: activeResume.rawText?.slice(0, 500) }
        }
      }
      const result = await predictQuestions(aiConfig, parsed, job, '初面')
      if (result.questions && Array.isArray(result.questions)) {
        setPredictions(result.questions)
        toast.success(`已生成 ${result.questions.length} 个预测问题`)
      } else {
        toast.error('AI 返回格式异常')
      }
    } catch (e) {
      toast.error('预测失败：' + e.message)
    } finally {
      setPredicting(false)
    }
  }

  const handlePredictClick = (q) => {
    setInput(q.text)
    inputRef.current?.focus()
  }

  const renderMessage = (msg) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="flex justify-end mb-4">
          <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-brand text-white text-sm leading-relaxed whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>
      )
    }
    return (
      <div key={msg.id} className="flex justify-start mb-4">
        <div className="max-w-[80%]">
          <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-border text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
            {msg.content}
          </div>
          <div className="mt-1 flex items-center gap-2 px-2">
            <button
              onClick={() => handleToggleFavorite(msg.id)}
              className={`text-xs flex items-center gap-1 hover:opacity-80 ${
                favorites.has(msg.id) ? 'text-warning' : 'text-text-tertiary'
              }`}
            >
              <IconStar width={14} height={14} fill={favorites.has(msg.id) ? 'currentColor' : 'none'} />
              {favorites.has(msg.id) ? '已收藏' : '收藏'}
            </button>
            <span className="text-xs text-text-tertiary">
              {new Date(msg.createdAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderStreamingMessage = () => {
    if (!streaming) return null
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-brand/30 text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
          {streamingContent ? (
            <>
              {streamingContent}
              <span className="inline-block w-1 h-4 ml-1 bg-brand animate-pulse align-middle" />
            </>
          ) : (
            <span className="text-text-tertiary italic">AI 正在思考...</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border bg-white p-6 overflow-y-auto">
        <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <IconSparkles width={18} height={18} className="text-brand" />
          个性化预测
        </h3>

        {!aiReady ? (
          <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 text-center">
            <p className="text-sm text-text-secondary mb-3">AI 未配置</p>
            <button onClick={() => navigate('/settings')} className="btn-primary text-xs px-3 py-1.5">
              去设置 →
            </button>
          </div>
        ) : !activeResume ? (
          <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-border text-center">
            <p className="text-xs text-text-tertiary">上传简历后可获得个性化预测</p>
          </div>
        ) : !activeJobId ? (
          <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-border text-center">
            <p className="text-xs text-text-tertiary">请先选择岗位</p>
          </div>
        ) : (
          <>
            <button
              onClick={handlePredict}
              disabled={predicting}
              className="btn-secondary w-full mb-4 disabled:opacity-50"
            >
              {predicting ? '生成中...' : predictions.length ? '重新生成预测' : '生成预测问题'}
            </button>

            {predictions.length > 0 && (
              <div className="space-y-2">
                {predictions.map((q, i) => {
                  const style = PRIORITY_STYLE[q.priority] || PRIORITY_STYLE.medium
                  const isExpanded = expandedPrediction === i
                  return (
                    <div key={i} className="p-3 rounded-lg border border-border hover:border-brand/40 transition-colors">
                      <button
                        onClick={() => handlePredictClick(q)}
                        className="block w-full text-left text-sm font-medium text-text-primary hover:text-brand"
                      >
                        {q.text}
                      </button>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded-md ${style.bg} ${style.text}`}>
                          {style.icon} {style.label}
                        </span>
                        <button
                          onClick={() => setExpandedPrediction(isExpanded ? null : i)}
                          className="text-xs text-text-tertiary hover:text-text-primary"
                        >
                          {isExpanded ? '收起' : '展开'}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-border text-xs text-text-tertiary space-y-1.5">
                          <p>
                            <span className="text-text-secondary font-medium">原因：</span>
                            {q.reason}
                          </p>
                          <p>
                            <span className="text-text-secondary font-medium">建议：</span>
                            {q.prepAdvice}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-text-tertiary mb-3">使用提示</p>
          <ul className="space-y-1.5 text-xs text-text-tertiary">
            <li>· 切换岗位会加载该岗位的对话历史</li>
            <li>· 8 个快速提问可直接点击使用</li>
            <li>· AI 回答会自动注入岗位+简历上下文</li>
            <li>· 收藏的回答可在历史中找到</li>
          </ul>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col bg-content">
        {/* Job selector + Tabs */}
        <div className="px-8 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-tertiary">当前岗位：</span>
            {jobs.length === 0 ? (
              <span className="text-sm text-warning">请先在岗位管理添加岗位</span>
            ) : (
              <select
                value={activeJobId}
                onChange={handleJobChange}
                className="input text-sm py-1.5 pr-8 w-64"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.company} · {j.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-1 p-1 bg-white rounded-lg border border-border shadow-sm">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-5 py-2 rounded-md text-sm font-medium ${
                activeTab === 'chat' ? 'bg-brand text-white' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              智能问答
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`px-5 py-2 rounded-md text-sm font-medium ${
                activeTab === 'bank' ? 'bg-brand text-white' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              常规问题库
            </button>
          </div>
        </div>

        {/* Tab 内容 */}
        {activeTab === 'bank' ? (
          <div className="flex-1 -mx-8 -mb-6 mt-4">
            <QuestionBank
              activeJobType={getJob(activeJobId)?.title || '通用'}
              onPractice={(q) => {
                setActiveTab('chat')
                setInput(q)
                inputRef.current?.focus()
              }}
            />
          </div>
        ) : (
          <>
        {/* Dialog area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {messages.length === 0 && !streaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white mb-5 shadow-lg">
                <IconPrep width={40} height={40} />
              </div>
              {aiReady ? (
                <>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">AI 智能问答已就绪</h3>
                  <p className="text-sm text-text-tertiary max-w-md">
                    点击下方快速提问，或在输入框输入你的问题，开始一场真实的面试模拟。
                    {activeResume ? 'AI 会结合你的简历和岗位信息给出个性化回答。' : '上传简历可获得更个性化的回答。'}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">AI 未配置</h3>
                  <p className="text-sm text-text-tertiary max-w-md mb-4">
                    请先在设置页填入 API Key 启用智能问答
                  </p>
                  <button onClick={() => navigate('/settings')} className="btn-primary">
                    去设置 →
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map(renderMessage)}
              {renderStreamingMessage()}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-8 pb-6">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-border shadow-sm p-3">
            {/* Quick prompts */}
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleQuickPrompt(p.text)}
                  disabled={!aiReady || !activeJobId}
                  className="px-3 py-1.5 rounded-full bg-brand/5 border border-brand/20 text-xs text-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input row */}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!aiReady || !activeJobId}
                placeholder={
                  !aiReady
                    ? '请先在设置页配置 AI...'
                    : !activeJobId
                    ? '请先选择岗位...'
                    : '输入你的问题，Enter 发送，Shift+Enter 换行'
                }
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 border border-border text-sm resize-none focus:outline-none focus:border-brand focus:bg-white min-h-[42px] max-h-32 disabled:cursor-not-allowed"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                }}
              />
              <button
                onClick={handleSend}
                disabled={!aiReady || !activeJobId || streaming || !input.trim()}
                className="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <IconSend width={16} height={16} />
                {streaming ? '回复中' : '发送'}
              </button>
            </div>

            {/* Bottom row: clear history */}
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-xs text-text-tertiary">
                {messages.length > 0 ? `共 ${messages.length} 条对话` : '回车发送 / Shift+回车换行'}
              </span>
              {messages.length > 0 && activeJobId && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-text-tertiary hover:text-danger flex items-center gap-1"
                >
                  <IconTrash width={12} height={12} />
                  清空当前岗位对话
                </button>
              )}
            </div>

            {contextDebug && (
              <div className="mt-2 px-1 text-[11px] text-text-tertiary">
                <span>
                  上下文注入：岗位{contextDebug.jobIncluded ? '✓' : '×'}
                  {contextDebug.jobHasJD ? '（含JD）' : ''}，简历{contextDebug.resumeIncluded ? '✓' : '×'}
                  {contextDebug.resumeIncluded
                    ? `（来源:${contextDebug.resumeSource}，字段:${
                        contextDebug.resumeFieldsIncluded.length
                          ? contextDebug.resumeFieldsIncluded.join(',')
                          : '无'
                      }，结构化:${contextDebug.parsedJsonCharsIncluded}字，原文:${contextDebug.rawTextCharsIncluded}字）`
                    : ''}
                </span>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {dialog}
    </div>
  )
}
