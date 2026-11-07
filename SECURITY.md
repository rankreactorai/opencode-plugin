# Security

## Reporting

Report vulnerabilities privately through GitHub Security Advisories on
[rankreactorai/opencode-plugin](https://github.com/rankreactorai/opencode-plugin)
or by contacting the RankReactor maintainers. Do not open a public issue that
includes a project API key, session token, or customer data.

## Authentication

This plugin uses only a RankReactor project API key:

- Set `RANKREACTOR_API_KEY` in the OpenCode **server** process environment.
- The plugin sends `Authorization: Bearer <key>` to `https://www.rankreactor.ai/mcp`.
- `oauth` is always `false` for plugin-owned servers. Do not run `opencode mcp auth`,
  complete a browser consent flow, or configure OAuth client metadata for this plugin.
- Existing hosted RankReactor OAuth support on other products is out of scope and
  is not changed by this plugin.
- Never put the key in plugin options, chat, committed JSON, or shell history if
  you can avoid it.

A `rr_live_` prefix check is a format hint, not authentication. The hosted MCP
server validates the key and project scope. Plan, quota, and credit limits remain
enforced there.

## Permissions

Every RankReactor MCP tool defaults to interactive `ask`. Configured `deny` rules
are final. Unknown or newly added catalog tools stay at `ask`. This plugin does
not auto-allow tools based on name or untrusted read-only annotations.

A timeout can mean an earlier mutation already succeeded. Do not retry publish,
send, delete, or paid generation automatically.

## Credentials and logs

Status and setup commands redact Bearer values, project-key-shaped strings, and
Authorization assignments. They do not print environment values, OAuth tokens,
callback URLs, or raw auth error bodies. Removing the plugin does not revoke a
hosted key; revoke keys in the RankReactor dashboard.

## Endpoint boundary

The only RankReactor service/API endpoint this plugin configures is
`https://www.rankreactor.ai/mcp`. There is no endpoint override, no direct
backend client, and no alternate authentication URL. CI fails if scanned
source, docs, fixtures, build output, or the packed tarball include other
RankReactor API URLs or hosted-backend client imports.

## Release guards

`package.json` is `private` and `UNLICENSED`. `npm publish` is blocked until the
owner selects a license and authorizes a release. Do not publish this package or
submit it to a plugin directory without that approval.

`npm audit` currently reports moderate findings inside the pinned
`@opencode/plugin@2.2.6` tree. They are upstream of this plugin. This package
does not bundle those modules into an install-time script. Re-audit before any
authorized npm release.
