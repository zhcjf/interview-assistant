// localStorage 工具层 - 统一读写，避免散写

const KEYS = {
  JOBS: 'ia_jobs',
  INTERVIEWS: 'ia_interviews',
  REVIEWS: 'ia_reviews',
  // Phase 2 新增
  RESUMES: 'ia_resumes',
  CHAT_HISTORY: 'ia_chat_history',
  AI_CONFIG: 'ia_ai_config',
  BACKUP_CONFIG: 'ia_backup_config',
}

function read(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined) return fallback
    const parsed = JSON.parse(raw)
    // 类型校验：如果存储的值与 fallback 类型不一致，回退到 fallback
    if (parsed === null || parsed === undefined) return fallback
    return parsed
  } catch (e) {
    console.error('localStorage read error:', key, e)
    return fallback
  }
}

function readObj(key, fallback = {}) {
  const v = read(key, fallback)
  // 确保返回对象（不是数字、字符串、数组）
  if (v && typeof v === 'object' && !Array.isArray(v)) return v
  return fallback
}

function write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (e) {
    console.error('localStorage write error:', key, e)
    return false
  }
}

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ===== Jobs =====
export function getJobs() {
  return read(KEYS.JOBS)
}

export function getJob(id) {
  return getJobs().find((j) => j.id === id) || null
}

export function saveJob(job) {
  const jobs = getJobs()
  if (job.id) {
    const idx = jobs.findIndex((j) => j.id === job.id)
    if (idx >= 0) {
      jobs[idx] = { ...jobs[idx], ...job, updatedAt: new Date().toISOString() }
    } else {
      jobs.push(job)
    }
  } else {
    job.id = genId('job')
    job.createdAt = new Date().toISOString()
    jobs.push(job)
  }
  write(KEYS.JOBS, jobs)
  return job
}

export function deleteJob(id) {
  const jobs = getJobs().filter((j) => j.id !== id)
  write(KEYS.JOBS, jobs)
  // cascade delete interviews & reviews
  const interviewIds = getInterviews().filter((i) => i.jobId === id).map((i) => i.id)
  const interviews = getInterviews().filter((i) => i.jobId !== id)
  write(KEYS.INTERVIEWS, interviews)
  const reviews = getReviews().filter((r) => !interviewIds.includes(r.interviewId))
  write(KEYS.REVIEWS, reviews)
  return true
}

// ===== Interviews =====
export function getInterviews() {
  return read(KEYS.INTERVIEWS)
}

export function getInterview(id) {
  return getInterviews().find((i) => i.id === id) || null
}

export function saveInterview(interview) {
  const interviews = getInterviews()
  if (interview.id) {
    const idx = interviews.findIndex((i) => i.id === interview.id)
    if (idx >= 0) {
      interviews[idx] = { ...interviews[idx], ...interview, updatedAt: new Date().toISOString() }
    } else {
      interviews.push(interview)
    }
  } else {
    interview.id = genId('itv')
    interview.createdAt = new Date().toISOString()
    if (!interview.isReviewed) interview.isReviewed = false
    interviews.push(interview)
  }
  write(KEYS.INTERVIEWS, interviews)
  return interview
}

export function deleteInterview(id) {
  const interviews = getInterviews().filter((i) => i.id !== id)
  write(KEYS.INTERVIEWS, interviews)
  const reviews = getReviews().filter((r) => r.interviewId !== id)
  write(KEYS.REVIEWS, reviews)
  return true
}

// ===== Reviews =====
export function getReviews() {
  return read(KEYS.REVIEWS)
}

export function getReview(id) {
  return getReviews().find((r) => r.id === id) || null
}

export function getReviewByInterview(interviewId) {
  return getReviews().find((r) => r.interviewId === interviewId) || null
}

export function saveReview(review) {
  const reviews = getReviews()
  if (review.id) {
    const idx = reviews.findIndex((r) => r.id === review.id)
    if (idx >= 0) {
      reviews[idx] = { ...reviews[idx], ...review, updatedAt: new Date().toISOString() }
    } else {
      reviews.push(review)
    }
  } else {
    review.id = genId('rev')
    review.createdAt = new Date().toISOString()
    reviews.push(review)
  }
  write(KEYS.REVIEWS, reviews)
  // mark interview as reviewed
  const interview = getInterview(review.interviewId)
  if (interview && !interview.isReviewed) {
    interview.isReviewed = true
    saveInterview(interview)
  }
  return review
}

export function deleteReview(id) {
  const review = getReview(id)
  const reviews = getReviews().filter((r) => r.id !== id)
  write(KEYS.REVIEWS, reviews)
  if (review) {
    const interview = getInterview(review.interviewId)
    if (interview && interview.isReviewed) {
      interview.isReviewed = false
      saveInterview(interview)
    }
  }
  return true
}

// ===== Resumes (Phase 2 新增) =====
export function getResumes() {
  return read(KEYS.RESUMES)
}

export function getResume(id) {
  return getResumes().find((r) => r.id === id) || null
}

export function getActiveResume() {
  return getResumes().find((r) => r.isActive) || null
}

export function saveResume(resume) {
  const resumes = getResumes()
  if (resume.isActive) {
    // only one active at a time
    resumes.forEach((r) => (r.isActive = false))
  }
  if (resume.id) {
    const idx = resumes.findIndex((r) => r.id === resume.id)
    if (idx >= 0) {
      resumes[idx] = { ...resumes[idx], ...resume, updatedAt: new Date().toISOString() }
    } else {
      resumes.push(resume)
    }
  } else {
    resume.id = genId('res')
    resume.createdAt = new Date().toISOString()
    resumes.push(resume)
  }
  write(KEYS.RESUMES, resumes)
  return resume
}

