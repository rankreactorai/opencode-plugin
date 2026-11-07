import { describe, expect, it } from "../helpers/test.ts"
import plugin, { PLUGIN_ID } from "../../src/index.ts"
import { installNetworkGuard } from "../helpers/network-guard.ts"

installNetworkGuard()

describe("V2 plugin export", () => {
  it("default-exports Plugin.define with a stable id and setup", () => {
    expect(plugin.id).toBe(PLUGIN_ID)
    expect(plugin.id).toBe("rankreactor")
    expect(typeof plugin.setup).toBe("function")
  })
})
