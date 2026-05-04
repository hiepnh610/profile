---
title: "Self-hosting in 2026: a lazy person's setup"
date: 2026-03-31T00:00:00Z
draft: false
tags: ["dev"]
description: "I run a handful of services on a single VPS. Here's the minimal setup that keeps them running without demanding my attention."
dek: "I run a handful of services on a single VPS. Here's the minimal setup that keeps them running without demanding my attention."
showToc: true
---

I've been self-hosting things on and off for years. The pattern I've settled into is: do the minimum amount of work to make something run reliably, then never think about it again.

Here's what that looks like in practice.

## The stack

One VPS (2 vCPU, 4GB RAM), running:

- **Coolify** for deployment — a self-hosted Heroku-alike that handles Docker containers, environment variables, and basic health checks
- **Cloudflare** for DNS and a free tunnel, so I don't need to expose ports or manage TLS myself
- **Restic** for nightly backups to Backblaze B2

That's it. No Kubernetes. No Nomad. No complicated orchestration.

## What I run

- A private [Gitea](https://gitea.io) instance (mirrors of repos I care about)
- [Miniflux](https://miniflux.app) (RSS reader)
- A [Plausible](https://plausible.io) instance (privacy-respecting analytics)
- A few small personal tools I've written

## The philosophy

The goal is to spend less than thirty minutes per month on maintenance. If something breaks at 2am, I want to be able to ignore it until morning without anything catching fire.

Coolify gives me one-click deploys and a restart button. Cloudflare handles the scary networking parts. The backups mean I can nuke the whole VPS and rebuild from scratch without losing anything important.

Boring infrastructure is good infrastructure.