export function deleteResume(id) {
  const resumes = getResumes().filter((r) => r.id !== id)
  write(KEYS.RESUMES, resumes)
  return true
}

// ===== Chat History (Phase 2 新增) =====
export function getChatHistory(jobId) {
  const all = read(KEYS.CHAT_HISTORY)
  return all.filter((c) => c.jobId === jobId)
}

export function saveChatMessage(msg) {
  const all = read(KEYS.CHAT_HISTORY)
  msg.id = genId('chat')
  msg.createdAt = new Date().toISOString()
  all.push(msg)
  write(KEYS.CHAT_HISTORY, all)
  return msg
}

export function clearChatHistory(jobId) {
  const all = read(KEYS.CHAT_HISTORY).filter((c) => c.jobId !== jobId)
  write(KEYS.CHAT_HISTORY, all)
  return true
}

export function toggleFavoriteChat(messageId) {
  const all = read(KEYS.CHAT_HISTORY)
  const idx = all.findIndex((c) => c.id === messageId)
  if (idx >= 0) {
    all[idx].isFavorite = !all[idx].isFavorite
    write(KEYS.CHAT_HISTORY, all)
    return all[idx]
  }
  return null
}

// ===== AI Config (Phase 2 新增) =====
export function getAIConfig() {
  return readObj(KEYS.AI_CONFIG, {
    provider: 'gemini',
    apiKey: '',          // 当前激活的 key（向后兼容）
    apiKeys: {},         // 按 provider 分开存储的 key 映射 { groq: 'gsk_...', gemini: 'AIza...', ... }
    model: 'gemini-2.5-flash',
    customEndpoint: '',
    // 音频转录配置
    audio: {
      provider: 'groq',
      apiKey: '',
      model: 'whisper-large-v3-turbo',
      language: 'zh',
      endpoint: '',
    },
  })
}

export function saveAIConfig(config) {
  const current = getAIConfig()
  // 浅合并 audio 子对象，避免覆盖
  const next = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  }
  if (config.audio) {
    next.audio = { ...current.audio, ...config.audio }
  }
  write(KEYS.AI_CONFIG, next)
  return next
}

// ===== Backup Config (Phase 2 新增) =====
export function getBackupConfig() {
  return readObj(KEYS.BACKUP_CONFIG, {
    enabled: false,
    ghToken: '',
    owner: 'zhcjf', // GitHub 用户名
    repo: 'interview-assistant', // 仓库名
    branch: 'main',
    path: 'data-backup.json',
    lastBackupAt: null,
    lastBackupStatus: null, // 'success' | 'fail' | null
  })
}

export function saveBackupConfig(config) {
  const current = getBackupConfig()
  const next = { ...current, ...config, updatedAt: new Date().toISOString() }
  write(KEYS.BACKUP_CONFIG, next)
  return next
}

// ===== Data export / clear =====
export function exportAllData() {
  return {
    jobs: getJobs(),
    interviews: getInterviews(),
    reviews: getReviews(),
    resumes: getResumes(),
    chatHistory: read(KEYS.CHAT_HISTORY),
    exportedAt: new Date().toISOString(),
    version: '2.0.0',
  }
}

// 导入 Phase 1 数据（兼容旧版结构）
export function importPhase1Data(data) {
  if (!data || typeof data !== 'object') {
    return { ok: false, msg: '数据格式无效' }
  }
  try {
    const stats = { jobs: 0, interviews: 0, reviews: 0 }
    if (Array.isArray(data.jobs)) {
      // 重新生成 ID 以避免冲突
      const jobs = getJobs()
      data.jobs.forEach((j) => {
        const oldId = j.id
        const newJob = { ...j }
        delete newJob.id
        const saved = saveJob(newJob)
        // 维护 ID 映射，用于 interviews.jobId 迁移
        if (!data._idMap) data._idMap = {}
        data._idMap[oldId] = saved.id
        stats.jobs++
      })
    }
    if (Array.isArray(data.interviews)) {
      const idMap = data._idMap || {}
      data.interviews.forEach((i) => {
        const newItv = { ...i }
        delete newItv.id
        if (idMap[i.jobId]) newItv.jobId = idMap[i.jobId]
        const saved = saveInterview(newItv)
        if (!data._itvIdMap) data._itvIdMap = {}
        data._itvIdMap[i.id] = saved.id
        stats.interviews++
      })
    }
    if (Array.isArray(data.reviews)) {
      const itvIdMap = data._itvIdMap || {}
      data.reviews.forEach((r) => {
        const newRev = { ...r }
        delete newRev.id
        if (itvIdMap[r.interviewId]) newRev.interviewId = itvIdMap[r.interviewId]
        saveReview(newRev)
        stats.reviews++
      })
    }
    return { ok: true, stats }
  } catch (e) {
    console.error('import Phase 1 data failed:', e)
    return { ok: false, msg: e.message || '导入失败' }
  }
}

export function clearAllData() {
  write(KEYS.JOBS, [])
  write(KEYS.INTERVIEWS, [])
  write(KEYS.REVIEWS, [])
  write(KEYS.RESUMES, [])
  write(KEYS.CHAT_HISTORY, [])
  return true
}

export const STORAGE_KEYS = KEYS
