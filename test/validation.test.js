import test from "node:test";
import assert from "node:assert/strict";
import { validateInput } from "../lib/server.js";
import { TOOLS } from "../lib/tools.js";

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


test("applies the actual tool schema defaults without mutating client arguments", () => {
  const schemaFor = (name) => TOOLS.find((tool) => tool.name === name).inputSchema;

  const holdersArgs = { mint: "abc" };
  assert.deepEqual(validateInput(schemaFor("top_holders"), holdersArgs), {
    mint: "abc",
    limit: 20,
  });
  assert.deepEqual(holdersArgs, { mint: "abc" });

  assert.deepEqual(validateInput(schemaFor("screen_tokens"), {}), {
    source: "trending",
    sort: "vol",
    limit: 15,
  });
  assert.deepEqual(validateInput(schemaFor("whale_trades"), { mint: "abc" }), {
    mint: "abc",
    minUsd: 1000,
    limit: 20,
  });
  assert.deepEqual(validateInput(schemaFor("wallet_trades"), { wallet: "abc" }), {
    wallet: "abc",
    transactions: 25,
  });
});

test("rejects the issue's malformed tool arguments using real schemas", () => {
  const schemaFor = (name) => TOOLS.find((tool) => tool.name === name).inputSchema;

  assert.throws(
    () => validateInput(schemaFor("top_holders"), { mint: "abc", limit: "ten" }),
    /Invalid argument "limit": expected integer/,
  );
  assert.throws(
    () => validateInput(schemaFor("whale_trades"), { mint: "abc", minUsd: "1k" }),
    /Invalid argument "minUsd": expected number/,
  );
  assert.throws(
    () => validateInput(schemaFor("whale_trades"), { mint: "abc", limit: 0 }),
    /Invalid argument "limit": must be at least 1/,
  );
  assert.throws(
    () => validateInput(schemaFor("screen_tokens"), { maxAgeMinutes: null }),
    /Invalid argument "maxAgeMinutes": expected number/,
  );
  assert.throws(
    () => validateInput(schemaFor("screen_tokens"), { sort: "unknown" }),
    /Invalid argument "sort": expected one of/,
  );
});
