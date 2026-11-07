import { afterEach, describe, expect, it } from "../helpers/test.ts"
import { API_KEY_ENV, SETUP_COMMAND, STATUS_COMMAND } from "../../src/constants.ts"
import { setupPlugin } from "../../src/index.ts"
import { containsSecret } from "../../src/redaction.ts"
import { createMockContext } from "../helpers/mock-context.ts"
import { installNetworkGuard } from "../helpers/network-guard.ts"

installNetworkGuard()

describe("onboarding commands", () => {
  const previous = process.env[API_KEY_ENV]

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[API_KEY_ENV]
    } else {
      process.env[API_KEY_ENV] = previous
    }
  })

  it("registers setup and status commands that prompt informational text without secrets", async () => {
    process.env[API_KEY_ENV] = "rr_live_example_format_only_not_a_credential"
    const mock = createMockContext({
      servers: [{ name: "rankreactor", status: { status: "pending" } }],
      tools: [{ id: "rankreactor_list_projects", name: "list_projects", description: "List projects" }],
    })
    await setupPlugin(mock.ctx)
    expect(mock.commands.map((command) => command.name)).toEqual([SETUP_COMMAND, STATUS_COMMAND])

    await mock.commands[0]?.execute({
      sessionID: "ses_test",
      prompt: { text: "" },
      delivery: "steer",
    })
    await mock.commands[1]?.execute({
      sessionID: "ses_test",
      prompt: { text: "" },
      delivery: "queue",
    })

    expect(mock.prompts).toHaveLength(2)
    for (const prompt of mock.prompts) {
      expect(containsSecret(prompt.text)).toBe(false)
      expect(prompt.text.toLowerCase()).toContain("informational")
      expect(prompt.text).toContain("https://www.rankreactor.ai/mcp")
    }
    expect(mock.prompts[0]?.text.toLowerCase()).toContain("do not run opencode mcp auth")
    expect(mock.prompts[1]?.text).toContain("pending")
    expect(mock.prompts[1]?.text).toContain("rankreactor_list_projects")
  })
})
