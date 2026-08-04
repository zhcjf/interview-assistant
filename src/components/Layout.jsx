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
  return (
    <div className="flex h-screen overflow-hidden bg-content">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
