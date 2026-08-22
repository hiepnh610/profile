// prerender-mermaid.mjs — render {{< mermaid >}} blocks to static SVGs.
//
// Scans content/ for mermaid shortcode blocks, renders each through the same
// patched beautiful-mermaid bundle the browser fallback uses, and writes
// assets/mermaid/<md5-of-source>.svg. The shortcode inlines the SVG when the
// hash matches; otherwise it falls back to client-side rendering — so run
// this after adding or editing a diagram, and commit the SVGs:
//
//   node tools/prerender-mermaid.mjs
//
// Hashing must mirror layouts/shortcodes/mermaid.html (`md5 (trim .Inner ...)`)
// — a mismatch is harmless (client fallback) but ships 1.6 MB of JS.

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'mermaid');
const { renderMermaidSVG } = await import(join(root, 'static/js/beautiful-mermaid.min.js'));

// Same options as the client-side path in layouts/shortcodes/mermaid.html.
const RENDER_OPTS = {
  bg: 'var(--paper)',
  fg: 'var(--ink)',
  accent: 'var(--link)',
  font: 'iA Writer Duospace',
  transparent: true,
};

function* markdownFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* markdownFiles(path);
    else if (entry.endsWith('.md')) yield path;
  }
}

const BLOCK_RE = /\{\{<\s*mermaid\s*>\}\}([\s\S]*?)\{\{<\s*\/mermaid\s*>\}\}/g;

mkdirSync(outDir, { recursive: true });
const wanted = new Map(); // hash → { src, file }

for (const file of markdownFiles(join(root, 'content'))) {
  const md = readFileSync(file, 'utf8');
  for (const [, inner] of md.matchAll(BLOCK_RE)) {
    const src = inner.trim();
    const hash = createHash('md5').update(src).digest('hex');
    wanted.set(hash, { src, file });
  }
}

let rendered = 0;
for (const [hash, { src, file }] of wanted) {
  try {
    // The renderer hardcodes a Google Fonts @import; fonts are self-hosted,
    // so drop it — same cleanup the client-side path does.
    const svg = renderMermaidSVG(src, RENDER_OPTS).replace(/@import url\([^)]*\);/g, '');
    writeFileSync(join(outDir, `${hash}.svg`), svg);
    rendered++;
  } catch (e) {
    console.error(`FAIL ${file}: ${e.message} — post will use client-side fallback`);
    process.exitCode = 1;
  }
}

// Prune SVGs whose source diagram no longer exists anywhere in content/.
let pruned = 0;
for (const entry of readdirSync(outDir)) {
  if (entry.endsWith('.svg') && !wanted.has(entry.replace(/\.svg$/, ''))) {
    unlinkSync(join(outDir, entry));
    pruned++;
  }
}

console.log(`${wanted.size} diagram(s) found, ${rendered} rendered, ${pruned} stale SVG(s) pruned → assets/mermaid/`);
