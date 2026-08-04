import { useState } from 'react'
import { JOB_STAGES, JOB_STATUS } from './ui.jsx'

export default function JobForm({ job, onSave, onCancel }) {
  const [form, setForm] = useState({
    company: job?.company || '',
    title: job?.title || '',
    jdText: job?.jdText || '',
    stage: job?.stage || '准备中',
    status: job?.status || '准备中',
    notes: job?.notes || '',
  })
  const [errors, setErrors] = useState({})

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }))
  }

  const handleSubmit = () => {
    const errs = {}
    if (!form.company.trim()) errs.company = '请输入公司名称'
    if (!form.title.trim()) errs.title = '请输入岗位名称'
    if (!form.status) errs.status = '请选择状态'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    onSave({ ...form, id: job?.id })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label label-required">公司名称</label>
          <input
            className={`input ${errors.company ? 'input-error' : ''}`}
            placeholder="如：字节跳动"
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
          />
          {errors.company && <p className="mt-1 text-xs text-danger">{errors.company}</p>}
        </div>
        <div>
          <label className="label label-required">岗位名称</label>
          <input
            className={`input ${errors.title ? 'input-error' : ''}`}
            placeholder="如：产品经理"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />
          {errors.title && <p className="mt-1 text-xs text-danger">{errors.title}</p>}
        </div>
      </div>

      <div>
        <label className="label">岗位描述（JD）</label>
        <textarea
          className="textarea min-h-[100px]"
          placeholder="粘贴 JD 原文，不超过 5000 字"
          maxLength={5000}
          value={form.jdText}
          onChange={(e) => update('jdText', e.target.value)}
        />
        <p className="mt-1 text-xs text-text-tertiary text-right">{form.jdText.length}/5000</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">面试阶段</label>
          <select
            className="input"
            value={form.stage}
            onChange={(e) => update('stage', e.target.value)}
          >
            {JOB_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label label-required">状态</label>
          <select
            className={`input ${errors.status ? 'input-error' : ''}`}
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
          >
            {JOB_STATUS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">备注</label>
        <textarea
          className="textarea min-h-[60px]"
          placeholder="自由记录"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button className="btn-secondary" onClick={onCancel}>取消</button>
        <button className="btn-primary" onClick={handleSubmit}>保存</button>
      </div>
    </div>
  )
}
