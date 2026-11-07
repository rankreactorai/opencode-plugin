import {
  authorizationHeader,
  readProjectApiKey,
  type AuthResult,
} from "./auth.ts"
import { RANKREACTOR_MCP_URL } from "./constants.ts"

export type McpServerConfig = {
  type: "local" | "remote"
  url?: string
  command?: readonly string[]
  headers?: Record<string, string>
  oauth?: false | Record<string, unknown>
  disabled?: boolean
  [key: string]: unknown
}

export type McpEditor = {
  list(): readonly (readonly [string, McpServerConfig])[]
  get(name: string): McpServerConfig | undefined
  set(name: string, config: McpServerConfig): void
  update(name: string, update: (config: McpServerConfig) => void): void
  remove(name: string): void
}

export type OwnershipKind =
  | "unregistered"
  | "plugin-owned"
  | "external-compatible"
  | "external-incompatible"
  | "collision"

export type Ownership = {
  kind: OwnershipKind
  serverName: string
  reason: string
}

export type RegistrationResult = {
  ownership: Ownership
  registered: boolean
  auth: AuthResult
}

function normalizeEndpoint(url: string): string {
  return url.replace(/\/+$/, "")
}

function isCanonicalRankReactorEndpoint(url: unknown): boolean {
  return typeof url === "string" && normalizeEndpoint(url) === RANKREACTOR_MCP_URL
}

function hasBearerAuthorization(headers: Record<string, string> | undefined): boolean {
  if (!headers) {
    return false
  }
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "authorization") {
      return value.trimStart().toLowerCase().startsWith("bearer ") && value.trim().length > 7
    }
  }
  return false
}

export function classifyExistingServer(
  serverName: string,
  config: McpServerConfig,
): Ownership {
  if (config.type !== "remote" || !isCanonicalRankReactorEndpoint(config.url)) {
    return {
      kind: "collision",
      serverName,
      reason:
        "Another MCP server already uses this name. It is not the RankReactor hosted MCP endpoint. Choose a different serverName in plugin options; this plugin will not attach RankReactor permissions or replace the existing server.",
    }
  }

  const oauthDisabled = config.oauth === false
  const bearer = hasBearerAuthorization(config.headers)

  if (!oauthDisabled || !bearer) {
    return {
      kind: "external-incompatible",
      serverName,
      reason:
        "A server named for RankReactor already exists and targets the hosted MCP URL, but it is not this plugin's API-key-only contract (explicit oauth: false and Authorization Bearer project key). It was left unchanged. Do not run OpenCode MCP auth or a browser login against it. Migrate the config manually to oauth: false plus RANKREACTOR_API_KEY, or pick a unique serverName.",
    }
  }

  return {
    kind: "external-compatible",
    serverName,
    reason:
      "An existing MCP server with this name already targets https://www.rankreactor.ai/mcp with oauth: false and a Bearer header. The plugin treats it as externally managed and will not replace, enable, or disable it.",
  }
}

export function pluginOwnedConfig(key: string): McpServerConfig {
  return {
    type: "remote",
    url: RANKREACTOR_MCP_URL,
    oauth: false,
    headers: {
      Authorization: authorizationHeader(key),
    },
  }
}

/**
 * Non-overwriting MCP registration. Existing servers are never mutated.
 * Environment substitution is resolved here for transform-created objects.
 */
export function registerRankReactorMcp(
  editor: McpEditor,
  serverName: string,
  env: NodeJS.Dict<string> = process.env,
): RegistrationResult {
  const auth = readProjectApiKey(env)
  const existing = editor.get(serverName)

  if (existing) {
    return {
      ownership: classifyExistingServer(serverName, existing),
      registered: false,
      auth,
    }
  }

  if (!auth.ok) {
    return {
      ownership: {
        kind: "unregistered",
        serverName,
        reason:
          "No MCP server was registered because RANKREACTOR_API_KEY is missing or not a well-formed RankReactor project API key.",
      },
      registered: false,
      auth,
    }
  }

  editor.set(serverName, pluginOwnedConfig(auth.key))
  return {
    ownership: {
      kind: "plugin-owned",
      serverName,
      reason:
        "The plugin registered a remote MCP server at https://www.rankreactor.ai/mcp with oauth: false and an in-memory Bearer header from RANKREACTOR_API_KEY.",
    },
    registered: true,
    auth,
  }
}
