import { describe, expect, it } from "../helpers/test.ts"
import { RANKREACTOR_MCP_URL } from "../../src/constants.ts"
import {
  classifyExistingServer,
  pluginOwnedConfig,
  registerRankReactorMcp,
  type McpServerConfig,
} from "../../src/mcp.ts"
import { createMcpEditor, replayTransforms } from "../helpers/mock-mcp.ts"

const FORMAT_OK = "rr_live_example_format_only_not_a_credential"
const env = { RANKREACTOR_API_KEY: FORMAT_OK }

function freeze(config: McpServerConfig): McpServerConfig {
  return structuredClone(config)
}

describe("registerRankReactorMcp", () => {
  it("registers the canonical remote server with oauth: false and a Bearer header", () => {
    const editor = createMcpEditor()
    const result = registerRankReactorMcp(editor, "rankreactor", env)
    expect(result.registered).toBe(true)
    expect(result.ownership.kind).toBe("plugin-owned")
    const config = editor.get("rankreactor")
    expect(config).toEqual({
      type: "remote",
      url: RANKREACTOR_MCP_URL,
      oauth: false,
      headers: { Authorization: `Bearer ${FORMAT_OK}` },
    })
    expect(config?.oauth).toBe(false)
  })

  it("does not register when the env key is missing", () => {
    const editor = createMcpEditor()
    const result = registerRankReactorMcp(editor, "rankreactor", {})
    expect(result.registered).toBe(false)
    expect(result.ownership.kind).toBe("unregistered")
    expect(editor.get("rankreactor")).toBeUndefined()
  })

  it("does not mutate an existing matching RankReactor server, including disabled ones", () => {
    const existing: McpServerConfig = {
      type: "remote",
      url: RANKREACTOR_MCP_URL,
      oauth: false,
      disabled: true,
      headers: { Authorization: "Bearer rr_live_example_format_only_not_a_credential" },
    }
    const before = freeze(existing)
    const editor = createMcpEditor({ rankreactor: existing })
    const result = registerRankReactorMcp(editor, "rankreactor", env)
    expect(result.registered).toBe(false)
    expect(result.ownership.kind).toBe("external-compatible")
    expect(editor.snapshot().rankreactor).toEqual(before)
    expect(editor.get("rankreactor")?.disabled).toBe(true)
  })

  it("does not mutate an existing header-auth server that already has Bearer credentials", () => {
    const existing: McpServerConfig = {
      type: "remote",
      url: RANKREACTOR_MCP_URL,
      oauth: false,
      headers: { Authorization: "Bearer rr_live_example_format_only_not_a_credential" },
    }
    const editor = createMcpEditor({ rankreactor: existing })
    registerRankReactorMcp(editor, "rankreactor", env)
    expect(editor.get("rankreactor")).toEqual(existing)
  })

  it("does not mutate a foreign colliding server", () => {
    const existing: McpServerConfig = {
      type: "local",
      command: ["npx", "other"],
    }
    const editor = createMcpEditor({ rankreactor: existing })
    const result = registerRankReactorMcp(editor, "rankreactor", env)
    expect(result.ownership.kind).toBe("collision")
    expect(editor.get("rankreactor")).toEqual(existing)
  })

  it("reports an existing RankReactor URL that still uses OAuth as incompatible and leaves it untouched", () => {
    const existing: McpServerConfig = {
      type: "remote",
      url: RANKREACTOR_MCP_URL,
      oauth: { client_id: "not-used" },
    }
    const editor = createMcpEditor({ rankreactor: existing })
    const result = registerRankReactorMcp(editor, "rankreactor", env)
    expect(result.ownership.kind).toBe("external-incompatible")
    expect(editor.get("rankreactor")).toEqual(existing)
  })

  it("treats a different remote URL as a name collision", () => {
    const existing: McpServerConfig = {
      type: "remote",
      url: "https://mcp.example.com/mcp",
      oauth: false,
    }
    const result = classifyExistingServer("rankreactor", existing)
    expect(result.kind).toBe("collision")
  })

  it("replays transforms onto a fresh base without mutating user config", () => {
    const user: Record<string, McpServerConfig> = {
      other: { type: "local", command: ["echo"] },
    }
    const transform = (editor: import("../../src/mcp.ts").McpEditor) => {
      registerRankReactorMcp(editor, "rankreactor", env)
    }
    const first = replayTransforms(user, [transform])
    const second = replayTransforms(user, [transform])
    expect(first).toEqual(second)
    expect(user).toEqual({ other: { type: "local", command: ["echo"] } })
    expect(first.other).toEqual({ type: "local", command: ["echo"] })
  })

  it("builds plugin-owned config without protocol, pool, or timeout overrides", () => {
    const config = pluginOwnedConfig(FORMAT_OK)
    expect(config.protocol).toBeUndefined()
    expect(config.pool).toBeUndefined()
    expect(config.timeout).toBeUndefined()
    expect(config.codemode).toBeUndefined()
    expect(config.oauth).toBe(false)
  })
})
