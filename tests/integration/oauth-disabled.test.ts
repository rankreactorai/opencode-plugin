import { afterEach, describe, expect, it } from "../helpers/test.ts"
import { API_KEY_ENV } from "../../src/constants.ts"
import { setupPlugin } from "../../src/index.ts"
import { buildSetupGuidance } from "../../src/status.ts"
import { createMockContext } from "../helpers/mock-context.ts"
import { installNetworkGuard } from "../helpers/network-guard.ts"

installNetworkGuard()

describe("API-key-only contract", () => {
  const previous = process.env[API_KEY_ENV]

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[API_KEY_ENV]
    } else {
      process.env[API_KEY_ENV] = previous
    }
  })

  it("never enables OAuth, browser login, or token exchange on 401", async () => {
    process.env[API_KEY_ENV] = "rr_live_example_format_only_not_a_credential"
    const mock = createMockContext({
      servers: [
        {
          name: "rankreactor",
          status: { status: "failed", error: "401 unauthorized" },
        },
      ],
    })
    await setupPlugin(mock.ctx)
    const config = mock.applyMcp().get("rankreactor")
    expect(config?.oauth).toBe(false)
    expect(mock.outbound).toEqual([])
    expect(buildSetupGuidance().toLowerCase()).toContain("do not run opencode mcp auth")
    expect(buildSetupGuidance().toLowerCase()).not.toContain("oauth login")
  })

  it("does not follow an auth challenge into OAuth discovery fields", async () => {
    process.env[API_KEY_ENV] = "rr_live_example_format_only_not_a_credential"
    const mock = createMockContext()
    await setupPlugin(mock.ctx)
    const config = mock.applyMcp().get("rankreactor")
    expect(config).toBeDefined()
    expect(config && "oauth" in config && config.oauth).toBe(false)
    expect(JSON.stringify(config)).not.toContain("auth_server_metadata_url")
    expect(JSON.stringify(config)).not.toContain("redirect_uri")
    expect(JSON.stringify(config)).not.toContain("client_id")
  })
})
