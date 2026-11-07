import { API_KEY_ENV, API_KEY_PREFIX } from "./constants.ts"

export type AuthFailureCode =
  | "missing"
  | "empty"
  | "whitespace"
  | "control_characters"
  | "malformed"

export type AuthResult =
  | { ok: true; key: string }
  | { ok: false; code: AuthFailureCode }

const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/
const ANY_WHITESPACE = /\s/

export function readProjectApiKey(
  env: NodeJS.Dict<string> = process.env,
): AuthResult {
  if (!Object.prototype.hasOwnProperty.call(env, API_KEY_ENV)) {
    return { ok: false, code: "missing" }
  }

  const raw = env[API_KEY_ENV]
  if (raw === undefined || raw === "") {
    return { ok: false, code: "empty" }
  }

  if (CONTROL_CHARACTER.test(raw)) {
    return { ok: false, code: "control_characters" }
  }

  if (ANY_WHITESPACE.test(raw) || raw !== raw.trim()) {
    return { ok: false, code: "whitespace" }
  }

  if (!raw.startsWith(API_KEY_PREFIX) || raw.length <= API_KEY_PREFIX.length) {
    return { ok: false, code: "malformed" }
  }

  return { ok: true, key: raw }
}

export function authorizationHeader(key: string): string {
  return `Bearer ${key}`
}

export function authGuidance(code: AuthFailureCode): string {
  switch (code) {
    case "missing":
    case "empty":
      return `Set ${API_KEY_ENV} in the environment of the OpenCode server process to your RankReactor project API key, then restart OpenCode so the plugin can inherit it. Do not paste the key into chat, plugin options, or a committed config file.`
    case "whitespace":
      return `${API_KEY_ENV} contains whitespace. Replace it with the exact project API key (no quotes or surrounding spaces) and restart OpenCode.`
    case "control_characters":
      return `${API_KEY_ENV} contains control characters. Paste the key without hidden characters, or regenerate it in RankReactor, then restart OpenCode.`
    case "malformed":
      return `${API_KEY_ENV} does not look like a RankReactor project API key (expected prefix ${API_KEY_PREFIX}). This is only a format check; the hosted MCP server validates the key and project scope. Generate a project API key in RankReactor, set ${API_KEY_ENV}, and restart OpenCode.`
  }
}
