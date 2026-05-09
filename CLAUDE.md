# CLAUDE.md — hoanghiep.dev

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

## Key Files — Open These First

| Task | File |
|------|------|
| Site config, analytics IDs, menu | `hugo.yaml` |
| Home page layout + JS | `layouts/index.html` |
| Single post page | `layouts/single.html` |
| Posts archive + tag filter | `layouts/posts/list.html` |
| Shared `<head>` (GA4, Fingerprint.js) | `layouts/partials/extend_head.html` |
| New post template | `archetypes/posts.md` |
| CI/CD deploy | `.github/workflows/deploy.yml` |

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

## CSS Design Tokens

CSS variables defined inline in each template (no external stylesheet):

```
--ink, --paper, --muted, --quiet   # text hierarchy
--rule, --rule-2                   # borders
--topbar-bg                        # sticky header background
```

Fonts: `Geist` (body) · `Geist Mono` (code/meta) · `Newsreader` (headings)

## JavaScript Patterns

- Vanilla JS only — no frameworks, no bundler
- All scripts are inline `<script>` blocks at the bottom of each template
- Use IIFE wrappers `(function() { ... })()` to avoid polluting global scope
- Key client-side features:
  - **Search** — Fuse.js 7 consuming `/index.json`
  - **Theme toggle** — localStorage key `theme` (`light` / `dark`)
  - **Tag filter** — DOM data-attribute `[data-tag]` on `.post-item` elements
  - **Analytics** — GA4 (`gtag`) with custom events + Fingerprint.js visitor ID caching

## What NOT to Touch

- `/public/` — build artifact, never edit manually (regenerated each build)
- `/themes/PaperMod/` — git submodule; create overrides in `/layouts/` instead

## Commit Convention

`feat:` · `fix:` · `ci:` · `chore:` · `style:`
