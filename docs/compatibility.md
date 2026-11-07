# Compatibility evidence

Researched and implemented against **released** OpenCode V2 packages, not
unreleased docs-only APIs.

## Verified versions

| Component | Version | Evidence |
| --- | --- | --- |
| `@opencode/plugin` | **2.2.6** (pinned, not `latest`) | npm package published 2026-11-06; `Plugin.define`, `setup(ctx)` |
| OpenCode runtime claimed | **2.2.6** minimum and tested-target | Matching published SDK/runtime line |
| Node.js used to typecheck/test | **22.23.4** | Cloud Agent environment; `engines.node` is `>=22` for this repo's build |
| Effect (transitive, not bundled) | 4.1.0 via the SDK | Do not bundle `effect` |

This plugin is **OpenCode V2 only**. V1 (`@opencode-ai/plugin`, `plugin` config
key, `server()` object hooks) is intentionally unsupported.

## APIs used (present in `@opencode/plugin@2.2.6`)

Documented at https://opencode.ai/docs/build/plugins and
https://opencode.ai/docs/build/plugins/server, then checked against the
published `.d.ts` files:

- `Plugin.define({ id, setup })` — `dist/promise/plugin.d.ts`
- `ctx.options` — `PluginOptions`
- `ctx.mcp.transform` / `editor.get` / `editor.set` / `editor.list` — `dist/promise/mcp.d.ts`
- `ctx.mcp.list()` → `{ location, data: Mcp.Server[] }` with
  `connected | pending | disabled | failed | needs_auth`
- `ctx.command.transform` / `editor.add` / `execute({ sessionID, prompt, delivery })`
- `ctx.session.prompt({ sessionID, text, delivery })`
- `ctx.permission.hook("evaluate", event)` — deny is final and is not passed to the hook
- `ctx.tool.list()` — `{ id, name, description, options }`
- Registration `dispose()` on unload

Remote MCP config fields used (schema `Mcp.RemoteConfig` in
`@opencode/schema@2.2.6`): `type: "remote"`, `url`, `headers`, `oauth: false`.
`protocol`, `pool`, and `timeout` are left unset.

No plugin-owned MCP transport, stdio server, or second HTTP client is created.
OpenCode reconciles the connection.

## Not verified (no live credential)

The following remain **untested** rather than claimed successful:

- Direct-key live connection from a real OpenCode server to
  `https://www.rankreactor.ai/mcp`
- Missing / invalid / revoked key behavior against the hosted server
- Authenticated `tools/list` catalog contents and parity with OpenCode-visible
  names, including default Code Mode grouping
- Real permission prompts in TUI/Desktop
- Packed tarball install into a clean OpenCode user config
- Network capture proving no OAuth discovery on a live 401

Do not treat mocked tests as a substitute for that opt-in interoperability gate.

## Code Mode permission limitation

OpenCode documents MCP tool permission actions as `{server}_{tool}`. Nested
Code Mode calls still use that action namespace, and this plugin maps those to
`ask`. The Code Mode `execute` action is only rewritten when `resources` or
metadata identify the RankReactor server, so unrelated Code Mode servers are
not gated. Live confirmation of Code Mode action strings was not possible
without a running OpenCode session.
