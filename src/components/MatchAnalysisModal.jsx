import { useState, useEffect } from 'react'
import { getJob, getActiveResume, getAIConfig } from '../utils/storage.js'
import { analyzeMatch } from '../utils/ai-client.js'
import { useToast } from './Toast.jsx'
import Modal from './Modal.jsx'
import { IconSparkles, IconCheck, IconClose, IconStar } from './Icons.jsx'

export default function MatchAnalysisModal({ open, onClose, jobId }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const aiConfig = getAIConfig()
  const aiReady = !!(aiConfig.apiKey && aiConfig.model)
  const resume = getActiveResume()

  useEffect(() => {
    if (open && jobId) {
      setResult(null)
      setError('')
      handleAnalyze()
    }
  }, [open, jobId])

  const handleAnalyze = async () => {
    if (!aiReady) {
      setError('AI 未配置，请先在设置页填入 API Key')
      return
    }
    if (!resume) {
      setError('请先上传简历')
      return
    }
    if (!resume.parsedJson) {
      setError('简历尚未解析，请重新上传或等待解析完成')
      return
    }

    setLoading(true)
    setError('')
    try {
      const job = getJob(jobId)
      let parsed = resume.parsedJson
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed)
        } catch {
          parsed = { summary: resume.rawText?.slice(0, 500) }
        }
      }
      const r = await analyzeMatch(aiConfig, parsed, job)
      setResult(r)
    } catch (e) {
      setError('分析失败：' + e.message)
      toast.error('匹配分析失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const matchScore = result?.matchScore || 0
  const scoreColor =
    matchScore >= 75 ? 'text-success' : matchScore >= 50 ? 'text-warning' : 'text-danger'
  const scoreBg =
    matchScore >= 75 ? 'bg-success' : matchScore >= 50 ? 'bg-warning' : 'bg-danger'

  return (
    <Modal open={open} onClose={onClose} title="简历 × 岗位匹配分析" size="md">
      <div className="space-y-4">
        {/* 顶部状态 */}
        {loading && (
          <div className="p-4 rounded-lg bg-brand/5 border border-brand/20 text-sm text-brand flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            AI 正在分析简历与岗位的匹配度...
          </div>
        )}

        {error && !loading && (
          <div className="p-4 rounded-lg bg-danger/5 border border-danger/20 text-sm text-danger">
            {error}
            <button onClick={handleAnalyze} className="ml-3 text-xs underline">
              重试
            </button>
          </div>
        )}

        {result && !loading && (
          <>
            {/* 匹配度分数 */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-brand/5 to-transparent border border-brand/20 text-center">
              <p className="text-xs text-text-tertiary mb-1">整体匹配度</p>
              <div className={`text-4xl font-bold ${scoreColor}`}>{matchScore}<span className="text-xl">/100</span></div>
              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${scoreBg} transition-all duration-500`}
                  style={{ width: `${Math.min(matchScore, 100)}%` }}
                />
              </div>
            </div>

            {/* 匹配项 */}
            {Array.isArray(result.matchedPoints) && result.matchedPoints.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-success mb-2 flex items-center gap-1">
                  <IconCheck width={14} height={14} /> 匹配项
                </p>
                <div className="space-y-1.5">
                  {result.matchedPoints.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0 mt-1.5" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 差距项 */}
            {Array.isArray(result.gaps) && result.gaps.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-danger mb-2 flex items-center gap-1">
                  <IconClose width={14} height={14} /> 差距项
                </p>
                <div className="space-y-1.5">
                  {result.gaps.map((g, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0 mt-1.5" />
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 建议 */}
            {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-brand mb-2 flex items-center gap-1">
                  <IconSparkles width={14} height={14} /> 面试建议
                </p>
                <div className="space-y-1.5">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0 mt-1.5" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 高风险问题 */}
            {Array.isArray(result.highRiskQuestions) && result.highRiskQuestions.length > 0 && (
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                <p className="text-sm font-semibold text-warning mb-2 flex items-center gap-1">
                  <IconStar width={14} height={14} /> 高风险面试题预测
                </p>
                <div className="space-y-1.5">
                  {result.highRiskQuestions.map((q, i) => (
                    <div key={i} className="text-sm text-text-secondary pl-4 border-l-2 border-warning/40">
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleAnalyze} className="btn-secondary w-full">
              重新分析
            </button>
          </>
        )}

        {!loading && !error && !result && (
          <div className="text-center py-8 text-sm text-text-tertiary">
            点击下方按钮开始分析
            <button onClick={handleAnalyze} className="btn-primary block mx-auto mt-3">
              开始分析
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
