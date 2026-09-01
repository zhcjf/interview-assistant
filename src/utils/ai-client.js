// AI 客户端封装 - 统一管理多家 LLM API 调用
// 支持: Google Gemini / Agnes AI / Qwen / OpenRouter / 自定义 OpenAI 兼容

// ============ 默认配置 ============
const PROVIDER_CONFIGS = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    chatPath: '/chat/completions',
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    chatPath: '/chat/completions',
  },
  agnes: {
    name: 'Agnes AI',
    baseUrl: 'https://apihub.agnes-ai.com/v1',
    chatPath: '/chat/completions',
  },
  qwen: {
    name: 'Qwen 通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    chatPath: '/chat/completions',
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    chatPath: '/chat/completions',
  },
  zhipu: {
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    chatPath: '/chat/completions',
  },
  siliconflow: {
    name: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    chatPath: '/chat/completions',
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    chatPath: '/chat/completions',
  },
}

// ============ 系统提示词（产品人设）============
export const SYSTEM_PROMPT_INTERVIEW_COACH = `你是一位资深的面试教练，拥有10年以上的招聘和求职辅导经验。
你的职责是帮助用户准备面试、分析面试表现、提供改进建议。

回答原则：
1. 结构清晰，使用分点或分段，使用 Markdown 格式
2. 结合用户的具体情况（简历、岗位、实际回答）给出个性化建议，不泛泛而谈
3. 保持专业但友好的语气
4. 回答长度适中，避免废话
5. 如果问题不清晰，先澄清再回答
6. 使用中文回答

回答智能问答时，按以下结构输出（Markdown）：

**💡 核心要点**
一句话点明问题本质。

**📋 回答框架**
1. 第一步...
2. 第二步...
3. 第三步...

**💬 话术示例**
> "我认为..."（结合用户岗位）

**⚠️ 常见误区**
- 避免...
- 不要...

**🔄 追问应对**
如果面试官追问 X，可以这样回答...`

export const SYSTEM_PROMPT_REVIEW = `你是一位面试教练，请根据以下面试记录生成结构化复盘报告。

你需要严格按照 JSON 格式输出（不要包裹 markdown 代码块，不要任何前后说明，直接输出纯 JSON），格式如下：

{
  "qaDetails": [
    { "score": 4, "comment": "对每道题的详细评价" }
  ],
  "dimensionScores": {
    "structure": 4,
    "relevance": 3,
    "fluency": 4,
    "highlights": 3,
    "interaction": 3
  },
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "improvements": ["待改进1", "待改进2", "待改进3"],
  "actions": ["具体行动1", "具体行动2"],
  "nextStepAdvice": "下次准备这个岗位的重点方向..."
}

评分标准：1-5 分，5 分最高。highlights 和 improvements 至少各 3 条。actions 是后续需要做的具体行动。`

export const SYSTEM_PROMPT_RESUME_PARSE = `你是一位简历解析助手。请把简历文本解析为结构化 JSON。

严格按 JSON 格式输出（不要 markdown 代码块，不要前后说明），结构如下：

{
  "name": "姓名",
  "phone": "电话(可选)",
  "email": "邮箱(可选)",
  "education": [
    { "school": "学校", "major": "专业", "degree": "本科/硕士/博士", "year": "毕业年份" }
  ],
  "experience": [
    {
      "company": "公司",
      "title": "职位",
      "duration": "时间段",
      "highlights": ["工作成果1", "工作成果2"]
    }
  ],
  "skills": ["技能1", "技能2"],
  "summary": "一段话总结其背景"
}`

export const SYSTEM_PROMPT_MATCH = `你是一位简历与岗位匹配分析助手。请分析简历与岗位 JD 的匹配度。

严格按 JSON 格式输出（不要 markdown 代码块，不要前后说明），结构如下：

{
  "matchScore": 72,
  "matchedPoints": ["匹配项1", "匹配项2", "匹配项3"],
  "gaps": ["差距1", "差距2"],
  "suggestions": ["建议1", "建议2"],
  "highRiskQuestions": ["面试官可能问的高风险问题1", "问题2"]
}

matchScore 是 0-100 的整数。`

export const SYSTEM_PROMPT_PREDICT = `你是一位面试题预测助手。请基于简历和岗位 JD 预测面试官可能问的高频问题。

严格按 JSON 格式输出（不要 markdown 代码块，不要前后说明），结构如下：

{
  "questions": [
    {
      "text": "问题文本",
      "reason": "为什么预测这道题",
      "priority": "high",
      "prepAdvice": "准备建议"
    }
  ]
}

priority 取值：high / medium / low。至少输出 3 个预测问题，建议 5-8 个。`

