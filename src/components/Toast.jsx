import { createContext, useContext, useState, useCallback } from 'react'
import { IconCheck, IconClose, IconX } from './Icons.jsx'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

let idSeq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, type = 'success', duration = 2000) => {
      const id = ++idSeq
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration > 0) {
        setTimeout(() => remove(id), duration)
      }
      return id
    },
    [remove],
  )

  const success = useCallback((msg, d) => show(msg, 'success', d), [show])
  const error = useCallback((msg, d) => show(msg, 'error', d), [show])
  const info = useCallback((msg, d) => show(msg, 'info', d), [show])

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg min-w-[240px] bg-white animate-in fade-in slide-in-from-top-2"
            style={{
              borderLeft: `3px solid ${
                t.type === 'success' ? '#52C41A' : t.type === 'error' ? '#FF4D4F' : '#1890FF'
              }`,
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{
                background:
                  t.type === 'success' ? '#52C41A' : t.type === 'error' ? '#FF4D4F' : '#1890FF',
              }}
            >
              {t.type === 'success' ? (
                <IconCheck width={14} height={14} />
              ) : t.type === 'error' ? (
                <IconX width={14} height={14} />
              ) : (
                <IconClose width={14} height={14} />
              )}
            </div>
            <span className="text-sm text-text-primary">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
