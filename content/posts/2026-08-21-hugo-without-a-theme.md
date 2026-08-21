---
title: "What a hand-rolled Hugo site looks like"
date: 2026-08-21T00:00:00Z
draft: true
tags: ["dev", "writing"]
description: "How this blog's Hugo project is structured, without a theme, and how it deploys to GitHub Pages on every push."
dek: "How this blog's Hugo project is structured, without a theme, and how it deploys to GitHub Pages on every push."
showToc: true
---

The first thing every Hugo tutorial tells you to do is pick a theme. Drop it into `themes/`, point `hugo.yaml` at it, and you have a blog in five minutes.

I did that once. Then I wanted to change how the tag filter worked on the home page, and spent an hour reading someone else's partials trying to figure out which override hook I was supposed to use. That's when I ripped the theme out and wrote every template myself.

This site — hoanghiep.dev — has zero theme, zero JS framework, zero bundler. Just Hugo, hand-written templates, and `hugo --minify`. Here's how it's laid out and how it ships.

## The four folders that matter

```
content/posts/     # one markdown file per post
layouts/           # every template, hand-written
static/            # fonts, JS, images — served as-is
archetypes/        # scaffolding for `hugo new`
```

`content/` holds nothing but Markdown and front matter. No logic, no partial includes — that's deliberate. If a decision needs to live somewhere, it lives in a template, not in a post file.

`layouts/` is the whole site. There's no `themes/` directory to fall back to, so every page type has an explicit template:

```
layouts/index.html           # home page
layouts/single.html          # posts + standalone pages like /about/
layouts/posts/list.html      # the archive
layouts/taxonomy.html        # /tags/
layouts/term.html            # /tags/<tag>/
layouts/404.html             # GitHub Pages not-found page
```

Shared pieces — the topbar, the search modal, font preloads, the CSS design tokens — live in `layouts/partials/` and get included by whichever top-level template needs them. Nothing gets copy-pasted between templates; if I need to change the topbar, there's exactly one file to edit.

## No config beyond what's used

`hugo.yaml` has five entries under `params`, and all five are read by a template somewhere:

```yaml
params:
  env: production               # gates GA4 in analytics.html
  googleAnalytics: 'G-XXXXXXX'
  fingerprintPublicKey: '...'
  description: "..."
  author: 'Hiep Nguyen'
```

I've been tempted to add more — a `params.showAuthorBox` toggle, a `params.postsPerPage` — and stopped myself each time. A config key that only one template reads, once, is a worse abstraction than just hardcoding the value in that template. Config is for things that actually vary.

## Writing a post

```bash
hugo new posts/2026-08-21-slug.md
```

pulls from `archetypes/posts.md`, which sets the front matter shape every post needs — title, date, draft, description, tags, showToc — and nothing else. `draft: true` by default, so nothing goes live by accident.

## Shipping it

There's no server. `master` is the only branch that matters, and pushing to it runs the whole pipeline:

```yaml
on:
  push:
    branches: [master]
```

Two jobs, in order. First, a secret scan:

```yaml
security:
  steps:
    - run: gitleaks detect --source . --redact --verbose
```

then the build:

```yaml
build:
  needs: security
  steps:
    - run: hugo --minify --baseURL "${{ steps.pages.outputs.base_url }}/"
    - uses: actions/upload-pages-artifact@...
```

If the secret scan fails, the build never runs. A third job deploys the artifact to GitHub Pages. That's the entire release process — no staging environment, no manual approval step, no rollback script. `git revert` is the rollback script.

One detail I care about more than I expected to: every third-party action is pinned to a commit SHA, not a version tag, and both the Gitleaks and Hugo binaries the workflow downloads are verified against a published sha256 checksum before they run. A tag can move. A SHA can't. It's a few extra lines in the workflow and it means a compromised upstream release can't silently execute in my pipeline.

## Where this breaks down

None of this scales to a site with editors who aren't comfortable with git and Markdown, or content that needs a real workflow — drafts routed for review, scheduled publishing, more than one author stepping on the same files. For that, you want a CMS with a UI, not a folder of `.md` files.

For a personal blog, a docs site, or anything one person maintains, it's hard to find a reason to add the complexity back in.

---

A theme gets you a blog in five minutes. Writing the templates yourself gets you a blog you actually understand.