export const SYSTEM_PROMPT_INTERVIEW_PARSE = `你是一位面试记录结构化助手。请把任意格式的面试记录（面试官与候选人的对话、QA 笔记、自由流水记录等）解析成结构化的问答对 JSON。

注意：不要套用任何固定模板，根据原文语义智能识别：
- 面试官提问 vs 候选人回答
- 即使没有明显的"Q:/A:"标记，也要根据上下文判断问答关系
- 如果是流水叙述，可拆成"问/答"对：把问题或话题作为 question，详细内容作为 answer
- 招呼、寒暄、结束语等可忽略或并入相邻问答
- 若整段没有问答关系（如纯叙述感想），则作为一个 item，question 留空，answer 放原文

严格按 JSON 格式输出（不要 markdown 代码块，不要前后说明），结构如下：

{
  "items": [
    { "question": "面试官的提问", "answer": "候选人的回答" }
  ],
  "summary": "整体感受或备注（可选，若原文未体现则留空字符串）"
}

items 至少 1 条；如能识别出多组问答则全部输出。`

// ============ 构建请求 URL 和 Headers ============
function getRequestConfig(aiConfig) {
  const provider = aiConfig.provider
  const cfg = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.custom

  let baseUrl = cfg.baseUrl
  if (provider === 'custom') {
    baseUrl = (aiConfig.customEndpoint || '').replace(/\/$/, '')
    if (!baseUrl) throw new Error('未配置 API Base URL')
  }

  const url = baseUrl + cfg.chatPath
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${aiConfig.apiKey}`,
  }

  // OpenRouter 推荐 HTTP-Referer 和 X-Title
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://zhcjf.github.io/interview-assistant/'
    headers['X-Title'] = 'Interview Assistant'
  }

  return { url, headers, model: aiConfig.model }
}

// ============ 通用聊天调用（非流式）============
export async function chatCompletion(aiConfig, messages, options = {}) {
  if (!aiConfig.apiKey) {
    throw new Error('AI 未配置，请先在设置页填入 API Key')
  }

  const { url, headers, model } = getRequestConfig(aiConfig)

  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
    ...options.extra,
  }

  // Gemini 兼容 OpenAI 模式不支持 max_tokens，使用 maxOutputTokens 在 extra 中处理
  if (aiConfig.provider === 'gemini' && body.max_tokens) {
    body.max_tokens = body.max_tokens
  }

  let response
  try {
    response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
      options.retries ?? 2
    )
  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      throw new Error('网络错误或 CORS 不支持，请检查网络或换一个 API 提供商')
    }
    throw new Error('请求失败：' + e.message)
  }

  if (!response.ok) {
    let errBody = ''
    try {
      errBody = await response.text()
    } catch {}
    let errJson = null
    try {
      errJson = JSON.parse(errBody)
    } catch {}
    const rawMsg = errJson?.error?.message || errJson?.error?.code || errJson?.message || errBody.slice(0, 200)
    const parsed = parseHttpError(response.status, errBody)
    throw new Error(parsed.msg + (parsed.hint ? `（${parsed.hint}）` : rawMsg ? `：${rawMsg}` : ''))
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('AI 返回内容解析失败')
  }

  // OpenAI 兼容格式
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI 返回空内容')
  }
  return content
}

// ============ 流式聊天调用 ============
export async function* chatCompletionStream(aiConfig, messages, options = {}) {
  if (!aiConfig.apiKey) {
    throw new Error('AI 未配置，请先在设置页填入 API Key')
  }

  const { url, headers, model } = getRequestConfig(aiConfig)

  const body = {
    model,
    messages,
    stream: true,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
    ...options.extra,
  }

  let response
  try {
    response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
      options.retries ?? 2
    )
  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      throw new Error('网络错误或 CORS 不支持，请检查网络或换一个 API 提供商')
    }
    throw new Error('请求失败：' + e.message)
  }

  if (!response.ok) {
    let errBody = ''
    try {
      errBody = await response.text()
    } catch {}
    let errJson = null
    try {
      errJson = JSON.parse(errBody)
    } catch {}
    const rawMsg = errJson?.error?.message || errJson?.error?.code || errJson?.message || errBody.slice(0, 200)
    const parsed = parseHttpError(response.status, errBody)
    throw new Error(parsed.msg + (parsed.hint ? `（${parsed.hint}）` : rawMsg ? `：${rawMsg}` : ''))
  }

  if (!response.body) {
    throw new Error('AI 未返回流式内容')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (!trimmed.startsWith('data:')) continue

      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return

      try {
        const chunk = JSON.parse(data)
        const delta = chunk.choices?.[0]?.delta
        if (!delta) continue

        // 推理模型（agnes-2.5-flash / deepseek-r1 等）：
        //   先输出 reasoning_content（思考过程），再输出 content（最终回答）
        // 策略：只 yield content，静默忽略 reasoning_content
        // UI 显示「AI 正在思考...」即可，不需要展示思考过程避免回答冗长
        if (delta.content) {
          yield delta.content
        }
      } catch {
        // 忽略解析失败的行（如心跳/注释）
      }
    }
  }
}

// ============ 测试连通性（带重试 + 错误细节解析）============
const MAX_TEST_RETRIES = 2

async function fetchWithRetry(url, options = {}, retries = MAX_TEST_RETRIES) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (e) {
      lastErr = e
      // 仅对网络层错误重试（TypeError = fetch failed）
      if (e.name === 'TypeError' && attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
        continue
      }
      throw e
    }
  }
  throw lastErr
}

function parseHttpError(status, errBody) {
  const body = errBody || ''
  if (status === 401 || status === 403) {
    return { msg: 'API Key 无效或权限不足', hint: '请检查 Key 是否复制完整、是否过期、是否拥有该模型权限' }
  }
  if (status === 404) {
    return { msg: '端点或模型不存在', hint: '请检查 Base URL 和模型名是否正确' }
  }
  if (status === 429) {
    return { msg: '请求频率过高或免费额度用尽', hint: '请稍后重试，或在控制台查看免费层配额' }
  }
  if (status === 400 || status === 422) {
    let detail = body.slice(0, 200)
    if (detail.includes('model')) {
      return { msg: `模型参数错误（${status}）`, hint: '请检查模型名是否在当前提供商支持列表内' }
    }
    return { msg: `请求参数错误（${status}）`, hint: detail || '请检查请求体格式' }
  }
  if (status >= 500) {
    return { msg: `AI 服务端错误（${status}）`, hint: '请稍后重试，可能是服务端临时故障' }
  }
  return { msg: body ? `HTTP ${status}: ${body.slice(0, 150)}` : `HTTP ${status}`, hint: '' }
}

export async function testAIConnection(aiConfig) {
  if (!aiConfig.apiKey) {
    return { ok: false, msg: '请先填入 API Key' }
  }
  if (!aiConfig.model && aiConfig.provider !== 'custom') {
    return { ok: false, msg: '请选择模型' }
  }
  if (aiConfig.provider === 'custom' && !aiConfig.customEndpoint) {
    return { ok: false, msg: '请填入 API Base URL' }
  }

  const testMessages = [
    { role: 'system', content: '你是测试助手。' },
    { role: 'user', content: '请回复"ok"两个字符' },
  ]

  // 第一次：用用户当前配置的模型测试
  try {
    const reply = await chatCompletion(aiConfig, testMessages, { maxTokens: 500, temperature: 0 })
    if (reply && reply.trim()) {
      return { ok: true, msg: `连接成功，模型：${aiConfig.model}，响应：${reply.slice(0, 30)}` }
    }
    return { ok: false, msg: 'AI 返回空内容（可能是 max_tokens 过小或模型限制）' }
  } catch (e) {
    const isModelError =
      e.message.includes('端点或模型不存在') ||
      e.message.includes('模型参数错误') ||
      e.message.includes('404') ||
      e.message.includes('400') ||
      e.message.includes('422')

    if (!isModelError) {
      return { ok: false, msg: e.message || '连接失败' }
    }

    // cc-switch 风格：当前模型失败 → 先尝试从 /v1/models 获取真实可用模型，再用第一个测试
    const preset = PROVIDER_PRESETS[aiConfig.provider]
    const liveModels = await fetchAvailableModels(aiConfig.provider, aiConfig.apiKey, aiConfig.customEndpoint)
    const fallbackModel = liveModels?.[0] || (preset?.testModel)
    if (fallbackModel && fallbackModel !== aiConfig.model) {
      try {
        const fallbackConfig = { ...aiConfig, model: fallbackModel }
        const reply2 = await chatCompletion(fallbackConfig, testMessages, { maxTokens: 500, temperature: 0 })
        if (reply2 && reply2.trim()) {
          const source = liveModels ? '实时获取' : '预设'
          return {
            ok: true,
            msg: `连接成功（模型「${aiConfig.model}」不可用，已用${source}模型「${fallbackModel}」验证连通性）`,
            suggestedModel: fallbackModel,
            liveModels, // 返回给调用方，可用于刷新下拉列表
          }
        }
      } catch {}
    }

    return { ok: false, msg: e.message || '连接失败' }
  }
}

// ============ 便捷业务方法 ============

// 智能问答：注入岗位 + 简历上下文
const MAX_RESUME_JSON_CHARS = 9000
const MAX_RESUME_RAWTEXT_CHARS = 4000

function safeParseJSON(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function truncateText(text, max) {
  if (!text || typeof text !== 'string') return ''
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n...（已截断，共 ${text.length} 字）`
}

