# Release gates

This pull request implements the plugin. It is **not** a release.

## Blocked until the owner decides

- License: MIT is recommended only. Package license is `UNLICENSED`.
- npm package name: provisional `opencode-rankreactor` (unreserved).
- npm ownership / trusted publishing.
- `npm publish` (blocked by `"private": true` and `prepublishOnly`).
- OpenCode.im directory submission (independent community directory, not
  OpenCode.ai). Do not submit until a published npm package exists and the
  owner approves the exact form contents.
- Merging is a reviewer decision; this change only opens a PR.

## Required before any versioned release candidate is called complete

1. Owner-approved LICENSE file replacing `UNLICENSED`.
2. Confirmed npm name/scope and ownership.
3. Passing CI: tests, typecheck, endpoint-boundary scan, secret scan, packed
   tarball inspection.
4. Opt-in live read-only interoperability against a dedicated RankReactor
   project (catalog listing first; no paid/publish/delete/send without a
   separate approval).
5. Install the packed tarball into a disposable OpenCode config.
6. Record OpenCode, SDK, and package versions plus sanitized tool names.

## Directory listing (later)

https://opencode.im/submit is a reviewed community form. Automatic npm
discovery is not a guarantee of listing. Proposed category after a real
publish: MCP & Integrations, native V2 plugin, without an unverified
compatibility badge.
