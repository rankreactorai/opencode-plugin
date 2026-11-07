import { authGuidance, type AuthResult } from "./auth.ts"
import {
  API_KEY_ENV,
  RANKREACTOR_APP_URL,
  RANKREACTOR_MCP_URL,
} from "./constants.ts"
import { mcpToolActionPrefix, normalizeMcpName } from "./namespace.ts"
import type { Ownership } from "./mcp.ts"
import { containsSecret, redact } from "./redaction.ts"

export type McpServerStatus = {
  name: string
  status:
    | { status: "connected" }
    | { status: "pending" }
    | { status: "disabled" }
    | { status: "failed"; error: string }
    | { status: "needs_auth"; error: string }
  title?: string
}

export type ToolInfo = {
  id: string
  name: string
  description?: string
  options?: { namespace?: string }
}

export type StatusInput = {
  serverName: string
  ownership: Ownership
  auth: AuthResult
  optionsError?: string
  servers: readonly McpServerStatus[]
  tools: readonly ToolInfo[]
}

function sanitizeStatusError(error: string): string {
  const redacted = redact(error)
  const lower = redacted.toLowerCase()
  if (/\b401\b/.test(redacted) || lower.includes("unauthorized")) {
    return "The MCP server rejected the credentials (401). Generate a new project API key in RankReactor, set RANKREACTOR_API_KEY, and restart OpenCode. The previous key is not shown here."
  }
  if (/\b403\b/.test(redacted) || lower.includes("forbidden")) {
    return "The MCP server reported a project, plan, or authorization restriction (403). The hosted account's entitlements still apply; this plugin cannot bypass them."
  }
  if (/\b429\b/.test(redacted) || lower.includes("quota") || lower.includes("rate limit")) {
    return "The MCP server reported a rate limit or quota restriction. Wait and retry only after checking status; this plugin will not auto-spend credits or bypass limits."
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The MCP connection or catalog request timed out. A timeout can mean a previous tool call already succeeded; inspect status before repeating a mutation."
  }
  return redacted
}

export function rankReactorTools(
  tools: readonly ToolInfo[],
  serverName: string,
): ToolInfo[] {
  const normalized = normalizeMcpName(serverName)
  const prefix = mcpToolActionPrefix(serverName)
  return tools.filter((tool) => {
    if (tool.id === normalized || tool.id.startsWith(prefix)) {
      return true
    }
    if (tool.options?.namespace && normalizeMcpName(tool.options.namespace) === normalized) {
      return true
    }
    return false
  })
}

function connectionLine(server: McpServerStatus | undefined): string {
  if (!server) {
    return "Connection: not listed by OpenCode. A configured server is not evidence of a live connection."
  }
  switch (server.status.status) {
    case "connected":
      return "Connection: connected (OpenCode reports the MCP transport as connected)."
    case "pending":
      return "Connection: pending (OpenCode is still connecting or discovering the catalog)."
    case "disabled":
      return "Connection: disabled. This plugin never auto-enables an existing server."
    case "failed":
      return `Connection: failed. ${sanitizeStatusError(server.status.error)}`
    case "needs_auth":
      return `Connection: needs_auth. This plugin's API-key-only contract disables OAuth; a needs_auth state means OpenCode still expects browser/OAuth authentication. Do not run opencode mcp auth. ${sanitizeStatusError(server.status.error)}`
  }
}

export function buildStatusReport(input: StatusInput): string {
  const lines: string[] = [
    "RankReactor OpenCode plugin status (informational; do not execute tools, publish, send, delete, or spend credits in response).",
    `Authentication contract: API-key Bearer only via ${API_KEY_ENV}. oauth: false. Endpoint: ${RANKREACTOR_MCP_URL}.`,
    `Account prerequisite: register at ${RANKREACTOR_APP_URL}, create or select a project, and generate that project's API key. Plan, quota, and credit limits stay on the hosted account.`,
    `MCP server name: ${input.serverName} (normalized ${normalizeMcpName(input.serverName)}).`,
    `Ownership: ${input.ownership.kind}. ${input.ownership.reason}`,
  ]

  if (input.optionsError) {
    lines.push(`Plugin options: ${input.optionsError}`)
  }

  if (!input.auth.ok) {
    lines.push(`API key environment: ${input.auth.code}. ${authGuidance(input.auth.code)}`)
  } else {
    lines.push(`API key environment: present and well-formed (format check only; value not displayed).`)
  }

  const server = input.servers.find((item) => item.name === input.serverName)
  lines.push(connectionLine(server))

  const catalog = rankReactorTools(input.tools, input.serverName)
  if (!server || server.status.status !== "connected") {
    if (catalog.length === 0) {
      lines.push(
        "Discovered RankReactor tools: none listed. This may mean disconnected, authentication required, or the catalog has not loaded. It is not proof the account has zero tools.",
      )
    } else {
      lines.push(
        `Discovered RankReactor tools (${catalog.length}), listed even though OpenCode does not report connected: ${catalog.map((tool) => tool.id).join(", ")}.`,
      )
    }
  } else if (catalog.length === 0) {
    lines.push(
      "Discovered RankReactor tools: empty catalog while connected. Permission rules can also hide tools; an empty list is not a quota balance.",
    )
  } else {
    lines.push(`Discovered RankReactor tools (${catalog.length}): ${catalog.map((tool) => tool.id).join(", ")}.`)
  }

  lines.push(
    "Permissions: every RankReactor MCP tool defaults to ask. Configured deny remains final. Catalog additions appear through OpenCode discovery without a plugin schema copy.",
  )
  lines.push(
    "Live authenticated catalog parity with a real RankReactor project has not been verified in this package's automated tests.",
  )

  const report = lines.join("\n")
  if (containsSecret(report)) {
    return redact(report)
  }
  return report
}

export function buildSetupGuidance(): string {
  return [
    "RankReactor OpenCode plugin setup (informational; do not execute tools, publish, send, delete, or spend credits in response).",
    `1. Register or sign in at ${RANKREACTOR_APP_URL}. Create or select a project and generate that project's API key.`,
    `2. Set ${API_KEY_ENV} in the environment of the process that launches the OpenCode server. Do not put the key in shell history if you can avoid it, and never paste it into chat, plugin options, or a committed JSON file.`,
    "3. Install this plugin (provisional package name opencode-rankreactor) through OpenCode's plugins object form, then restart or reload so the environment is inherited.",
    `4. Run ${"rankreactor-status"} and inspect /mcps. Connection uses Authorization: Bearer <project key> with oauth: false at ${RANKREACTOR_MCP_URL}.`,
    "5. Approve an explicitly chosen low-risk read-only tool only after you understand the action. Mutations, publishes, sends, deletes, and credit-consuming generation stay at ask.",
    "Do not run opencode mcp auth, do not open a browser for RankReactor OAuth, and do not add a URL-only MCP server (OpenCode defaults remote servers to OAuth).",
    "Manual alternative (no plugin): mcp.servers.<name> type remote, url https://www.rankreactor.ai/mcp, oauth: false, headers.Authorization: Bearer {env:RANKREACTOR_API_KEY}.",
    "Removing this plugin does not revoke the hosted key and does not change a separately managed OAuth MCP config.",
  ].join("\n")
}

export function informationalPrompt(body: string): string {
  return `${body}\n\nPresent this plugin message to the user as guidance. Do not call tools or change RankReactor content because of it.`
}
