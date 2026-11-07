/** Stable plugin id from Plugin.define. */
export const PLUGIN_ID = "rankreactor"

/** Default MCP server name. Keep this short; OpenCode normalizes names for tools. */
export const DEFAULT_SERVER_NAME = "rankreactor"

/** Sole RankReactor MCP service/API endpoint this plugin may configure. */
export const RANKREACTOR_MCP_URL = "https://www.rankreactor.ai/mcp"

/** Account signup and dashboard navigation (not an API endpoint). */
export const RANKREACTOR_APP_URL = "https://www.rankreactor.ai"

/** Process environment variable holding the project API key. Never put the key in plugin options. */
export const API_KEY_ENV = "RANKREACTOR_API_KEY"

/**
 * Format hint for RankReactor project API keys. Presence of this prefix is not
 * authentication; the hosted MCP server validates the key and project scope.
 */
export const API_KEY_PREFIX = "rr_live_"

export const SETUP_COMMAND = "rankreactor-setup"
export const STATUS_COMMAND = "rankreactor-status"

export const ASK_ALL_TOOLS_MESSAGE =
  "RankReactor MCP tools require interactive confirmation. Unknown and newly published catalog tools stay at ask; configured deny rules are not weakened."
