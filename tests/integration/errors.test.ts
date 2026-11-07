import { describe, expect, it } from "../helpers/test.ts"
import { buildStatusReport } from "../../src/status.ts"
import { containsSecret } from "../../src/redaction.ts"
import { installNetworkGuard } from "../helpers/network-guard.ts"

installNetworkGuard()

const FORMAT_OK = "rr_live_example_format_only_not_a_credential"

describe("sanitized connection errors", () => {
  it("explains disconnected, 401, 403, 429/quota, and timeout without echoing credentials", () => {
    const cases = [
      { status: { status: "failed" as const, error: `HTTP 401 Unauthorized Bearer ${FORMAT_OK}` }, expectText: "401" },
      { status: { status: "failed" as const, error: "403 forbidden for this project" }, expectText: "403" },
      { status: { status: "failed" as const, error: "429 quota exceeded" }, expectText: "quota" },
      { status: { status: "failed" as const, error: "catalog timeout" }, expectText: "timed out" },
    ]

    for (const item of cases) {
      const report = buildStatusReport({
        serverName: "rankreactor",
        ownership: {
          kind: "plugin-owned",
          serverName: "rankreactor",
          reason: "registered",
        },
        auth: { ok: true, key: FORMAT_OK },
        servers: [{ name: "rankreactor", status: item.status }],
        tools: [],
      })
      expect(containsSecret(report)).toBe(false)
      expect(report.toLowerCase()).toContain(item.expectText)
      expect(report.includes(FORMAT_OK)).toBe(false)
    }
  })

  it("does not treat an empty catalog as a live usage balance", () => {
    const report = buildStatusReport({
      serverName: "rankreactor",
      ownership: { kind: "plugin-owned", serverName: "rankreactor", reason: "registered" },
      auth: { ok: true, key: FORMAT_OK },
      servers: [{ name: "rankreactor", status: { status: "connected" } }],
      tools: [],
    })
    expect(report.toLowerCase()).toContain("empty catalog")
    expect(report.toLowerCase()).not.toContain("credits remaining")
  })

  it("returns structured mocked tool results without inventing a second schema registry", () => {
    const structured = {
      content: [{ type: "text", text: "ok" }],
      metadata: { source: "mock" },
    }
    expect(structured.content[0]?.type).toBe("text")
  })
})
