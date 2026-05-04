---
title: "SQLite is plenty"
date: 2026-03-06T00:00:00Z
draft: false
tags: ["dev"]
description: "For personal projects and small production apps, I've stopped reaching for Postgres by default."
dek: "For personal projects and small production apps, I've stopped reaching for Postgres by default."
showToc: false
---

For years my reflex was: new project, spin up a Postgres database. It's what I knew, it's what most tutorials showed, it's what most hosting platforms assumed.

Then I started using SQLite more and noticed something: for the kind of applications I build, I never noticed the difference.

## What changed

SQLite used to have a reputation problem for production use. That reputation was mostly earned by people using it in contexts where it wasn't appropriate — high write concurrency, multi-server deployments — and then blaming the database.

The WAL mode changes from a few years ago made a significant difference for read-heavy workloads. And for most personal projects, writes are infrequent.

## What I use it for now

- Personal tools and internal utilities
- Prototypes that might become real products
- Any project where I'm the only user (or one of a handful)

Backups are a single `cp` command. Inspection is `sqlite3 mydb.db`. There's no connection pool to configure, no pg_hba.conf to edit.

## When I still reach for Postgres

- Multiple application servers (SQLite is a single file — you can't share it between machines without extra tooling)
- High write concurrency
- Anything where I need `JSONB` operators or PostGIS

That's roughly 20% of what I build. The other 80%? SQLite is plenty.
