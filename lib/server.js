import { TOOL_MAP, TOOLS } from "./tools.js";

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
const INFO = { name: "pump-fun-mcp", version: "1.0.0" };

/**
 * Handle one JSON-RPC message from an MCP client. Returns the response object,
 * or null for notifications. Exported on its own so it can be tested without stdio.
 */
export async function handle(msg) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return msg && msg.id !== undefined ? { jsonrpc: "2.0", id: msg.id, error: { code: -32600, message: "Invalid request" } } : null;
  }
  const { id, method, params = {} } = msg;
  const isNotification = id === undefined || id === null;
  const ok = (result) => (isNotification ? null : { jsonrpc: "2.0", id, result });
  const fail = (code, message) => (isNotification ? null : { jsonrpc: "2.0", id, error: { code, message } });

  switch (method) {
    case "initialize": {
      const asked = params.protocolVersion;
      return ok({
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: INFO,
        instructions: "Solana memecoin and pump.fun research tools: token info, rug checks, top holders, a screener, whale trades and wallet trades. Read-only; no trading or keys. Full terminal: https://blixvip.com",
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const tool = TOOL_MAP.get(params.name);
      if (!tool) return fail(-32602, `Unknown tool: ${params.name}`);
      try {
        const data = await tool.run(params.arguments || {});
        return ok({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data, isError: false });
      } catch (err) {
        // Tool failures are results the model can read, not protocol errors.
        return ok({ content: [{ type: "text", text: `Error: ${err.message}` }], isError: true });
      }
    }
    default:
      if (method.startsWith("notifications/")) return null;
      return fail(-32601, `Method not found: ${method}`);
  }
}
