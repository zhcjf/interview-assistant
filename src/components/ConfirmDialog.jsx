import { useState } from 'react'
import Modal from './Modal.jsx'
import { IconCheck, IconTrash } from './Icons.jsx'

export function useConfirm() {
  const [state, setState] = useState({ open: false })
  const confirm = (opts) =>
    new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title || '确认操作',
        message: opts.message || '确认执行此操作吗？',
        confirmText: opts.confirmText || '确认',
        cancelText: opts.cancelText || '取消',
        danger: opts.danger || false,
        onResolve: resolve,
      })
    })

  const dialog = (
    <Modal
      open={state.open}
      onClose={() => {
        state.onResolve?.(false)
        setState({ open: false })
      }}
      title={state.title}
      size="sm"
      footer={
        <>
          <button
            className="btn-secondary"
            onClick={() => {
              state.onResolve?.(false)
              setState({ open: false })
            }}
          >
            {state.cancelText}
          </button>
          <button
            className={state.danger ? 'btn-danger' : 'btn-primary'}
            onClick={() => {
              state.onResolve?.(true)
              setState({ open: false })
            }}
          >
            {state.confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: state.danger ? '#FFF1F0' : '#E6F7FF',
            color: state.danger ? '#FF4D4F' : '#1890FF',
          }}
        >
          {state.danger ? <IconTrash width={16} height={16} /> : <IconCheck width={16} height={16} />}
        </div>
        <p className="text-sm text-text-secondary mt-1">{state.message}</p>
      </div>
    </Modal>
  )

  return { confirm, dialog }
}
