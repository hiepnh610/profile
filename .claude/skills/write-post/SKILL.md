---
name: write-post
description: Use when asked to write, draft, or outline a new blog post for this site (backend, DevOps, networking, or personal reflections). Produces a Markdown post in content/posts/ following the repo's front matter, voice, and publishing conventions.
---

# Write a Blog Post

Write posts for hoanghiep.dev — a personal blog about software engineering (backend, DevOps, networking) and occasional personal reflections.

## Before writing

1. If the topic is vague ("write something about Docker"), ask ONE question to pin down the angle: what did the author learn / build / change their mind about? A post needs a specific claim or experience, not a topic survey.
2. Skim 1–2 existing posts in `content/posts/` to match voice. Check no existing post already covers the same angle.
3. Confirm language if unclear — the existing corpus is **English**; write English unless asked otherwise.

## File + front matter

Create `content/posts/YYYY-MM-DD-slug.md` (date = today, slug = short kebab-case):

```yaml
---
title: "Sentence case, plain words"   # like "SQLite is plenty" — no clickbait, no colons-with-subtitle
date: YYYY-MM-DDT00:00:00Z
draft: true                            # ALWAYS true; the author flips it when ready
tags: ["dev"]                          # exactly ONE primary tag: dev | meta | network
description: "Meta description, ≤160 chars, states the post's claim."
dek: "Listing summary shown on home/archive — usually same as description."
showToc: false                         # true only for long technical posts with 4+ H2s
# featured: true                       # only if the author asks to feature it
---
```

Do NOT add `categories` (taxonomy removed) or any other keys.

## Voice — match the corpus

- First person, grounded in real experience: "I stopped doing X", "what changed for me".
- **Open with the problem or the old habit, never the solution.** No "In this article we will…".
- Short paragraphs (1–3 sentences). Concrete over abstract: real commands, real numbers, real file names.
- Structure the argument, not the topic: headings like "What changed", "What I use it for now", "When I still reach for Postgres" — position + boundaries, not encyclopedia sections.
- Be honest about trade-offs; a section on when the advice does NOT apply makes the post credible.
- **End with a short, punchy takeaway line.** No summary section, no "In conclusion".
- Banned: filler ("It's worth noting", "In today's fast-paced world"), hype, emoji in body text, second-person lecturing ("you should always").

## Formatting toolkit

- Code blocks with language tags — syntax highlighting (Chroma, dracula) is styled.
- Mermaid diagrams: `{{</* mermaid */>}} … {{</* /mermaid */>}}` shortcode.
- Images: put under `static/images/<post-slug>/` and reference as `/images/<post-slug>/name.png`.
- Tables, footnotes, and blockquotes are styled; use sparingly.

## Before handing over

1. `hugo --minify` must pass with no warnings.
2. Preview with `hugo server -D` (drafts included) if asked to show the result.
3. Re-read: description ≤160 chars, exactly one tag, `draft: true` still set.
4. Remind the author: flip `draft: false` and push to publish; commit message convention is `feat: add post <slug>`.
