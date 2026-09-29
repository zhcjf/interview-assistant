import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import questionBank from '../data/question-bank.json'
import { getAIConfig } from '../utils/storage.js'
import { IconChevronDown, IconChevronUp, IconSparkles } from './Icons.jsx'

const CATEGORIES = ['全部', '通用行为类', '项目经历类', '团队协作类', '压力与挑战类', '薪资与期望类', '产品岗专项', '运营岗专项', '技术岗专项']
const SUITABLE_FOR = ['全部', '通用', '产品', '运营', '技术']
const DIFFICULTIES = ['全部', '初级', '中级', '高级']

export default function QuestionBank({ onPractice, activeJobType = '通用' }) {
  const navigate = useNavigate()
  const [filterCategory, setFilterCategory] = useState('全部')
  const [filterSuitable, setFilterSuitable] = useState('全部')
  const [filterDifficulty, setFilterDifficulty] = useState('全部')
  const [expandedId, setExpandedId] = useState(null)

  const questions = questionBank.questions

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filterCategory !== '全部' && q.category !== filterCategory) return false
      if (filterSuitable !== '全部' && !q.suitableFor.includes(filterSuitable)) return false
      if (filterDifficulty !== '全部' && q.difficulty !== filterDifficulty) return false
      return true
    })
  }, [filterCategory, filterSuitable, filterDifficulty])

  const handlePractice = (q) => {
    if (onPractice) {
      onPractice(q.text)
    } else {
      navigate('/preparation')
    }
  }

  const difficultyStyle = {
    初级: 'bg-success/10 text-success',
    中级: 'bg-warning/10 text-warning',
    高级: 'bg-danger/10 text-danger',
  }

  return (
    <div className="flex h-full">
      {/* 左侧筛选 */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-white p-5 overflow-y-auto">
        <h3 className="text-sm font-semibold text-text-primary mb-4">筛选</h3>

        <div className="mb-5">
          <p className="text-xs text-text-tertiary mb-2">岗位类型</p>
          <div className="space-y-1">
            {SUITABLE_FOR.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSuitable(s)}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  filterSuitable === s ? 'bg-brand text-white' : 'text-text-secondary hover:bg-gray-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs text-text-tertiary mb-2">难度</p>
          <div className="space-y-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setFilterDifficulty(d)}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  filterDifficulty === d ? 'bg-brand text-white' : 'text-text-secondary hover:bg-gray-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-text-tertiary mb-2">分类</p>
          <div className="space-y-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  filterCategory === c ? 'bg-brand text-white' : 'text-text-secondary hover:bg-gray-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 右侧题目列表 */}
      <div className="flex-1 overflow-y-auto bg-content p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            题库 <span className="text-sm font-normal text-text-tertiary">({filtered.length}/{questions.length})</span>
          </h3>
          <p className="text-xs text-text-tertiary">点击「去练习」直接跳转到智能问答</p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-text-tertiary">没有符合条件的题目</div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {filtered.map((q) => {
              const isExpanded = expandedId === q.id
              return (
                <div key={q.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{q.text}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs rounded bg-brand/10 text-brand">{q.category}</span>
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-text-tertiary">
                          {q.subCategory}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${difficultyStyle[q.difficulty] || ''}`}>
                          {q.difficulty}
                        </span>
                        {q.suitableFor.map((s) => (
                          <span key={s} className="px-2 py-0.5 text-xs rounded bg-gray-50 text-text-tertiary border border-border">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePractice(q)}
                      className="btn-primary text-xs px-3 py-1.5 flex-shrink-0 flex items-center gap-1"
                    >
                      <IconSparkles width={12} height={12} />
                      去练习
                    </button>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="mt-2 text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1"
                  >
                    {isExpanded ? <IconChevronUp width={12} height={12} /> : <IconChevronDown width={12} height={12} />}
                    {isExpanded ? '收起参考答案' : '查看参考答案框架'}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                      {q.reference}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
