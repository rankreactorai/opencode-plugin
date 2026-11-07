import { describe, expect, it } from "../helpers/test.ts"
import { parseOptions, serverNameCollisionNote } from "../../src/options.ts"

describe("parseOptions", () => {
  it("defaults serverName to rankreactor", () => {
    expect(parseOptions({})).toEqual({
      ok: true,
      options: { serverName: "rankreactor" },
    })
  })

  it("accepts a unique safe server name", () => {
    expect(parseOptions({ serverName: "rankreactor-work" })).toEqual({
      ok: true,
      options: { serverName: "rankreactor-work" },
    })
  })

  it("rejects authMode and any alternate auth path", () => {
    const result = parseOptions({ authMode: "oauth" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("auth_mode_unsupported")
    }
  })

  it("rejects endpoint overrides", () => {
    for (const key of ["endpoint", "url", "mcpUrl", "baseUrl", "apiUrl"]) {
      const result = parseOptions({ [key]: "https://example.invalid/mcp" })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe("endpoint_override_unsupported")
      }
    }
  })

  it("rejects credentials in plugin options", () => {
    const result = parseOptions({ apiKey: "rr_live_example_format_only_not_a_credential" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("credential_in_options")
    }
  })

  it("rejects oauth objects in options", () => {
    const result = parseOptions({ oauth: { client_id: "x" } })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("credential_in_options")
    }
  })

  it("rejects unsafe server names", () => {
    expect(parseOptions({ serverName: "rank.reactor" }).ok).toBe(false)
    expect(parseOptions({ serverName: "rank reactor" }).ok).toBe(false)
    expect(parseOptions({ serverName: "" }).ok).toBe(false)
    expect(parseOptions({ serverName: "x".repeat(33) }).ok).toBe(false)
  })

  it("documents normalized-name collision risk only when normalization would change the name", () => {
    expect(serverNameCollisionNote("rankreactor")).toBeUndefined()
  })
})
