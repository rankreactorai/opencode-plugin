#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import fs from "node:fs"

const ROOT_FILES = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)

const PEM = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
const AWS = /AKIA[0-9A-Z]{16}/
const GITHUB = /ghp_[A-Za-z0-9]{20,}/
const BEARER_LIVE = /Bearer\s+(?:rr_live_[A-Za-z0-9_-]+|[A-Za-z0-9\-._~+/]{20,}=*)/g
const RANKREACTOR_KEY = /rr_live_(?!\[redacted\]|example_)[A-Za-z0-9_-]{12,}/g

function isAllowedFixture(value, file) {
  return (
    value.includes("example_format_only_not_a_credential") ||
    value.includes("[redacted]") ||
    value.includes("{env:RANKREACTOR_API_KEY}") ||
    (file.startsWith("tests/") && value.includes("example"))
  )
}

const failures = []

for (const file of ROOT_FILES) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    continue
  }
  if (file === "scripts/check-secrets.mjs") {
    continue
  }
  const content = fs.readFileSync(file, "utf8")
  if (PEM.test(content)) {
    failures.push(`${file}: private key block`)
  }
  if (AWS.test(content)) {
    failures.push(`${file}: AWS access key pattern`)
  }
  if (GITHUB.test(content)) {
    failures.push(`${file}: GitHub token pattern`)
  }
  for (const match of content.match(BEARER_LIVE) ?? []) {
    if (!isAllowedFixture(match, file) && !match.includes("{env:RANKREACTOR_API_KEY}")) {
      failures.push(`${file}: Bearer credential ${match.slice(0, 24)}…`)
    }
  }
  for (const match of content.match(RANKREACTOR_KEY) ?? []) {
    if (!isAllowedFixture(match, file)) {
      failures.push(`${file}: RankReactor key-like value`)
    }
  }
}

if (failures.length > 0) {
  console.error("Secret scan failed:")
  for (const failure of failures) {
    console.error(` - ${failure}`)
  }
  process.exit(1)
}

console.log("Secret scan passed over tracked files.")
