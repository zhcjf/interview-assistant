import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './Icons.jsx'

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
}

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizes[size]} max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-gray-100 hover:text-text-primary transition-colors"
            >
              <IconClose width={18} height={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
