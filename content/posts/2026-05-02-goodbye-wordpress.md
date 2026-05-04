---
title: "Goodbye WordPress, hello a folder of markdown files"
date: 2026-05-02T00:00:00Z
draft: false
tags: ["essay"]
description: "After eight years on WordPress, I migrated everything to flat Markdown files and a static site generator. Here's what I learned and why I'm not going back."
dek: "After eight years on WordPress, I migrated everything to flat Markdown files and a static site generator. Here's what I learned and why I'm not going back."
featured: true
showToc: true
---

Eight years. That's how long I ran my personal site on WordPress.

I didn't hate it. WordPress is fine — genuinely good for a lot of use cases. But somewhere along the way, maintaining it started to feel like overhead I didn't want. Plugin updates. PHP upgrades. The occasional "your site was hacked" email.

What I actually wanted was a blog that felt like a folder of text files, because that's what it *is*.

## The migration

I exported everything with WordPress's built-in exporter, then wrote a small script to convert the XML into Markdown frontmatter. Titles, slugs, publish dates, tags — all of it moved cleanly.

The body content was messier. WordPress stores post content as a mix of HTML and Gutenberg blocks. I used Pandoc to convert most of it, then manually cleaned up the rough edges.

Total time: one weekend.

## What I gained

**Speed.** The site now scores 100 on every Lighthouse metric. There's nothing to be fast — it's just HTML and CSS.

**Simplicity.** The entire site lives in a git repository. I write a post in any editor, commit it, push, and a GitHub Actions workflow handles the rest.

**Durability.** Markdown files will be readable for the next fifty years. The same can't be said for a WordPress database dump.

## What I gave up

Comments. That's it, really. I'm not sure I miss them.

---

If you're a developer running a personal blog, I can't imagine a reason not to make this switch.
