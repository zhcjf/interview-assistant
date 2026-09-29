// GitHub Contents API 实现云端备份与恢复
// 身份识别：GitHub Token + 仓库唯一标识用户数据，无需账号系统。

const GH_API = 'https://api.github.com'

// 模块级缓存：已确认存在的分支，避免每次备份都发 3 个请求
const _knownBranches = new Set()

/** 读取指定文件的内容和 sha */
async function getFileSha(token, owner, repo, path, branch = 'data-backup') {
  const res = await fetch(
    `${GH_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(15000), // 移动网络适当放宽
    }
  )
  if (res.status === 404) return { sha: null, content: null }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const raw = data.content ? atob(data.content.replace(/\s/g, '')) : null
  return { sha: data.sha, content: raw }
}

/** 检查分支是否存在，不存在则从默认分支创建（带缓存，每次 session 只检查一次）*/
async function ensureBranch(token, owner, repo, branch = 'data-backup') {
  const cacheKey = `${owner}/${repo}#${branch}`
  if (_knownBranches.has(cacheKey)) return // 已知存在，跳过检查

  const checkRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}/branches/${branch}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(12000),
    }
  )
  if (checkRes.ok) {
    _knownBranches.add(cacheKey)
    return
  }

  // 分支不存在，从默认分支创建
  const repoRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(12000),
    }
  )
  if (!repoRes.ok) throw new Error('无法获取仓库信息，请检查仓库名和 Token 权限')
  const repoData = await repoRes.json()
  const defaultBranch = repoData.default_branch || 'main'

  const branchRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}/branches/${defaultBranch}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(12000),
    }
  )
  if (!branchRes.ok) throw new Error('无法获取默认分支信息')
  const branchData = await branchRes.json()
  const sha = branchData.commit.sha

  const createRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}/git/refs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
      signal: AbortSignal.timeout(12000),
    }
  )
  if (!createRes.ok && createRes.status !== 422) {
    const body = await createRes.text().catch(() => '')
    throw new Error(`创建备份分支失败：${body.slice(0, 200)}`)
  }
  _knownBranches.add(cacheKey)
}

/** 上传/更新文件到 GitHub，遇到 409 冲突时自动重新获取 SHA 重试一次 */
async function putFile(token, owner, repo, path, content, branch, sha = null, message = '', retries = 1) {
  const body = {
    message: message || `backup: ${new Date().toISOString()}`,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  }
  if (sha) body.sha = sha

  const res = await fetch(
    `${GH_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(35000),
    }
  )

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')

    // 409 = SHA 冲突（两台设备同时写），重新获取最新 SHA 再试
    if (res.status === 409 && retries > 0) {
      const { sha: freshSha } = await getFileSha(token, owner, repo, path, branch)
      return putFile(token, owner, repo, path, content, branch, freshSha, message, retries - 1)
    }

    let hint = ''
    if (res.status === 403) hint = '（Token 权限不足，需要 Contents: Write）'
    if (res.status === 404) hint = '（仓库不存在或 Token 无权访问）'
    if (res.status === 422) hint = '（SHA 不匹配，请稍后重试）'
    throw new Error(`上传失败 ${res.status}${hint}: ${errBody.slice(0, 150)}`)
  }
  return await res.json()
}

// ============ 对外接口 ============

export async function pushBackup(cfg, data) {
  const { ghToken, owner, repo, path = 'data-backup.json', branch = 'data-backup' } = cfg
  if (!ghToken || !owner || !repo) {
    return { ok: false, msg: '备份配置不完整，请填写 Token、用户名和仓库名' }
  }

  try {
    await ensureBranch(ghToken, owner, repo, branch)
    const { sha } = await getFileSha(ghToken, owner, repo, path, branch)
    const content = JSON.stringify({ ...data, backedUpAt: new Date().toISOString() }, null, 2)
    await putFile(ghToken, owner, repo, path, content, branch, sha)
    return { ok: true, msg: `已备份到 ${owner}/${repo}@${branch}` }
  } catch (e) {
    // 网络超时给出更友好的提示
    if (e.name === 'TimeoutError' || e.message?.includes('timeout')) {
      return { ok: false, msg: '备份超时，请检查网络后重试（数据已保存在本地）' }
    }
    return { ok: false, msg: e.message || '备份失败' }
  }
}

export async function pullBackup(cfg) {
  const { ghToken, owner, repo, path = 'data-backup.json', branch = 'data-backup' } = cfg
  if (!ghToken || !owner || !repo) {
    return { ok: false, msg: '备份配置不完整' }
  }

  try {
    const { content } = await getFileSha(ghToken, owner, repo, path, branch)
    if (!content) {
      return { ok: false, msg: '远端暂无备份数据，请先在其他设备执行一次备份' }
    }
    const parsed = JSON.parse(content)
    return {
      ok: true,
      data: parsed,
      msg: `已拉取备份（${parsed.backedUpAt ? new Date(parsed.backedUpAt).toLocaleString() : '未知时间'}）`,
    }
  } catch (e) {
    if (e.name === 'TimeoutError') return { ok: false, msg: '拉取超时，请检查网络' }
    return { ok: false, msg: e.message || '拉取失败' }
  }
}

export async function verifyBackupConfig(cfg) {
  const { ghToken, owner, repo } = cfg
  if (!ghToken || !owner || !repo) return { ok: false, msg: '请填写完整配置' }

  try {
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10000),
    })
    if (res.status === 401) return { ok: false, msg: 'Token 无效或已过期' }
    if (res.status === 403) return { ok: false, msg: 'Token 权限不足' }
    if (res.status === 404) return { ok: false, msg: `仓库 ${owner}/${repo} 不存在或无权访问` }
    if (!res.ok) return { ok: false, msg: `GitHub API 错误 ${res.status}` }
    const data = await res.json()
    // 验证通过后缓存分支
    _knownBranches.delete(`${owner}/${repo}#data-backup`) // 清除旧缓存，让下次备份重新检查
    return { ok: true, msg: `✓ 仓库「${data.full_name}」已连接`, private: data.private }
  } catch (e) {
    if (e.name === 'TimeoutError') return { ok: false, msg: '连接超时，请检查网络' }
    return { ok: false, msg: e.message || '验证失败' }
  }
}
