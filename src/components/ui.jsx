// Shared UI helpers and constants

export const JOB_STAGES = ['准备中', '初面', '二面', '三面', 'HR面', '终面']
export const JOB_STATUS = ['准备中', '面试中', '已结束']
export const INTERVIEW_ROUNDS = ['初面', '二面', '三面', 'HR面', '终面']
export const INTERVIEW_RESULTS = ['通过', '未通过', '待定']
export const INTERVIEW_FORMATS = ['现场', '电话', '视频']
export const REVIEW_DIMENSIONS = [
  { key: 'structure', label: '回答结构' },
  { key: 'relevance', label: '内容相关度' },
  { key: 'fluency', label: '表达流畅度' },
  { key: 'highlights', label: '亮点呈现' },
  { key: 'interaction', label: '互动与追问' },
]

// Status color maps (text + bg)
export const INTERVIEW_RESULT_STYLE = {
  待进行: { text: '#1890FF', bg: '#E6F7FF' },
  待复盘: { text: '#FAAD14', bg: '#FFFBE6' },
  已通过: { text: '#52C41A', bg: '#F6FFED' },
  未通过: { text: '#FF4D4F', bg: '#FFF1F0' },
  待定: { text: '#FAAD14', bg: '#FFFBE6' },
}

export const JOB_STATUS_STYLE = {
  准备中: { text: '#1890FF', bg: '#E6F7FF' },
  面试中: { text: '#4F6EF7', bg: '#EEF2FF' },
  已结束: { text: '#8C9AB0', bg: '#F0F2F5' },
}

export function StatusTag({ label, styleMap }) {
  const s = (styleMap && styleMap[label]) || { text: '#5A6A7E', bg: '#F0F2F5' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: s.text, background: s.bg }}
    >
      {label}
    </span>
  )
}

// Map interview result -> display status used on cards
export function interviewDisplayStatus(itv) {
  if (itv.isReviewed) return '已复盘'
  if (itv.result === '通过') return '已通过'
  if (itv.result === '未通过') return '未通过'
  return '待复盘'
}

export const ITV_DISPLAY_STYLE = {
  待复盘: { text: '#FAAD14', bg: '#FFFBE6' },
  已复盘: { text: '#52C41A', bg: '#F6FFED' },
  已通过: { text: '#52C41A', bg: '#F6FFED' },
  未通过: { text: '#FF4D4F', bg: '#FFF1F0' },
}

export function formatDate(iso, withTime = false) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d)) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (!withTime) return `${y}-${m}-${day}`
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export function relativeTime(iso) {
  if (!iso) return ''
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diff = now - t
  if (diff < 0) return '即将'
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}天前`
  return formatDate(iso)
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(val) {
  if (!val) return null
  const d = new Date(val)
  if (isNaN(d)) return null
  return d.toISOString()
}
