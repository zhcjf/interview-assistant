// 基于 Web Crypto API 的密码派生加密
// PBKDF2 + AES-GCM，浏览器原生支持，无需第三方库

const ENC = new TextEncoder()
const DEC = new TextDecoder()

/** 从密码派生 AES-GCM 密钥（128位） */
async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    ENC.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt', 'decrypt']
  )
}

/** 加密数据：返回 base64 字符串（salt + iv + ciphertext） */
export async function encryptData(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    ENC.encode(plaintext)
  )
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)
  return btoa(String.fromCharCode(...combined))
}

/** 解密数据：从 base64 字符串恢复明文 */
export async function decryptData(ciphertextB64, password) {
  const combined = new Uint8Array(Array.from(atob(ciphertextB64)).map((c) => c.charCodeAt(0)))
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const ciphertext = combined.slice(28)
  const key = await deriveKey(password, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return DEC.decode(decrypted)
}

/** 生成密码哈希（用于本地验证密码正确性，不存明文密码） */
export async function hashPassword(password) {
  const data = ENC.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}
