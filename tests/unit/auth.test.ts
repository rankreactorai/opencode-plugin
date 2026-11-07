import { afterEach, describe, expect, it } from "../helpers/test.ts"
import { authGuidance, readProjectApiKey } from "../../src/auth.ts"
import { API_KEY_ENV } from "../../src/constants.ts"
import { containsSecret } from "../../src/redaction.ts"

const FORMAT_OK = "rr_live_example_format_only_not_a_credential"

describe("readProjectApiKey", () => {
  const previous = process.env[API_KEY_ENV]

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[API_KEY_ENV]
    } else {
      process.env[API_KEY_ENV] = previous
    }
  })

  it("rejects a missing variable", () => {
    expect(readProjectApiKey({})).toEqual({ ok: false, code: "missing" })
  })

  it("rejects an empty value", () => {
    expect(readProjectApiKey({ [API_KEY_ENV]: "" })).toEqual({ ok: false, code: "empty" })
  })

  it("rejects whitespace-only and embedded whitespace", () => {
    expect(readProjectApiKey({ [API_KEY_ENV]: "   " })).toEqual({
      ok: false,
      code: "whitespace",
    })
    expect(readProjectApiKey({ [API_KEY_ENV]: `${FORMAT_OK} ` })).toEqual({
      ok: false,
      code: "whitespace",
    })
    expect(readProjectApiKey({ [API_KEY_ENV]: ` ${FORMAT_OK}` })).toEqual({
      ok: false,
      code: "whitespace",
    })
  })

  it("rejects control-character contamination", () => {
    expect(readProjectApiKey({ [API_KEY_ENV]: `${FORMAT_OK}\n` })).toEqual({
      ok: false,
      code: "control_characters",
    })
    expect(readProjectApiKey({ [API_KEY_ENV]: `${FORMAT_OK}\u0000` })).toEqual({
      ok: false,
      code: "control_characters",
    })
  })

  it("rejects obviously malformed credentials", () => {
    expect(readProjectApiKey({ [API_KEY_ENV]: "not-a-rankreactor-key" })).toEqual({
      ok: false,
      code: "malformed",
    })
    expect(readProjectApiKey({ [API_KEY_ENV]: "rr_live_" })).toEqual({
      ok: false,
      code: "malformed",
    })
  })

  it("accepts a well-formed project key without treating the prefix as authentication", () => {
    expect(readProjectApiKey({ [API_KEY_ENV]: FORMAT_OK })).toEqual({
      ok: true,
      key: FORMAT_OK,
    })
  })

  it("does not put the secret into user guidance", () => {
    for (const code of ["missing", "empty", "whitespace", "control_characters", "malformed"] as const) {
      const text = authGuidance(code)
      expect(containsSecret(text)).toBe(false)
      expect(text.includes(FORMAT_OK)).toBe(false)
    }
  })
})
