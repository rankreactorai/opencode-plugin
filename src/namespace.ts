/**
 * OpenCode MCP tool names: `{server}_{tool}`, with characters other than
 * letters, numbers, `_`, and `-` replaced by `_`.
 * Source: https://opencode.ai/docs/mcp-servers/ (Names).
 */
export function normalizeMcpName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_")
}

export function mcpToolActionPrefix(serverName: string): string {
  return `${normalizeMcpName(serverName)}_`
}

export function isNormalizedNameCollisionRisk(serverName: string): boolean {
  return normalizeMcpName(serverName) !== serverName
}
