---
title: "How I run AdGuard Home in Docker"
date: 2026-08-22T00:00:00Z
draft: false
tags: ["network"]
description: "A docker-compose file for AdGuard Home, why its ports look strange, and why I run two of them on named volumes."
dek: "A docker-compose file for AdGuard Home, why its ports look strange, and why I run two of them on named volumes."
showToc: true
---

AdGuard Home is a DNS server you run yourself: every device on your network sends its DNS queries to it, and it answers them — except for ad and tracker domains, which it refuses to resolve at all. Same job as Pi-hole; I went with AdGuard Home mainly because encrypted DNS (DNS-over-TLS and DNS-over-QUIC) is built in on both the client and upstream side rather than something you bolt on afterwards.

When I [split my home network into VLANs]({{< ref "2026-08-22-home-network-vlan-design.md" >}}), I mentioned a pair of AdGuard Home resolvers sitting on the core VLAN and left it at that. Here's the actual compose file behind them, and the handful of decisions in it that weren't obvious to me the first time.

Before you start, you'll want:

- a host with Docker and `docker compose` on it
- port 53 free on that host — on Ubuntu, `systemd-resolved` sits on it by default and has to be moved aside first
- a static IP (or DHCP reservation) for the host, since everything on your network is about to memorize it
- access to whatever hands out DHCP, so you can point clients at the new resolver when you're done

## Where it sits

Nothing changes about how a device makes a DNS query — it just now asks AdGuard Home instead of the ISP or `8.8.8.8`, because that's what DHCP hands out. AdGuard Home decides, and either forwards the query upstream or kills it on the spot:

{{< mermaid >}}
flowchart TD
    DEV[Laptop, phone, TV, IoT device] -->|DNS query| ADG1[AdGuard Home primary]
    DEV -.->|if primary is unreachable| ADG2[AdGuard Home secondary]

    ADG1 -->|allowed domain| UP[Upstream resolver, DNS-over-TLS]
    ADG1 -->|ad / tracker domain| DROP[NXDOMAIN, no forward]
    UP --> WAN((Internet))

    classDef blocked fill:#4a2626,stroke:#b35c5c,color:#f3dede
    class DROP blocked
{{< /mermaid >}}

The device never talks to the internet's real resolvers directly, and it never sees the blocklists — it just gets an answer, or doesn't. Everything past this diagram is what that primary box is actually made of.

```yaml
services:
  adguard:
    image: adguard/adguardhome
    container_name: adguard
    restart: unless-stopped
    ports:
      - 53:53/tcp
      - 53:53/udp
      - 784:784/udp
      - 853:853/tcp
      - 853:853/udp
      - 8889:3000/tcp
      - 8888:80/tcp
      - 6060:6060/tcp
    volumes:
      - adguard-data-work:/opt/adguardhome/work
      - adguard-data-conf:/opt/adguardhome/conf
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro

volumes:
  adguard-data-work:
    driver: local
  adguard-data-conf:
    driver: local
```

## Why the ports look weird

53/tcp and 53/udp are the obvious ones — that's plain DNS, and it's the only pair anything on my LAN actually talks to.

784/udp and 853/tcp+udp are less obvious unless you've read the DNS-over-QUIC RFC recently. 784 was the original experimental port for DoQ; RFC 9250 later moved DoQ onto 853, the same port DNS-over-TLS already used. AdGuard Home happily serves both, so I map all three and let it sort out TLS vs QUIC on 853 by protocol. I don't have a client on the network that speaks DoQ yet, but the container costs nothing extra to leave it listening, and it saves me a compose edit the day something does.

8889:3000 and 8888:80 are the pair that confused me. AdGuard Home serves its first-run setup wizard on port 3000, and once you finish that wizard it switches the real web UI over to whatever port you configured — 80 by default. So 8889 is only ever useful for the five minutes of initial setup; after that it just sits there mapped to a port nothing inside the container answers on anymore. I could unmap it after first boot, but then I'd have to remember to put it back the one time I need to blow away the config and start over. Leaving it in the compose file is cheaper than remembering.

6060 is Go's `net/http/pprof`, which AdGuard Home exposes if you turn it on in the config. I don't run with it enabled day to day — it's there for the one time a resolver's memory or CPU does something weird and I want a profile instead of a guess.

## Config lives in named volumes, not bind mounts

`/opt/adguardhome/work` and `/opt/adguardhome/conf` are named Docker volumes, not paths on the host. That was a deliberate trade against my usual habit of bind-mounting everything so I can `cat` a config file without thinking about it.

The reason is that I run this same compose file, unmodified, on two different hosts for redundancy — I didn't want either one to depend on a specific directory existing with the right permissions before the container would start. A named volume gets created automatically on first run, owned correctly, no `mkdir` step to forget. The cost is that pulling `AdGuardHome.yaml` out for a look now means `docker run --rm -v adguard-data-conf:/data -v $(pwd):/backup alpine cat /data/AdGuardHome.yaml` instead of just opening a file. I do that rarely enough that it's a fine trade.

The two read-only bind mounts for `/etc/timezone` and `/etc/localtime` stay as bind mounts on purpose — I want the container's clock reasoning to follow the host, not get baked into a volume that could drift if I ever rebuild it on a host in a different timezone. Query log timestamps that don't match the host's local time are a minor but constant annoyance, and this fixes it for free.

## The wizard, once, then never again

`docker compose up -d` and a minute later `http://<host>:8889` has the setup wizard waiting. It's short: pick the interface and port the web UI should listen on afterward (I leave it at all interfaces, port 80, which is why 8888:80 is in the compose file), pick the interface and port for DNS itself (all interfaces, 53), then set an admin username and password. That's it, three screens.

Finish the wizard and it redirects you to log in on the port you just chose, over the 8888 mapping from then on. 8889 goes quiet at that point, which is the whole reason it turns into dead weight in the compose file afterward.

From the login screen, the two things worth changing before you trust a resolver with real traffic are under Settings. Upstream DNS servers defaults to a public resolver over plain DNS; I switch it to DNS-over-TLS servers instead, since AdGuard Home is now the only thing standing between my LAN and the wider internet and I'd rather that hop be encrypted. And under Filters, the default AdGuard blocklist is on but sparse by itself — I add one or two more lists there before pointing any real client at it, otherwise the first few days make the whole exercise feel pointless.

Everything past that first login (query log, client-specific rules, the dashboard) is just using the product. The wizard is the only part that's a one-time thing.

## Two containers, one file, no orchestration

Both resolvers run this exact compose file with nothing templated between them — same image, same ports, same volume names, just two different hosts. Each VLAN's DHCP hands out both IPs as primary and secondary DNS, so if one host reboots for a kernel update, the other keeps answering without a client ever noticing. There's no shared state between the two: they each keep their own query log and their own filter list cache, and I don't sync them. If their blocklists drift out of sync for a day because one pulled an update the other hasn't yet, that's a rounding error I'm fine with — it's not the kind of consistency this setup needs.

The whole thing is boring on purpose. Two identical containers, ports that mostly explain themselves once you know what they're for, and volumes I never have to think about until the day I need to peek inside one.
