#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const CANONICAL_MCP = "https://www.rankreactor.ai/mcp"
const NAVIGATION = new Set([
  "https://www.rankreactor.ai",
  "https://www.rankreactor.ai/",
  "https://rankreactor.ai",
  "https://rankreactor.ai/",
])

const FORBIDDEN_HOST_FRAGMENTS = [
  ["cloud", "functions", ".net"].join(""),
  ["run", ".app"].join(""),
  ["firebase", "io.com"].join(""),
  ["firebase", "app.com"].join(""),
  ["firebase", "storage.googleapis.com"].join(""),
  ["identity", "toolkit.googleapis.com"].join(""),
]

const FORBIDDEN_IMPORT_FRAGMENTS = [
  ["firebase", "-admin"].join(""),
  ["firebase", "-functions"].join(""),
  ["@google-cloud/"].join(""),
  "from \"firebase\"",
  "from 'firebase'",
]

const ALLOWED_EXTERNAL_HOSTS = new Set([
  "opencode.ai",
  "www.opencode.ai",
  "opencode.im",
  "github.com",
  "www.github.com",
  "npmjs.com",
  "www.npmjs.com",
  "json.schemastore.org",
  "nodejs.org",
])

const URL_PATTERN = /https?:\/\/[^\s"'`<>)\]}]+/gi

function gitFiles() {
  const output = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function walkGenerated(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkGenerated(full, acc)
    } else {
      acc.push(path.relative(ROOT, full))
    }
  }
  return acc
}

function stripTrailingPunctuation(value) {
  return value.replace(/[.,;:]+$/, "")
}

function classify(url) {
  const normalized = stripTrailingPunctuation(url)
  let parsed
  try {
    parsed = new URL(normalized)
  } catch {
    return { kind: "invalid", url: normalized }
  }

  const host = parsed.hostname.toLowerCase()
  const originAndPath = `${parsed.origin}${parsed.pathname}`

  if (FORBIDDEN_HOST_FRAGMENTS.some((fragment) => host.includes(fragment) || normalized.includes(fragment))) {
    return { kind: "forbidden-host", url: normalized }
  }

  if (host === "www.rankreactor.ai" || host === "rankreactor.ai") {
    if (originAndPath.replace(/\/+$/, "") === CANONICAL_MCP) {
      return { kind: "canonical-mcp", url: normalized }
    }
    if (NAVIGATION.has(originAndPath) || parsed.pathname === "" || parsed.pathname === "/") {
      return { kind: "navigation", url: normalized }
    }
    return { kind: "rankreactor-noncanonical", url: normalized }
  }

  if (ALLOWED_EXTERNAL_HOSTS.has(host) || host.endsWith(".github.com")) {
    return { kind: "external-docs", url: normalized }
  }

  if (host === "mcp.example.com" || host === "example.com" || host === "example.invalid") {
    return { kind: "foreign-mock", url: normalized }
  }

  return { kind: "unclassified", url: normalized }
}

const files = new Set([...gitFiles(), ...walkGenerated("dist")])
const failures = []
const seen = []

for (const file of files) {
  if (file.startsWith("scripts/check-endpoint-boundary")) {
    continue
  }
  const lockfile = path.basename(file) === "package-lock.json"
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    continue
  }
  const content = fs.readFileSync(file, "utf8")
  for (const fragment of FORBIDDEN_IMPORT_FRAGMENTS) {
    if (content.includes(fragment)) {
      failures.push(`${file}: forbidden backend client import fragment`)
    }
  }
  const matches = content.match(URL_PATTERN) ?? []
  for (const match of matches) {
    const result = classify(match)
    seen.push({ file, ...result })
    if (result.kind === "forbidden-host" || result.kind === "rankreactor-noncanonical") {
      failures.push(`${file}: ${result.kind} URL ${result.url}`)
    } else if (!lockfile && (result.kind === "unclassified" || result.kind === "invalid")) {
      failures.push(`${file}: ${result.kind} URL ${result.url}`)
    }
  }
}

if (failures.length > 0) {
  console.error("Endpoint boundary check failed:")
  for (const failure of failures) {
    console.error(` - ${failure}`)
  }
  process.exit(1)
}

const canonical = seen.filter((item) => item.kind === "canonical-mcp")
if (canonical.length === 0) {
  console.error("Endpoint boundary check failed: canonical MCP URL was not found in scanned files.")
  process.exit(1)
}

console.log(
  `Endpoint boundary check passed (${seen.length} URLs classified; canonical MCP ${canonical.length}; no forbidden hosts).`,
)
