# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo v0.161.1 static blog deployed to GitHub Pages at hoanghiep.dev.
No backend, no JS framework, no bundler, no theme — every template is hand-written in `/layouts/`; `hugo --minify` → `/public/`.

## Essential Commands

```bash
hugo server -D                            # local dev (includes drafts)
hugo --minify                             # production build → /public/
hugo new posts/YYYY-MM-DD-slug.md         # new post from archetype
```

CI (`.github/workflows/deploy.yml`) auto-builds and deploys on every push to `master`.
The pipeline runs a **Gitleaks secret scan** (`security` job) before the `build` job — both must pass.
Supply-chain hardening: actions are pinned by commit SHA (tag in trailing comment) and the Gitleaks/Hugo downloads are sha256-verified — when bumping a version, update BOTH the version and its checksum (from the release's `*_checksums.txt`).

Husky runs `gitleaks protect --staged` on every local commit. Requires `gitleaks` installed locally.

## Key Files — Open These First

| Task | File |
|------|------|
| Site config, analytics IDs, menu | `hugo.yaml` |
| Home page orchestration | `layouts/index.html` |
| Shared design tokens + topbar/search-modal CSS | `layouts/partials/styles-shared.html` |
| Home-only styles | `layouts/partials/home/styles.html` |
| Home page scripts (tag filter + shared UI JS) | `layouts/partials/home/scripts.html` |
| Shared search + theme-toggle JS | `layouts/partials/ui-scripts.html` |
| GA4 snippet (all pages) | `layouts/partials/analytics.html` |
| Single post page (also renders /about/) | `layouts/single.html` |
| Posts archive + tag filter | `layouts/posts/list.html` |
| Tags index (/tags/) + per-tag pages | `layouts/taxonomy.html` · `layouts/term.html` |
| New post template | `archetypes/posts.md` |
| CI/CD deploy | `.github/workflows/deploy.yml` |

## Layout Architecture

### Home page (`layouts/index.html`)
Orchestrates partials from `layouts/partials/home/`:

| Partial | Purpose | Data received |
|---------|---------|---------------|
| `head.html` | `<head>` meta + shared partials | `.` |
| `sidebar.html` | Intro header: bio + one-line stats | `dict "totalPosts" "wordsThisYear"` |
| `featured-card.html` | Flat featured-post block | `dict "featured"` |
| `posts-list.html` | Recent 8 posts + tag filter tabs | `dict "recent" "totalPosts"` |
| `projects.html` | Side-projects section | `.` |
| `footer.html` | Site footer | `.` |
| `scripts.html` | Tag filter JS + includes `ui-scripts.html` | `.` |

### Shared partials (`layouts/partials/`)
Used by home head, `layouts/single.html`, and `layouts/posts/list.html` — edit these, never re-inline their contents into a page template:

| Partial | Purpose |
|---------|---------|
| `analytics.html` | GA4 (prod only) |
| `theme-init.html` | pre-paint `data-theme` from localStorage |
| `styles-shared.html` | design tokens, reset, topbar, icons, search-modal, focus/reduced-motion CSS |
| `styles-list.html` | post-list page CSS (page-header, post rows, footer) — posts list + tags pages |
| `topbar.html` | sticky nav header — `dict "active" "home\|about\|posts"` |
| `icon.html` | inline SVG icons — `partial "icon.html" "search"` (search, sun, moon, arrows) |
| `search-modal.html` | Fuse.js search `<dialog>` markup |
| `ui-scripts.html` | search modal + theme toggle JS |
| `fonts.html` | `@font-face` + preloads for self-hosted woff2 |

### Non-home pages
`layouts/single.html` renders ALL single pages (posts, /about/) — not just posts. `layouts/posts/list.html` renders the archive; `layouts/taxonomy.html` / `layouts/term.html` render /tags/ and /tags/<tag>/; `layouts/404.html` is the GitHub Pages not-found page. All are standalone documents composing the shared partials above.

### Shortcodes
`layouts/shortcodes/mermaid.html` — renders Mermaid diagrams in posts via [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid). Diagrams are **pre-rendered at authoring time**: after adding/editing a `{{</* mermaid */>}}` block, run `npm run prerender` (= `node tools/prerender-mermaid.mjs`) and commit the generated `assets/mermaid/<md5>.svg` — the shortcode inlines it (zero JS shipped). If the hash doesn't match (forgot to run it), the block falls back to client-side rendering via the self-hosted 1.6 MB `/static/js/beautiful-mermaid.min.js`, so nothing breaks — but always run the prerender. Supported diagram types ONLY: flowchart, sequence, state, class, ER, XY chart — no pie/gantt/mindmap/timeline/gitgraph. Colors are CSS vars from the site design tokens (`--paper`/`--ink`), so inlined diagrams follow theme toggles with no re-render.

### Third-party policy
Everything is self-hosted (`/static/fonts/`, `/static/js/`) — no CDN, no Google Fonts. The ONLY external requests are GA4 (`googletagmanager.com`, in `layouts/partials/analytics.html`) and the Cloudflare Web Analytics beacon (`static.cloudflareinsights.com`, injected at the edge by Cloudflare — not in this repo). Both are allowlisted in the CSP, which is set via a Cloudflare Transform Rule (also not in this repo) — adding any new external origin requires updating that CSP too. Icons are inline SVG via `layouts/partials/icon.html` — do not add icon fonts.

## Content Conventions

Writing a post? Use the `/write-post` skill (`.claude/skills/write-post/SKILL.md`) — it encodes voice, front matter, and the publish checklist.

Posts: `content/posts/YYYY-MM-DD-slug.md`

YAML front matter:
```yaml
title: ""
date: YYYY-MM-DD
draft: false
tags: ["dev"]          # dev | meta | network
description: ""        # meta description
dek: ""                # listing summary (falls back to auto-truncated content)
showToc: false
# featured: true       # surfaces post in home page hero card
```

## Visual Design

Styled after watchyourhack.com: single narrow column (`max-width: 44rem`), warm paper background, flat markdown-like blocks separated by `<hr>`, blue links (underline on hover only), light + dark themes.

## CSS Design Tokens

CSS variables live in ONE place: `layouts/partials/styles-shared.html` (included by home head, single, posts list):

```
--ink, --head, --muted, --quiet   # text hierarchy (head = headings)
--paper                           # page background (#f8f8f6 light / #1b1b19 dark)
--rule, --rule-2                  # borders / subtle bg
--link                            # link blue (#006fd0 light / #58a6ff dark)
--code-bg                         # inline-code background
--topbar-bg                       # sticky header background
```

Fonts: `iA Writer Duospace` (body + code) · `Montserrat 700` (headings) — self-hosted woff2 in `/static/fonts/`, `@font-face` + preloads in `layouts/partials/fonts.html` (included by home head, single, posts list).

## JavaScript Patterns

- Vanilla JS only — no frameworks, no bundler
- Shared JS (search modal, theme toggle) lives in `layouts/partials/ui-scripts.html`; page-specific JS stays inline at the bottom of each template
- Use IIFE wrappers `(function() { ... })()` to avoid polluting global scope
- Key client-side features:
  - **Search** — Fuse.js 7 (self-hosted `/static/js/fuse.min.js`, lazy-loaded on first search open) consuming `/index.json` (generated by `layouts/index.json`)
  - **Theme toggle** — localStorage key `theme` (`light` / `dark`)
  - **Tag filter** — DOM data-attribute `[data-tag]` on `.post-item` elements
  - **Analytics** — GA4 (`gtag`) with custom events

## What NOT to Touch

- `/public/` — build artifact, never edit manually (regenerated each build)
- `hugo.yaml` `params` — only 4 params exist and all are consumed by templates (`env`, `googleAnalytics`, `description`, `author`); don't add theme-style config that nothing reads

## Commit Convention

`feat:` · `fix:` · `ci:` · `chore:` · `style:`

Do not add any Claude/agent signature or co-author footer to commit messages (e.g. no "🤖 Generated with Claude Code", no "Co-Authored-By: Claude").
