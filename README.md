# RankReactor OpenCode plugin

Standalone **OpenCode V2** plugin that registers the hosted RankReactor MCP
server so OpenCode can discover that account's catalog.

This package does **not** reimplement tools or copy input schemas. Tool
availability is whatever the authenticated RankReactor project is entitled to.

## Prerequisites

1. Register at [https://www.rankreactor.ai](https://www.rankreactor.ai).
2. Create or select a project.
3. Generate that project's API key.
4. Set `RANKREACTOR_API_KEY` in the environment of the process that starts the
   OpenCode **server**, then restart OpenCode so the plugin inherits it.

Open-source plugin code does not mean a free hosted service. Plan, quota, and
credit balances stay on the RankReactor account.

## Authentication (API key only)

The only supported path is a project API key sent as a Bearer token:

```text
Authorization: Bearer <RANKREACTOR_API_KEY>
oauth: false
endpoint: https://www.rankreactor.ai/mcp
```

There is no OAuth login, discovery, browser consent, callback, token exchange,
or `opencode mcp auth` step in this plugin. Do not paste keys into chat or
plugin options.

A `rr_live_` prefix is a format hint only. The hosted server validates the key.

## Install (provisional)

The npm package name `opencode-rankreactor` is **provisional**. Publishing is
blocked (`private`, `UNLICENSED`) until the owner selects a license and
authorizes a release. Until then, load from git or a local checkout:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "github:rankreactorai/opencode-plugin",
      "options": {
        "serverName": "rankreactor"
      }
    }
  ]
}
```

After an approved npm release, the documented object form is:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-rankreactor",
      "options": {
        "serverName": "rankreactor"
      }
    }
  ]
}
```

`serverName` is optional and defaults to `rankreactor`. Names must be 1–32
letters, numbers, underscores, or hyphens. OpenCode normalizes MCP names for
tools (`server_tool`); pick a unique name if `rankreactor` is already used.

Then restart OpenCode, run `rankreactor-setup`, inspect `rankreactor-status`
and `/mcps`, and approve an explicitly chosen low-risk read-only tool.

## Manual MCP config (no plugin)

A URL-only `opencode mcp add` is not enough: remote servers default to OAuth.
Set `oauth: false` and the Bearer header:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "rankreactor": {
        "type": "remote",
        "url": "https://www.rankreactor.ai/mcp",
        "oauth": false,
        "headers": {
          "Authorization": "Bearer {env:RANKREACTOR_API_KEY}"
        }
      }
    }
  }
}
```

`{env:RANKREACTOR_API_KEY}` is OpenCode config substitution. The plugin path
resolves `process.env` itself when it creates the server object, because
transform-created objects are not config-file placeholders.

Do not configure both the plugin-owned server and this manual entry under
different names unless you want two connections.

## Permissions

Every RankReactor MCP tool starts at **ask**, including tools added to the
hosted catalog later. Configured **deny** is never weakened. Unrelated OpenCode
tools are not gated. Mutations, publishes, sends, deletes, and credit-consuming
generation must be approved; this plugin will not retry them on timeout.

## Existing MCP configs

If `serverName` already exists, this plugin leaves that server entirely
unchanged (URL, headers, disabled flag, OAuth, credentials). Matching
RankReactor URLs are treated as externally managed. A different URL or a local
server is a name collision: choose another `serverName`. Removing this plugin
does not rewrite or delete separately managed MCP config, including any
pre-existing OAuth setup.

## Supported versions

| Piece | Version |
| --- | --- |
| OpenCode | 2.2.6 (V2 only; V1 is unsupported) |
| `@opencode/plugin` | 2.2.6 (pinned) |
| Node.js for build/test | >= 22 (tested 22.23.4) |

See [docs/compatibility.md](docs/compatibility.md) for the API checklist.

## Build and test

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run ci
```

Tests are mocked. They do not call the hosted MCP server, spend credits, or
publish content.

## Limitations (this PR)

- **Authenticated live interoperability is untested.** No live RankReactor
  credential was provided. Catalog parity, live 401/403/429 behavior, and a
  clean tarball install into OpenCode are not claimed.
- License is **not selected**. MIT is a recommendation only. The package is
  `UNLICENSED` and `private`.
- Do not `npm publish` or submit https://opencode.im/plugins from this change.

## Security

See [SECURITY.md](SECURITY.md). Rotate a key by replacing `RANKREACTOR_API_KEY`
and restarting OpenCode. Revoke compromised keys in the RankReactor UI; local
plugin removal is not server-side revocation.
