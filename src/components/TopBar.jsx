import { IconBell } from './Icons.jsx'

export default function TopBar({ title }) {
  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-border flex items-center justify-between px-8">
      <h1 className="text-base font-semibold text-text-primary">{title}</h1>
      <div className="flex items-center gap-4">
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
