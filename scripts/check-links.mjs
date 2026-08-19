import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const ignoredPrefixes = [
  "#",
  "http:",
  "https:",
  "mailto:",
  "tel:",
  "javascript:",
  "data:",
];
const attributePattern = /(?:href|src)=["']([^"']+)["']/gi;

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries
      .filter(
        (entry) => !entry.name.startsWith(".") && entry.name !== "node_modules",
      )
      .map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return findHtmlFiles(fullPath);
        return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
      }),
  );

  return nestedFiles.flat();
}

function isLocalReference(reference) {
  return (
    reference && !ignoredPrefixes.some((prefix) => reference.startsWith(prefix))
  );
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

const htmlFiles = await findHtmlFiles(repositoryRoot);
const failures = [];

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, "utf8");
  const referenceDirectory =
    path.dirname(htmlFile) === path.join(repositoryRoot, "components")
      ? repositoryRoot
      : path.dirname(htmlFile);
  for (const match of html.matchAll(attributePattern)) {
    const reference = match[1].split(/[?#]/, 1)[0];
    if (!isLocalReference(reference)) continue;

    const candidate = reference.startsWith("/")
      ? path.join(repositoryRoot, reference)
      : path.resolve(referenceDirectory, reference);
    const resolvedCandidate = candidate.endsWith(path.sep)
      ? path.join(candidate, "index.html")
      : candidate;

    if (!(await exists(resolvedCandidate))) {
      failures.push(
        `${path.relative(repositoryRoot, htmlFile)} -> ${match[1]}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Broken local links or assets found:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(
  `Checked local links and assets in ${htmlFiles.length} HTML file(s).`,
);
