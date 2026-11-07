import { ASK_ALL_TOOLS_MESSAGE } from "./constants.ts"
import { mcpToolActionPrefix, normalizeMcpName } from "./namespace.ts"

export type PermissionEffect = "allow" | "ask" | "deny"

export type PermissionEvaluation = {
  readonly sessionID: string
  readonly agent?: string
  readonly action: string
  readonly resources: readonly string[]
  readonly metadata?: Record<string, unknown>
  readonly source?: { type: "tool"; messageID: string; id: string }
  effect: PermissionEffect
  message?: string
}

function stringMeta(metadata: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!metadata) {
    return undefined
  }
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }
  return undefined
}

/**
 * Identify permission actions that belong to this RankReactor MCP server.
 *
 * Direct MCP tools use `{normalizedServer}_{tool}` (OpenCode Names docs).
 * Resource tools use `opencode_list_mcp_resources` / `opencode_read_mcp_resource`
 * with the server name in `resources`.
 *
 * Code Mode nested tools still use `{server}_{tool}` actions. The Code Mode
 * `execute` action is only treated as RankReactor when resources or metadata
 * identify this server, so unrelated Code Mode servers are not gated.
 */
export function belongsToRankReactorServer(
  action: string,
  resources: readonly string[],
  serverName: string,
  metadata?: Record<string, unknown>,
): boolean {
  const normalized = normalizeMcpName(serverName)
  const prefix = mcpToolActionPrefix(serverName)

  if (action === normalized || action.startsWith(prefix)) {
    return true
  }

  if (action === "opencode_list_mcp_resources") {
    return resources.some((resource) => normalizeMcpName(resource) === normalized)
  }

  if (action === "opencode_read_mcp_resource") {
    return resources.some((resource) => {
      const server = resource.split(":")[0] ?? ""
      return normalizeMcpName(server) === normalized
    })
  }

  const metaServer = stringMeta(metadata, ["server", "mcpServer", "serverName"])
  const identified =
    metaServer !== undefined && normalizeMcpName(metaServer) === normalized

  if (action === "execute") {
    if (identified) {
      return true
    }
    return resources.some((resource) => {
      const value = normalizeMcpName(resource)
      return value === normalized || value.startsWith(prefix)
    })
  }

  return identified
}

/**
 * Change allow/ask to ask for RankReactor MCP actions. Never weaken deny.
 * OpenCode does not invoke evaluate hooks for configured deny; this still
 * no-ops if a deny event is passed in tests.
 */
export function evaluateRankReactorPermission(
  event: PermissionEvaluation,
  serverName: string,
): void {
  if (event.effect === "deny") {
    return
  }

  if (!belongsToRankReactorServer(event.action, event.resources, serverName, event.metadata)) {
    return
  }

  if (event.effect === "allow" || event.effect === "ask") {
    event.effect = "ask"
    event.message = ASK_ALL_TOOLS_MESSAGE
  }
}