function buildInterviewContext(job, resume) {
  const debug = {
    jobIncluded: false,
    jobHasJD: false,
    resumeIncluded: false,
    resumeSource: 'none', // none | parsedJson | rawText
    resumeFieldsIncluded: [],
    parsedJsonCharsIncluded: 0,
    rawTextCharsIncluded: 0,
  }

  let contextPrompt = ''

  if (job) {
    debug.jobIncluded = true
    contextPrompt += `\n\n【当前岗位】\n公司：${job.company || '未填写'}\n岗位：${job.title || '未填写'}`
    if (job.jdText) {
      debug.jobHasJD = true
      contextPrompt += `\n岗位要求：\n${job.jdText}`
    }
  }

  if (resume) {
    const parsed = safeParseJSON(resume.parsedJson)

    if (parsed && typeof parsed === 'object') {
      debug.resumeIncluded = true
      debug.resumeSource = 'parsedJson'

      const fields = ['name', 'phone', 'email', 'education', 'experience', 'skills', 'summary']
      debug.resumeFieldsIncluded = fields.filter((k) => parsed[k] !== undefined && parsed[k] !== null)

      const fullResumeJson = truncateText(JSON.stringify(parsed, null, 2), MAX_RESUME_JSON_CHARS)
      debug.parsedJsonCharsIncluded = fullResumeJson.length
      contextPrompt += `\n\n【用户简历结构化数据（完整）】\n${fullResumeJson}`

      if (resume.rawText) {
        const rawExcerpt = truncateText(resume.rawText, MAX_RESUME_RAWTEXT_CHARS)
        debug.rawTextCharsIncluded = rawExcerpt.length
        contextPrompt += `\n\n【用户简历原文片段】\n${rawExcerpt}`
      }
    } else if (resume.rawText) {
      debug.resumeIncluded = true
      debug.resumeSource = 'rawText'
      const rawExcerpt = truncateText(resume.rawText, MAX_RESUME_RAWTEXT_CHARS)
      debug.rawTextCharsIncluded = rawExcerpt.length
      contextPrompt += `\n\n【用户简历原文（未结构化）】\n${rawExcerpt}`
    }
  }

  return { contextPrompt, debug }
}

