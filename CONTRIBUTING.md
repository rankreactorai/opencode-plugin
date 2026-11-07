# Contributing

This repository is a standalone public OpenCode plugin. It does not include
RankReactor backend source and must not grow a second copy of MCP tool schemas.

## Requirements

- Node.js 22 or newer (tested: 22.23.4)
- npm 10+
- OpenCode **2.2.6** and `@opencode/plugin@2.2.6` for the V2 APIs this plugin
  uses. Do not retarget `latest`. Do not add a V1 implementation.

## Setup

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Tests use Node.js 22 `node:test` with `--experimental-strip-types`. `npm run ci`
also runs endpoint-boundary, secret, and packed-tarball checks.

## Rules

- Keep `https://www.rankreactor.ai/mcp` as the only configured RankReactor MCP
  endpoint. Do not add Firebase, Cloud Run, or other backend URLs, clients, or
  credentials.
- Authentication is `RANKREACTOR_API_KEY` + `oauth: false` only.
- Do not invent OpenCode APIs. If a documented V2 method is missing from the
  pinned SDK, stop and record a compatibility blocker; do not shim V1.
- Preserve existing MCP servers with the same name. Never auto-enable them.
- Do not weaken configured `deny` permissions. Unknown RankReactor tools stay
  at `ask`.
- Mock all paid, publish, send, delete, and mutation tests. Do not run live
  credentialed tests in CI.
- Do not `npm publish`, submit the OpenCode.im directory form, or select a
  license without an explicit owner decision.

## License

License selection is pending. The package remains `UNLICENSED` and private.
MIT is a recommendation only.
