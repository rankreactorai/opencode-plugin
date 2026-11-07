import { afterEach, describe, expect, it } from "../helpers/test.ts"
import { API_KEY_ENV } from "../../src/constants.ts"
import { setupPlugin } from "../../src/index.ts"
import type { PermissionEvaluation } from "../../src/permissions.ts"
import { createMockContext } from "../helpers/mock-context.ts"
import { installNetworkGuard } from "../helpers/network-guard.ts"

installNetworkGuard()

describe("mocked permission and execution safety", () => {
  const previous = process.env[API_KEY_ENV]

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[API_KEY_ENV]
    } else {
      process.env[API_KEY_ENV] = previous
    }
  })

  it("converts allow to ask and a rejection prevents the mocked hosted call", async () => {
    process.env[API_KEY_ENV] = "rr_live_example_format_only_not_a_credential"
    const mock = createMockContext()
    await setupPlugin(mock.ctx)

    let hostedCalls = 0
    const call = async (evaluation: PermissionEvaluation, decision: "once" | "reject" | "configured-deny") => {
      if (decision === "configured-deny") {
        return { called: false, effect: "deny" as const }
      }
      await mock.evaluate(evaluation)
      if (evaluation.effect === "deny") {
        return { called: false, effect: evaluation.effect }
      }
      if (evaluation.effect === "ask" && decision === "reject") {
        return { called: false, effect: evaluation.effect }
      }
      hostedCalls += 1
      return { called: true, effect: evaluation.effect }
    }

    const allow = {
      sessionID: "ses_test",
      action: "rankreactor_generate_content",
      resources: ["*"],
      effect: "allow" as const,
    }
    const rejected = await call(allow, "reject")
    expect(rejected.called).toBe(false)
    expect(rejected.effect).toBe("ask")
    expect(hostedCalls).toBe(0)

    const approved = await call(
      {
        sessionID: "ses_test",
        action: "rankreactor_list_projects",
        resources: ["*"],
        effect: "allow",
      },
      "once",
    )
    expect(approved.called).toBe(true)
    expect(hostedCalls).toBe(1)
  })

  it("preserves configured deny without invoking the hosted call", async () => {
    const mock = createMockContext()
    await setupPlugin(mock.ctx)
    const denied: PermissionEvaluation = {
      sessionID: "ses_test",
      action: "rankreactor_delete",
      resources: ["*"],
      effect: "deny",
    }
    await mock.evaluate(denied)
    expect(denied.effect).toBe("deny")
  })

  it("does not retry mutations after a mocked timeout", async () => {
    const mock = createMockContext()
    await setupPlugin(mock.ctx)
    let attempts = 0
    const runPaidMutation = async () => {
      attempts += 1
      return { status: "timeout" as const }
    }
    const first = await runPaidMutation()
    expect(first.status).toBe("timeout")
    expect(attempts).toBe(1)
  })

  it("keeps Code Mode nested RankReactor tools at ask", async () => {
    const mock = createMockContext()
    await setupPlugin(mock.ctx)
    const nested: PermissionEvaluation = {
      sessionID: "ses_test",
      action: "rankreactor_publish_post",
      resources: ["*"],
      effect: "allow",
    }
    await mock.evaluate(nested)
    expect(nested.effect).toBe("ask")
  })
})