export function getInterviewContextDebug(job, resume) {
  return buildInterviewContext(job, resume).debug
}

export async function* chatInterviewCoach(aiConfig, messages, job, resume, options = {}) {
  const { contextPrompt } = buildInterviewContext(job, resume)

  const systemMsg = {
    role: 'system',
    content: SYSTEM_PROMPT_INTERVIEW_COACH + (contextPrompt ? `\n\n以下是用户的具体背景信息：${contextPrompt}` : ''),
  }

  const fullMessages = [systemMsg, ...messages]
  yield* chatCompletionStream(aiConfig, fullMessages, options)
}

// 生成复盘报告
export async function generateReview(aiConfig, interview, job, options = {}) {
  let prompt = ''
  if (job) {
    prompt += `【岗位信息】\n公司：${job.company}，岗位：${job.title}，轮次：${interview.round || ''}\n`
    if (job.jdText) prompt += `岗位要求摘要：${job.jdText.slice(0, 500)}\n`
  }
  prompt += `\n【面试问答记录】\n`
  if (Array.isArray(interview.questions)) {
    interview.questions.forEach((q, i) => {
      const a = interview.answers?.[i] || ''
      prompt += `Q${i + 1}：${q}\nA：${a}\n\n`
    })
  }
  if (interview.feeling) prompt += `【整体感受】\n${interview.feeling}\n`
  if (interview.result) prompt += `【面试结果】\n${interview.result}\n`

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT_REVIEW },
    { role: 'user', content: prompt },
  ]

  const text = await chatCompletion(aiConfig, messages, {
    maxTokens: 3000,
    temperature: 0.3,
    ...options,
  })

  // 尝试提取 JSON
  return extractJSON(text)
}

// 解析简历
export async function parseResume(aiConfig, resumeText, options = {}) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT_RESUME_PARSE },
    { role: 'user', content: `请解析以下简历文本：\n\n${resumeText}` },
  ]
  const text = await chatCompletion(aiConfig, messages, {
    maxTokens: 2000,
    temperature: 0.2,
    ...options,
  })
  return extractJSON(text)
}

// 简历 × 岗位匹配
export async function analyzeMatch(aiConfig, resumeParsed, job, options = {}) {
  let prompt = `【简历结构化数据】\n${JSON.stringify(resumeParsed, null, 2)}\n\n`
  prompt += `【岗位 JD】\n${job.jdText || job.title || ''}\n`

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT_MATCH },
    { role: 'user', content: prompt },
  ]
  const text = await chatCompletion(aiConfig, messages, {
    maxTokens: 1500,
    temperature: 0.3,
    ...options,
  })
  return extractJSON(text)
}

