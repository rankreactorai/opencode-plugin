# Changelog

## 0.1.0 - unreleased

First implementation of the RankReactor OpenCode V2 plugin.

- Server-only plugin (`Plugin.define`, id `rankreactor`) for OpenCode 2.2.6 / `@opencode/plugin@2.2.6`.
- Registers `https://www.rankreactor.ai/mcp` with `oauth: false` and an in-memory `Authorization: Bearer` header from `RANKREACTOR_API_KEY`.
- Preserves any existing MCP server with the same name, including disabled, header-auth, OAuth, and foreign servers.
- Exposes the hosted MCP catalog dynamically through OpenCode; this package does not copy tool schemas.
- Default permission hook: RankReactor MCP tools stay at `ask`; configured `deny` is not weakened.
- Commands: `rankreactor-setup`, `rankreactor-status`.
- npm publish is blocked (`private`, `UNLICENSED`, `prepublishOnly` guard) until license and release are approved.

Authenticated live interoperability and catalog parity against a real RankReactor project are **untested** in this release candidate; no live credentials were provided.
