import { getJobs } from '../utils/storage.js'
import { IconPrep } from '../components/Icons.jsx'

export default function Preparation() {
  const jobs = getJobs()

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border bg-white p-6 overflow-y-auto">
        <h3 className="text-base font-semibold text-text-primary mb-4">个性化推荐</h3>
        {jobs.length === 0 ? (
          <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-border text-center">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand mx-auto mb-2">
              <IconPrep width={20} height={20} />
            </div>
            <p className="text-sm text-text-tertiary">请先录入岗位信息以获取推荐</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => (
              <div
                key={j.id}
                className="p-3 rounded-lg border border-border hover:border-brand hover:bg-brand/5 cursor-pointer transition-colors"
              >
                <p className="text-sm font-medium text-text-primary truncate">{j.company}</p>
                <p className="text-xs text-text-tertiary mt-0.5 truncate">{j.title}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-text-tertiary mb-3">快捷问题模板</p>
          <div className="space-y-1.5">
            {['自我介绍', '项目经验', '离职原因', '职业规划', '薪资期望'].map((q) => (
              <button
                key={q}
                disabled
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-tertiary bg-gray-50 cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col bg-content">
        {/* Tabs */}
        <div className="px-8 pt-6">
          <div className="flex gap-1 p-1 bg-white rounded-lg border border-border w-fit shadow-sm">
            <button
              className="px-5 py-2 rounded-md text-sm font-medium bg-brand text-white"
            >
              智能问答
            </button>
            <button
              disabled
              className="px-5 py-2 rounded-md text-sm font-medium text-text-tertiary cursor-not-allowed"
            >
              常规问题库
            </button>
          </div>
        </div>

        {/* Dialog area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white mb-5 shadow-lg">
            <IconPrep width={40} height={40} />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">AI 问答功能即将上线</h3>
          <p className="text-sm text-text-tertiary text-center max-w-md">
            Phase 2 将接入 AI 智能问答，基于你的岗位信息生成面试预测题、答题建议和模拟对话，敬请期待
          </p>
        </div>

        {/* Input area (disabled) */}
        <div className="px-8 pb-6">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-3">
            <div className="flex items-center gap-2">
              <input
                disabled
                placeholder="问答功能开发中"
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 text-sm text-text-tertiary cursor-not-allowed"
              />
              <button
                disabled
                className="px-5 py-2.5 rounded-lg bg-gray-200 text-text-tertiary text-sm font-medium cursor-not-allowed"
              >
                发送
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {['请帮我预测面试题', '我的简历适合这个岗位吗', '如何回答离职原因'].map((q) => (
                <button
                  key={q}
                  disabled
                  className="px-3 py-1.5 rounded-full bg-gray-50 border border-border text-xs text-text-tertiary cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
