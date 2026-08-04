// localStorage 工具层 - 统一读写，避免散写

const KEYS = {
  JOBS: 'ia_jobs',
  INTERVIEWS: 'ia_interviews',
  REVIEWS: 'ia_reviews',
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('localStorage read error:', key, e)
    return []
  }
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
  const interviews = getInterviews().filter((i) => i.jobId !== id)
  write(KEYS.INTERVIEWS, interviews)
  const interviewIds = getInterviews().filter((i) => i.jobId === id).map((i) => i.id)
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

// ===== Data export / clear =====
export function exportAllData() {
  return {
    jobs: getJobs(),
    interviews: getInterviews(),
    reviews: getReviews(),
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  }
}

export function clearAllData() {
  write(KEYS.JOBS, [])
  write(KEYS.INTERVIEWS, [])
  write(KEYS.REVIEWS, [])
  return true
}

export const STORAGE_KEYS = KEYS
