import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  exportAllData,
  clearAllData,
  getAIConfig,
  saveAIConfig,
  getBackupConfig,
  saveBackupConfig,
  importPhase1Data,
} from '../utils/storage.js'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { IconDownload, IconTrash, IconUpload, IconCloud, IconAI, IconCheck, IconClose, IconFileText } from '../components/Icons.jsx'
import {
  testAIConnection,
  testAudioConnection,
  detectProviderFromKey,
  smartTestAIConnection,
  smartTestAudioConnection,
  fetchAvailableModels,
  PROVIDER_PRESETS,
} from '../utils/ai-client.js'

// ============ AI 提供商列表（从 PROVIDER_PRESETS 派生，保持唯一数据源）============
const PROVIDER_UI_META = {
  groq: {
    desc: 'Llama 3.3 70B · 极速推理 · 免费无需信用卡',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    recommended: true,
  },
  gemini: {
    desc: 'Gemini 2.5 Flash · 100 万 token 上下文 · 每天 1500 次免费',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  agnes: {
    desc: 'Agnes 2.5 Flash · 512K 上下文 · 国内直连无需代理',
    placeholder: 'agnes-...',
    docsUrl: 'https://platform.agnes-ai.com/',
  },
  qwen: {
    desc: 'Qwen Plus · 100 万 token 上下文 · 中文理解最强',
    placeholder: 'sk-...',
    docsUrl: 'https://bailian.console.aliyun.com/api-key',
  },
  openrouter: {
    desc: '一个 key 使用 DeepSeek / Llama / Gemma 等 20+ 免费模型',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
  },
  custom: {
    desc: '自定义任意 OpenAI 格式兼容的 API 端点',
    placeholder: 'sk-...',
    docsUrl: '',
  },
}

// 完整 PROVIDERS 列表（展示顺序）
const PROVIDER_ORDER = ['groq', 'gemini', 'agnes', 'qwen', 'openrouter', 'custom']
const PROVIDERS = PROVIDER_ORDER.map((id) => {
  const meta = PROVIDER_UI_META[id] || {}
  const preset = PROVIDER_PRESETS[id]
  return {
    id,
    name: preset?.name || id,
    desc: meta.desc || '',
    models: preset?.models || [],
    placeholder: meta.placeholder || 'sk-...',
    docsUrl: meta.docsUrl || '',
    recommended: meta.recommended || false,
  }
})

export default function Settings() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const navigate = useNavigate()

  // AI Config
  const [aiConfig, setAiConfig] = useState(() => {
    const cfg = getAIConfig()
    // 向后兼容：若 apiKeys 不存在但有旧的 apiKey，迁移进去
    const apiKeys = cfg.apiKeys || {}
    if (cfg.apiKey && !apiKeys[cfg.provider]) {
      apiKeys[cfg.provider] = cfg.apiKey
    }
    return { ...cfg, apiKeys }
  })
  const [showKey, setShowKey] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyStep, setVerifyStep] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testMsg, setTestMsg] = useState('')
  const [detectedProvider, setDetectedProvider] = useState(null)
  // 按 provider 记录验证状态：{ groq: 'ok', gemini: 'ok', ... }
  const [verifiedProviders, setVerifiedProviders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ia_verified_providers') || '{}') } catch { return {} }
  })
  // 动态模型列表：从 /v1/models 实时拉取，覆盖静态预设
  const [liveModels, setLiveModels] = useState(null)
  const [loadingModels, setLoadingModels] = useState(false)

  // Audio Transcription Config
  const [showAudioKey, setShowAudioKey] = useState(false)
  const [verifyingAudio, setVerifyingAudio] = useState(false)
  const [audioTestResult, setAudioTestResult] = useState(null)
  const [audioTestMsg, setAudioTestMsg] = useState('')

  // Backup Config
  const [backupConfig, setBackupConfig] = useState(getBackupConfig())
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    saveAIConfig(aiConfig)
  }, [aiConfig])

  useEffect(() => {
    saveBackupConfig(backupConfig)
  }, [backupConfig])

  const current = PROVIDERS.find((p) => p.id === aiConfig.provider)
  // 展示给用户的模型列表：liveModels（从 API 实时拉取）优先，否则用静态预设
  const displayModels = (liveModels && liveModels.length > 0) ? liveModels : (current?.models || [])

  const handleProviderChange = (providerId) => {
    if (providerId === aiConfig.provider) return
    const p = PROVIDERS.find((x) => x.id === providerId)
    // 加载该 provider 已保存的 key（没有则为空，方便重新输入）
    const savedKey = aiConfig.apiKeys?.[providerId] || ''
    setAiConfig((prev) => ({
      ...prev,
      provider: providerId,
      apiKey: savedKey,
      model: p && p.models.length > 0 ? p.models[0] : '',
    }))
    setTestResult(null)
    setLiveModels(null)
    setShowKey(false)
  }

  // cc-switch 风格：拉取该 provider 的真实可用模型列表
  const handleFetchModels = async () => {
    if (!aiConfig.apiKey) { toast.error('请先填入 API Key'); return }
    setLoadingModels(true)
    try {
      const models = await fetchAvailableModels(aiConfig.provider, aiConfig.apiKey, aiConfig.customEndpoint)
      if (models && models.length > 0) {
        setLiveModels(models)
        // 如果当前选中的模型不在实时列表里，自动切换到第一个
        if (!models.includes(aiConfig.model)) {
          setAiConfig((prev) => ({ ...prev, model: models[0] }))
          toast.info(`已从 API 拉取 ${models.length} 个可用模型，并切换到「${models[0]}」`)
        } else {
          toast.success(`已拉取 ${models.length} 个可用模型`)
        }
      } else {
        toast.info('未能从 API 获取模型列表，保留预设模型')
      }
    } catch {
      toast.error('获取模型列表失败')
    } finally {
      setLoadingModels(false)
    }
  }

  // ── 合并后的统一验证入口 ──────────────────────────────────────────
  // 策略（递进，和 cc-switch 一致）：
  //   Step 1: 用当前配置直接测试
  //   Step 2: 若失败且是模型问题 → 调 /v1/models 拿真实列表，用第一个重试
  //   Step 3: 若仍失败 → 跨提供商轮询兜底（智能测试原逻辑）
  //   每步成功立即返回，自动更新模型下拉和提供商选择
  const handleVerify = async () => {
    if (!aiConfig.apiKey) { toast.error('请先填入 API Key'); return }
    setVerifying(true)
    setTestResult(null)
    setVerifyStep('正在验证...')

    try {
      // Step 1: 当前配置直接测
      setVerifyStep('正在验证当前配置...')
      const step1 = await testAIConnection(aiConfig)
      if (step1.ok) {
        _applyVerifySuccess(step1)
        return
      }

      const isModelErr = step1.msg?.includes('端点或模型不存在') ||
        step1.msg?.includes('模型参数错误') ||
        step1.msg?.includes('404') ||
        step1.msg?.includes('400')

      // Step 2: 模型问题 → 拉实时列表重试
      if (isModelErr) {
        setVerifyStep('当前模型不可用，正在从 API 获取可用模型...')
        const live = await fetchAvailableModels(aiConfig.provider, aiConfig.apiKey, aiConfig.customEndpoint)
        if (live && live.length > 0) {
          const step2 = await testAIConnection({ ...aiConfig, model: live[0] })
          if (step2.ok) {
            setLiveModels(live)
            setAiConfig((prev) => ({ ...prev, model: live[0] }))
            _applyVerifySuccess({ ...step2, detectedProvider: aiConfig.provider, detectedModel: live[0], liveModels: live })
            return
          }
        }
      }

      // Step 3: 仍失败 → 跨提供商智能兜底
      setVerifyStep('当前提供商失败，正在尝试其他提供商...')
      const step3 = await smartTestAIConnection(aiConfig.apiKey, aiConfig.provider)
      if (step3.ok) {
        _applyVerifySuccess(step3)
        return
      }

      // 全部失败
      setTestResult('fail')
      setTestMsg(step3.msg || step1.msg || '验证失败，请检查 API Key 是否有效')
      toast.error(step3.msg || step1.msg || '验证失败')
    } catch (e) {
      setTestResult('fail')
      setTestMsg(e.message || '验证失败')
      toast.error('验证失败：' + e.message)
    } finally {
      setVerifying(false)
      setVerifyStep('')
    }
  }

  // 验证成功后统一应用结果（更新 provider / model / liveModels / verifiedProviders）
  const _applyVerifySuccess = (result) => {
    setTestResult('ok')
    setTestMsg(result.msg || '验证通过')

    if (result.liveModels && result.liveModels.length > 0) {
      setLiveModels(result.liveModels)
    }

    const finalProvider = result.detectedProvider || aiConfig.provider
    const finalKey = aiConfig.apiKey

    setAiConfig((prev) => {
      let nextModel = prev.model
      if (result.detectedProvider) {
        const providerEntry = PROVIDERS.find((p) => p.id === result.detectedProvider)
        const availableList = result.liveModels || providerEntry?.models || []
        nextModel = availableList.includes(result.detectedModel ?? '')
          ? result.detectedModel
          : (availableList[0] || result.detectedModel || prev.model)
      } else if (result.suggestedModel) {
        nextModel = result.suggestedModel
      }
      return {
        ...prev,
        provider: finalProvider,
        model: nextModel,
        apiKey: finalKey,
        // 确保切换 provider 后把 key 也存进新 provider 的 slot
        apiKeys: { ...prev.apiKeys, [finalProvider]: finalKey },
      }
    })

    // 标记该 provider 为已验证
    setVerifiedProviders((prev) => {
      const next = { ...prev, [finalProvider]: 'ok' }
      try { localStorage.setItem('ia_verified_providers', JSON.stringify(next)) } catch {}
      return next
    })

    const switched = result.detectedProvider && result.detectedProvider !== aiConfig.provider
    if (switched) {
      const providerEntry = PROVIDERS.find((p) => p.id === result.detectedProvider)
      const availableList = result.liveModels || providerEntry?.models || []
      const bestModel = availableList.includes(result.detectedModel ?? '')
        ? result.detectedModel : (availableList[0] || result.detectedModel)
      toast.success(`✓ 已自动切换到「${providerEntry?.name || result.detectedProvider}」· 模型：${bestModel}`)
    } else if (result.suggestedModel && result.suggestedModel !== aiConfig.model) {
      toast.success(`✓ 验证通过，已切换到可用模型「${result.suggestedModel}」`)
    } else {
      toast.success('✓ 验证通过')
    }
  }

  // cc-switch 风格：根据 Key 前缀自动识别提供商，并自动切换
  const handleAutoDetect = () => {
    if (!aiConfig.apiKey) {
      toast.error('请先填入 API Key')
      return
    }
    const provider = detectProviderFromKey(aiConfig.apiKey)
    if (!provider) {
      toast.info('未能识别该 Key 前缀，请手动选择提供商')
      return
    }
    const p = PROVIDERS.find((x) => x.id === provider)
    setDetectedProvider(provider)
    setAiConfig({
      ...aiConfig,
      provider,
      model: p && p.models.length > 0 ? p.models[0] : aiConfig.model,
    })
    setTestResult(null)
    toast.success(`已自动识别为「${p?.name || provider}」并切换`)
  }

  // ── 音频转录验证（合并）────────────────────────────────────────────
  const handleVerifyAudio = async () => {
    const audio = aiConfig.audio
    if (!audio?.apiKey) { toast.error('请先填入音频转录 API Key'); return }
    setVerifyingAudio(true)
    setAudioTestResult(null)
    try {
      // 先用 smartTest（发真实静音音频验证 key + endpoint + model）
      const result = await smartTestAudioConnection(audio.apiKey, audio.provider)
      if (result.ok) {
        setAudioTestResult('ok')
        setAudioTestMsg(result.msg || '验证通过')
        toast.success('✓ 音频转录验证通过')
      } else {
        setAudioTestResult('fail')
        setAudioTestMsg(result.msg || '验证失败')
        toast.error(result.msg || '验证失败')
      }
    } catch (e) {
      setAudioTestResult('fail')
      setAudioTestMsg(e.message || '验证失败')
      toast.error('音频转录验证失败：' + e.message)
    } finally {
      setVerifyingAudio(false)
    }
  }

  const handleCopyMainKeyToAudio = () => {
    const audio = aiConfig.audio || {}
    setAiConfig({
      ...aiConfig,
      audio: { ...audio, apiKey: aiConfig.apiKey || '' },
    })
    toast.success('已复制主 AI Key 到音频转录（若你是 Groq 主 AI 则可复用）')
  }

  const handleExport = () => {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const d = new Date()
    const name = `interview-data-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    toast.success('数据已导出')
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = importPhase1Data(data)
      if (result.ok) {
        toast.success(`导入成功：${result.stats.jobs} 个岗位、${result.stats.interviews} 条面试、${result.stats.reviews} 条复盘`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        toast.error('导入失败：' + result.msg)
      }
    } catch (err) {
      toast.error('导入失败：' + err.message)
    }
    e.target.value = '' // 清空，方便下次再选同文件
  }

  const handleClear = async () => {
    const ok = await confirm({
      title: '清空全部数据',
      message: '此操作不可撤销，确认清空所有数据吗？所有岗位、面试记录、复盘报告和简历都将被删除。',
      confirmText: '确认清空',
      danger: true,
    })
    if (ok) {
      clearAllData()
      toast.success('数据已清空')
      setTimeout(() => window.location.reload(), 500)
    }
  }

  return (
    <div className="px-8 py-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-text-primary mb-1">数据与设置</h2>
      <p className="text-sm text-text-tertiary mb-6">配置 AI 模型、云备份与数据管理</p>

      {/* ===== AI 模型配置 ===== */}
      <div className="card p-6 mb-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
            <IconAI width={20} height={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary">AI 模型配置</h3>
            <p className="text-sm text-text-tertiary mt-0.5">选择 AI 提供商并填入 API Key，启用智能问答、AI 复盘等功能</p>
          </div>
        </div>

        {/* 提供商选择 */}
        <div className="space-y-3 mb-5">
          {PROVIDERS.map((p) => {
            const isActive = aiConfig.provider === p.id
            const isVerified = verifiedProviders[p.id] === 'ok'
            const hasKey = !!(aiConfig.apiKeys?.[p.id])
            return (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isActive && isVerified
                    ? 'border-success bg-success/5 ring-2 ring-success/20'
                    : isActive
                    ? 'border-brand bg-brand/5 ring-2 ring-brand/20'
                    : isVerified
                    ? 'border-success/40 bg-success/3 hover:border-success/60'
                    : 'border-border hover:border-brand/40 hover:bg-brand/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${isVerified ? 'text-success' : 'text-text-primary'}`}>{p.name}</span>
                      {p.recommended && !isVerified && (
                        <span className="px-2 py-0.5 text-xs rounded-md bg-brand/10 text-brand font-medium">推荐</span>
                      )}
                      {isVerified && (
                        <span className="px-2 py-0.5 text-xs rounded-md bg-success/10 text-success font-medium flex items-center gap-1">
                          <IconCheck width={10} height={10} /> 已验证
                        </span>
                      )}
                      {!isVerified && hasKey && (
                        <span className="px-2 py-0.5 text-xs rounded-md bg-gray-100 text-text-tertiary font-normal">已填 Key</span>
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">{p.desc}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${
                      isActive && isVerified
                        ? 'border-success bg-success'
                        : isActive
                        ? 'border-brand bg-brand'
                        : isVerified
                        ? 'border-success/60 bg-transparent'
                        : 'border-gray-300'
                    }`}
                  >
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* API Key 输入 */}
        <div className="p-4 rounded-xl bg-gray-50 border border-border space-y-4">
          {aiConfig.provider === 'custom' && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">API Base URL</label>
              <input
                className="input w-full"
                placeholder="https://api.example.com/v1"
                value={aiConfig.customEndpoint}
                onChange={(e) => setAiConfig({ ...aiConfig, customEndpoint: e.target.value })}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-text-secondary">API Key</label>
              {current?.docsUrl && (
                <a href={current.docsUrl} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
                  如何获取? →
                </a>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="input w-full pr-20"
                placeholder={current?.placeholder || '请输入 API Key'}
                value={aiConfig.apiKey}
                onChange={(e) => {
                  const val = e.target.value
                  setAiConfig((prev) => ({
                    ...prev,
                    apiKey: val,
                    apiKeys: { ...prev.apiKeys, [prev.provider]: val },
                  }))
                  // key 变更后清除当前 provider 的验证状态
                  setVerifiedProviders((prev) => {
                    const next = { ...prev }
                    delete next[aiConfig.provider]
                    try { localStorage.setItem('ia_verified_providers', JSON.stringify(next)) } catch {}
                    return next
                  })
                  setTestResult(null)
                }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary hover:text-text-primary px-2 py-1"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="text-xs text-text-tertiary mt-1.5">🔒 Key 只存储在你本地浏览器，不会上传任何服务器</p>
          </div>

          {/* 模型选择 */}
          {current && current.provider !== 'custom' && displayModels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  模型
                  {liveModels && liveModels.length > 0 && (
                    <span className="ml-1.5 text-xs text-success font-normal">✓ 已实时更新（{liveModels.length} 个）</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={loadingModels || !aiConfig.apiKey}
                  className="text-xs text-brand hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                  title="从 API 实时拉取该 Key 的可用模型列表"
                >
                  {loadingModels ? '获取中...' : '↻ 刷新模型列表'}
                </button>
              </div>
              <select
                className="input w-full"
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
              >
                {displayModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {/* 如果当前选中的模型不在列表中（手动输入过），保留显示 */}
                {aiConfig.model && !displayModels.includes(aiConfig.model) && (
                  <option key={aiConfig.model} value={aiConfig.model}>
                    {aiConfig.model}（手动配置）
                  </option>
                )}
              </select>
            </div>
          )}

          {/* 自定义模型输入 */}
          {aiConfig.provider === 'custom' && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">模型名</label>
              <input
                className="input w-full"
                placeholder="例如：gpt-4o-mini"
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
              />
            </div>
          )}

          {/* 验证 API */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleVerify}
                disabled={verifying || !aiConfig.apiKey}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title="自动验证：先测当前配置，失败则拉取实时模型重试，仍失败跨提供商兜底"
              >
                {verifying ? '验证中...' : '验证 API'}
              </button>
              <button
                onClick={handleAutoDetect}
                disabled={verifying || !aiConfig.apiKey}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                title="根据 API Key 前缀自动识别提供商"
              >
                🔍 自动识别提供商
              </button>
              {testResult === 'ok' && (
                <span className="text-xs text-success flex items-center gap-1">
                  <IconCheck width={14} height={14} /> {testMsg || '验证通过'}
                </span>
              )}
              {testResult === 'fail' && (
                <span className="text-xs text-danger flex items-center gap-1">
                  <IconClose width={14} height={14} /> {testMsg || '验证失败，请检查 Key 或网络'}
                </span>
              )}
            </div>
            {verifying && verifyStep && (
              <p className="text-xs text-text-tertiary">{verifyStep}</p>
            )}
            {detectedProvider && detectedProvider !== aiConfig.provider && (
              <p className="text-xs text-info">
                💡 已识别该 Key 属于「{PROVIDERS.find((p) => p.id === detectedProvider)?.name || detectedProvider}」，点击「验证 API」可自动切换并验证
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== 音频转录配置 ===== */}
      <div className="card p-6 mb-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
            <IconFileText width={20} height={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary">音频转录配置 (可选)</h3>
            <p className="text-sm text-text-tertiary mt-0.5">
              用于面试记录的「上传音频/视频」功能：Whisper 把录音转文字 → 再走 AI 解析为问答对
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-border space-y-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-success/10 text-success font-medium">免费</span>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              Groq 控制台 →
            </a>
            <span className="text-text-tertiary">
              · 免费层约 2 小时音频/天（14,400 req/日）· 300× 实时速度 · 无需信用卡
            </span>
          </div>
          <p className="text-xs text-text-tertiary -mt-2">
            💡 <span className="font-medium">Groq 是免费的</span>：用 Google 账号登录 console.groq.com 即可创建 Key，
            开发层有免费配额，个人面试录音场景完全够用。填 Key 时建议先点「✨ 智能测试」，会用真实静音音频验证 Key + 模型 + 端点是否全部可用。
          </p>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">转录提供商</label>
            <select
              className="input w-full"
              value={aiConfig.audio?.provider || 'groq'}
              onChange={(e) => setAiConfig({ ...aiConfig, audio: { ...(aiConfig.audio || {}), provider: e.target.value } })}
            >
              <option value="groq">Groq Whisper（推荐，免费够用）</option>
              <option value="custom">自定义 (OpenAI 兼容 Whisper 端点)</option>
            </select>
          </div>

          {aiConfig.audio?.provider === 'custom' && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">API Base URL</label>
              <input
                className="input w-full"
                placeholder="https://api.example.com/v1"
                value={aiConfig.audio?.endpoint || ''}
                onChange={(e) => setAiConfig({ ...aiConfig, audio: { ...(aiConfig.audio || {}), endpoint: e.target.value } })}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-text-secondary">音频转录 API Key</label>
              <button
                onClick={handleCopyMainKeyToAudio}
                className="text-xs text-brand hover:underline"
                type="button"
              >
                复用主 AI Key ↑
              </button>
            </div>
            <div className="relative">
              <input
                type={showAudioKey ? 'text' : 'password'}
                className="input w-full pr-20"
                placeholder="gsk_..."
                value={aiConfig.audio?.apiKey || ''}
                onChange={(e) => setAiConfig({ ...aiConfig, audio: { ...(aiConfig.audio || {}), apiKey: e.target.value } })}
              />
              <button
                onClick={() => setShowAudioKey(!showAudioKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary hover:text-text-primary px-2 py-1"
              >
                {showAudioKey ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="text-xs text-text-tertiary mt-1.5">🔒 Key 仅存储在你本地浏览器，不会上传任何服务器</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">模型</label>
              <select
                className="input w-full"
                value={aiConfig.audio?.model || 'whisper-large-v3-turbo'}
                onChange={(e) => setAiConfig({ ...aiConfig, audio: { ...(aiConfig.audio || {}), model: e.target.value } })}
              >
                <option value="whisper-large-v3-turbo">whisper-large-v3-turbo（最快）</option>
                <option value="whisper-large-v3">whisper-large-v3（更准）</option>
                <option value="distil-whisper-large-v3-en">distil-whisper-large-v3-en（仅英文）</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">识别语言</label>
              <select
                className="input w-full"
                value={aiConfig.audio?.language || 'zh'}
                onChange={(e) => setAiConfig({ ...aiConfig, audio: { ...(aiConfig.audio || {}), language: e.target.value } })}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="">自动检测</option>
              </select>
            </div>
          </div>

          {/* 验证音频 API */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              onClick={handleVerifyAudio}
              disabled={verifyingAudio || !aiConfig.audio?.apiKey}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              title="用真实静音音频 POST 验证 Key + 模型 + 端点是否全部可用"
            >
              {verifyingAudio ? '验证中...' : '验证音频 API'}
            </button>
            {audioTestResult === 'ok' && (
              <span className="text-xs text-success flex items-center gap-1">
                <IconCheck width={14} height={14} /> {audioTestMsg || '验证通过'}
              </span>
            )}
            {audioTestResult === 'fail' && (
              <span className="text-xs text-danger flex items-center gap-1">
                <IconClose width={14} height={14} /> {audioTestMsg || '验证失败，请检查 Key 或网络'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== 云端备份 ===== */}
      <div className="card p-6 mb-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
            <IconCloud width={20} height={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary">云端备份 (可选)</h3>
            <p className="text-sm text-text-tertiary mt-0.5">配置 GitHub Token，实现跨设备数据同步。换电脑/手机也能看到你的数据</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">启用云端备份</p>
              <p className="text-xs text-text-tertiary mt-0.5">每次数据变更自动同步到你 GitHub 仓库的 data-backup.json</p>
            </div>
            <button
              onClick={() => setBackupConfig({ ...backupConfig, enabled: !backupConfig.enabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${backupConfig.enabled ? 'bg-success' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  backupConfig.enabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {backupConfig.enabled && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-text-secondary">GitHub Personal Access Token</label>
                  <a
                    href="https://github.com/settings/tokens?type=beta"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand hover:underline"
                  >
                    如何生成? →
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="input w-full pr-20"
                    placeholder="github_pat_xxx..."
                    value={backupConfig.ghToken}
                    onChange={(e) => setBackupConfig({ ...backupConfig, ghToken: e.target.value })}
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary hover:text-text-primary px-2 py-1"
                  >
                    {showToken ? '隐藏' : '显示'}
                  </button>
                </div>
                <p className="text-xs text-text-tertiary mt-1.5">
                  🔒 只需要 Contents: Read and write 权限，限定到 interview-assistant 单仓库
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block">GitHub 用户名</label>
                  <input
                    className="input w-full"
                    placeholder="zhcjf"
                    value={backupConfig.owner}
                    onChange={(e) => setBackupConfig({ ...backupConfig, owner: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block">仓库名</label>
                  <input
                    className="input w-full"
                    placeholder="interview-assistant"
                    value={backupConfig.repo}
                    onChange={(e) => setBackupConfig({ ...backupConfig, repo: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs text-text-secondary leading-relaxed">
                  💡 <span className="font-medium">工作原理</span>：你填写数据 → 本机先存 IndexedDB → 后台静默推送到你仓库的
                  data-backup.json。换设备打开 → 自动从 GitHub 拉取恢复。
                </p>
              </div>

              {backupConfig.lastBackupAt && (
                <p className="text-xs text-text-tertiary">
                  上次备份：{new Date(backupConfig.lastBackupAt).toLocaleString()}{' '}
                  <span className={backupConfig.lastBackupStatus === 'success' ? 'text-success' : 'text-danger'}>
                    {backupConfig.lastBackupStatus === 'success' ? '成功' : '失败'}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== 数据管理 ===== */}
      <div className="card p-6 mb-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
            <IconDownload width={20} height={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary">数据管理</h3>
            <p className="text-sm text-text-tertiary mt-0.5">导入旧版数据、导出备份，或在需要时清空所有本地记录</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* 导入 Phase 1 数据 */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-brand/30 bg-brand/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                <IconUpload width={20} height={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">导入 Phase 1 数据 (JSON)</p>
                <p className="text-xs text-text-tertiary mt-0.5">从 Phase 1 版本导出的 JSON 文件迁移过来</p>
              </div>
            </div>
            <label className="btn-primary cursor-pointer">
              选择文件导入
              <input type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
            </label>
          </div>

          {/* 导出 */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                <IconDownload width={20} height={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">导出全部数据 (JSON)</p>
                <p className="text-xs text-text-tertiary mt-0.5">包含所有岗位、面试记录、复盘报告</p>
              </div>
            </div>
            <button className="btn-primary" onClick={handleExport}>导出数据</button>
          </div>

          {/* 清空 */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-danger/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
                <IconTrash width={20} height={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">清空全部数据</p>
                <p className="text-xs text-text-tertiary mt-0.5">删除所有本地记录，操作不可撤销</p>
              </div>
            </div>
            <button className="btn-danger" onClick={handleClear}>清空数据</button>
          </div>
        </div>
      </div>

      {/* ===== 关于 ===== */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-text-primary mb-3">关于</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">版本号</span>
            <span className="text-text-primary font-medium">v2.0.0 (Phase 2 - AI 智能版)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">数据存储</span>
            <span className="text-text-primary">本地浏览器 + GitHub 云备份 (可选)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">AI 提供商</span>
            <span className="text-text-primary">{current?.name || '未配置'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">AI 状态</span>
            <span className={aiConfig.apiKey ? 'text-success' : 'text-warning'}>
              {aiConfig.apiKey ? '✓ 已配置' : '⚠ 未配置，AI 功能将不可用'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">音频转录</span>
            <span className={aiConfig.audio?.apiKey ? 'text-success' : 'text-text-tertiary'}>
              {aiConfig.audio?.apiKey ? '✓ 已配置' : '未配置，音视频上传不可用'}
            </span>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-sm text-text-secondary leading-relaxed">
            Phase 2 已接入真实 AI 能力。请在上方配置 AI 模型，即可使用智能问答、AI 复盘、简历解析等高级功能。所有配置仅存储在你本地浏览器，不会上传任何服务器。
          </p>
        </div>
      </div>

      {dialog}
    </div>
  )
}
