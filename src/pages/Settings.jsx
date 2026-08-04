import { useNavigate } from 'react-router-dom'
import { exportAllData, clearAllData } from '../utils/storage.js'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { IconDownload, IconTrash } from '../components/Icons.jsx'

export default function Settings() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const navigate = useNavigate()

  const handleExport = () => {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const d = new Date()
    const name = `interview-data-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    toast.success('数据已导出')
  }

  const handleClear = async () => {
    const ok = await confirm({
      title: '清空全部数据',
      message: '此操作不可撤销，确认清空所有数据吗？所有岗位、面试记录和复盘报告都将被删除。',
      confirmText: '确认清空',
      danger: true,
    })
    if (ok) {
      clearAllData()
      toast.success('数据已清空')
      setTimeout(() => window.location.reload(), 500)
    }
  }

  return (
    <div className="px-8 py-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-text-primary mb-6">数据与设置</h2>

      {/* Data management */}
      <div className="card p-6 mb-5">
        <h3 className="text-base font-semibold text-text-primary mb-1">数据管理</h3>
        <p className="text-sm text-text-tertiary mb-5">
          导出备份你的数据，或在需要时清空所有本地记录
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                <IconDownload width={20} height={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">导出全部数据（JSON）</p>
                <p className="text-xs text-text-tertiary mt-0.5">包含所有岗位、面试记录、复盘报告</p>
              </div>
            </div>
            <button className="btn-primary" onClick={handleExport}>导出数据</button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-danger/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
                <IconTrash width={20} height={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">清空全部数据</p>
                <p className="text-xs text-text-tertiary mt-0.5">删除所有本地记录，操作不可撤销</p>
              </div>
            </div>
            <button className="btn-danger" onClick={handleClear}>清空数据</button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-text-primary mb-3">关于</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">版本号</span>
            <span className="text-text-primary font-medium">v1.0.0 (Phase 1 Demo)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">数据存储</span>
            <span className="text-text-primary">本地浏览器 (localStorage)</span>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-sm text-text-secondary leading-relaxed">
            当前为单机 Demo 版，数据存储在本地浏览器中。清除浏览器数据会导致记录丢失，请定期导出备份。
          </p>
        </div>
      </div>

      {dialog}
    </div>
  )
}
