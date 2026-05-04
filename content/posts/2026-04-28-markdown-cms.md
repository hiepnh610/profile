---
title: "A markdown CMS that fits in one Cloudflare Worker"
date: 2026-04-28T00:00:00Z
draft: false
tags: ["dev"]
description: "A zero-dependency CMS built on top of Cloudflare Workers that reads, writes, and previews Markdown — under 200 lines of code."
dek: "A zero-dependency CMS built on top of Cloudflare Workers that reads, writes, and previews Markdown — under 200 lines of code."
showToc: false
---

Last month I got tired of opening VS Code every time I wanted to fix a typo in a post. I wanted a lightweight web UI that could edit Markdown files stored in a git repo — ideally something I could open on my phone.

The result: a Cloudflare Worker that proxies GitHub's REST API and renders a minimal editing UI.

## How it works

The Worker handles four routes:

- `GET /` — lists all `.md` files in the repo
- `GET /edit?file=path/to/post.md` — loads the file and renders a `<textarea>`
- `POST /save` — calls the GitHub API to commit the updated file
- `GET /preview` — renders Markdown to HTML via `micromark`

No database. No build step on save. Just an API call and a commit.

## The interesting parts

GitHub's "create or update file" endpoint requires the current file's SHA to prevent overwriting concurrent edits. The Worker stores this in a KV namespace alongside the file path. Cheap and good enough.

For auth, I used a URL-bound secret token. Not fancy, but sufficient for a single-user tool.

## The result

It's 187 lines of JavaScript. It deploys in under two seconds. I've used it to fix three typos from my phone already.
