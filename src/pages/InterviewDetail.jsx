import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { getInterview, getJob, getReviewByInterview, saveInterview, deleteInterview, getAIConfig } from '../utils/storage.js'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import Modal from '../components/Modal.jsx'
import UploadModal from '../components/UploadModal.jsx'
import InterviewForm from '../components/InterviewForm.jsx'
import {
  interviewDisplayStatus,
  ITV_DISPLAY_STYLE,
  INTERVIEW_FORMATS,
  formatDate,
} from '../components/ui.jsx'
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconReview,
  IconPaperclip,
  IconFile,
  IconClock,
  IconUser,
  IconChevronRight,
  IconSparkles,
} from '../components/Icons.jsx'

export default function InterviewDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [job, setJob] = useState(null)
  const [review, setReview] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const { confirm, dialog } = useConfirm()
  const toast = useToast()

  const refresh = () => {
    const itv = getInterview(id)
    setInterview(itv)
    setJob(itv ? getJob(itv.jobId) : null)
    setReview(itv ? getReviewByInterview(itv.id) : null)
  }
  useEffect(refresh, [id])

  useEffect(() => {
    if (location.state?.edit) {
      setEditOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state])

  if (!interview) {
    return (
      <div className="px-8 py-6 max-w-4xl mx-auto">
        <div className="card p-12 text-center">
          <p className="text-text-tertiary">面试记录不存在或已被删除</p>
          <Link to="/interviews" className="btn-primary mt-4 inline-block">返回列表</Link>
        </div>
      </div>
    )
  }

  const status = interviewDisplayStatus(interview)
  const s = ITV_DISPLAY_STYLE[status] || { text: '#5A6A7E', bg: '#F0F2F5' }

  const handleDelete = async () => {
    const ok = await confirm({
      title: '删除面试记录',
      message: '此操作不可撤销，确认删除这条面试记录及其复盘吗？',
      confirmText: '确认删除',
      danger: true,
    })
    if (ok) {
      deleteInterview(id)
      toast.success('面试记录已删除')
      navigate('/interviews')
    }
  }

  const handleSave = (data) => {
    saveInterview(data)
    toast.success('面试记录已更新')
    setEditOpen(false)
    refresh()
  }

  const infoItems = [
    { label: '公司', value: job?.company || '-' },
    { label: '岗位', value: job?.title || '-' },
    { label: '面试时间', value: formatDate(interview.interviewTime, true) },
    { label: '面试轮次', value: interview.round },
    { label: '面试官', value: interview.interviewer || '-' },
    { label: '面试形式', value: interview.format || '-' },
    { label: '面试结果', value: interview.result || '待定' },
  ]

  return (
    <div className="px-8 py-6 max-w-4xl mx-auto">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/interviews')}
          className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors"
        >
          <IconArrowLeft width={16} height={16} />
          返回列表
        </button>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setEditOpen(true)}>
            <IconEdit width={16} height={16} className="inline mr-1.5 -mt-0.5" />
            编辑
          </button>
          {!review ? (
            <>
              <button
                className="btn-secondary border-brand/30 text-brand hover:bg-brand/10"
                onClick={() => navigate(`/reviews/new/${interview.id}?ai=1`)}
                title="基于面试问答记录，AI 自动生成复盘初稿"
              >
                <IconSparkles width={16} height={16} className="inline mr-1.5 -mt-0.5" />
                AI 生成复盘
              </button>
              <button
                className="btn-primary"
                onClick={() => navigate(`/reviews/new/${interview.id}`)}
              >
                <IconReview width={16} height={16} className="inline mr-1.5 -mt-0.5" />
                手动复盘
              </button>
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={() => navigate(`/reviews/${review.id}`)}
            >
              查看复盘
              <IconChevronRight width={14} height={14} className="inline ml-1 -mt-0.5" />
            </button>
          )}
          <button className="btn-secondary text-danger border-danger/20 hover:bg-red-50" onClick={handleDelete}>
            <IconTrash width={16} height={16} className="inline mr-1.5 -mt-0.5" />
            删除
          </button>
        </div>
      </div>

      {/* Basic info card */}
      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              {job?.company || '未知公司'} · {job?.title || '未知岗位'}
            </h2>
            <p className="mt-1 text-sm text-text-tertiary">创建于 {formatDate(interview.createdAt)}</p>
          </div>
          <span
            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium"
            style={{ color: s.text, background: s.bg }}
          >
            {status}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
          {infoItems.map((item) => (
            <div key={item.label}>
              <p className="text-xs text-text-tertiary">{item.label}</p>
              <p className="mt-1 text-sm text-text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QA list */}
      <div className="card p-6 mb-5">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          问答记录 <span className="text-sm font-normal text-text-tertiary">({interview.questions.length})</span>
        </h3>
        {interview.questions.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4">暂无问答记录</p>
        ) : (
          <div className="space-y-4">
            {interview.questions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-gray-50 border border-border">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                    Q{idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium">{q}</p>
                    {interview.answers[idx] && (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <p className="text-xs text-text-tertiary mb-1">我的回答：</p>
                        <p className="text-sm text-text-secondary whitespace-pre-wrap">{interview.answers[idx]}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feeling */}
      {interview.feeling && (
        <div className="card p-6 mb-5">
          <h3 className="text-base font-semibold text-text-primary mb-3">整体感受</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{interview.feeling}</p>
        </div>
      )}

      {/* Attachment */}
      {interview.hasAttachment && (
        <div className="card p-6 mb-5">
          <h3 className="text-base font-semibold text-text-primary mb-3">附件</h3>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-info">
              <IconFile width={20} height={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {interview.attachmentFileName || '面试记录.txt'}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {(interview.attachmentText || '').length} 字符
              </p>
            </div>
            <button
              onClick={() => {
                if (!interview.attachmentText) return
                const blob = new Blob([interview.attachmentText], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = interview.attachmentFileName || '面试记录.txt'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="btn-text"
            >
              下载原文
            </button>
          </div>
        </div>
      )}

      {/* Related review */}
      {review && (
        <Link
          to={`/reviews/${review.id}`}
          className="card p-5 flex items-center hover:shadow-card-hover transition-shadow"
        >
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success flex-shrink-0 mr-4">
            <IconReview width={20} height={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">已有复盘报告</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              创建于 {formatDate(review.createdAt)} · 点击查看详情
            </p>
          </div>
          <IconChevronRight width={16} height={16} className="text-text-tertiary" />
        </Link>
      )}

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="编辑面试记录"
        size="xl"
      >
        <InterviewForm
          interview={interview}
          jobs={job ? [job] : []}
          onSave={handleSave}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Upload modal (for adding attachment) */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        jobs={job ? [job] : []}
      />
      {dialog}
    </div>
  )
}
