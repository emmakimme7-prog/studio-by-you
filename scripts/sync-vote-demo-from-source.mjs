import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.resolve(repoRoot, "..", "투표시스템");
const targetRoot = path.resolve(repoRoot, "public", "vote-demo");

const filesToCopy = [
  "app.js",
  "styles.css",
  "move.svg",
  "symbol.png",
];

if (!fs.existsSync(sourceRoot)) {
  console.error(`Vote source project not found: ${sourceRoot}`);
  process.exit(1);
}

for (const file of filesToCopy) {
  const sourcePath = path.join(sourceRoot, file);
  const targetPath = path.join(targetRoot, file);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Missing source file: ${sourcePath}`);
    process.exit(1);
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`synced ${file}`);
}

const appJsPath = path.join(targetRoot, "app.js");
let appJs = fs.readFileSync(appJsPath, "utf8");
appJs = appJs.replace(
  "    appState.user = data.user;\n",
  "    appState.user = data.user || data;\n"
);
fs.writeFileSync(appJsPath, appJs);
console.log("patched demo session fallback");
