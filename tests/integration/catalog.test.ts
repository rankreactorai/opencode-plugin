import { afterEach, describe, expect, it } from "../helpers/test.ts"
import { API_KEY_ENV } from "../../src/constants.ts"
import { setupPlugin } from "../../src/index.ts"
import { rankReactorTools } from "../../src/status.ts"
import { createMockContext } from "../helpers/mock-context.ts"
import { installNetworkGuard } from "../helpers/network-guard.ts"

installNetworkGuard()

describe("dynamic catalog exposure", () => {
  const previous = process.env[API_KEY_ENV]

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[API_KEY_ENV]
    } else {
      process.env[API_KEY_ENV] = previous
    }
  })

  it("exposes whatever OpenCode discovered, including later catalog additions, without copied schemas", async () => {
    process.env[API_KEY_ENV] = "rr_live_example_format_only_not_a_credential"
    const mock = createMockContext({
      servers: [{ name: "rankreactor", status: { status: "connected" } }],
      tools: [
        { id: "rankreactor_list_projects", name: "list_projects", description: "List projects" },
        { id: "read", name: "read", description: "Read a file" },
      ],
    })
    await setupPlugin(mock.ctx)

    const first = rankReactorTools(await mock.ctx.tool.list(), "rankreactor")
    expect(first.map((tool) => tool.id)).toEqual(["rankreactor_list_projects"])

    mock.setTools([
      { id: "rankreactor_list_projects", name: "list_projects", description: "List projects" },
      { id: "rankreactor_new_catalog_tool", name: "new_catalog_tool", description: "Added later" },
      { id: "read", name: "read", description: "Read a file" },
    ])

    const second = rankReactorTools(await mock.ctx.tool.list(), "rankreactor")
    expect(second.map((tool) => tool.id)).toEqual([
      "rankreactor_list_projects",
      "rankreactor_new_catalog_tool",
    ])
  })

  it("treats mocked server catalog names and OpenCode tool ids as the same set after normalization", async () => {
    const serverCatalog = ["list.projects", "get-item"]
    const visible = serverCatalog.map((name) => ({
      id: `rankreactor_${name.replace(/[^A-Za-z0-9_-]/g, "_")}`,
      name,
      description: name,
    }))
    const mock = createMockContext({ tools: visible })
    await setupPlugin(mock.ctx)
    const listed = rankReactorTools(await mock.ctx.tool.list(), "rankreactor").map((tool) => tool.id)
    expect(listed.sort()).toEqual(["rankreactor_get-item", "rankreactor_list_projects"].sort())
  })
})
