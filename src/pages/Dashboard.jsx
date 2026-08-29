import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getInterviews, getReviews, getJobs } from '../utils/storage.js'
import { IconInterview, IconReview, IconUpload, IconPlus, IconChevronRight, IconClock } from '../components/Icons.jsx'
import { interviewDisplayStatus, ITV_DISPLAY_STYLE, formatDate } from '../components/ui.jsx'

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
      label: '面试总数',
      value: stats.total,
      icon: IconInterview,
      gradient: 'from-[#4F6EF7] to-[#7B8FF7]',
    },
    {
      label: '已复盘',
      value: stats.reviewed,
      icon: IconReview,
      gradient: 'from-[#52C41A] to-[#7DD642]',
    },
    {
      label: '待复盘',
      value: stats.pending,
      icon: IconClock,
      gradient: 'from-[#FAAD14] to-[#FFC53D]',
    },
  ]

  const quickActions = [
    { label: '上传面试记录', sub: '上传录音/视频', icon: IconUpload, color: '#4F6EF7', bg: '#EEF2FF', onClick: () => navigate('/interviews', { state: { openUpload: true } }) },
    { label: '新建面试记录', sub: '手动创建记录', icon: IconPlus, color: '#52C41A', bg: '#F6FFED', onClick: () => navigate('/interviews', { state: { openCreate: true } }) },
    { label: '开始复盘', sub: 'AI 辅助分析', icon: IconReview, color: '#FAAD14', bg: '#FFFBE6', onClick: () => navigate('/reviews') },
  ]

  return (
    <div className="px-4 md:px-8 py-5 md:py-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-5">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary">你好，欢迎使用 AI 面试小助手</h2>
        <p className="mt-1 text-sm text-text-tertiary">{dateStr} · {week}</p>
      </div>

      {/* Stat cards — 手机端 3 列紧凑模式，桌面端标准模式 */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-5 mb-5">
        {statCards.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className={`relative overflow-hidden rounded-xl md:rounded-2xl p-3 md:p-5 text-white bg-gradient-to-br ${c.gradient} shadow-md`}
            >
              {/* 手机端：图标+数字同行，标签在下 */}
              <div className="flex items-center justify-between md:hidden">
                <p className="text-2xl font-bold leading-none">{c.value}</p>
                <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center">
                  <Icon width={16} height={16} />
                </div>
              </div>
              <p className="text-xs opacity-90 mt-1.5 leading-tight md:hidden">{c.label}</p>

              {/* 桌面端：原始布局 */}
              <div className="hidden md:flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-90">{c.label}</p>
                  <p className="mt-2 text-4xl font-bold">{c.value}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                  <Icon width={24} height={24} />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 md:-right-6 md:-bottom-6 md:w-32 md:h-32" />
            </div>
          )
        })}
      </div>

      {/* Recent interviews */}
      <div className="card p-0 overflow-hidden mb-5">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">近期面试</h3>
          <Link to="/interviews" className="text-sm text-brand hover:text-brand-hover flex items-center gap-1">
            查看全部 <IconChevronRight width={14} height={14} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-tertiary">
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
                  className="flex items-center px-4 md:px-6 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate text-sm">
                      {job?.company || '未知公司'} · {job?.title || '未知岗位'}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
                      <span>{formatDate(itv.interviewTime, true)}</span>
                      <span>·</span>
                      <span>{itv.round}</span>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ml-2 shrink-0"
                    style={{ color: s.text, background: s.bg }}
                  >
                    {status}
                  </span>
                  <IconChevronRight width={14} height={14} className="ml-2 text-text-tertiary shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions — 手机端单列，桌面端三列 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {quickActions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className="card flex items-center gap-3 px-4 py-3.5 md:p-5 hover:shadow-card-hover transition-all text-left w-full"
            >
              <div
                className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: a.bg, color: a.color }}
              >
                <Icon width={20} height={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{a.label}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{a.sub}</p>
              </div>
              <IconChevronRight width={16} height={16} className="text-text-tertiary shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
