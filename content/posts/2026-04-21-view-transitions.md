---
title: "View transitions are the most underused web feature of 2026"
date: 2026-04-21T00:00:00Z
draft: false
tags: ["dev"]
description: "The View Transitions API shipped in every major browser over a year ago. Almost nobody uses it. Here's how to add them in an afternoon."
dek: "The View Transitions API shipped in every major browser over a year ago. Almost nobody uses it. Here's how to add them in an afternoon."
showToc: false
---

The View Transitions API gives you native-feeling animated page transitions with roughly ten lines of CSS and one line of JavaScript. It shipped in Chromium in 2023, Firefox in 2024, and Safari in 2025. All major browsers support it now.

I've looked at maybe two hundred personal sites in the past year. Three used view transitions.

## Why the gap?

I think it's partly discoverability and partly the perception that "animations = complexity." Neither is true here.

For a basic cross-fade:

```js
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a[href]');
  if (!link || link.hostname !== location.hostname) return;
  e.preventDefault();
  await document.startViewTransition(() => fetch(link.href).then(...));
});
```

That's the core. Everything else is optional CSS.

## What you can do with more effort

With `view-transition-name` on specific elements, you can create "shared element transitions" where an image or heading morphs from its position on page A to its position on page B.

On a blog, this works beautifully for post titles. On a portfolio, for project thumbnails.

## The catch

It's a progressive enhancement. On unsupported browsers, the page just navigates without animation. There's nothing to break.

Add it to your site. It takes an afternoon and the effect is genuinely delightful.
