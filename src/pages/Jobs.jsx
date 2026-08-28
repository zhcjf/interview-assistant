import { useState, useEffect } from 'react'
import { getJobs, saveJob, deleteJob } from '../utils/storage.js'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import Modal from '../components/Modal.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ResumeUploader from '../components/ResumeUploader.jsx'
import MatchAnalysisModal from '../components/MatchAnalysisModal.jsx'
import { StatusTag, JOB_STATUS_STYLE, JOB_STATUS, JOB_STAGES, formatDate } from '../components/ui.jsx'
import { IconPlus, IconEdit, IconTrash, IconBriefcase, IconSparkles } from '../components/Icons.jsx'
import JobForm from '../components/JobForm.jsx'

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [matchJob, setMatchJob] = useState(null)
  const { confirm, dialog } = useConfirm()
  const toast = useToast()

  const refresh = () => setJobs(getJobs())
  useEffect(refresh, [])

  const openCreate = () => {
    setEditingJob(null)
    setModalOpen(true)
  }
  const openEdit = (job) => {
    setEditingJob(job)
    setModalOpen(true)
  }

  const handleSave = (data) => {
    saveJob(data)
    toast.success(editingJob ? '岗位已更新' : '岗位已创建')
    setModalOpen(false)
    refresh()
  }

  const handleDelete = async (job) => {
    const ok = await confirm({
      title: '删除岗位',
      message: `此操作不可撤销，确认删除「${job.company} · ${job.title}」及其所有面试记录吗？`,
      confirmText: '确认删除',
      danger: true,
    })
    if (ok) {
      deleteJob(job.id)
      toast.success('岗位已删除')
      refresh()
    }
  }

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">岗位管理</h2>
          <p className="mt-1 text-sm text-text-tertiary">管理你投递的岗位信息，共 {jobs.length} 个岗位</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <IconPlus width={16} height={16} className="inline mr-1.5 -mt-0.5" />
          新建岗位
        </button>
      </div>

      {/* 简历上传区 (Phase 2 新增) */}
      <ResumeUploader />

      {/* 岗位列表标题 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-primary">投递岗位</h3>
        <span className="text-xs text-text-tertiary">共 {jobs.length} 个</span>
      </div>

      {/* List */}
      {jobs.length === 0 ? (
        <div className="card">
          <EmptyState
            type="jobs"
            title="还没有岗位信息"
            description="先添加一个岗位，后续才能关联面试记录"
            actions={[{ label: '新建岗位', icon: IconPlus, onClick: openCreate, primary: true }]}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((job) => (
              <div key={job.id} className="card p-5 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <IconBriefcase width={20} height={20} className="text-brand" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-text-primary truncate">{job.company}</h3>
                      <p className="text-sm text-text-secondary mt-0.5 truncate">{job.title}</p>
                    </div>
                  </div>
                  <StatusTag label={job.status} styleMap={JOB_STATUS_STYLE} />
                </div>

                {job.jdText && (
                  <p className="mt-3 text-xs text-text-tertiary line-clamp-2">{job.jdText}</p>
                )}

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-text-tertiary">
                    {job.stage && <span className="mr-2">{job.stage}</span>}
                    创建于 {formatDate(job.createdAt)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setMatchJob(job)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-brand/10 hover:text-brand transition-colors"
                      title="分析简历匹配度"
                    >
                      <IconSparkles width={16} height={16} />
                    </button>
                    <button
                      onClick={() => openEdit(job)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-gray-100 hover:text-brand transition-colors"
                      title="编辑"
                    >
                      <IconEdit width={16} height={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(job)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-red-50 hover:text-danger transition-colors"
                      title="删除"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingJob ? '编辑岗位' : '新建岗位'}
        size="lg"
      >
        <JobForm
          job={editingJob}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <MatchAnalysisModal
        open={!!matchJob}
        onClose={() => setMatchJob(null)}
        jobId={matchJob?.id}
      />
      {dialog}
    </div>
  )
}
