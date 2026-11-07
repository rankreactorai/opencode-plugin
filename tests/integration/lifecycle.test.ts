import { afterEach, describe, expect, it } from "../helpers/test.ts"
import { API_KEY_ENV, RANKREACTOR_MCP_URL } from "../../src/constants.ts"
import { setupPlugin } from "../../src/index.ts"
import { createMockContext } from "../helpers/mock-context.ts"
import { installNetworkGuard } from "../helpers/network-guard.ts"

const FORMAT_OK = "rr_live_example_format_only_not_a_credential"

installNetworkGuard()

describe("plugin lifecycle", () => {
  const previous = process.env[API_KEY_ENV]

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[API_KEY_ENV]
    } else {
      process.env[API_KEY_ENV] = previous
    }
  })

  it("registers a plugin-owned server, then leaves it gone after dispose", async () => {
    process.env[API_KEY_ENV] = FORMAT_OK
    const mock = createMockContext()
    const cleanup = await setupPlugin(mock.ctx)
    const registered = mock.applyMcp().snapshot()
    expect(registered.rankreactor).toMatchObject({
      type: "remote",
      url: RANKREACTOR_MCP_URL,
      oauth: false,
    })
    expect(registered.rankreactor?.oauth).toBe(false)

    await cleanup?.()
    expect(mock.applyMcp().snapshot().rankreactor).toBeUndefined()
  })

  it("is idempotent across reload-style replays", async () => {
    process.env[API_KEY_ENV] = FORMAT_OK
    const mock = createMockContext()
    await setupPlugin(mock.ctx)
    const first = mock.applyMcp().snapshot()
    await mock.ctx.mcp.reload()
    const second = mock.applyMcp().snapshot()
    expect(second).toEqual(first)
  })

  it("leaves an external MCP config intact after plugin removal", async () => {
    process.env[API_KEY_ENV] = FORMAT_OK
    const existing = {
      other: { type: "remote" as const, url: "https://mcp.example.com/mcp", oauth: false as const },
    }
    const mock = createMockContext({ mcpBase: existing })
    const cleanup = await setupPlugin(mock.ctx)
    expect(mock.applyMcp().snapshot().other).toEqual(existing.other)
    await cleanup?.()
    expect(mock.applyMcp().snapshot()).toEqual(existing)
  })

  it("does not register when the key rotates away until a well-formed key is present again", async () => {
    process.env[API_KEY_ENV] = FORMAT_OK
    const mock = createMockContext()
    await setupPlugin(mock.ctx)
    expect(mock.applyMcp().get("rankreactor")).toBeDefined()
    delete process.env[API_KEY_ENV]
    await mock.ctx.mcp.reload()
    expect(mock.applyMcp().get("rankreactor")).toBeUndefined()
    process.env[API_KEY_ENV] = FORMAT_OK
    await mock.ctx.mcp.reload()
    expect(mock.applyMcp().get("rankreactor")?.url).toBe(RANKREACTOR_MCP_URL)
  })
})
