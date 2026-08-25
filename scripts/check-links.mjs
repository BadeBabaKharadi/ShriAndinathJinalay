import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "playwright-report",
  "test-results",
  "coverage",
]);

const FILE_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

const URL_PATTERN = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;

const CSS_URL_PATTERN = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

const errors = [];

function shouldIgnore(relativePath) {
  const parts = relativePath.split(path.sep);

  return parts.some((part) => IGNORE_DIRS.has(part));
}

function isLocalReference(reference) {
  if (!reference) {
    return false;
  }

  const value = reference.trim();

  if (!value) {
    return false;
  }

  if (
    value.startsWith("#") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("//") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("data:") ||
    value.startsWith("javascript:")
  ) {
    return false;
  }

  return true;
}

function stripQueryAndHash(reference) {
  return reference.split("#")[0].split("?")[0];
}

function resolveReference(sourceFile, reference) {
  const cleanReference = stripQueryAndHash(reference);

  if (!cleanReference) {
    return null;
  }

  const relativeSource = path.relative(ROOT, sourceFile);

  /*
   * Files under components/ are reusable HTML
   * fragments injected into pages at the site root.
   *
   * Their links therefore resolve relative to
   * the website root, not components/.
   *
   * Example:
   *
   * components/navbar.html
   *     -> index.html
   *     -> kalash.html
   */
  if (relativeSource.startsWith(`components${path.sep}`)) {
    return path.resolve(ROOT, cleanReference);
  }

  return path.resolve(path.dirname(sourceFile), cleanReference);
}

function existsAsFileOrDirectory(target) {
  if (fs.existsSync(target)) {
    return true;
  }

  const candidates = [
    `${target}.html`,
    `${target}.css`,
    `${target}.js`,
    `${target}.mjs`,
  ];

  return candidates.some((candidate) => fs.existsSync(candidate));
}

function collectFiles(directory) {
  const results = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
      continue;
    }

    if (entry.name.startsWith(".") && entry.name !== ".well-known") {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    const relativePath = path.relative(ROOT, fullPath);

    if (shouldIgnore(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results;
}

function checkReference(sourceFile, reference) {
  if (!isLocalReference(reference)) {
    return;
  }

  const target = resolveReference(sourceFile, reference);

  if (!target) {
    return;
  }

  if (!existsAsFileOrDirectory(target)) {
    errors.push({
      sourceFile,
      reference,
    });
  }
}

const files = collectFiles(ROOT);

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");

  const extension = path.extname(file).toLowerCase();

  if (extension === ".html" || extension === ".js" || extension === ".mjs") {
    for (const match of content.matchAll(URL_PATTERN)) {
      checkReference(file, match[1]);
    }
  }

  if (extension === ".css") {
    for (const match of content.matchAll(CSS_URL_PATTERN)) {
      checkReference(file, match[1]);
    }
  }
}

if (errors.length > 0) {
  console.error("Broken local links or assets found:");

  for (const error of errors) {
    console.error(
      `${path.relative(ROOT, error.sourceFile)} -> \`${error.reference}\``,
    );
  }

  process.exit(1);
}

console.log(`Link check passed (${files.length} files checked).`);
