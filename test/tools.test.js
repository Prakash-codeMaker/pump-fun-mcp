import test from "node:test";
import assert from "node:assert/strict";

// RPC pacing is read when core.js is imported; zero keeps this offline fixture fast.
process.env.SOLANA_RPC_GAP_MS = "0";
process.env.BLIX_QUIET = "1";

const { TOOL_MAP } = await import("../lib/tools.js");

const wallet = "11111111111111111111111111111111";
const mint = "So11111111111111111111111111111111111111112";

function response(body) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  };
}

function buyTransaction(signature) {
  return {
    blockTime: 1_700_000_000,
    transaction: {
      signatures: [signature],
      message: { accountKeys: [wallet] },
    },
    meta: {
      err: null,
      fee: 5_000,
      preBalances: [1_000_000_000],
      postBalances: [500_000_000],
      preTokenBalances: [],
      postTokenBalances: [{
        owner: wallet,
        mint,
        uiTokenAmount: { uiAmountString: "100" },
      }],
    },
  };
}

test("wallet_trades reports fetched transactions separately from RPC failures", async () => {
  const originalFetch = globalThis.fetch;
  const dexRequests = [];
  const signatures = Array.from({ length: 5 }, (_, i) => ({ signature: `signature-${i}`, err: null }));

  globalThis.fetch = async (input, options = {}) => {
    const url = typeof input === "string" ? input : input.href;

    if (url === "https://api.mainnet-beta.solana.com") {
      const request = JSON.parse(options.body);
      if (request.method === "getSignaturesForAddress") {
        return response({ jsonrpc: "2.0", id: request.id, result: signatures });
      }
      if (request.method === "getTransaction") {
        const signature = request.params[0];
        if (signature === "signature-0" || signature === "signature-1") {
          return response({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32000, message: "fixture RPC failure" },
          });
        }
        return response({ jsonrpc: "2.0", id: request.id, result: buyTransaction(signature) });
      }
      throw new Error(`Unexpected RPC method: ${request.method}`);
    }

    if (url.startsWith("https://api.dexscreener.com/tokens/v1/solana/")) {
      dexRequests.push(url);
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [],
      };
    }

    throw new Error(`Unexpected network request: ${url}`);
  };

  try {
    const result = await TOOL_MAP.get("wallet_trades").run({ wallet, transactions: 5 });

    assert.equal(result.transactionsRead, 3);
    assert.equal(result.transactionsSkipped, 2);
    assert.match(result.note, /SOLANA_RPC_URL/);
    assert.equal(result.trades.length, 3);
    assert.equal(dexRequests.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
