import { IconBell } from './Icons.jsx'

// syncStatus: null | 'syncing' | 'ok' | 'fail'
export default function TopBar({ title, onMenuClick, syncStatus }) {
  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-border flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        {/* 汉堡菜单：只在手机端显示 */}
        <button
          onClick={onMenuClick}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-gray-100 transition-colors"
          aria-label="打开菜单"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <h1 className="text-base font-semibold text-text-primary">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* 云同步状态指示器 */}
        {syncStatus && (
          <div
            title={
              syncStatus === 'syncing' ? '正在同步到云端...' :
              syncStatus === 'ok' ? '已同步到云端' :
              '云端同步失败，请检查备份配置'
            }
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all"
            style={{
              background: syncStatus === 'ok' ? '#f0fdf4' : syncStatus === 'fail' ? '#fef2f2' : '#f0f4ff',
              color: syncStatus === 'ok' ? '#16a34a' : syncStatus === 'fail' ? '#dc2626' : '#4f6ef7',
            }}
          >
            {syncStatus === 'syncing' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="animate-spin" style={{ animationDuration: '1s' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
              </svg>
            )}
            {syncStatus === 'ok' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {syncStatus === 'fail' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            )}
            <span className="text-xs">
              {syncStatus === 'syncing' ? '同步中' : syncStatus === 'ok' ? '已同步' : '失败'}
            </span>
          </div>
        )}

        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-full text-text-tertiary hover:bg-gray-50 hover:text-text-secondary transition-colors"
          title="通知"
        >
          <IconBell width={20} height={20} />
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-danger" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white text-sm font-medium">
          我
        </div>
      </div>
    </header>
  )
}
