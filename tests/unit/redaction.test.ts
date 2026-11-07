import { describe, expect, it } from "../helpers/test.ts"
import { containsSecret, redact, redactUnknown } from "../../src/redaction.ts"
import { buildSetupGuidance, buildStatusReport } from "../../src/status.ts"

const FORMAT_OK = "rr_live_example_format_only_not_a_credential"

describe("redaction", () => {
  it("strips Bearer tokens, project keys, and Authorization assignments", () => {
    const raw = `Authorization: Bearer ${FORMAT_OK}; RANKREACTOR_API_KEY=${FORMAT_OK}`
    const cleaned = redact(raw)
    expect(cleaned.includes(FORMAT_OK)).toBe(false)
    expect(containsSecret(cleaned)).toBe(false)
  })

  it("redacts Error messages", () => {
    expect(redactUnknown(new Error(`401 Bearer ${FORMAT_OK}`)).includes(FORMAT_OK)).toBe(false)
  })

  it("keeps setup and status reports free of secrets", () => {
    const status = buildStatusReport({
      serverName: "rankreactor",
      ownership: {
        kind: "plugin-owned",
        serverName: "rankreactor",
        reason: "registered",
      },
      auth: { ok: true, key: FORMAT_OK },
      servers: [
        {
          name: "rankreactor",
          status: { status: "failed", error: `Unauthorized Bearer ${FORMAT_OK}` },
        },
      ],
      tools: [],
    })
    expect(containsSecret(status)).toBe(false)
    expect(status.includes(FORMAT_OK)).toBe(false)
    expect(containsSecret(buildSetupGuidance())).toBe(false)
  })
})
