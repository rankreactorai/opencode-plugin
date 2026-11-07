import { DEFAULT_SERVER_NAME } from "./constants.ts"
import { isNormalizedNameCollisionRisk, normalizeMcpName } from "./namespace.ts"

export type OptionsFailureCode =
  | "auth_mode_unsupported"
  | "endpoint_override_unsupported"
  | "credential_in_options"
  | "invalid_server_name"

export type PluginUserOptions = {
  serverName: string
}

export type OptionsResult =
  | { ok: true; options: PluginUserOptions }
  | { ok: false; code: OptionsFailureCode; message: string }

const SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/

const AUTH_MODE_KEYS = ["authMode", "auth_mode", "authentication"] as const
const ENDPOINT_KEYS = [
  "endpoint",
  "url",
  "mcpUrl",
  "mcpURL",
  "baseUrl",
  "baseURL",
  "apiUrl",
  "apiURL",
] as const
const CREDENTIAL_KEYS = ["apiKey", "api_key", "token", "headers", "oauth"] as const

function hasOwn(options: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(options, key)
}

export function parseOptions(raw: unknown): OptionsResult {
  const options =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  for (const key of AUTH_MODE_KEYS) {
    if (hasOwn(options, key)) {
      return {
        ok: false,
        code: "auth_mode_unsupported",
        message:
          "This plugin has no authMode and no alternate authentication path. Use RANKREACTOR_API_KEY with oauth: false at the fixed RankReactor MCP endpoint.",
      }
    }
  }

  for (const key of ENDPOINT_KEYS) {
    if (hasOwn(options, key)) {
      return {
        ok: false,
        code: "endpoint_override_unsupported",
        message:
          "This plugin does not accept API endpoint overrides. The only configured RankReactor MCP endpoint is https://www.rankreactor.ai/mcp.",
      }
    }
  }

  for (const key of CREDENTIAL_KEYS) {
    if (hasOwn(options, key)) {
      return {
        ok: false,
        code: "credential_in_options",
        message:
          "Do not put API keys, OAuth settings, or headers in plugin options. Set RANKREACTOR_API_KEY in the OpenCode server environment.",
      }
    }
  }

  const serverName =
    options.serverName === undefined ? DEFAULT_SERVER_NAME : options.serverName

  if (typeof serverName !== "string" || !SERVER_NAME_PATTERN.test(serverName)) {
    return {
      ok: false,
      code: "invalid_server_name",
      message:
        "serverName must be 1–32 characters: letters, numbers, underscore, or hyphen, starting with a letter or number. Choose a unique name if rankreactor is already taken.",
    }
  }

  return { ok: true, options: { serverName } }
}

export function serverNameCollisionNote(serverName: string): string | undefined {
  if (!isNormalizedNameCollisionRisk(serverName)) {
    return undefined
  }
  return `OpenCode will normalize MCP names by replacing unsupported characters with underscores (result: ${normalizeMcpName(serverName)}). That can collide with another server after normalization; pick a distinct letters/numbers/underscore/hyphen name.`
}
