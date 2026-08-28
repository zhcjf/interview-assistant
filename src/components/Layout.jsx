import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'

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

  // 路由切换时自动关闭手机侧边栏
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

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
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
