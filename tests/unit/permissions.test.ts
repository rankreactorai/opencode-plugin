import { describe, expect, it } from "../helpers/test.ts"
import {
  belongsToRankReactorServer,
  evaluateRankReactorPermission,
  type PermissionEvaluation,
} from "../../src/permissions.ts"

function event(
  partial: Partial<PermissionEvaluation> & Pick<PermissionEvaluation, "action" | "effect">,
): PermissionEvaluation {
  return {
    sessionID: "ses_test",
    resources: ["*"],
    ...partial,
  }
}

describe("RankReactor permission hook", () => {
  it("matches the normalized RankReactor tool namespace", () => {
    expect(
      belongsToRankReactorServer("rankreactor_list_projects", ["*"], "rankreactor"),
    ).toBe(true)
    expect(belongsToRankReactorServer("shell", ["git status"], "rankreactor")).toBe(false)
    expect(belongsToRankReactorServer("other_tool", ["*"], "rankreactor")).toBe(false)
  })

  it("changes allow to ask for unknown RankReactor tools", () => {
    const evaluation = event({
      action: "rankreactor_brand_new_catalog_tool",
      effect: "allow",
    })
    evaluateRankReactorPermission(evaluation, "rankreactor")
    expect(evaluation.effect).toBe("ask")
  })

  it("keeps ask as ask", () => {
    const evaluation = event({ action: "rankreactor_publish", effect: "ask" })
    evaluateRankReactorPermission(evaluation, "rankreactor")
    expect(evaluation.effect).toBe("ask")
  })

  it("never weakens deny", () => {
    const evaluation = event({ action: "rankreactor_delete", effect: "deny" })
    evaluateRankReactorPermission(evaluation, "rankreactor")
    expect(evaluation.effect).toBe("deny")
  })

  it("does not gate unrelated servers or built-in tools", () => {
    const shell = event({ action: "shell", effect: "allow" })
    evaluateRankReactorPermission(shell, "rankreactor")
    expect(shell.effect).toBe("allow")

    const other = event({ action: "docs_search", effect: "allow" })
    evaluateRankReactorPermission(other, "rankreactor")
    expect(other.effect).toBe("allow")
  })

  it("does not rewrite Code Mode execute unless the server is identified", () => {
    const execute = event({ action: "execute", effect: "allow", resources: ["*"] })
    evaluateRankReactorPermission(execute, "rankreactor")
    expect(execute.effect).toBe("allow")

    const identified = event({
      action: "execute",
      effect: "allow",
      resources: ["rankreactor_list_projects"],
    })
    evaluateRankReactorPermission(identified, "rankreactor")
    expect(identified.effect).toBe("ask")
  })

  it("matches MCP resource actions for this server only", () => {
    const list = event({
      action: "opencode_list_mcp_resources",
      effect: "allow",
      resources: ["rankreactor"],
    })
    evaluateRankReactorPermission(list, "rankreactor")
    expect(list.effect).toBe("ask")

    const other = event({
      action: "opencode_list_mcp_resources",
      effect: "allow",
      resources: ["docs"],
    })
    evaluateRankReactorPermission(other, "rankreactor")
    expect(other.effect).toBe("allow")
  })
})