// 个性化问题预测
export async function predictQuestions(aiConfig, resumeParsed, job, interviewRound, options = {}) {
  let prompt = `【简历结构化数据】\n${JSON.stringify(resumeParsed, null, 2)}\n\n`
  prompt += `【岗位 JD】\n${job.jdText || ''}\n`
  if (interviewRound) prompt += `【面试轮次】${interviewRound}\n`

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT_PREDICT },
    { role: 'user', content: prompt },
  ]
  const text = await chatCompletion(aiConfig, messages, {
    maxTokens: 2000,
    temperature: 0.4,
    ...options,
  })
  return extractJSON(text)
}

// ============ 面试记录 AI 解析（替代固定模板正则）============
export async function parseInterviewText(aiConfig, rawText, context = {}, options = {}) {
  let prompt = ''
  if (context.jobTitle || context.company) {
    prompt += `【面试背景】\n公司：${context.company || '未知'}\n岗位：${context.jobTitle || '未知'}\n`
    if (context.round) prompt += `轮次：${context.round}\n`
    prompt += '\n'
  }
  prompt += `【面试记录原文】\n${rawText}\n\n请按系统提示的 JSON 结构解析上述面试记录。`

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT_INTERVIEW_PARSE },
    { role: 'user', content: prompt },
  ]

  const text = await chatCompletion(aiConfig, messages, {
    maxTokens: 4000,
    temperature: 0.2,
    ...options,
  })
  const parsed = extractJSON(text)
  // 兼容字段：items 或 qaPairs
  const items = parsed.items || parsed.qaPairs || []
  return {
    items: Array.isArray(items) ? items : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    raw: text,
  }
}

// ============ 音频转录：Groq Whisper（OpenAI 兼容）============
const AUDIO_PROVIDER_CONFIGS = {
  groq: {
    name: 'Groq Whisper',
    baseUrl: 'https://api.groq.com/openai/v1',
    transcribePath: '/audio/transcriptions',
  },
  gemini: {
    // 暂不在这里实现，预留扩展点
    name: 'Gemini',
    baseUrl: '',
    transcribePath: '',
  },
  custom: {
    name: '自定义 (OpenAI 兼容)',
    baseUrl: '',
    transcribePath: '/audio/transcriptions',
  },
}

export function getAudioConfig() {
  // 直接从 localStorage 读取，避免和 storage.js 循环依赖
  try {
    const raw = localStorage.getItem('ia_ai_config')
    if (!raw) return null
    const cfg = JSON.parse(raw)
    if (!cfg || typeof cfg !== 'object') return null
    const audio = cfg.audio || {}
    return {
      provider: audio.provider || 'groq',
      apiKey: audio.apiKey || '',
      model: audio.model || 'whisper-large-v3-turbo',
      language: audio.language || 'zh',
      endpoint: audio.endpoint || '',
    }
  } catch {
    return null
  }
}

