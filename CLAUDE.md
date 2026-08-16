# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo v0.161.1 static blog deployed to GitHub Pages at hoanghiep.dev.
No backend, no JS framework, no bundler — just `hugo --minify` → `/public/`.
All customization overrides the PaperMod theme via `/layouts/`. Never edit `/themes/PaperMod/` directly.

## Essential Commands

```bash
hugo server -D                            # local dev (includes drafts)
hugo --minify                             # production build → /public/
hugo new posts/YYYY-MM-DD-slug.md         # new post from archetype
```

CI (`.github/workflows/deploy.yml`) auto-builds and deploys on every push to `master`.
The pipeline runs a **Gitleaks secret scan** (`security` job) before the `build` job — both must pass.

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
| GA4 + Fingerprint.js snippet (all pages) | `layouts/partials/analytics.html` |
| Single post page (also renders /about/, /search/) | `layouts/single.html` |
| Posts archive + tag filter | `layouts/posts/list.html` |
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
| `head-assets.html` | fonts partial + self-hosted Fuse.js |
| `analytics.html` | GA4 + Fingerprint.js (prod only) |
| `theme-init.html` | pre-paint `data-theme` from localStorage |
| `styles-shared.html` | design tokens, reset, topbar, icons, search-modal, focus/reduced-motion CSS |
| `topbar.html` | sticky nav header — `dict "active" "home\|about\|posts"` |
| `icon.html` | inline SVG icons — `partial "icon.html" "search"` (search, sun, moon, arrows) |
| `search-modal.html` | Fuse.js search `<dialog>` markup |
| `ui-scripts.html` | search modal + theme toggle JS |
| `fonts.html` | `@font-face` + preloads for self-hosted woff2 |

### Non-home pages
`layouts/single.html` renders ALL single pages (posts, /about/, /search/) — not just posts. `layouts/posts/list.html` renders the archive. Both are standalone documents composing the shared partials above. `layouts/partials/extend_head.html` (→ `analytics.html`) covers any remaining PaperMod-rendered page.

### Shortcodes
`layouts/shortcodes/mermaid.html` — renders Mermaid diagrams in posts (self-hosted `/static/js/mermaid.min.js`, loaded once per page via `.Page.Scratch`).

### Third-party policy
Everything is self-hosted (`/static/fonts/`, `/static/js/`) — no CDN, no Google Fonts. The ONLY external requests are GA4 (`googletagmanager.com`) and Fingerprint.js (`fpjscdn.net`), both in `layouts/partials/analytics.html`. Icons are inline SVG via `layouts/partials/icon.html` — do not add icon fonts.

## Content Conventions

Posts: `content/posts/YYYY-MM-DD-slug.md`

YAML front matter:
```yaml
title: ""
date: YYYY-MM-DD
draft: false
tags: ["dev"]          # dev | notes | meta
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
  - **Search** — Fuse.js 7 (self-hosted `/static/js/fuse.min.js`) consuming `/index.json` (generated by `layouts/index.json`)
  - **Theme toggle** — localStorage key `theme` (`light` / `dark`)
  - **Tag filter** — DOM data-attribute `[data-tag]` on `.post-item` elements
  - **Analytics** — GA4 (`gtag`) with custom events + Fingerprint.js visitor ID caching (key: `fingerprintPublicKey` in `hugo.yaml`)

## What NOT to Touch

- `/public/` — build artifact, never edit manually (regenerated each build)
- `/themes/PaperMod/` — git submodule; create overrides in `/layouts/` instead

## Commit Convention

`feat:` · `fix:` · `ci:` · `chore:` · `style:`
