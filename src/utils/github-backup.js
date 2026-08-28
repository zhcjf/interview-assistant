// GitHub Gist / Contents API 实现云端备份与恢复
// 工作方式：把整个数据集序列化成一个 JSON 文件，通过 GitHub Contents API
// 存到用户自己指定的仓库 (owner/repo/path)，换设备后拉取恢复。
//
// 身份识别：GitHub Token + 仓库唯一标识用户数据，无需账号系统。

const GH_API = 'https://api.github.com'

/** 读取指定文件的内容和 sha（sha 是后续更新时必须传的） */
async function getFileSha(token, owner, repo, path, branch = 'data-backup') {
  const res = await fetch(
    `${GH_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(10000),
    }
  )
  if (res.status === 404) return { sha: null, content: null }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  // content 是 base64，需要解码
  const raw = data.content ? atob(data.content.replace(/\s/g, '')) : null
  return { sha: data.sha, content: raw }
}

/** 检查分支是否存在，不存在则从默认分支创建 */
async function ensureBranch(token, owner, repo, branch = 'data-backup') {
  // 1. 查分支是否存在
  const checkRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}/branches/${branch}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(8000),
    }
  )
  if (checkRes.ok) return // 分支已存在

  // 2. 获取默认分支的最新 commit SHA
  const repoRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!repoRes.ok) throw new Error('无法获取仓库信息，请检查仓库名和 Token 权限')
  const repoData = await repoRes.json()
  const defaultBranch = repoData.default_branch || 'main'

  const branchRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}/branches/${defaultBranch}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!branchRes.ok) throw new Error('无法获取默认分支信息')
  const branchData = await branchRes.json()
  const sha = branchData.commit.sha

  // 3. 创建新分支
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
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!createRes.ok && createRes.status !== 422) { // 422 = already exists
    const body = await createRes.text().catch(() => '')
    throw new Error(`创建备份分支失败：${body.slice(0, 200)}`)
  }
}

/** 上传/更新文件到 GitHub */
async function putFile(token, owner, repo, path, content, branch, sha = null, message = '') {
  const body = {
    message: message || `backup: ${new Date().toISOString()}`,
    content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
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
      signal: AbortSignal.timeout(30000),
    }
  )
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    let hint = ''
    if (res.status === 403) hint = '（Token 权限不足，需要 Contents: Write）'
    if (res.status === 404) hint = '（仓库不存在或 Token 无权访问）'
    if (res.status === 409) hint = '（文件冲突，请稍后重试）'
    throw new Error(`上传失败 ${res.status}${hint}: ${errBody.slice(0, 150)}`)
  }
  return await res.json()
}

// ============ 对外接口 ============

/**
 * 执行一次完整备份
 * @param {object} cfg - backupConfig: { ghToken, owner, repo, path, branch }
 * @param {object} data - exportAllData() 的返回值
 * @returns {{ ok: boolean, msg: string }}
 */
export async function pushBackup(cfg, data) {
  const { ghToken, owner, repo, path = 'data-backup.json', branch = 'data-backup' } = cfg
  if (!ghToken || !owner || !repo) {
    return { ok: false, msg: '备份配置不完整，请填写 Token、用户名和仓库名' }
  }

  try {
    // 确保 data-backup 分支存在
    await ensureBranch(ghToken, owner, repo, branch)

    // 获取当前文件 sha（更新时必须传 sha）
    const { sha } = await getFileSha(ghToken, owner, repo, path, branch)

    // 写入
    const content = JSON.stringify({ ...data, backedUpAt: new Date().toISOString() }, null, 2)
    await putFile(ghToken, owner, repo, path, content, branch, sha)

    return { ok: true, msg: `已备份到 ${owner}/${repo}@${branch}` }
  } catch (e) {
    return { ok: false, msg: e.message || '备份失败' }
  }
}

/**
 * 从 GitHub 拉取备份数据
 * @returns {{ ok: boolean, data?: object, msg: string }}
 */
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
    return { ok: true, data: parsed, msg: `已拉取备份（${parsed.backedUpAt ? new Date(parsed.backedUpAt).toLocaleString() : '未知时间'}）` }
  } catch (e) {
    return { ok: false, msg: e.message || '拉取失败' }
  }
}

/**
 * 验证 Token + 仓库是否有效（不写入，只读 repo 信息）
 */
export async function verifyBackupConfig(cfg) {
  const { ghToken, owner, repo } = cfg
  if (!ghToken || !owner || !repo) return { ok: false, msg: '请填写完整配置' }

  try {
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401) return { ok: false, msg: 'Token 无效或已过期' }
    if (res.status === 403) return { ok: false, msg: 'Token 权限不足' }
    if (res.status === 404) return { ok: false, msg: `仓库 ${owner}/${repo} 不存在或无权访问` }
    if (!res.ok) return { ok: false, msg: `GitHub API 错误 ${res.status}` }
    const data = await res.json()
    return { ok: true, msg: `✓ 仓库「${data.full_name}」已连接`, private: data.private }
  } catch (e) {
    if (e.name === 'TimeoutError') return { ok: false, msg: '连接超时，请检查网络' }
    return { ok: false, msg: e.message || '验证失败' }
  }
}