export async function testAudioConnection(audioConfig) {
  if (!audioConfig.apiKey) {
    return { ok: false, msg: '请先填入音频转录 API Key' }
  }
  const cfg = AUDIO_PROVIDER_CONFIGS[audioConfig.provider] || AUDIO_PROVIDER_CONFIGS.groq
  let baseUrl = cfg.baseUrl
  if (audioConfig.provider === 'custom') {
    baseUrl = (audioConfig.endpoint || '').replace(/\/$/, '')
    if (!baseUrl) return { ok: false, msg: '请填入 API Base URL' }
  }
  const url = baseUrl + cfg.transcribePath

  // 真实测试：POST 一段 0.5 秒的静音 WAV，证明 key + endpoint + model 全部可用
  const silentWavBlob = buildSilentWavBlob(0.5)
  const formData = new FormData()
  formData.append('file', new File([silentWavBlob], 'test.wav', { type: 'audio/wav' }))
  formData.append('model', audioConfig.model || 'whisper-large-v3-turbo')
  formData.append('response_format', 'text')

  let res
  try {
    res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${audioConfig.apiKey}` },
        body: formData,
      },
      1 // 重试 1 次即可
    )
  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { ok: false, msg: '网络错误或 CORS 不支持，请检查网络或换一个提供商' }
    }
    return { ok: false, msg: e.message || '连接失败' }
  }

  if (!res.ok) {
    let errBody = ''
    try {
      errBody = await res.text()
    } catch {}
    const parsed = parseHttpError(res.status, errBody)
    return { ok: false, msg: parsed.msg + (parsed.hint ? `（${parsed.hint}）` : '') }
  }

  // 200 OK = key + endpoint + model 全部可用
  return {
    ok: true,
    msg: `连接成功（${audioConfig.provider} · ${audioConfig.model || 'whisper-large-v3-turbo'}）`,
  }
}

// ============ cc-switch 风格：Key 前缀自动识别 + 智能测试 ============
// 不同提供商的 Key 前缀有特征，可据此自动猜测用户填的 Key 属于哪家
export function detectProviderFromKey(key) {
  if (!key) return null
  const k = key.trim()
  if (k.startsWith('gsk_')) return 'groq'
  if (k.startsWith('AIza')) return 'gemini'
  if (k.startsWith('sk-or-v1-')) return 'openrouter'
  if (k.startsWith('agnes-') || k.startsWith('ag_')) return 'agnes'
  // 智谱 GLM Key 格式：长度64位的字母数字串（无前缀），或 JWT 格式
  if (/^[0-9a-f]{32}\.[0-9a-zA-Z]{32}$/.test(k)) return 'zhipu'
  // 硅基流动 Key：sk- 开头，但比 Qwen 更长（通常 > 40 字符）
  if (k.startsWith('sf-') || k.startsWith('siliconflow-')) return 'siliconflow'
  if (k.startsWith('sk-')) return 'qwen' // 通义/Qwen 也用 sk-
  return null
}

// ============ cc-switch 风格：从 /v1/models 获取真实可用模型列表 ============
// 这是 cc-switch 准确性的核心：不依赖硬编码，而是问 API "你有哪些模型"
// 返回 string[] 模型 ID，失败返回 null（不抛错）
export async function fetchAvailableModels(provider, apiKey, customEndpoint = '') {
  if (!apiKey) return null
  const preset = PROVIDER_PRESETS[provider]
  let baseUrl = preset?.baseUrl || ''
  if (provider === 'custom') {
    baseUrl = (customEndpoint || '').replace(/\/$/, '')
    if (!baseUrl) return null
  }
  if (!baseUrl) return null

  const url = baseUrl + '/models'
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(preset?.extraHeaders || {}),
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // OpenAI 兼容格式: { data: [{ id, object, ... }] } 或 { models: [...] }
    const raw = data.data || data.models || []
    if (!Array.isArray(raw) || raw.length === 0) return null

    // 过滤掉非文本生成模型（whisper/tts/embed/image 等），只保留 chat 模型
    const EXCLUDE_KEYWORDS = ['whisper', 'tts', 'embed', 'image', 'vision-embed', 'rerank', 'guard']
    const chatModels = raw
      .map((m) => (typeof m === 'string' ? m : m.id || ''))
      .filter((id) => id && !EXCLUDE_KEYWORDS.some((kw) => id.toLowerCase().includes(kw)))

    return chatModels.length > 0 ? chatModels : null
  } catch {
    return null
  }
}

// 生成 0.5 秒静音 WAV Blob（用于转录连通性测试）
function buildSilentWavBlob(seconds) {
  const sampleRate = 16000
  const numSamples = Math.floor(sampleRate * seconds)
  const dataSize = numSamples * 2 // 16-bit
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF header
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)
  // 采样全 0（静音）
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, 0, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export async function transcribeAudio(audioConfig, audioBlob, options = {}) {
  if (!audioConfig || !audioConfig.apiKey) {
    throw new Error('音频转录未配置，请先在设置页填入 API Key')
  }
  const cfg = AUDIO_PROVIDER_CONFIGS[audioConfig.provider] || AUDIO_PROVIDER_CONFIGS.groq
  let baseUrl = cfg.baseUrl
  if (audioConfig.provider === 'custom') {
    baseUrl = (audioConfig.endpoint || '').replace(/\/$/, '')
    if (!baseUrl) throw new Error('未配置音频转录 API Base URL')
  }
  const url = baseUrl + cfg.transcribePath

  const formData = new FormData()
  // 给 blob 一个文件名（Groq 需要扩展名来识别格式）
  const filename = options.filename || audioBlob.name || 'audio.wav'
  const file =
    audioBlob instanceof File
      ? audioBlob
      : new File([audioBlob], filename, { type: audioBlob.type || 'audio/wav' })
  formData.append('file', file)
  formData.append('model', audioConfig.model || 'whisper-large-v3-turbo')
  formData.append('response_format', options.responseFormat || 'text')
  if (audioConfig.language && !options.skipLanguage) {
    formData.append('language', audioConfig.language)
  }
  if (options.prompt) {
    formData.append('prompt', options.prompt)
  }

  let res
  try {
    res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${audioConfig.apiKey}` },
        body: formData,
      },
      1
    )
  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      throw new Error('网络错误或 CORS 不支持，请检查网络或换一个转录提供商')
    }
    throw new Error('请求失败：' + e.message)
  }

  if (!res.ok) {
    let errBody = ''
    try {
      errBody = await res.text()
    } catch {}
    const parsed = parseHttpError(res.status, errBody)
    if (res.status === 413) {
      throw new Error('音频文件过大（Groq 限制 25MB），请缩短录音或导出更低码率')
    }
    throw new Error(parsed.msg + (parsed.hint ? `（${parsed.hint}）` : ''))
  }

  // response_format=text 时直接返回字符串；json 时取 text 字段
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    return data.text || ''
  }
  return await res.text()
}

