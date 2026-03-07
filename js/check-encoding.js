#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const scanExt = new Set([".html", ".htm", ".css", ".js"]);
const ignoreDirs = new Set([".git", "node_modules"]);
const badRegexes = [
  /\uFFFD/,
  new RegExp("\\u00C3[\\u00A1\\u00E2\\u00E3\\u00E0\\u00E9\\u00EA\\u00ED\\u00F3\\u00F4\\u00F5\\u00FA\\u00E7]", "i"),
  new RegExp("\\u00C2[\\u00B7\\u00BA\\u00AA]"),
  new RegExp("\\u00C2(?=\\s)"),
  new RegExp("\\u00E2[\\u20AC\\u2122\\u0153\\u017E\\u20AC\\u201C\\u201D]")
];
const offenders = [];

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(fullPath);
      }
      continue;
    }
    if (!scanExt.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }
    scanFile(fullPath);
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of badRegexes) {
      if (pattern.test(line)) {
        offenders.push({
          file: path.relative(rootDir, filePath),
          line: i + 1,
          text: line.trim().slice(0, 160)
        });
        break;
      }
    }
  }
}

walk(rootDir);

if (offenders.length > 0) {
  console.error("Encoding check failed. Possible mojibake found:");
  for (const item of offenders) {
    console.error(`- ${item.file}:${item.line} ${item.text}`);
  }
  process.exit(1);
}

console.log("Encoding check passed. No mojibake patterns found.");
