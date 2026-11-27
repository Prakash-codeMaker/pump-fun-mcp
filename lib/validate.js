/**
 * Validate MCP tool arguments against the JSON Schema subset used by this server.
 * Defaults are applied to a fresh object so caller-owned arguments are not mutated.
 */
const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function validateToolArguments(schema, args) {
  if (!isPlainObject(args)) {
    throw new Error("Arguments must be an object.");
  }

  const properties = schema?.properties || {};
  const normalized = { ...args };

  for (const name of schema?.required || []) {
    if (normalized[name] === undefined) {
      throw new Error(`Missing required argument "${name}".`);
    }
  }

  for (const [name, rule] of Object.entries(properties)) {
    if (normalized[name] === undefined && Object.hasOwn(rule, "default")) {
      normalized[name] = rule.default;
    }

    const value = normalized[name];
    if (value === undefined) continue;

    if (rule.type === "string" && typeof value !== "string") {
      throw new Error(`Invalid argument "${name}": must be a string.`);
    }
    if (rule.type === "integer" && !Number.isInteger(value)) {
      throw new Error(`Invalid argument "${name}": must be an integer.`);
    }
    if (rule.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new Error(`Invalid argument "${name}": must be a finite number.`);
    }
    if (rule.type === "boolean" && typeof value !== "boolean") {
      throw new Error(`Invalid argument "${name}": must be a boolean.`);
    }

    if (rule.enum && !rule.enum.includes(value)) {
      throw new Error(
        `Invalid argument "${name}": must be one of ${rule.enum.map((entry) => JSON.stringify(entry)).join(", ")}.`,
      );
    }

    if (typeof value === "number" && rule.minimum !== undefined && value < rule.minimum) {
      throw new Error(`Invalid argument "${name}": must be at least ${rule.minimum}.`);
    }
    if (typeof value === "number" && rule.maximum !== undefined && value > rule.maximum) {
      throw new Error(`Invalid argument "${name}": must be at most ${rule.maximum}.`);
    }
  }

  return normalized;
}
