import { NavLink } from 'react-router-dom'
import {
  IconDashboard,
  IconBriefcase,
  IconPrep,
  IconInterview,
  IconReview,
  IconSettings,
  IconLogo,
} from './Icons.jsx'

const menuItems = [
  { to: '/', label: '首页看板', icon: IconDashboard, end: true },
  { to: '/jobs', label: '简历与岗位管理', icon: IconBriefcase },
  { to: '/preparation', label: '面试准备', icon: IconPrep },
  { to: '/interviews', label: '面试记录', icon: IconInterview },
  { to: '/reviews', label: '面试复盘', icon: IconReview },
  { to: '/settings', label: '数据与设置', icon: IconSettings },
]

export default function Sidebar() {
  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col"
      style={{ background: '#1E2634' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 gap-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <IconLogo />
        <span className="text-white font-semibold text-base tracking-tight">AI面试小助手</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'group flex items-center h-12 rounded-lg px-4 text-sm transition-all duration-200 relative',
                  isActive
                    ? 'text-white font-medium'
                    : 'text-[#B0BEC5] hover:text-white hover:bg-[#253042]',
                ].join(' ')
              }
              style={({ isActive }) =>
                isActive ? { background: '#2D3748' } : {}
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r"
                      style={{ background: '#4F6EF7' }}
                    />
                  )}
                  <Icon
                    width={18}
                    height={18}
                    className="mr-3 flex-shrink-0"
                    style={{ color: isActive ? '#4F6EF7' : undefined }}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 text-xs text-[#5A6A7E] border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        v1.0.0 · Phase 1 Demo
      </div>
    </aside>
  )
}