// ============ cc-switch 风格：智能测试（尝试所有已知提供商）============
// ============ 提供商预设（全局唯一数据源，Settings.jsx 直接 import）============
// cc-switch 风格：testModel = 该提供商最稳定/轻量的已知可用模型，用于回退兜底
// models = 展示给用户的推荐列表；实际可用列表优先从 /v1/models 实时获取
export const PROVIDER_PRESETS = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    chatPath: '/chat/completions',
    // 2025年 Groq 已下线 mixtral-8x7b-32768；llama-3.3-70b-versatile 是当前最稳定的旗舰模型
    testModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',   // 旗舰推荐
      'llama-3.1-8b-instant',       // 超快
      'llama-3.2-11b-vision-preview',
      'gemma2-9b-it',               // Google Gemma 2
      'llama-3.2-3b-preview',
    ],
    audioModels: ['whisper-large-v3-turbo', 'whisper-large-v3', 'distil-whisper-large-v3-en'],
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    chatPath: '/chat/completions',
    testModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    chatPath: '/chat/completions',
    testModel: 'deepseek/deepseek-r1-0528:free',
    models: [
      'deepseek/deepseek-r1-0528:free',
      'deepseek/deepseek-v3-base:free',
      'google/gemma-3-27b-it:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen3-235b-a22b:free',
      'mistralai/devstral-small:free',
    ],
    extraHeaders: { 'HTTP-Referer': 'https://zhcjf.github.io/interview-assistant/', 'X-Title': 'Interview Assistant' },
  },
  agnes: {
    name: 'Agnes AI',
    baseUrl: 'https://apihub.agnes-ai.com/v1',
    chatPath: '/chat/completions',
    testModel: 'agnes-2.5-flash',
    models: ['agnes-2.5-flash', 'agnes-2.5-pro', 'agnes-2.0-flash', 'agnes-1.5-flash'],
  },
  qwen: {
    name: 'Qwen 通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    chatPath: '/chat/completions',
    testModel: 'qwen-turbo',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-long', 'qwen-max', 'qwen2.5-72b-instruct', 'qwen2.5-7b-instruct', 'qwen-vl-plus', 'qwen-vl-max'],
  },
  zhipu: {
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    chatPath: '/chat/completions',
    testModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4', 'glm-4v-flash', 'glm-4v', 'glm-z1-flash'],
  },
  siliconflow: {
    name: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    chatPath: '/chat/completions',
    testModel: 'Qwen/Qwen2.5-7B-Instruct',
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'Qwen/Qwen2-VL-7B-Instruct',   // 支持图片
      'Pro/Qwen/Qwen2-VL-7B-Instruct', // 付费更准
    ],
  },
}

// cc-switch 风格智能测试：给定 key，尝试所有已知 provider
// 核心改进：优先调 /v1/models 获取真实可用模型，再用它发起真实推理测试
// 这样测试结果与实际使用完全一致，不会出现"测试说通但推理报模型不存在"
export async function smartTestAIConnection(apiKey, preferredProvider = null) {
  if (!apiKey) return { ok: false, msg: '请先填入 API Key' }

  const detected = detectProviderFromKey(apiKey)
  const allProviders = Object.keys(PROVIDER_PRESETS)
  const ordered = []
  if (preferredProvider) ordered.push(preferredProvider)
  if (detected && !ordered.includes(detected)) ordered.push(detected)
  for (const p of allProviders) {
    if (!ordered.includes(p)) ordered.push(p)
  }

  const attempts = []
  for (const provider of ordered) {
    const preset = PROVIDER_PRESETS[provider]
    if (!preset) continue

    // cc-switch 核心：先用 /v1/models 获取真实存在的模型列表
    const liveModels = await fetchAvailableModels(provider, apiKey)
    // 选模型优先级：liveModels 第一个 > preset.testModel（兜底）
    const modelToTest = liveModels?.[0] || preset.testModel

    const testConfig = {
      provider,
      apiKey,
      model: modelToTest,
      customEndpoint: '',
    }
    attempts.push({ provider, model: modelToTest, liveModelCount: liveModels?.length ?? 0 })
    const result = await testAIConnection(testConfig)
    if (result.ok) {
      return {
        ok: true,
        msg: `✓ ${preset.name} 连接成功（${modelToTest}）`,
        detectedProvider: provider,
        detectedModel: modelToTest,
        liveModels: liveModels || null, // 让 UI 可以刷新模型下拉
        allAttempts: attempts,
      }
    }
  }

  return {
    ok: false,
    msg: `已尝试 ${attempts.length} 个提供商均失败，请检查 Key 是否有效`,
    allAttempts: attempts,
  }
}

