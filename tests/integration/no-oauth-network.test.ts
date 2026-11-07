import { afterEach, describe, expect, it } from "../helpers/test.ts"
import { API_KEY_ENV } from "../../src/constants.ts"
import { setupPlugin } from "../../src/index.ts"
import { createMockContext } from "../helpers/mock-context.ts"
import { installNetworkGuard } from "../helpers/network-guard.ts"

installNetworkGuard()

describe("no plugin-owned network or OAuth", () => {
  const previous = process.env[API_KEY_ENV]

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[API_KEY_ENV]
    } else {
      process.env[API_KEY_ENV] = previous
    }
  })

  it("setup, status, and mocked feature-call evaluation do not call fetch or OAuth APIs", async () => {
    process.env[API_KEY_ENV] = "rr_live_example_format_only_not_a_credential"
    const mock = createMockContext({
      servers: [{ name: "rankreactor", status: { status: "connected" } }],
      tools: [{ id: "rankreactor_list_projects", name: "list_projects", description: "List" }],
    })
    const cleanup = await setupPlugin(mock.ctx)
    await mock.commands[1]?.execute({
      sessionID: "ses_test",
      prompt: { text: "" },
      delivery: "steer",
    })
    await mock.evaluate({
      sessionID: "ses_test",
      action: "rankreactor_list_projects",
      resources: ["*"],
      effect: "allow",
    })
    expect(mock.outbound).toEqual([])
    await cleanup?.()
  })
})
