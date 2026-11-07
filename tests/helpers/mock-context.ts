import type { CommandDefinition, CommandEditor } from "../../src/commands.ts"
import type { McpEditor, McpServerConfig } from "../../src/mcp.ts"
import type { PermissionEvaluation } from "../../src/permissions.ts"
import type { McpServerStatus, ToolInfo } from "../../src/status.ts"
import { createMcpEditor } from "./mock-mcp.ts"

export type MockRegistration = {
  dispose: () => Promise<void>
  kind: "mcp" | "command" | "permission"
}

export type PromptCall = {
  sessionID: string
  text: string
  delivery?: "steer" | "queue"
}

export function createMockContext(input?: {
  options?: Record<string, unknown>
  env?: NodeJS.Dict<string>
  mcpBase?: Record<string, McpServerConfig>
  servers?: McpServerStatus[]
  tools?: ToolInfo[]
}) {
  const mcpBase = input?.mcpBase ?? {}
  const mcpTransforms: Array<(editor: McpEditor) => void> = []
  const commands: CommandDefinition[] = []
  const permissionHooks: Array<(event: PermissionEvaluation) => void | Promise<void>> = []
  const prompts: PromptCall[] = []
  const registrations: MockRegistration[] = []
  let tools = input?.tools ?? []
  let servers = input?.servers ?? []
  const outbound: string[] = []

  const applyMcp = () => {
    const editor = createMcpEditor(mcpBase)
    for (const transform of mcpTransforms) {
      transform(editor)
    }
    return editor
  }

  const ctx = {
    app: { name: "opencode", version: "2.2.6", channel: "test" },
    options: input?.options ?? {},
    mcp: {
      transform: async (callback: (editor: McpEditor) => void) => {
        mcpTransforms.push(callback)
        const registration: MockRegistration = {
          kind: "mcp",
          dispose: async () => {
            const index = mcpTransforms.indexOf(callback)
            if (index >= 0) {
              mcpTransforms.splice(index, 1)
            }
          },
        }
        registrations.push(registration)
        return registration
      },
      reload: async () => {
        applyMcp()
      },
      list: async () => ({
        location: { directory: "/tmp/project" },
        data: servers,
      }),
    },
    command: {
      transform: async (callback: (editor: CommandEditor) => void) => {
        const editor: CommandEditor = {
          add(definition) {
            commands.push(definition)
          },
        }
        callback(editor)
        const registration: MockRegistration = {
          kind: "command",
          dispose: async () => {
            commands.length = 0
          },
        }
        registrations.push(registration)
        return registration
      },
    },
    permission: {
      hook: async (
        _name: "evaluate",
        callback: (event: PermissionEvaluation) => void | Promise<void>,
      ) => {
        permissionHooks.push(callback)
        const registration: MockRegistration = {
          kind: "permission",
          dispose: async () => {
            const index = permissionHooks.indexOf(callback)
            if (index >= 0) {
              permissionHooks.splice(index, 1)
            }
          },
        }
        registrations.push(registration)
        return registration
      },
    },
    session: {
      prompt: async (call: PromptCall) => {
        prompts.push(call)
        return { id: "msg_test" }
      },
    },
    tool: {
      list: async () => tools,
    },
    integration: {
      oauth: {
        connect: async () => {
          outbound.push("integration.oauth.connect")
          throw new Error("OAuth must not be used")
        },
      },
    },
  }

  return {
    ctx,
    prompts,
    commands,
    permissionHooks,
    registrations,
    outbound,
    applyMcp,
    setTools(next: ToolInfo[]) {
      tools = next
    },
    setServers(next: McpServerStatus[]) {
      servers = next
    },
    async evaluate(event: PermissionEvaluation) {
      for (const hook of permissionHooks) {
        await hook(event)
      }
      return event
    },
  }
}

