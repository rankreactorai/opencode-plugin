import assert from "node:assert/strict"

export { afterEach, beforeEach, describe, it } from "node:test"

export function expect(actual: unknown) {
  const self = {
    toBe(expected: unknown) {
      assert.strictEqual(actual, expected)
    },
    toEqual(expected: unknown) {
      assert.deepEqual(actual, expected)
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined)
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined)
    },
    toHaveLength(length: number) {
      assert.ok(actual !== null && typeof actual === "object" && "length" in actual)
      assert.strictEqual((actual as { length: number }).length, length)
    },
    toContain(expected: unknown) {
      if (typeof actual === "string") {
        assert.ok(actual.includes(String(expected)))
        return
      }
      assert.ok(Array.isArray(actual) && actual.includes(expected))
    },
    toMatch(pattern: RegExp) {
      assert.match(String(actual), pattern)
    },
    toMatchObject(expected: Record<string, unknown>) {
      assert.ok(actual !== null && typeof actual === "object")
      for (const [key, value] of Object.entries(expected)) {
        assert.deepEqual((actual as Record<string, unknown>)[key], value)
      }
    },
    not: {
      toContain(expected: unknown) {
        if (typeof actual === "string") {
          assert.ok(!actual.includes(String(expected)))
          return
        }
        assert.ok(!(Array.isArray(actual) && actual.includes(expected)))
      },
      toMatch(pattern: RegExp) {
        assert.doesNotMatch(String(actual), pattern)
      },
    },
  }
  return self
}
