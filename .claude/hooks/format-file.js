#!/usr/bin/env node
// PostToolUse hook (Write|Edit): runs Prettier and ESLint --fix on the file just written.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const PRETTIER_EXTS = new Set([
  ".js", ".jsx", ".mjs", ".cjs",
  ".ts", ".tsx",
  ".json", ".md", ".mdx", ".css",
]);
const ESLINT_EXTS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const filePath =
      (input.tool_response && input.tool_response.filePath) ||
      (input.tool_input && input.tool_input.file_path);
    if (!filePath) return;

    const ext = path.extname(filePath).toLowerCase();
    // execFileSync spawning "npx.cmd" directly fails with EINVAL on Windows;
    // shell:true is required there to resolve npx as a shell built-in shim.
    const run = (args) =>
      execFileSync("npx", args, { stdio: "ignore", shell: true });

    if (PRETTIER_EXTS.has(ext)) {
      try {
        run(["--no-install", "prettier", "--write", filePath]);
      } catch {
        // ignore formatting failures (e.g. no prettier config match, syntax error)
      }
    }

    if (ESLINT_EXTS.has(ext)) {
      try {
        run(["--no-install", "eslint", "--fix", filePath]);
      } catch {
        // ignore lint failures; don't block the tool call
      }
    }
  } catch {
    // malformed input JSON; nothing to do
  }
});
