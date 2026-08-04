import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getReviews, getInterview, getJob } from '../utils/storage.js'
import EmptyState from '../components/EmptyState.jsx'
import { formatDate } from '../components/ui.jsx'
import { IconPlus, IconReview, IconChevronRight } from '../components/Icons.jsx'

export default function ReviewList() {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [interviews, setInterviews] = useState({})
  const [jobs, setJobs] = useState({})

  const refresh = () => {
    const rs = getReviews().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setReviews(rs)
    const itvMap = {}
    const jobMap = {}
    rs.forEach((r) => {
      if (!itvMap[r.interviewId]) {
        const itv = getInterview(r.interviewId)
        itvMap[r.interviewId] = itv
        if (itv && !jobMap[itv.jobId]) {
          jobMap[itv.jobId] = getJob(itv.jobId)
        }
      }
    })
    setInterviews(itvMap)
    setJobs(jobMap)
  }
  useEffect(refresh, [])

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">面试复盘</h2>
          <p className="mt-1 text-sm text-text-tertiary">共 {reviews.length} 条复盘记录</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="card">
          <EmptyState
            type="reviews"
            title="还没有复盘记录"
            description="从面试记录开始复盘吧，找到可以改进的地方"
            actions={[{ label: '去面试记录', icon: IconReview, onClick: () => navigate('/interviews'), primary: true }]}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const itv = interviews[r.interviewId]
            const job = itv ? jobs[itv.jobId] : null
            const dimAvg = itv
              ? (
                  (r.dimensionScores?.structure || 0) +
                  (r.dimensionScores?.relevance || 0) +
                  (r.dimensionScores?.fluency || 0) +
                  (r.dimensionScores?.highlights || 0) +
                  (r.dimensionScores?.interaction || 0)
                ) / 5
              : 0
            return (
              <Link
                key={r.id}
                to={`/reviews/${r.id}`}
                className="card p-5 flex items-center group"
              >
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success flex-shrink-0 mr-4">
                  <IconReview width={20} height={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">
                    {job?.company || '未知公司'} · {job?.title || '未知岗位'}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-text-tertiary">
                    <span>{itv?.round || '-'}</span>
                    <span>·</span>
                    <span>{formatDate(r.createdAt)}</span>
                    <span>·</span>
                    <span>整体评分 {dimAvg.toFixed(1)}/5</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {r.highlights?.length > 0 && (
                    <span className="tag" style={{ color: '#52C41A', background: '#F6FFED' }}>
                      {r.highlights.length} 亮点
                    </span>
                  )}
                  {r.improvements?.length > 0 && (
                    <span className="tag" style={{ color: '#FF4D4F', background: '#FFF1F0' }}>
                      {r.improvements.length} 待改进
                    </span>
                  )}
                  <IconChevronRight width={16} height={16} className="text-text-tertiary" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
