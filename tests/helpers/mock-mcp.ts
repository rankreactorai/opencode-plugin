import type { McpEditor, McpServerConfig } from "../../src/mcp.ts"

export function cloneConfig<T>(value: T): T {
  return structuredClone(value)
}

export function createMcpEditor(
  initial: Record<string, McpServerConfig> = {},
): McpEditor & { snapshot(): Record<string, McpServerConfig> } {
  const servers: Record<string, McpServerConfig> = cloneConfig(initial)
  return {
    list() {
      return Object.entries(servers)
    },
    get(name) {
      return servers[name]
    },
    set(name, config) {
      servers[name] = cloneConfig(config)
    },
    update(name, update) {
      const current = servers[name]
      if (!current) {
        return
      }
      update(current)
    },
    remove(name) {
      delete servers[name]
    },
    snapshot() {
      return cloneConfig(servers)
    },
  }
}

export function replayTransforms(
  base: Record<string, McpServerConfig>,
  transforms: Array<(editor: McpEditor) => void>,
): Record<string, McpServerConfig> {
  const editor = createMcpEditor(base)
  for (const transform of transforms) {
    transform(editor)
  }
  return editor.snapshot()
}
