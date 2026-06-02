const { readFileSync, writeFileSync } = require("node:fs");

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

writeFileSync(
  "./src/version.js",
  `export const version = ${JSON.stringify(pkg.version)};\n`,
);
