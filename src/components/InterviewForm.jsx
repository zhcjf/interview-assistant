import { useState } from 'react'
import {
  INTERVIEW_ROUNDS,
  INTERVIEW_RESULTS,
  INTERVIEW_FORMATS,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from './ui.jsx'
import { IconPlus, IconTrash } from './Icons.jsx'

export default function InterviewForm({ interview, jobs, onSave, onCancel }) {
  const [form, setForm] = useState({
    jobId: interview?.jobId || '',
    interviewTime: interview?.interviewTime || new Date().toISOString(),
    round: interview?.round || '初面',
    interviewer: interview?.interviewer || '',
    format: interview?.format || '视频',
    questions: interview?.questions?.length ? interview.questions : [''],
    answers: interview?.answers?.length ? interview.answers : [''],
    feeling: interview?.feeling || '',
    result: interview?.result || '待定',
  })
  const [errors, setErrors] = useState({})

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }))
  }

  const updateQA = (idx, field, val) => {
    setForm((f) => {
      const arr = [...f[field]]
      arr[idx] = val
      return { ...f, [field]: arr }
    })
  }

  const addQA = () => {
    setForm((f) => ({
      ...f,
      questions: [...f.questions, ''],
      answers: [...f.answers, ''],
    }))
  }

  const removeQA = (idx) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx),
      answers: f.answers.filter((_, i) => i !== idx),
    }))
  }

  const handleSubmit = () => {
    const errs = {}
    if (!form.jobId) errs.jobId = '请选择关联岗位'
    if (!form.interviewTime) errs.interviewTime = '请选择面试时间'
    if (!form.round) errs.round = '请选择面试轮次'
    const hasQ = form.questions.some((q) => q.trim())
    if (!hasQ) errs.questions = '至少填写一个问题'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // clean up empty QA pairs
    const cleanQ = []
    const cleanA = []
    form.questions.forEach((q, i) => {
      if (q.trim() || (form.answers[i] || '').trim()) {
        cleanQ.push(q.trim())
        cleanA.push((form.answers[i] || '').trim())
      }
    })

    onSave({
      ...form,
      id: interview?.id,
      questions: cleanQ,
      answers: cleanA,
      interviewTime: fromDatetimeLocalValue(form.interviewTime) || form.interviewTime,
    })
  }

  const timeValue = toDatetimeLocalValue(form.interviewTime)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label label-required">关联岗位</label>
          <select
            className={`input ${errors.jobId ? 'input-error' : ''}`}
            value={form.jobId}
            onChange={(e) => update('jobId', e.target.value)}
          >
            <option value="">请选择岗位</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} · {j.title}
              </option>
            ))}
          </select>
          {errors.jobId ? (
            <p className="mt-1 text-xs text-danger">{errors.jobId}</p>
          ) : jobs.length === 0 ? (
            <p className="mt-1 text-xs text-text-tertiary">
              没有岗位？请先到「简历与岗位管理」新建岗位
            </p>
          ) : null}
        </div>
        <div>
          <label className="label label-required">面试时间</label>
          <input
            type="datetime-local"
            className={`input ${errors.interviewTime ? 'input-error' : ''}`}
            value={timeValue}
            onChange={(e) => update('interviewTime', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label label-required">面试轮次</label>
          <select
            className={`input ${errors.round ? 'input-error' : ''}`}
            value={form.round}
            onChange={(e) => update('round', e.target.value)}
          >
            {INTERVIEW_ROUNDS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">面试官</label>
          <input
            className="input"
            placeholder="选填"
            value={form.interviewer}
            onChange={(e) => update('interviewer', e.target.value)}
          />
        </div>
        <div>
          <label className="label">面试形式</label>
          <select
            className="input"
            value={form.format}
            onChange={(e) => update('format', e.target.value)}
          >
            {INTERVIEW_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* QA list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">面试问题列表</label>
          {errors.questions && <span className="text-xs text-danger">{errors.questions}</span>}
        </div>
        <div className="space-y-3">
          {form.questions.map((q, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <input
                  className="input"
                  placeholder="面试官的问题"
                  value={q}
                  onChange={(e) => updateQA(idx, 'questions', e.target.value)}
                />
                {form.questions.length > 1 && (
                  <button
                    onClick={() => removeQA(idx)}
                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-red-50 hover:text-danger transition-colors"
                    title="删除"
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                )}
              </div>
              <textarea
                className="textarea ml-8"
                placeholder="我的回答"
                value={form.answers[idx] || ''}
                onChange={(e) => updateQA(idx, 'answers', e.target.value)}
              />
            </div>
          ))}
        </div>
        <button
          onClick={addQA}
          className="mt-3 w-full py-2.5 rounded-lg border border-dashed border-brand text-brand text-sm font-medium hover:bg-brand/5 transition-colors flex items-center justify-center gap-1.5"
        >
          <IconPlus width={16} height={16} />
          添加一个问题
        </button>
      </div>

      <div>
        <label className="label">整体感受</label>
        <textarea
          className="textarea"
          placeholder="选填，记录面试整体感受"
          value={form.feeling}
          onChange={(e) => update('feeling', e.target.value)}
        />
      </div>

      <div>
        <label className="label">面试结果</label>
        <div className="flex items-center gap-4">
          {INTERVIEW_RESULTS.map((r) => (
            <label key={r} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="result"
                value={r}
                checked={form.result === r}
                onChange={(e) => update('result', e.target.value)}
                className="text-brand focus:ring-brand"
              />
              <span className="text-sm text-text-primary">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button className="btn-secondary" onClick={onCancel}>取消</button>
        <button className="btn-primary" onClick={handleSubmit}>保存</button>
      </div>
    </div>
  )
}
