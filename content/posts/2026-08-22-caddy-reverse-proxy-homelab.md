---
title: "One Caddyfile for the whole homelab"
date: 2026-08-22T11:15:00Z
draft: false
tags: ["network"]
description: "How I use Caddy and one wildcard cert to give every service in my homelab a friendly hoanghiep.dev name, with the header and mount gotchas I hit along the way."
dek: "How I use Caddy and one wildcard cert to give every service in my homelab a friendly hoanghiep.dev name, with the header and mount gotchas I hit along the way."
showToc: true
---

Before Caddy, every device in my homelab lived at its own IP and port. Grafana was `10.0.40.199:3000`, the MikroTik was `10.0.10.1`, the Cisco switch's clunky management UI was another number I'd half-memorized. It worked, but only for me, and only if I remembered which octet went with which box. Nothing about it was a "network." It was a list of numbers in my head.

What I wanted instead: type `grafana.hoanghiep.dev` and land on Grafana, from my phone or my laptop, on the LAN or off it, with a valid cert either way. Caddy plus one wildcard DNS record turned out to be a single container and about a hundred lines of config.

## The shape of it

One Caddy container sits in front of everything. It gets a wildcard cert for `*.hoanghiep.dev` and routes purely on the `Host` header, with no per-service subdomain to register anywhere else:

```
*.hoanghiep.dev {
	tls {
		dns cloudflare {env.CLOUDFLARE_API_TOKEN}
		resolvers 1.1.1.1
	}

	@grafana host grafana.hoanghiep.dev
	handle @grafana {
		reverse_proxy grafana:3000
	}

	@mikrotik host mikrotik.hoanghiep.dev
	handle @mikrotik {
		reverse_proxy 10.0.10.1:80
	}

	# ...one matcher + handle block per service

	handle {
		redir https://home.hoanghiep.dev
	}
}
```

Adding a service later is one block here, nothing else: no new DNS record, no new cert to issue, since the wildcard already covers it. The catch-all `handle {}` at the end sends anything that doesn't match (typos, scanners probing random subdomains) to a portal page instead of a Caddy default error.

## The wildcard cert needs DNS-01, which needs a scoped API token

A cert for `*.hoanghiep.dev` can't be issued with the normal HTTP challenge, since there's no single file path that proves you own every possible subdomain. It has to be DNS-01: Caddy creates a TXT record, Let's Encrypt checks it, done. That means the plain `caddy` image isn't enough; you need a build with the DNS provider's plugin baked in. I use [`caddybuilds/caddy-cloudflare`](https://github.com/caddybuilds/caddy-cloudflare) rather than building my own image:

```yaml
caddy:
  image: ghcr.io/caddybuilds/caddy-cloudflare:2.11.4
  environment:
    CLOUDFLARE_API_TOKEN: ${CLOUDFLARE_API_TOKEN:?set it in .env}
  volumes:
    - ./caddy:/etc/caddy:ro
    - ./data/caddy/data:/data
    - ./data/caddy/config:/config
  ports:
    - "80:80"
    - "443:443"
    - "443:443/udp"
```

The token itself needs exactly one permission: **Zone → DNS → Edit**, scoped to the one zone. A token that can edit DNS for your whole Cloudflare account is a much bigger blast radius than this container needs.

One thing that cost me a debugging session: the `dns cloudflare` block also sets `resolvers 1.1.1.1` explicitly. My homelab's default resolver is [AdGuard Home]({{< ref "2026-08-22-adguard-home-docker.md" >}}), which rewrites `*.hoanghiep.dev` to the LAN IP. That's useful for browsing but useless for a DNS-01 propagation check, which needs to see the real public TXT record. Pinning the resolver to `1.1.1.1` keeps the ACME check honest regardless of what the host's own DNS does with that zone.

## Mount the directory, not the file

The Caddyfile is bind-mounted as `./caddy:/etc/caddy:ro`, a directory, not `./caddy/Caddyfile:/etc/caddy/Caddyfile:ro` pointing at the single file. That distinction bit me once already.

`git pull` doesn't edit tracked files in place; it writes a new temp file and renames it over the old one, which means the file gets a new inode. A single-file bind mount is pinned to the inode it had at container creation time, so after a pull the container keeps serving the *old* Caddyfile from a now-unlinked inode, silently, through a `caddy reload`, even through a plain `docker restart`. The only fix at that point is recreating the container. Mounting the parent directory instead makes every lookup path-based, so a `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile` after a pull actually picks up what you just pulled.

## Admin surfaces don't get a friendly name

Grafana is read-only for me day to day, so it's the one dashboard I want reachable by name from anywhere. Prometheus and Alertmanager are different: both let you *do* things (Prometheus can reload config through its lifecycle API, Alertmanager can silence alerts), so [they bind to `127.0.0.1` on the host]({{< ref "2026-08-22-homelab-monitoring-stack.md" >}}) instead of getting published on the LAN at all, Caddy route or not. Same logic extends to Caddy's own metrics: it listens on `:2020` for Prometheus to scrape, but that port is never published. Prometheus reaches it over the compose network as `caddy:2020`, and nothing else can.

```
:2020 {
	metrics /metrics
}
```

The friendly names are for things I want to glance at from my phone. Anything that can change state gets a deliberately higher bar than "type the name in a browser."

## Backends that don't expect a reverse proxy in front of them

Most `reverse_proxy` blocks are exactly the one-liner you'd guess: `reverse_proxy grafana:3000`. Two devices in my setup needed more, and both failures looked nothing like what actually caused them.

My Aruba AP controller serves its management UI over HTTPS on a non-standard port with a cert it signed itself, so there's no way Caddy's normal TLS verification passes against that. The fix is scoping `tls_insecure_skip_verify` to just that one backend, not the whole site:

```
reverse_proxy https://10.0.10.102:4343 {
	transport http {
		tls_insecure_skip_verify
	}
}
```

The Cisco switch's management UI is a `GoAhead-Webs` server, which apparently was never sized for modern cookie payloads. It returned `413 Request Entity Too Large`, but only when I hit it *remotely*, through the Cloudflare Access tunnel, never on the LAN. That inconsistency was the actual clue: Cloudflare Access sets a domain-wide `CF_Authorization` cookie on every `*.hoanghiep.dev` request once you're authenticated, plus a separate `Cf-Access-Jwt-Assertion` header, and both ride along on LAN-originated requests too. They just don't exist unless you came in through the tunnel. Combined, they overflowed the switch's header buffer. The switch keys its session off a token in the URL path, not a cookie, so dropping both inbound was safe:

```
reverse_proxy 10.0.10.101:80 {
	header_up -Cookie
	header_up -Cf-Access-Jwt-Assertion
}
```

I tried stripping just the cookie first, since that's the one you'd normally suspect. The 413 didn't move remotely, because the JWT header alone was still big enough on its own. Worth checking both before assuming the fix didn't work.

## Where this is overkill

If you've got two or three services and you already know their IPs by heart, a wildcard cert and a routing table in front of them is more moving parts than the problem needs. Bookmark the IPs and move on. What made this worth it for me was the mix: Docker services, bare network appliances, a switch with a broken management UI, a couple of things behind Cloudflare Access and a couple that never leave the LAN. Once "the URL" replaced "the octet I half-remember" for a dozen different systems, one Caddyfile paid for itself.

The token stays narrowly scoped, the admin surfaces stay off the LAN entirely, and everything else answers to a name instead of a number.
