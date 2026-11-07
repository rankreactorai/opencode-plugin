import { afterEach, beforeEach } from "node:test"
import http from "node:http"
import https from "node:https"

const BLOCKED = "RankReactor plugin tests must not open real network connections"

function blocked(): never {
  throw new Error(BLOCKED)
}

export function installNetworkGuard(): void {
  let originalFetch: typeof fetch | undefined
  const originalHttpRequest = http.request
  const originalHttpsRequest = https.request

  beforeEach(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = (async () => blocked()) as typeof fetch
    http.request = ((..._args: unknown[]) => blocked()) as typeof http.request
    https.request = ((..._args: unknown[]) => blocked()) as typeof https.request
  })

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch
    }
    http.request = originalHttpRequest
    https.request = originalHttpsRequest
  })
}
