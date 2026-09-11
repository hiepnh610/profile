---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
description: ""
dek: ""
tags: []
showToc: false
---

<!--
  Writing tips (see .claude/skills/write-post/SKILL.md for the full guide):
  - Start with the problem, not the solution
  - Use code blocks with language tags for syntax highlighting
  - Diagrams: author an Archify spec in diagrams/, run `npm run prerender`, embed with {{</* archify "name" */>}}
  - Reference images as /images/<post-slug>/image.png
  - Set draft: false when ready to publish
-->
