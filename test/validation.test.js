import test from "node:test";
import assert from "node:assert/strict";
import { validateInput } from "../lib/server.js";

const schema = {
  type: "object",
  required: ["mint"],
  properties: {
    mint: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: 20, default: 20 },
    minUsd: { type: "number", minimum: 0 },
    sort: { type: "string", enum: ["vol", "liq"] },
  },
};

test("validates required fields, types, bounds, and enums", () => {
  assert.doesNotThrow(() => validateInput(schema, { mint: "abc", limit: 10, minUsd: 1.5, sort: "vol" }));
  for (const args of [
    {},
    { mint: "abc", limit: "ten" },
    { mint: "abc", limit: 0 },
    { mint: "abc", minUsd: null },
    { mint: "abc", sort: "unknown" },
  ]) {
    assert.throws(() => validateInput(schema, args), /Invalid argument|Missing required argument/);
  }
});
