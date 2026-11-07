import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "../helpers/test.ts"
import { RANKREACTOR_MCP_URL } from "../../src/constants.ts"

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(full))
    } else if (full.endsWith(".ts")) {
      files.push(full)
    }
  }
  return files
}

describe("public source boundary", () => {
  it("mentions only the canonical RankReactor MCP URL as a service endpoint", () => {
    const files = walk(path.join(process.cwd(), "src"))
    const urls = new Set<string>()
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8")
      for (const match of text.match(/https?:\/\/[^\s"'`]+/g) ?? []) {
        urls.add(match.replace(/[.,;]+$/, ""))
      }
    }
    const rankreactor = [...urls].filter((url) => url.includes("rankreactor.ai"))
    expect(rankreactor.sort()).toEqual([
      "https://www.rankreactor.ai",
      "https://www.rankreactor.ai/mcp",
    ])
    expect(urls.has(RANKREACTOR_MCP_URL)).toBe(true)
  })

  it("does not import backend SDKs or open a plugin-owned HTTP client", () => {
    const files = walk(path.join(process.cwd(), "src"))
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8")
      expect(text).not.toMatch(/firebase/i)
      expect(text).not.toContain("node:http")
      expect(text).not.toContain("node:https")
      expect(text).not.toMatch(/\bfetch\s*\(/)
    }
  })
})
