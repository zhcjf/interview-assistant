// 复盘报告导出为 Markdown 格式
import { REVIEW_DIMENSIONS } from '../components/ui.jsx'

function starString(score, max = 5) {
  const filled = '★'.repeat(score)
  const empty = '☆'.repeat(Math.max(0, max - score))
  return filled + empty
}

export function buildReviewMarkdown(review, interview, job) {
  const lines = []

  // Title
  lines.push('# 面试复盘报告')
  lines.push('')

  // Basic info
  lines.push(`**公司：** ${job?.company || '-'}  **岗位：** ${job?.title || '-'}`)
  lines.push(`**轮次：** ${interview?.round || '-'}  **面试官：** ${interview?.interviewer || '-'}`)
  const itvTime = interview?.interviewTime ? new Date(interview.interviewTime).toLocaleString('zh-CN') : '-'
  lines.push(`**时间：** ${itvTime}  **结果：** ${interview?.result || '待定'}`)
  lines.push('---')
  lines.push('')

  // Overall score
  const dims = review.dimensionScores || {}
  const validScores = Object.values(dims).filter((v) => typeof v === 'number' && v > 0)
  const avg = validScores.length ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '-'
  lines.push(`## 综合评分：${avg} / 5`)
  lines.push('')
  lines.push('| 维度 | 评分 |')
  lines.push('|------|------|')
  REVIEW_DIMENSIONS.forEach((d) => {
    const score = dims[d.key] || 0
    lines.push(`| ${d.label} | ${starString(score)} ${score}/5 |`)
  })
  lines.push('')

  // Q&A details
  if (review.qaDetails && review.qaDetails.length > 0) {
    lines.push('## 逐题复盘')
    lines.push('')
    review.qaDetails.forEach((qa, i) => {
      lines.push(`### Q${i + 1}：${qa.question || ''}`)
      if (qa.answer) {
        lines.push(`**我的回答：** ${qa.answer}`)
      }
      if (qa.score) {
        lines.push(`**自评：** ${starString(qa.score)} ${qa.score}/5`)
      }
      if (qa.comment) {
        lines.push(`**评语：** ${qa.comment}`)
      }
      lines.push('')
    })
  }

  // Highlights
  if (review.highlights && review.highlights.length > 0) {
    lines.push('## 亮点总结')
    lines.push('')
    review.highlights.forEach((h) => {
      if (h.trim()) lines.push(`✓ ${h}`)
    })
    lines.push('')
  }

  // Improvements
  if (review.improvements && review.improvements.length > 0) {
    lines.push('## 待改进项')
    lines.push('')
    review.improvements.forEach((imp) => {
      if (imp.trim()) lines.push(`✕ ${imp}`)
    })
    lines.push('')
  }

  // Actions
  if (review.actions && review.actions.length > 0) {
    lines.push('## 后续行动')
    lines.push('')
    review.actions.forEach((a) => {
      const text = typeof a === 'string' ? a : a.text
      const done = typeof a === 'string' ? false : a.done
      if (text && text.trim()) {
        lines.push(`- [${done ? 'x' : ' '}] ${text}`)
      }
    })
    lines.push('')
  }

  // Next step
  if (review.nextStepAdvice) {
    lines.push('## 下次准备方向')
    lines.push('')
    lines.push(review.nextStepAdvice)
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push(`> 本报告由 AI 面试小助手生成 · ${new Date().toLocaleString('zh-CN')}`)
  lines.push(`> ${review.aiGenerated ? 'AI 生成 · ' : ''}人工${review.aiGenerated ? '确认' : '填写'}`)

  return lines.join('\n')
}

export function downloadReviewMarkdown(review, interview, job) {
  const markdown = buildReviewMarkdown(review, interview, job)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = new Date()
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const company = (job?.company || '公司').replace(/[^\w\u4e00-\u9fa5]/g, '_')
  const title = (job?.title || '岗位').replace(/[^\w\u4e00-\u9fa5]/g, '_')
  a.download = `${company}-${title}-${dateStr}-复盘.md`
  a.click()
  URL.revokeObjectURL(url)
}
