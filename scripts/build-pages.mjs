import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = path.join(repositoryRoot, "dist");
const publishPaths = [
  "CNAME",
  "favicon.png",
  "index.html",
  "dainik-karyakram.html",
  "gallery.html",
  "kalash.html",
  "registration.html",
  "team.html",
  "components",
  "css",
  "data",
  "images",
  "js",
];

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

for (const publishPath of publishPaths) {
  await cp(
    path.join(repositoryRoot, publishPath),
    path.join(outputDirectory, publishPath),
    {
      recursive: true,
    },
  );
}

console.log(
  `Built Pages artifact in ${path.relative(repositoryRoot, outputDirectory)}.`,
);
