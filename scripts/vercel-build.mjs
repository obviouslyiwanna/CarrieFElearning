import { existsSync, mkdirSync, readdirSync, renameSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const clientDir = resolve(root, "dist/client");
const outputDir = resolve(root, "dist/server/prerendered-routes");

const build = spawnSync(
  process.execPath,
  ["node_modules/vinext/dist/cli.js", "build", "--prerender-all"],
  { cwd: root, stdio: "inherit" },
);

if (build.status !== 0 && !existsSync(join(outputDir, "index.html"))) {
  process.exit(build.status ?? 1);
}

if (build.status !== 0) {
  console.warn("vinext exited after writing the prerendered output; continuing.");
}

for (const entry of readdirSync(clientDir)) {
  if (entry === "_next") {
    cpSync(join(clientDir, entry), join(outputDir, entry), { recursive: true });
    continue;
  }

  const source = join(clientDir, entry);
  const destination = join(outputDir, entry);
  cpSync(source, destination, { recursive: true });
}

function normalizeHtmlRoutes(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);

    if (entry.isDirectory()) {
      normalizeHtmlRoutes(source);
      continue;
    }

    if (!entry.name.endsWith(".html") || entry.name === "index.html" || entry.name === "404.html") {
      continue;
    }

    const routeDir = join(directory, entry.name.slice(0, -5));
    mkdirSync(routeDir, { recursive: true });
    renameSync(source, join(routeDir, "index.html"));
  }
}

normalizeHtmlRoutes(outputDir);
