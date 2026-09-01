import { useState, useRef } from 'react'
import { JOB_STAGES, JOB_STATUS } from './ui.jsx'
import { getAIConfig } from '../utils/storage.js'
import { parseJDFromImage } from '../utils/ai-client.js'
import { useToast } from './Toast.jsx'

export default function JobForm({ job, onSave, onCancel }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    company: job?.company || '',
    title: job?.title || '',
    jdText: job?.jdText || '',
    stage: job?.stage || '准备中',
    status: job?.status || '准备中',
    notes: job?.notes || '',
  })
  const [errors, setErrors] = useState({})
  const [parsing, setParsing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

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

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // 显示预览
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    const aiConfig = getAIConfig()
    if (!aiConfig.apiKey) {
      toast.error('请先在「数据与设置」中配置 AI Key，才能使用截图识别')
      return
    }

    setParsing(true)
    try {
      const result = await parseJDFromImage(aiConfig, file)
      // 合并识别结果，非空才覆盖（避免覆盖用户已填内容）
      setForm((prev) => ({
        ...prev,
        company: result.company || prev.company,
        title: result.title || prev.title,
        jdText: result.jdText || prev.jdText,
        notes: result.notes
          ? (prev.notes ? prev.notes + '\n' + result.notes : result.notes)
          : prev.notes,
      }))
      toast.success('✓ 截图解析成功，已自动填入信息，请核对后保存')
    } catch (err) {
      toast.error('截图识别失败：' + err.message)
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* 截图上传区 */}
      <div
        onClick={() => !parsing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer
          ${parsing
            ? 'border-brand/40 bg-brand/5 cursor-wait'
            : 'border-gray-200 hover:border-brand/50 hover:bg-brand/3'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        {previewUrl ? (
          <div className="flex items-center gap-4 p-3">
            <img
              src={previewUrl}
              alt="截图预览"
              className="h-16 w-auto rounded-lg object-cover border border-gray-100 shrink-0"
            />
            <div className="flex-1 min-w-0">
              {parsing ? (
                <div className="flex items-center gap-2 text-brand">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
                  </svg>
                  <span className="text-sm font-medium">AI 正在识别截图内容...</span>
                </div>
              ) : (
                <p className="text-sm text-success font-medium">✓ 识别完成</p>
              )}
              <p className="text-xs text-text-tertiary mt-0.5">点击更换截图</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-text-primary">上传岗位截图，AI 自动解析</p>
            <p className="text-xs text-text-tertiary mt-0.5">支持招聘网站、企业公众号、聊天截图等 · 需先配置 AI Key</p>
          </div>
        )}
      </div>

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
          placeholder="粘贴 JD 原文，或通过上方截图自动填入"
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
          placeholder="薪资范围、地点、特殊要求等"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button className="btn-secondary" onClick={onCancel}>取消</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={parsing}>保存</button>
      </div>
    </div>
  )
}
