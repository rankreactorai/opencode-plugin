#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const ROOT = process.cwd()
const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-rankreactor-pack-"))

try {
  const packed = execFileSync("npm", ["pack", "--pack-destination", packDir], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .at(-1)
  const tarball = path.join(packDir, packed)
  execFileSync("tar", ["-xzf", tarball, "-C", packDir])
  const unpacked = path.join(packDir, "package")
  const pkg = JSON.parse(fs.readFileSync(path.join(unpacked, "package.json"), "utf8"))

  const failures = []
  if (pkg.private !== true) {
    failures.push("packed package.json must set private: true until publish is authorized")
  }
  if (pkg.license !== "UNLICENSED") {
    failures.push("packed package.json must remain UNLICENSED until the owner selects a license")
  }
  if (pkg.scripts?.prepublishOnly !== "node scripts/forbid-publish.mjs") {
    // The published tarball may omit scripts/; the guard must still exist in the repo package.json copy.
    const repoPkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
    if (repoPkg.scripts?.prepublishOnly !== "node scripts/forbid-publish.mjs") {
      failures.push("missing prepublishOnly publish guard")
    }
  }
  if (pkg.dependencies?.["@opencode/plugin"] !== "2.2.6") {
    failures.push("SDK dependency must be pinned to 2.2.6, not latest")
  }

  const walk = (dir, acc = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full, acc)
      } else {
        acc.push(path.relative(unpacked, full))
      }
    }
    return acc
  }

  const files = walk(unpacked)
  const forbiddenNames = [".env", "id_rsa", "credentials.json"]
  for (const file of files) {
    if (forbiddenNames.includes(path.basename(file))) {
      failures.push(`packed secret-like file ${file}`)
    }
    if (file.startsWith("tests/") || file.startsWith("dist/")) {
      failures.push(`packed unexpected path ${file}`)
    }
  }

  const srcIndex = path.join(unpacked, "src", "index.ts")
  if (!fs.existsSync(srcIndex)) {
    failures.push("packed tarball is missing src/index.ts")
  }
  const srcFiles = files.filter((file) => file.startsWith("src/") && file.endsWith(".ts"))
  const srcText = srcFiles.map((file) => fs.readFileSync(path.join(unpacked, file), "utf8")).join("\n")
  if (!srcText.includes("https://www.rankreactor.ai/mcp")) {
    failures.push("packed source must mention the canonical MCP URL")
  }
  if (srcText.includes("oauth: true")) {
    failures.push("packed source must not enable OAuth")
  }
  if (!srcText.includes("oauth: false")) {
    failures.push("packed source must set oauth: false")
  }

  const maps = files.filter((file) => file.endsWith(".map"))
  for (const mapFile of maps) {
    const content = fs.readFileSync(path.join(unpacked, mapFile), "utf8")
    if (/rr_live_(?!example_|\[redacted\])[A-Za-z0-9_-]{12,}/.test(content)) {
      failures.push(`source map contains a key-like value: ${mapFile}`)
    }
  }

  if (failures.length > 0) {
    console.error("Packed tarball check failed:")
    for (const failure of failures) {
      console.error(` - ${failure}`)
    }
    process.exit(1)
  }

  console.log(`Packed tarball check passed (${files.length} files in ${packed}).`)
} finally {
  fs.rmSync(packDir, { recursive: true, force: true })
}
