import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(join(standaloneDir, "server.js"))) {
  throw new Error("Missing .next/standalone/server.js. Run `next build` first.");
}

for (const [source, destination] of [
  [join(root, "public"), join(standaloneDir, "public")],
  [join(root, ".next", "static"), join(standaloneDir, ".next", "static")],
]) {
  if (!existsSync(source)) {
    throw new Error(`Missing standalone asset source: ${source}`);
  }

  rmSync(destination, { force: true, recursive: true });
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

console.log("Staged public and static assets in .next/standalone.");
