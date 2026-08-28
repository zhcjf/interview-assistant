import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'
import { getBackupConfig, saveBackupConfig, exportAllData } from '../utils/storage.js'
import { pushBackup } from '../utils/github-backup.js'

const TITLES = {
  '/': '首页看板',
  '/jobs': '简历与岗位管理',
  '/interviews': '面试记录',
  '/preparation': '面试准备',
  '/reviews': '面试复盘',
  '/settings': '数据与设置',
}

function getTitle(pathname) {
  if (pathname.startsWith('/interviews/')) return '面试记录详情'
  if (pathname.startsWith('/reviews/new/')) return '新建复盘'
  if (pathname.startsWith('/reviews/edit/')) return '编辑复盘'
  if (pathname.startsWith('/reviews/')) return '复盘详情'
  return TITLES[pathname] || 'AI面试小助手'
}

export default function Layout() {
  const location = useLocation()
  const title = getTitle(location.pathname)
  // 手机端侧边栏默认关闭
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // 云同步状态：null | 'syncing' | 'ok' | 'fail'
  const [syncStatus, setSyncStatus] = useState(null)
  const debounceTimer = useRef(null)
  const syncOkTimer = useRef(null)

  // 路由切换时自动关闭手机侧边栏
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // 自动备份：防抖 5 秒，数据不变时不重复触发
  const triggerAutoBackup = useCallback(async () => {
    const cfg = getBackupConfig()
    if (!cfg.enabled || !cfg.ghToken || !cfg.owner || !cfg.repo) return

    setSyncStatus('syncing')
    const data = exportAllData()
    const result = await pushBackup(cfg, data)

    const now = new Date().toISOString()
    saveBackupConfig({
      ...cfg,
      lastBackupAt: now,
      lastBackupStatus: result.ok ? 'success' : 'fail',
    })

    if (result.ok) {
      setSyncStatus('ok')
      // 3 秒后状态标志淡出
      clearTimeout(syncOkTimer.current)
      syncOkTimer.current = setTimeout(() => setSyncStatus(null), 3000)
    } else {
      setSyncStatus('fail')
    }
  }, [])

  // 监听业务数据变更事件
  useEffect(() => {
    const handler = () => {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(triggerAutoBackup, 5000)
    }
    window.addEventListener('ia:data-changed', handler)
    return () => {
      window.removeEventListener('ia:data-changed', handler)
      clearTimeout(debounceTimer.current)
      clearTimeout(syncOkTimer.current)
    }
  }, [triggerAutoBackup])

  return (
    <div className="flex h-screen overflow-hidden bg-content">
      {/* ── 手机遮罩 ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── 侧边栏 ── */}
      <div
        className={[
          // 手机端：绝对定位，滑入滑出
          'fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:relative md:translate-x-0 md:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── 右侧主区域 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
          syncStatus={syncStatus}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
