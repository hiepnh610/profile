// prerender-archify.mjs — render diagrams/*.json (Archify specs) to static SVGs.
//
// For each spec in diagrams/<name>.<type>.json this runs the Archify skill's
// `deliver` command (showcase quality, all composition checks must pass),
// extracts the <svg> from the delivered viewer HTML, strips viewer-only parts
// (background grid, accessibility ids that would collide between diagrams),
// and writes assets/archify/<name>.svg. The `archify` shortcode inlines that
// file — zero JS shipped, colors come from CSS classes styled in the shortcode
// so the diagram follows the site theme toggle without a re-render.
//
//   npm run prerender          # = node tools/prerender-archify.mjs
//
// Archify itself is not a dependency of this repo: it is the Claude Code skill
// at ~/.claude/skills/archify (override with ARCHIFY_DIR). The generated SVGs
// are committed, so CI never needs it.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'diagrams');
const outDir = join(root, 'assets', 'archify');
const archifyDir = process.env.ARCHIFY_DIR || join(homedir(), '.claude', 'skills', 'archify');
const archify = join(archifyDir, 'bin', 'archify.mjs');

const SPEC_RE = /^(?<name>[a-z0-9-]+)\.(?<type>architecture|workflow|sequence|dataflow|lifecycle)\.json$/;

mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'archify-'));
const wanted = new Set();
let rendered = 0;

function deliver(type, specPath, name) {
  const outHtml = join(tmp, `${name}.html`);
  const res = spawnSync(process.execPath, [archify, 'deliver', type, specPath, outHtml, '--quality', 'showcase', '--json'], {
    encoding: 'utf8',
  });
  let receipt;
  try {
    receipt = JSON.parse(res.stdout);
  } catch {
    throw new Error(`archify produced no JSON receipt (exit ${res.status}): ${(res.stderr || res.stdout).trim()}`);
  }
  if (!receipt.ok) throw new Error(receipt.error || 'archify deliver failed');
  const v = receipt.validation || {};
  if (v.errors || v.warnings || v.checksPassed !== v.checkCount) {
    throw new Error(`showcase validation not clean: ${JSON.stringify(v)}`);
  }
  return readFileSync(outHtml, 'utf8');
}

function extractSvg(html, name) {
  const m = html.match(/<svg viewBox="[^"]*"[^>]*>[\s\S]*?<\/svg>/);
  if (!m) throw new Error('no <svg> found in delivered HTML');
  let svg = m[0];

  // Viewer-only background grid — the blog inlines diagrams on the paper background.
  svg = svg.replace(/\s*<!-- Background Grid -->\s*<rect width="100%" height="100%" fill="url\(#grid\)" \/>/, '');
  svg = svg.replace(/\s*<pattern id="grid"[\s\S]*?<\/pattern>/, '');

  // Prefix every id so two diagrams on one page cannot collide (markers, a11y labels).
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    svg = svg
      .replace(new RegExp(`\\sid="${esc}"`, 'g'), ` id="${name}-${id}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${name}-${id})`)
      .replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${name}-${id}"`)
      .replace(new RegExp(`aria-labelledby="([^"]*)\\b${esc}\\b`, 'g'), (_, pre) => `aria-labelledby="${pre}${name}-${id}`);
  }

  // Mark the root so the shortcode CSS can scope to it (survives the enlarge modal's outerHTML copy).
  svg = svg.replace(/^<svg /, '<svg xmlns="http://www.w3.org/2000/svg" data-archify="" ');
  // Strip authoring-time indentation from the viewer template.
  return svg.replace(/^ {8}/gm, '') + '\n';
}

try {
  for (const entry of readdirSync(srcDir).sort()) {
    const m = entry.match(SPEC_RE);
    if (!m) {
      if (entry.endsWith('.json')) console.error(`SKIP ${entry}: expected <name>.<type>.json`);
      continue;
    }
    const { name, type } = m.groups;
    wanted.add(`${name}.svg`);
    try {
      const html = deliver(type, join(srcDir, entry), name);
      writeFileSync(join(outDir, `${name}.svg`), extractSvg(html, name));
      rendered++;
    } catch (e) {
      console.error(`FAIL diagrams/${entry}: ${e.message}`);
      process.exitCode = 1;
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// Prune SVGs whose spec no longer exists.
let pruned = 0;
for (const entry of readdirSync(outDir)) {
  if (entry.endsWith('.svg') && !wanted.has(entry)) {
    unlinkSync(join(outDir, entry));
    pruned++;
  }
}

console.log(`${wanted.size} diagram(s) found, ${rendered} rendered, ${pruned} stale SVG(s) pruned → assets/archify/`);
