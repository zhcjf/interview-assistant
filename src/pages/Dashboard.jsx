import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getInterviews, getReviews, getJobs } from '../utils/storage.js'
import { IconInterview, IconReview, IconUpload, IconPlus, IconChevronRight, IconClock } from '../components/Icons.jsx'
import { interviewDisplayStatus, ITV_DISPLAY_STYLE, JOB_STATUS_STYLE, formatDate, relativeTime } from '../components/ui.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const interviews = getInterviews()
  const reviews = getReviews()
  const jobs = getJobs()

  const stats = useMemo(() => {
    const total = interviews.length
    const reviewed = reviews.length
    const pending = interviews.filter((i) => !i.isReviewed).length
    return { total, reviewed, pending }
  }, [interviews, reviews])

  const recent = useMemo(() => {
    return [...interviews]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  }, [interviews])

  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const week = weekdays[today.getDay()]

  const statCards = [
    {
      label: '面试记录总数',
      value: stats.total,
      icon: IconInterview,
      gradient: 'from-[#4F6EF7] to-[#7B8FF7]',
    },
    {
      label: '已有复盘数',
      value: stats.reviewed,
      icon: IconReview,
      gradient: 'from-[#52C41A] to-[#7DD642]',
    },
    {
      label: '待复盘数',
      value: stats.pending,
      icon: IconClock,
      gradient: 'from-[#FAAD14] to-[#FFC53D]',
    },
  ]

  const quickActions = [
    { label: '上传面试记录', icon: IconUpload, color: '#4F6EF7', bg: '#EEF2FF', onClick: () => navigate('/interviews', { state: { openUpload: true } }) },
    { label: '新建面试记录', icon: IconPlus, color: '#52C41A', bg: '#F6FFED', onClick: () => navigate('/interviews', { state: { openCreate: true } }) },
    { label: '开始复盘', icon: IconReview, color: '#FAAD14', bg: '#FFFBE6', onClick: () => navigate('/reviews') },
  ]

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">你好，欢迎使用 AI 面试小助手</h2>
        <p className="mt-1 text-sm text-text-tertiary">{dateStr} · {week}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {statCards.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${c.gradient} shadow-lg`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-90">{c.label}</p>
                  <p className="mt-2 text-4xl font-bold">{c.value}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                  <Icon width={24} height={24} />
                </div>
              </div>
              {/* decorative */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10" />
            </div>
          )
        })}
      </div>

      {/* Recent interviews */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">近期面试</h3>
          <Link to="/interviews" className="text-sm text-brand hover:text-brand-hover flex items-center gap-1">
            查看全部 <IconChevronRight width={14} height={14} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-text-tertiary">
            还没有面试记录，快去
            <Link to="/interviews" className="text-brand mx-1">新建一条</Link>
            或
            <Link to="/interviews" className="text-brand mx-1">上传记录</Link>
            吧
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((itv) => {
              const job = jobs.find((j) => j.id === itv.jobId)
              const status = interviewDisplayStatus(itv)
              const s = ITV_DISPLAY_STYLE[status] || { text: '#5A6A7E', bg: '#F0F2F5' }
              return (
                <Link
                  key={itv.id}
                  to={`/interviews/${itv.id}`}
                  className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">
                        {job?.company || '未知公司'} · {job?.title || '未知岗位'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-text-tertiary">
                      <span>{formatDate(itv.interviewTime, true)}</span>
                      <span>·</span>
                      <span>{itv.round}</span>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium"
                    style={{ color: s.text, background: s.bg }}
                  >
                    {status}
                  </span>
                  <IconChevronRight width={16} height={16} className="ml-3 text-text-tertiary" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {quickActions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className="card flex items-center gap-3 p-5 hover:shadow-card-hover transition-all text-left"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: a.bg, color: a.color }}
              >
                <Icon width={22} height={22} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{a.label}</p>
                <p className="text-xs text-text-tertiary mt-0.5">点击开始</p>
              </div>
              <IconChevronRight width={16} height={16} className="text-text-tertiary" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
