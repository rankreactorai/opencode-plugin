import { Plugin } from "@opencode/plugin"
import { DEFAULT_SERVER_NAME, PLUGIN_ID } from "./constants.ts"
import { parseOptions } from "./options.ts"
import { registerRankReactorMcp, type Ownership } from "./mcp.ts"
import { registerCommands } from "./commands.ts"
import { evaluateRankReactorPermission } from "./permissions.ts"
import type { McpServerStatus, ToolInfo } from "./status.ts"

export { PLUGIN_ID, RANKREACTOR_MCP_URL, API_KEY_ENV, DEFAULT_SERVER_NAME } from "./constants.ts"
export { parseOptions } from "./options.ts"
export { readProjectApiKey } from "./auth.ts"
export { registerRankReactorMcp, classifyExistingServer } from "./mcp.ts"
export { evaluateRankReactorPermission, belongsToRankReactorServer } from "./permissions.ts"
export { redact, containsSecret } from "./redaction.ts"
export { normalizeMcpName } from "./namespace.ts"

const unconfiguredOwnership = (serverName: string): Ownership => ({
  kind: "unregistered",
  serverName,
  reason: "The plugin has not registered an MCP server yet.",
})

type Disposable = { dispose: () => Promise<void> }

/** Subset of Plugin.Context actually used. Kept narrow so tests do not invent extra APIs. */
export type PluginHost = {
  options: unknown
  mcp: {
    transform: (callback: (editor: Parameters<typeof registerRankReactorMcp>[0]) => void) => Promise<Disposable>
    list: () => Promise<{ data?: readonly McpServerStatus[] } | readonly McpServerStatus[]>
  }
  command: {
    transform: (callback: (editor: Parameters<typeof registerCommands>[0]) => void) => Promise<Disposable>
  }
  permission: {
    hook: (
      name: "evaluate",
      callback: (event: Parameters<typeof evaluateRankReactorPermission>[0]) => void | Promise<void>,
    ) => Promise<Disposable>
  }
  session: Parameters<typeof registerCommands>[1]
  tool: {
    list: () => Promise<readonly ToolInfo[]>
  }
}

export async function setupPlugin(ctx: PluginHost) {
  const parsed = parseOptions(ctx.options)
  const serverName = parsed.ok ? parsed.options.serverName : DEFAULT_SERVER_NAME
  let ownership = unconfiguredOwnership(serverName)
  const registrations: Disposable[] = []

  if (parsed.ok) {
    const mcpRegistration = await ctx.mcp.transform((editor) => {
      const result = registerRankReactorMcp(editor, serverName)
      ownership = result.ownership
    })
    registrations.push(mcpRegistration)
  }

  const commandRegistration = await ctx.command.transform((editor) => {
    registerCommands(editor, ctx.session, {
      options: ctx.options,
      ownership: () => ownership,
      listServers: () => ctx.mcp.list(),
      listTools: () => ctx.tool.list(),
    })
  })
  registrations.push(commandRegistration)

  const permissionRegistration = await ctx.permission.hook("evaluate", (event) => {
    evaluateRankReactorPermission(event, serverName)
  })
  registrations.push(permissionRegistration)

  return async () => {
    for (const registration of [...registrations].reverse()) {
      await registration.dispose()
    }
  }
}

export default Plugin.define({
  id: PLUGIN_ID,
  setup: (ctx) => setupPlugin(ctx),
})
