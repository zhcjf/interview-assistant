import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getInterview, getJob, getReview, saveReview, getAIConfig } from '../utils/storage.js'
import { generateReview } from '../utils/ai-client.js'
import { useToast } from '../components/Toast.jsx'
import { StarRating } from '../components/StarRating.jsx'
import { REVIEW_DIMENSIONS } from '../components/ui.jsx'
import { IconArrowLeft, IconPlus, IconTrash, IconCheck, IconStar, IconSparkles } from '../components/Icons.jsx'

export default function ReviewForm() {
  const { interviewId, id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const autoAI = searchParams.get('ai') === '1'

  const [interview, setInterview] = useState(null)
  const [job, setJob] = useState(null)
  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState({
    qaDetails: [],
    dimensionScores: { structure: 3, relevance: 3, fluency: 3, highlights: 3, interaction: 3 },
    highlights: [''],
    improvements: [''],
    actions: [{ text: '', done: false }],
    nextStepAdvice: '',
    aiGenerated: false,
  })
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')

  useEffect(() => {
    if (id) {
      // Edit mode
      const r = getReview(id)
      setExisting(r)
      if (r) {
        const itv = getInterview(r.interviewId)
        setInterview(itv)
        if (itv) setJob(getJob(itv.jobId))
        setForm({
          qaDetails: r.qaDetails || [],
          dimensionScores: r.dimensionScores || { structure: 3, relevance: 3, fluency: 3, highlights: 3, interaction: 3 },
          highlights: r.highlights?.length ? r.highlights : [''],
          improvements: r.improvements?.length ? r.improvements : [''],
          actions: r.actions?.length ? r.actions : [{ text: '', done: false }],
          nextStepAdvice: r.nextStepAdvice || '',
        })
      }
    } else if (interviewId) {
      // New mode
      const itv = getInterview(interviewId)
      setInterview(itv)
      if (itv) setJob(getJob(itv.jobId))
      if (itv) {
        setForm((f) => ({
          ...f,
          qaDetails: itv.questions.map((q, i) => ({
            question: q,
            answer: itv.answers[i] || '',
            score: 0,
            comment: '',
          })),
        }))
      }
    }
  }, [id, interviewId])

  // 自动触发 AI 生成
  useEffect(() => {
    if (autoAI && interviewId && interview && !generating && !form.aiGenerated) {
      handleAIGenerate()
    }
  }, [autoAI, interviewId, interview])

  if (!interview) {
    return (
      <div className="px-8 py-6 max-w-3xl mx-auto">
        <div className="card p-12 text-center">
          <p className="text-text-tertiary">面试记录不存在</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/interviews')}>
            返回面试记录
          </button>
        </div>
      </div>
    )
  }

  const updateQa = (idx, field, val) => {
    setForm((f) => {
      const arr = [...f.qaDetails]
      arr[idx] = { ...arr[idx], [field]: val }
      return { ...f, qaDetails: arr }
    })
  }

  const updateDim = (key, val) => {
    setForm((f) => ({
      ...f,
      dimensionScores: { ...f.dimensionScores, [key]: val },
    }))
  }

  const updateList = (field, idx, val) => {
    setForm((f) => {
      const arr = [...f[field]]
      arr[idx] = val
      return { ...f, [field]: arr }
    })
  }

  const addListItem = (field, factory) => {
    setForm((f) => ({ ...f, [field]: [...f[field], factory()] }))
  }

  const removeListItem = (field, idx) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].filter((_, i) => i !== idx),
    }))
  }

  const toggleAction = (idx) => {
    setForm((f) => {
      const arr = [...f.actions]
      arr[idx] = { ...arr[idx], done: !arr[idx].done }
      return { ...f, actions: arr }
    })
  }

  const handleSave = () => {
    setSaving(true)
    const cleanForm = {
      ...form,
      id: existing?.id,
      interviewId: existing?.interviewId || interview.id,
      qaDetails: form.qaDetails.filter((q) => q.question || q.answer || q.comment),
      highlights: form.highlights.filter((s) => s.trim()),
      improvements: form.improvements.filter((s) => s.trim()),
      actions: form.actions.filter((a) => a.text.trim()),
    }
    const saved = saveReview(cleanForm)
    setSaving(false)
    toast.success('复盘报告已保存')
    navigate(`/reviews/${saved.id}`)
  }

  // ===== AI 一键生成初稿 =====
  const handleAIGenerate = async () => {
    const aiConfig = getAIConfig()
    if (!aiConfig.apiKey) {
      toast.error('AI 未配置，请先在设置页填入 API Key')
      return
    }
    if (!interview || !interview.questions || interview.questions.length === 0) {
      toast.error('该面试记录暂无问答内容，无法生成复盘')
      return
    }

    setGenerating(true)
    setGenProgress('AI 正在分析你的面试记录，通常需要 10-30 秒...')
    try {
      const result = await generateReview(aiConfig, interview, job)
      // 合并 AI 结果到表单
      setForm((f) => {
        const qaDetails = (f.qaDetails || []).map((qa, i) => ({
          ...qa,
          score: result.qaDetails?.[i]?.score ?? qa.score ?? 3,
          comment: result.qaDetails?.[i]?.comment || qa.comment || '',
        }))
        return {
          ...f,
          qaDetails,
          dimensionScores: result.dimensionScores || f.dimensionScores,
          highlights: (result.highlights && result.highlights.length ? result.highlights : f.highlights),
          improvements: (result.improvements && result.improvements.length ? result.improvements : f.improvements),
          actions: (result.actions && result.actions.length
            ? result.actions.map((a) => (typeof a === 'string' ? { text: a, done: false } : { ...a, done: a.done || false }))
            : f.actions),
          nextStepAdvice: result.nextStepAdvice || f.nextStepAdvice,
          aiGenerated: true,
        }
      })
      toast.success('AI 初稿已生成，请逐项核对后保存')
    } catch (e) {
      toast.error('AI 生成失败：' + e.message)
    } finally {
      setGenerating(false)
      setGenProgress('')
    }
  }

  return (
    <div className="px-8 py-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors"
        >
          <IconArrowLeft width={16} height={16} />
          返回
        </button>
        <div className="flex items-center gap-3">
          <button className="btn-secondary" onClick={() => navigate(-1)}>取消</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存复盘报告'}
          </button>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-text-primary mb-2">
        {existing ? '编辑复盘' : '新建复盘'}
      </h2>
      {form.aiGenerated && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-medium">
          <IconSparkles width={12} height={12} />
          AI 生成 · 待人工确认
        </div>
      )}

      {/* AI 一键生成区 */}
      <section className="card p-5 mb-5 border-brand/30 bg-gradient-to-br from-brand/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
            <IconSparkles width={20} height={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary">AI 一键生成初稿</h3>
            <p className="text-sm text-text-tertiary mt-1">
              基于本次面试的问答记录，AI 自动生成各维度评分、亮点、待改进和行动建议。生成后可逐项编辑。
            </p>
            {genProgress && (
              <p className="text-xs text-brand mt-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                {genProgress}
              </p>
            )}
          </div>
          <button
            onClick={handleAIGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
          >
            <IconSparkles width={16} height={16} />
            {generating ? '生成中...' : form.aiGenerated ? '重新生成' : '生成初稿'}
          </button>
        </div>
      </section>

      {/* Section 1: 面试概览 */}
      <section className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-medium flex items-center justify-center">1</span>
          <h3 className="text-base font-semibold text-text-primary">面试概览</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-text-tertiary">公司：</span>{job?.company || '-'}</div>
          <div><span className="text-text-tertiary">岗位：</span>{job?.title || '-'}</div>
          <div><span className="text-text-tertiary">轮次：</span>{interview.round}</div>
          <div><span className="text-text-tertiary">时间：</span>{new Date(interview.interviewTime).toLocaleString()}</div>
        </div>
      </section>

      {/* Section 2: 逐题复盘 */}
      <section className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-medium flex items-center justify-center">2</span>
          <h3 className="text-base font-semibold text-text-primary">逐题复盘</h3>
        </div>
        {form.qaDetails.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4">暂无问答记录可复盘</p>
        ) : (
          <div className="space-y-4">
            {form.qaDetails.map((qa, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-gray-50 border border-border">
                <p className="text-sm font-medium text-text-primary">Q{idx + 1}：{qa.question}</p>
                {qa.answer && (
                  <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">{qa.answer}</p>
                )}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-tertiary">自评分</span>
                    <StarRating value={qa.score} onChange={(v) => updateQa(idx, 'score', v)} size={18} />
                  </div>
                  <textarea
                    className="textarea min-h-[60px]"
                    placeholder="评语：这一题答得怎么样？"
                    value={qa.comment}
                    onChange={(e) => updateQa(idx, 'comment', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: 整体评分 */}
      <section className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-medium flex items-center justify-center">3</span>
          <h3 className="text-base font-semibold text-text-primary">整体评分（5 维度）</h3>
        </div>
        <div className="space-y-4">
          {REVIEW_DIMENSIONS.map((d) => (
            <div key={d.key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-text-primary">{d.label}</label>
                <span className="text-sm font-medium text-brand">{form.dimensionScores[d.key]}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={form.dimensionScores[d.key]}
                onChange={(e) => updateDim(d.key, parseInt(e.target.value))}
                className="w-full accent-brand"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: 亮点总结 */}
      <section className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-success text-white text-xs font-medium flex items-center justify-center">4</span>
          <h3 className="text-base font-semibold text-text-primary">亮点总结</h3>
        </div>
        <div className="space-y-2">
          {form.highlights.map((h, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
              <input
                className="input flex-1"
                placeholder="如：我在××问题上给出了很好的 STAR 结构"
                value={h}
                onChange={(e) => updateList('highlights', idx, e.target.value)}
              />
              {form.highlights.length > 1 && (
                <button
                  onClick={() => removeListItem('highlights', idx)}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-red-50 hover:text-danger transition-colors"
                >
                  <IconTrash width={16} height={16} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addListItem('highlights', () => '')}
            className="text-sm text-success hover:text-green-600 flex items-center gap-1 mt-2"
          >
            <IconPlus width={14} height={14} /> 添加亮点
          </button>
        </div>
      </section>

      {/* Section 5: 待改进项 */}
      <section className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-danger text-white text-xs font-medium flex items-center justify-center">5</span>
          <h3 className="text-base font-semibold text-text-primary">待改进项</h3>
        </div>
        <div className="space-y-2">
          {form.improvements.map((imp, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" />
              <input
                className="input flex-1"
                placeholder="如：对××问题的回答太泛，缺少具体数据"
                value={imp}
                onChange={(e) => updateList('improvements', idx, e.target.value)}
              />
              {form.improvements.length > 1 && (
                <button
                  onClick={() => removeListItem('improvements', idx)}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-red-50 hover:text-danger transition-colors"
                >
                  <IconTrash width={16} height={16} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addListItem('improvements', () => '')}
            className="text-sm text-danger hover:text-red-600 flex items-center gap-1 mt-2"
          >
            <IconPlus width={14} height={14} /> 添加待改进项
          </button>
        </div>
      </section>

      {/* Section 6: 后续行动 */}
      <section className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-warning text-white text-xs font-medium flex items-center justify-center">6</span>
          <h3 className="text-base font-semibold text-text-primary">后续行动</h3>
        </div>
        <div className="space-y-2">
          {form.actions.map((a, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                onClick={() => toggleAction(idx)}
                className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  a.done ? 'bg-success border-success text-white' : 'border-border hover:border-success'
                }`}
              >
                {a.done && <IconCheck width={12} height={12} />}
              </button>
              <input
                className={`input flex-1 ${a.done ? 'line-through text-text-tertiary' : ''}`}
                placeholder="如：研究字节产品增长策略"
                value={a.text}
                onChange={(e) => updateList('actions', idx, { ...a, text: e.target.value })}
              />
              {form.actions.length > 1 && (
                <button
                  onClick={() => removeListItem('actions', idx)}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-red-50 hover:text-danger transition-colors"
                >
                  <IconTrash width={16} height={16} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addListItem('actions', () => ({ text: '', done: false }))}
            className="text-sm text-warning hover:text-yellow-600 flex items-center gap-1 mt-2"
          >
            <IconPlus width={14} height={14} /> 添加行动项
          </button>
        </div>
      </section>

      {/* Section 7: 下次准备方向 */}
      <section className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-medium flex items-center justify-center">7</span>
          <h3 className="text-base font-semibold text-text-primary">下次准备方向</h3>
        </div>
        <textarea
          className="textarea min-h-[100px]"
          placeholder="如：重点补强对业务理解的深度，多研究用户增长案例"
          value={form.nextStepAdvice}
          onChange={(e) => setForm({ ...form, nextStepAdvice: e.target.value })}
        />
      </section>

      {/* Bottom save bar */}
      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-border px-8 py-3 flex items-center justify-end gap-3 z-10">
        <button className="btn-secondary" onClick={() => navigate(-1)}>取消</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存复盘报告'}
        </button>
      </div>
    </div>
  )
}
