import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getReview, getInterview, getJob, deleteReview } from '../utils/storage.js'
import { downloadReviewMarkdown } from '../utils/markdownExport.js'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { StarRating } from '../components/StarRating.jsx'
import { REVIEW_DIMENSIONS, formatDate } from '../components/ui.jsx'
import {
  IconArrowLeft,
  IconEdit,
  IconDownload,
  IconTrash,
  IconCheck,
  IconStar,
  IconChevronRight,
  IconReview,
} from '../components/Icons.jsx'

export default function ReviewDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [review, setReview] = useState(null)
  const [interview, setInterview] = useState(null)
  const [job, setJob] = useState(null)

  const refresh = () => {
    const r = getReview(id)
    setReview(r)
    if (r) {
      const itv = getInterview(r.interviewId)
      setInterview(itv)
      if (itv) setJob(getJob(itv.jobId))
    }
  }
  useEffect(refresh, [id])

  if (!review) {
    return (
      <div className="px-8 py-6 max-w-3xl mx-auto">
        <div className="card p-12 text-center">
          <p className="text-text-tertiary">复盘报告不存在</p>
          <Link to="/reviews" className="btn-primary mt-4 inline-block">返回复盘列表</Link>
        </div>
      </div>
    )
  }

  const dimAvg =
    (review.dimensionScores?.structure || 0) +
    (review.dimensionScores?.relevance || 0) +
    (review.dimensionScores?.fluency || 0) +
    (review.dimensionScores?.highlights || 0) +
    (review.dimensionScores?.interaction || 0)
  const avg = (dimAvg / 5).toFixed(1)

  const handleDelete = async () => {
    const ok = await confirm({
      title: '删除复盘报告',
      message: '此操作不可撤销，确认删除这条复盘报告吗？',
      confirmText: '确认删除',
      danger: true,
    })
    if (ok) {
      deleteReview(id)
      toast.success('复盘报告已删除')
      navigate('/reviews')
    }
  }

  const dimColors = ['#4F6EF7', '#52C41A', '#FAAD14', '#FF4D4F', '#1890FF']

  return (
    <div className="px-8 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/reviews')}
          className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors"
        >
          <IconArrowLeft width={16} height={16} />
          返回列表
        </button>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => navigate(`/reviews/edit/${id}`)}>
            <IconEdit width={16} height={16} className="inline mr-1.5 -mt-0.5" />
            编辑
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              downloadReviewMarkdown(review, interview, job)
              toast.success('Markdown 已导出')
            }}
          >
            <IconDownload width={16} height={16} className="inline mr-1.5 -mt-0.5" />
            导出 Markdown
          </button>
          <button className="btn-secondary text-danger border-danger/20 hover:bg-red-50" onClick={handleDelete}>
            <IconTrash width={16} height={16} className="inline mr-1.5 -mt-0.5" />
            删除
          </button>
        </div>
      </div>

      {/* Overview card */}
      <div className="card p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success flex-shrink-0">
            <IconReview width={24} height={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary">
              {job?.company || '未知公司'} · {job?.title || '未知岗位'}
            </h2>
            <div className="mt-1.5 flex items-center gap-3 text-sm text-text-tertiary">
              <span>{interview?.round || '-'}</span>
              <span>·</span>
              <span>{formatDate(interview?.interviewTime, true)}</span>
              <span>·</span>
              <span>整体均分 {avg}/5</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-brand">{avg}</p>
            <p className="text-xs text-text-tertiary">综合评分</p>
          </div>
        </div>
      </div>

      {/* Dimension scores */}
      <div className="card p-6 mb-5">
        <h3 className="text-base font-semibold text-text-primary mb-4">整体评分</h3>
        <div className="space-y-3">
          {REVIEW_DIMENSIONS.map((d, i) => {
            const score = review.dimensionScores?.[d.key] || 0
            const pct = (score / 5) * 100
            return (
              <div key={d.key} className="flex items-center gap-3">
                <span className="text-sm text-text-secondary w-24 flex-shrink-0">{d.label}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: dimColors[i] }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary w-12 text-right">
                  {score}/5
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-question review */}
      {review.qaDetails?.length > 0 && (
        <div className="card p-6 mb-5">
          <h3 className="text-base font-semibold text-text-primary mb-4">
            逐题复盘 <span className="text-sm font-normal text-text-tertiary">({review.qaDetails.length})</span>
          </h3>
          <div className="space-y-4">
            {review.qaDetails.map((qa, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-gray-50 border border-border">
                <p className="text-sm font-medium text-text-primary">Q{idx + 1}：{qa.question}</p>
                {qa.answer && (
                  <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">{qa.answer}</p>
                )}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <StarRating value={qa.score} readOnly size={16} />
                  {qa.comment && (
                    <p className="text-sm text-text-tertiary flex-1 ml-4">{qa.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {review.highlights?.length > 0 && (
        <div className="card p-6 mb-5">
          <h3 className="text-base font-semibold text-text-primary mb-4">亮点总结</h3>
          <div className="space-y-2">
            {review.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center text-success flex-shrink-0 mt-0.5">
                  <IconCheck width={12} height={12} />
                </div>
                <p className="text-sm text-text-primary">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {review.improvements?.length > 0 && (
        <div className="card p-6 mb-5">
          <h3 className="text-base font-semibold text-text-primary mb-4">待改进项</h3>
          <div className="space-y-2">
            {review.improvements.map((imp, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-danger/10 flex items-center justify-center text-danger flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">×</span>
                </div>
                <p className="text-sm text-text-primary">{imp}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {review.actions?.length > 0 && (
        <div className="card p-6 mb-5">
          <h3 className="text-base font-semibold text-text-primary mb-4">后续行动</h3>
          <div className="space-y-2">
            {review.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                    a.done ? 'bg-success border-success text-white' : 'border-border'
                  }`}
                >
                  {a.done && <IconCheck width={12} height={12} />}
                </div>
                <p className={`text-sm ${a.done ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                  {a.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next steps */}
      {review.nextStepAdvice && (
        <div className="card p-6 mb-5">
          <h3 className="text-base font-semibold text-text-primary mb-3">下次准备方向</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{review.nextStepAdvice}</p>
        </div>
      )}

      {/* Link back to interview */}
      <Link
        to={`/interviews/${interview?.id}`}
        className="card p-4 flex items-center hover:shadow-card-hover transition-shadow"
      >
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">查看关联的面试记录</p>
          <p className="text-xs text-text-tertiary mt-0.5">{interview?.round} · {formatDate(interview?.interviewTime, true)}</p>
        </div>
        <IconChevronRight width={16} height={16} className="text-text-tertiary" />
      </Link>

      {dialog}
    </div>
  )
}
