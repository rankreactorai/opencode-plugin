import { API_KEY_ENV, API_KEY_PREFIX } from "./constants.ts"

const BEARER_PATTERN = /Bearer\s+\S+/gi
const RANKREACTOR_KEY_PATTERN = new RegExp(`${API_KEY_PREFIX}[A-Za-z0-9_-]+`, "g")
const ENV_ASSIGNMENT_PATTERN = new RegExp(`${API_KEY_ENV}\\s*[=:]\\s*\\S+`, "gi")
const AUTHORIZATION_HEADER_PATTERN = /Authorization\s*[=:]\s*[^,\s]+/gi

/**
 * Remove credentials, header values, and key fragments from diagnostic text.
 * Does not claim to catch every secret shape; status/setup must also avoid
 * interpolating those fields in the first place.
 */
export function redact(text: string): string {
  return text
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(RANKREACTOR_KEY_PATTERN, `${API_KEY_PREFIX}[redacted]`)
    .replace(ENV_ASSIGNMENT_PATTERN, `${API_KEY_ENV}=[redacted]`)
    .replace(AUTHORIZATION_HEADER_PATTERN, "Authorization=[redacted]")
}

export function redactUnknown(value: unknown): string {
  if (value instanceof Error) {
    return redact(value.message)
  }
  if (typeof value === "string") {
    return redact(value)
  }
  try {
    return redact(JSON.stringify(value))
  } catch {
    return "[unserializable]"
  }
}

function isPlaceholderToken(token: string): boolean {
  return (
    token === "[redacted]" ||
    token === `{env:${API_KEY_ENV}}` ||
    token.startsWith("{env:")
  )
}

/** True when a string still appears to contain a live project key or Bearer token. */
export function containsSecret(text: string): boolean {
  for (const match of text.matchAll(/Bearer\s+(\S+)/gi)) {
    const token = match[1] ?? ""
    if (isPlaceholderToken(token)) {
      continue
    }
    if (token.startsWith(API_KEY_PREFIX) || token.length >= 16) {
      return true
    }
  }
  const keyPattern = new RegExp(`${API_KEY_PREFIX}(?!\\[redacted\\])[A-Za-z0-9_-]{8,}`)
  return keyPattern.test(text)
}
