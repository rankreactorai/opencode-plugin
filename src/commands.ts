import { SETUP_COMMAND, STATUS_COMMAND } from "./constants.ts"
import { parseOptions } from "./options.ts"
import { readProjectApiKey } from "./auth.ts"
import type { Ownership } from "./mcp.ts"
import {
  buildSetupGuidance,
  buildStatusReport,
  informationalPrompt,
  type McpServerStatus,
  type ToolInfo,
} from "./status.ts"

export type CommandDefinition = {
  name: string
  description?: string
  execute: (input: {
    sessionID: string
    prompt: { text: string }
    delivery: "steer" | "queue"
  }) => Promise<void>
}

export type CommandEditor = {
  add(definition: CommandDefinition): void
}

export type CommandSession = {
  prompt: (input: {
    sessionID: string
    text: string
    delivery?: "steer" | "queue"
  }) => Promise<unknown>
}

export type StatusSources = {
  options: unknown
  ownership: () => Ownership
  listServers: () => Promise<{ data?: readonly McpServerStatus[] } | readonly McpServerStatus[]>
  listTools: () => Promise<readonly ToolInfo[]>
  env?: NodeJS.Dict<string>
}

function asServerList(
  listed: { data?: readonly McpServerStatus[] } | readonly McpServerStatus[],
): readonly McpServerStatus[] {
  if (Array.isArray(listed)) {
    return listed
  }
  if (listed && typeof listed === "object" && "data" in listed) {
    return listed.data ?? []
  }
  return []
}

export function registerCommands(
  editor: CommandEditor,
  session: CommandSession,
  sources: StatusSources,
): void {
  editor.add({
    name: SETUP_COMMAND,
    description: "Show RankReactor account, project API key, and API-key-only MCP setup guidance.",
    execute: async ({ sessionID, delivery }) => {
      await session.prompt({
        sessionID,
        delivery,
        text: informationalPrompt(buildSetupGuidance()),
      })
    },
  })

  editor.add({
    name: STATUS_COMMAND,
    description: "Show sanitized RankReactor MCP connection status and discovered tool names.",
    execute: async ({ sessionID, delivery }) => {
      const parsed = parseOptions(sources.options)
      const serverName = parsed.ok ? parsed.options.serverName : "rankreactor"
      const auth = readProjectApiKey(sources.env)
      const servers = asServerList(await sources.listServers())
      const tools = await sources.listTools()
      const report = buildStatusReport({
        serverName,
        ownership: sources.ownership(),
        auth,
        optionsError: parsed.ok ? undefined : parsed.message,
        servers,
        tools,
      })
      await session.prompt({
        sessionID,
        delivery,
        text: informationalPrompt(report),
      })
    },
  })
}
