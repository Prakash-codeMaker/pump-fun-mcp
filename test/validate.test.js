import test from "node:test";
import assert from "node:assert/strict";
import { handle } from "../lib/server.js";
import { TOOL_MAP } from "../lib/tools.js";
import { validateToolArguments } from "../lib/validate.js";

const mint = "So11111111111111111111111111111111111111112";

test("tool argument validation applies schema defaults without mutating input", () => {
  const args = { mint };
  const normalized = validateToolArguments(TOOL_MAP.get("top_holders").inputSchema, args);

  assert.deepEqual(normalized, { mint, limit: 20 });
  assert.deepEqual(args, { mint });

  assert.deepEqual(
    validateToolArguments(TOOL_MAP.get("screen_tokens").inputSchema, {}),
    { source: "trending", sort: "vol", limit: 15 },
  );
  assert.deepEqual(
    validateToolArguments(TOOL_MAP.get("whale_trades").inputSchema, { mint }),
    { mint, minUsd: 1000, limit: 20 },
  );
});

test("tools/call rejects invalid arguments before making a network request", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error("network should not be called for invalid arguments");
  };

  const cases = [
    { name: "top_holders", arguments: { mint, limit: "ten" }, argument: "limit", message: /integer/ },
    { name: "whale_trades", arguments: { mint, minUsd: "1k" }, argument: "minUsd", message: /finite number/ },
    { name: "whale_trades", arguments: { mint, limit: 0 }, argument: "limit", message: /at least 1/ },
    { name: "screen_tokens", arguments: { maxAgeMinutes: null }, argument: "maxAgeMinutes", message: /finite number/ },
    { name: "screen_tokens", arguments: { limit: 0 }, argument: "limit", message: /at least 1/ },
    { name: "screen_tokens", arguments: { sort: "unknown" }, argument: "sort", message: /must be one of/ },
    { name: "token_info", arguments: {}, argument: "mint", message: /Missing required argument/ },
  ];

  try {
    for (const [index, item] of cases.entries()) {
      const response = await handle({
        jsonrpc: "2.0",
        id: index + 1,
        method: "tools/call",
        params: { name: item.name, arguments: item.arguments },
      });

      assert.equal(response.result.isError, true);
      assert.match(response.result.content[0].text, item.message);
      assert.match(response.result.content[0].text, new RegExp(item.argument));
    }
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
