import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getInterviews, getJobs, deleteInterview, saveInterview } from '../utils/storage.js'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import Modal from '../components/Modal.jsx'
import EmptyState from '../components/EmptyState.jsx'
import UploadModal from '../components/UploadModal.jsx'
import InterviewForm from '../components/InterviewForm.jsx'
import {
  interviewDisplayStatus,
  ITV_DISPLAY_STYLE,
  INTERVIEW_ROUNDS,
  formatDate,
} from '../components/ui.jsx'
import { IconPlus, IconUpload, IconEdit, IconTrash, IconChevronRight, IconPaperclip, IconInterview } from '../components/Icons.jsx'

const STATUS_OPTIONS = ['全部', '待复盘', '已复盘', '已通过', '未通过']

export default function Interviews() {
  const location = useLocation()
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [jobs, setJobs] = useState([])
  const [roundFilter, setRoundFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [createOpen, setCreateOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const { confirm, dialog } = useConfirm()
  const toast = useToast()

  const refresh = () => {
    setInterviews(getInterviews())
    setJobs(getJobs())
  }
  useEffect(refresh, [])

  // Open modals based on navigation state (from dashboard quick actions)
  useEffect(() => {
    if (location.state?.openUpload) {
      setUploadOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
    if (location.state?.openCreate) {
      setCreateOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state])

  const filtered = interviews
    .filter((i) => (roundFilter === '全部' ? true : i.round === roundFilter))
    .filter((i) => {
      if (statusFilter === '全部') return true
      return interviewDisplayStatus(i) === statusFilter
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const handleSave = (data) => {
    const saved = saveInterview(data)
    toast.success('面试记录已保存')
    setCreateOpen(false)
    refresh()
    navigate(`/interviews/${saved.id}`)
  }

  const handleDelete = async (itv) => {
    const ok = await confirm({
      title: '删除面试记录',
      message: '此操作不可撤销，确认删除这条面试记录及其复盘吗？',
      confirmText: '确认删除',
      danger: true,
    })
    if (ok) {
      deleteInterview(itv.id)
      toast.success('面试记录已删除')
      refresh()
    }
  }

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">面试记录</h2>
          <p className="mt-1 text-sm text-text-tertiary">共 {interviews.length} 条记录</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary" onClick={() => setUploadOpen(true)}>
            <IconUpload width={16} height={16} className="inline mr-1.5 -mt-0.5" />
            上传面试记录
          </button>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <IconPlus width={16} height={16} className="inline mr-1.5 -mt-0.5" />
            新建面试记录
          </button>
        </div>
      </div>

      {/* Filters */}
      {interviews.length > 0 && (
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">轮次</span>
            <select
              className="input py-1.5 w-32"
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
            >
              <option value="全部">全部</option>
              {INTERVIEW_ROUNDS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">状态</span>
            <select
              className="input py-1.5 w-32"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* List */}
      {interviews.length === 0 ? (
        <div className="card">
          <EmptyState
            type="interviews"
            title="还没有面试记录"
            description="上传已有的面试记录文件，或手动新建一条记录"
            actions={[
              { label: '上传记录', icon: IconUpload, onClick: () => setUploadOpen(true), primary: true },
              { label: '去新建', icon: IconPlus, onClick: () => setCreateOpen(true) },
            ]}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-sm text-text-tertiary">
          没有符合条件的面试记录
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((itv) => {
            const job = jobs.find((j) => j.id === itv.jobId)
            const status = interviewDisplayStatus(itv)
            const s = ITV_DISPLAY_STYLE[status] || { text: '#5A6A7E', bg: '#F0F2F5' }
            return (
              <Link
                key={itv.id}
                to={`/interviews/${itv.id}`}
                className="card p-5 flex items-center group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand flex-shrink-0 mr-4">
                  <IconInterview width={20} height={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary truncate">
                      {job?.company || '未知公司'} · {job?.title || '未知岗位'}
                    </h3>
                    {itv.hasAttachment && (
                      <IconPaperclip width={14} height={14} className="text-text-tertiary flex-shrink-0" />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-text-tertiary">
                    <span>{formatDate(itv.interviewTime, true)}</span>
                    <span>·</span>
                    <span>{itv.round}</span>
                    {itv.interviewer && (
                      <>
                        <span>·</span>
                        <span>{itv.interviewer}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium"
                    style={{ color: s.text, background: s.bg }}
                  >
                    {status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(`/interviews/${itv.id}`, { state: { edit: true } })
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-gray-100 hover:text-brand transition-colors opacity-0 group-hover:opacity-100"
                    title="编辑"
                  >
                    <IconEdit width={16} height={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleDelete(itv)
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-red-50 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                    title="删除"
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                  <IconChevronRight width={16} height={16} className="text-text-tertiary" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新建面试记录"
        size="xl"
      >
        {jobs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-secondary mb-4">需要先创建岗位才能新建面试记录</p>
            <Link to="/jobs" className="btn-primary" onClick={() => setCreateOpen(false)}>
              去新建岗位
            </Link>
          </div>
        ) : (
          <InterviewForm
            interview={null}
            jobs={jobs}
            onSave={handleSave}
            onCancel={() => setCreateOpen(false)}
          />
        )}
      </Modal>

      {/* Upload modal */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        jobs={jobs}
      />
      {dialog}
    </div>
  )
}