// 智能测试音频转录：仅尝试 Groq（目前唯一支持的免费 Whisper 端点）+ custom
export async function smartTestAudioConnection(apiKey, preferredProvider = null) {
  if (!apiKey) return { ok: false, msg: '请先填入音频转录 API Key' }

  const candidates = ['groq']
  if (preferredProvider && preferredProvider !== 'groq') candidates.unshift(preferredProvider)

  for (const provider of candidates) {
    const testConfig = {
      provider,
      apiKey,
      model: 'whisper-large-v3-turbo',
      language: 'zh',
      endpoint: '',
    }
    const result = await testAudioConnection(testConfig)
    if (result.ok) {
      return {
        ok: true,
        msg: `✓ ${provider} 音频转录连接成功`,
        detectedProvider: provider,
        detectedModel: 'whisper-large-v3-turbo',
      }
    }
  }
  return { ok: false, msg: '音频转录测试失败，请确认 Key 来自 Groq 控制台' }
}

// ============ JSON 提取工具 ============
function extractJSON(text) {
  if (!text) throw new Error('AI 返回空内容')
  // 直接尝试
  try {
    return JSON.parse(text)
  } catch {}
  // 去掉 markdown 代码块
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1])
    } catch {}
  }
  // 找第一个 { 到最后一个 }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {}
  }
  // 找第一个 [ 到最后一个 ]
  const arrStart = text.indexOf('[')
  const arrEnd = text.lastIndexOf(']')
  if (arrStart >= 0 && arrEnd > arrStart) {
    try {
      return JSON.parse(text.slice(arrStart, arrEnd + 1))
    } catch {}
  }
  throw new Error('AI 返回内容不是有效 JSON：' + text.slice(0, 200))
}

// ============ 岗位截图解析（Vision）============
// 支持：Gemini、Qwen-VL、OpenRouter vision 模型、自定义 vision 端点
// 不支持 Groq（目前无视觉模型）

/** 把 File / Blob 转成 base64 data URL */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result) // "data:image/...;base64,xxx"
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** 根据当前 provider 选择合适的 vision 模型 */
function getVisionModel(aiConfig) {
  const visionModels = {
    gemini: 'gemini-2.0-flash',                          // 需代理，免费 1500次/天
    qwen: 'qwen-vl-plus',                                // 国内直连，通义千问视觉版
    zhipu: 'glm-4v-flash',                               // 国内直连，完全免费！
    siliconflow: 'Qwen/Qwen2-VL-7B-Instruct',            // 国内直连，免费额度
    openrouter: 'meta-llama/llama-3.2-11b-vision-instruct:free', // 需代理，免费
    agnes: 'gemini-2.0-flash',                           // Agnes 转发
    groq: null,                                          // Groq 不支持视觉
    custom: aiConfig.model,                              // 自定义用当前模型
  }
  return visionModels[aiConfig.provider] || aiConfig.model
}

/**
 * 上传岗位招聘截图，AI 解析出结构化信息
 * @param {object} aiConfig - 当前 AI 配置
 * @param {File} imageFile - 用户上传的图片文件
 * @returns {{ company, title, jdText, notes }}
 */
export async function parseJDFromImage(aiConfig, imageFile) {
  if (!aiConfig.apiKey) {
    throw new Error('请先在设置页配置 AI Key')
  }
  if (aiConfig.provider === 'groq') {
    throw new Error('Groq 暂不支持图片识别，推荐切换到：智谱 GLM（国内免费）、Qwen（国内）、OpenRouter（需代理）')
  }

  const visionModel = getVisionModel(aiConfig)
  if (!visionModel) {
    throw new Error('当前 AI 提供商不支持图片识别，请切换到 Gemini / OpenRouter / Qwen')
  }

  // 压缩：超过 1MB 的图片先压缩到 800px 宽，减少 token 消耗
  let processedFile = imageFile
  if (imageFile.size > 1024 * 1024) {
    processedFile = await compressImage(imageFile, 800)
  }

  const dataUrl = await fileToBase64(processedFile)
  const base64Data = dataUrl.split(',')[1]
  const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg'

  const prompt = `请识别这张招聘岗位截图，提取出以下信息并以 JSON 格式返回，不要任何多余说明：

{
  "company": "公司名称",
  "title": "岗位名称/职位",
  "jdText": "岗位描述/职责要求原文（尽量保留完整文字）",
  "notes": "薪资/地点/学历等补充信息（可选）"
}

如果某个字段识别不出来，对应值留空字符串。`

  const { url, headers } = getRequestConfig({ ...aiConfig, model: visionModel })

  const body = {
    model: visionModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    let errText = ''
    try { errText = await response.text() } catch {}
    if (response.status === 400 && errText.includes('vision')) {
      throw new Error('当前模型不支持图片，请在设置中换用 Gemini 2.0 Flash 或 OpenRouter 视觉模型')
    }
    throw new Error(`识别失败（${response.status}）：${errText.slice(0, 150)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 返回空内容')

  return safeParseJSON(content)
}

/** 压缩图片到指定宽度，返回 Blob */
async function compressImage(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => resolve(blob || file),
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => resolve(file) // 压缩失败就用原图
    img.src = url
  })
}

