import { describe, expect, it } from "../helpers/test.ts"
import { mcpToolActionPrefix, normalizeMcpName } from "../../src/namespace.ts"

describe("normalizeMcpName", () => {
  it("matches OpenCode's documented replacement of unsupported characters", () => {
    expect(normalizeMcpName("context 7")).toBe("context_7")
    expect(normalizeMcpName("resolve.library/id")).toBe("resolve_library_id")
    expect(normalizeMcpName("rankreactor")).toBe("rankreactor")
  })

  it("builds the documented server_tool permission action prefix", () => {
    expect(mcpToolActionPrefix("rankreactor")).toBe("rankreactor_")
  })
})
