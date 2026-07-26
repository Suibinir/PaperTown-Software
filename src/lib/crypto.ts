// Client-side AES-GCM encryption for vault credentials
// Uses Web Crypto API (available in all modern browsers)
// Key is derived from a passphrase stored in env var

const VAULT_KEY = process.env.NEXT_PUBLIC_VAULT_KEY ?? 'agency-crm-vault-default-key-2024'

async function getKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('agency-crm-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey(VAULT_KEY)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  )
  // Combine iv + ciphertext, encode as base64
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encoded: string): Promise<string> {
  try {
    const key = await getKey(VAULT_KEY)
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    return new TextDecoder().decode(plaintext)
  } catch {
    return '••••••••' // decryption failed — wrong key or corrupted
  }
}
