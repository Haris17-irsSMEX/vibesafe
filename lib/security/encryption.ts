/**
 * Token encryption using AES-256-GCM.
 * Server-side only. Never expose to client.
 *
 * Key must be 64 hex characters (32 bytes) stored in:
 * GITHUB_TOKEN_ENCRYPTION_KEY environment variable
 */

const ALGORITHM = 'AES-GCM'
const IV_LENGTH = 12 // 96-bit IV recommended for GCM
const KEY_LENGTH = 256

function getEncryptionKey(): string {
  const key = process.env.GITHUB_TOKEN_ENCRYPTION_KEY
  if (!key) {
    throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY is not configured')
  }
  if (key.length !== 64) {
    throw new Error(
      'GITHUB_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)'
    )
  }
  return key
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2)
  const view = new DataView(buf)
  for (let i = 0; i < hex.length; i += 2) {
    view.setUint8(i / 2, parseInt(hex.slice(i, i + 2), 16))
  }
  return new Uint8Array(buf)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function importKey(): Promise<CryptoKey> {
  const rawKeyBytes = hexToBytes(getEncryptionKey())
  // Slice to ensure we have a plain ArrayBuffer, not SharedArrayBuffer
  const rawKey = rawKeyBytes.buffer.slice(
    rawKeyBytes.byteOffset,
    rawKeyBytes.byteOffset + rawKeyBytes.byteLength
  ) as ArrayBuffer
  return crypto.subtle.importKey('raw', rawKey, { name: ALGORITHM, length: KEY_LENGTH }, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * Encrypts a GitHub access token using AES-256-GCM.
 * Returns a hex-encoded string: iv:ciphertext
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await importKey()
  const ivRaw = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const iv = ivRaw.buffer.slice(ivRaw.byteOffset, ivRaw.byteOffset + ivRaw.byteLength) as ArrayBuffer
  const encodedText = new TextEncoder().encode(plaintext)
  const encodedBuffer = encodedText.buffer.slice(
    encodedText.byteOffset,
    encodedText.byteOffset + encodedText.byteLength
  ) as ArrayBuffer

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: new Uint8Array(iv) },
    key,
    encodedBuffer
  )
  const ivHex = bytesToHex(new Uint8Array(iv))

  const cipherHex = bytesToHex(new Uint8Array(cipherBuffer))

  return `${ivHex}:${cipherHex}`
}

/**
 * Decrypts a stored token string back to the plaintext GitHub access token.
 * Expects format: iv:ciphertext (hex-encoded)
 */
export async function decryptToken(encrypted: string): Promise<string> {
  const [ivHex, cipherHex] = encrypted.split(':')
  if (!ivHex || !cipherHex) {
    throw new Error('Invalid encrypted token format')
  }

  const key = await importKey()
  const ivBytes = hexToBytes(ivHex)
  const cipherBytes = hexToBytes(cipherHex)

  const cipherBuffer = cipherBytes.buffer.slice(
    cipherBytes.byteOffset,
    cipherBytes.byteOffset + cipherBytes.byteLength
  ) as ArrayBuffer

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBytes },
    key,
    cipherBuffer
  )

  return new TextDecoder().decode(decryptedBuffer)
}
