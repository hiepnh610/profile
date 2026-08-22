---
title: "How I monitor my whole homelab from one Grafana dashboard"
date: 2026-08-22T00:00:00Z
draft: false
tags: ["network"]
description: "A single docker-compose stack — Prometheus, Loki, Grafana, Alertmanager — watching every host, container, and network device in my homelab."
dek: "A single docker-compose stack — Prometheus, Loki, Grafana, Alertmanager — watching every host, container, and network device in my homelab."
showToc: true
---

For a long time, "monitoring" in my homelab meant noticing something was wrong because I tried to use it. The NAS felt slow, so I'd SSH in and check `top`. A camera stopped recording, so I'd open the NVR and scroll back through gaps. There was no dashboard, no alert, no history — just me stumbling into problems after they'd already been problems for a while.

What finally pushed me to fix that wasn't one big outage, it was adding enough stuff — [VLANs]({{< ref "2026-08-22-home-network-vlan-design.md" >}}), [a pair of DNS resolvers]({{< ref "2026-08-22-adguard-home-docker.md" >}}), a switch, a couple of APs, a GPON ONU, a stack of Docker containers — that I could no longer hold the whole network's state in my head. I needed one place to look.

Before you start, you'll want:

- a host with Docker and `docker compose` on it, with a few hundred MB of RAM to spare
- SNMP-capable network gear if you want switches/APs/routers in the picture, not just servers
- somewhere to send alerts — I use a Telegram bot, but Alertmanager supports email, Slack, PagerDuty, and a handful of others
- patience for one afternoon of filling in IP addresses; almost none of this is hard, there's just a lot of it

## The shape of it

Every host runs a small agent that turns local reality into metrics or logs. Prometheus and Loki pull that data in on a timer and keep history. Grafana reads both to draw dashboards, and a separate rules engine watches the same data for anything that crosses a threshold:

{{< mermaid >}}
flowchart LR
    subgraph Sources
        NODE[Linux hosts<br/>node_exporter]
        DOCK[Containers<br/>cAdvisor]
        NET[Switches, APs, router<br/>SNMP]
        SVC[DNS, sites, ports<br/>Blackbox probes]
        LOG[Journald + containers<br/>Alloy]
    end

    NODE --> PROM[Prometheus]
    DOCK --> PROM
    NET --> PROM
    SVC --> PROM
    LOG --> LOKI[Loki]

    PROM --> GRAF[Grafana]
    LOKI --> GRAF
    PROM -->|rule breached| AM[Alertmanager]
    AM -->|critical / warning| TG[Telegram]

    classDef store fill:#26364a,stroke:#5c8bb3,color:#dee7f3
    class PROM,LOKI store
{{< /mermaid >}}

Nothing on the right side of that diagram talks directly to a device — every source is either a small process running next to the thing it watches (node_exporter, cAdvisor, Alloy) or a poller that reaches out on the network's behalf (SNMP exporter for switches, Blackbox exporter for anything you just want to ping or curl). Prometheus and Loki don't care which; they just scrape whatever's configured and keep it.

## One compose file, most of the stack

Prometheus, Grafana, Loki, and Alertmanager are four services in the same `docker-compose.yml`, on one bridge network, with everything else (node_exporter, cAdvisor, the SNMP and Blackbox exporters) alongside them:

```yaml
services:
  prometheus:
    image: prom/prometheus:v3.5.0
    restart: unless-stopped
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --storage.tsdb.retention.time=${PROM_RETENTION:-15d}
      - --web.enable-lifecycle
    volumes:
      - ./prometheus:/etc/prometheus:ro
      - ./data/prometheus:/prometheus
    ports:
      - "127.0.0.1:9090:9090"

  grafana:
    image: grafana/grafana:12.2.0
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:?set it in .env}
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
      - ./data/grafana:/var/lib/grafana
    ports:
      - "${GRAFANA_PORT:-3000}:3000"
    depends_on: [prometheus, loki]

  loki:
    image: grafana/loki:3.5.12
    restart: unless-stopped
    command: -config.file=/etc/loki/loki.yml
    volumes:
      - ./loki/loki.yml:/etc/loki/loki.yml:ro
      - ./data/loki:/loki

  alertmanager:
    image: prom/alertmanager:v0.28.1
    restart: unless-stopped
    command:
      - --config.file=/etc/alertmanager/alertmanager.yml
      - --storage.path=/alertmanager
    volumes:
      - ./alertmanager:/etc/alertmanager:ro
      - ./data/alertmanager:/alertmanager
    ports:
      - "127.0.0.1:9093:9093"
```

`node-exporter`, `cadvisor`, `snmp-exporter`, and `blackbox-exporter` sit in the same file with no published ports at all — Prometheus reaches them over the internal `monitoring` network, and nothing outside that network needs to talk to an exporter directly.

## Prometheus and Alertmanager never touch the LAN

Grafana is the only piece of this stack I actually want reachable from my phone or laptop, so it gets a normal port mapping. Prometheus and Alertmanager both bind to `127.0.0.1:<port>` instead — `"127.0.0.1:9090:9090"`, not `"9090:9090"` — which means the only way in is an SSH tunnel to the host, or the friendly-name reverse proxy I run in front of everything and lock behind an access policy.

The reasoning is narrower than "security best practice": both of those UIs let you *do* things — Prometheus can drop config via its lifecycle API, Alertmanager can silence alerts — where Grafana in read-only mode mostly just shows you graphs. I'd rather the two admin surfaces require deliberate access than sit open on the LAN because I got lazy with a compose file.

## Adding a target without editing prometheus.yml

The part of this setup I was most wrong about going in: I assumed every new host or switch would mean editing `prometheus.yml` and reloading. It doesn't. Every scrape job points at a small YAML file under `prometheus/targets/`, and Prometheus's `file_sd_configs` watches those files for changes on its own — no reload, no restart:

```yaml
# prometheus.yml
- job_name: linux-hosts
  file_sd_configs:
    - files: ["/etc/prometheus/targets/linux-hosts.yml"]

- job_name: snmp-mikrotik
  metrics_path: /snmp
  params:
    module: [if_mib, mikrotik]
    auth: [homelab_v3]
  file_sd_configs:
    - files: ["/etc/prometheus/targets/mikrotik.yml"]
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - source_labels: [__param_target]
      target_label: instance
    - target_label: __address__
      replacement: "snmp-exporter:9116"
```

```yaml
# prometheus/targets/mikrotik.yml
- targets: ["10.0.10.1"]
  labels: {device: "core-router"}
```

Adding a switch is: put its IP in the right targets file, save. That relabeling block is the part that isn't obvious from the docs — SNMP exporter needs the device IP as a URL *parameter* (`target=10.0.10.1`), not as the thing Prometheus scrapes directly, so the file just lists IPs and the relabel rules rewrite each one into a request against `snmp-exporter:9116/snmp?target=10.0.10.1`. Once that's copied once, every SNMP job after it is the same four lines with a different targets file.

A plain Linux host skips the SNMP indirection entirely — install `node_exporter`, add its IP:port to `linux-hosts.yml`, done. No agent to register, no token to generate, nothing to restart on the Prometheus side.

## Alerts that don't page me for warnings

Alertmanager routes on a `severity` label that the alert rules set, and I only wire two receivers to anything real:

```yaml
route:
  receiver: telegram-warning
  group_by: [alertname, severity]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  routes:
    - matchers: ['severity="critical"']
      receiver: telegram-critical
      repeat_interval: 4h
    - matchers: ['severity="info"']
      receiver: "null"

inhibit_rules:
  - source_matchers: ['severity="critical"']
    target_matchers: ['severity="warning"']
    equal: [instance]
```

`info` alerts go to the `"null"` receiver — matched, evaluated, visible in Grafana, but never sent anywhere. That sounds pointless until you've written a rule you're not fully sure is tuned right yet; landing it on `info` first lets it fire silently for a week before you decide it deserves a `warning` and a repeat interval.

The `inhibit_rules` block is the one that actually stopped me getting paged for nothing. Without it, a host going down trips both "node is down" (critical) and "disk usage unknown" (warning, because the exporter that reports disk usage is also down) at the same time, and I'd get two Telegram messages about one problem. The inhibit rule says: if a critical alert and a warning alert share the same `instance` label, only the critical one sends. One outage, one message.

## The exporters that aren't in anyone's quickstart

Node and container metrics are the easy 80%: `node_exporter` and cAdvisor are both one line in the compose file and need zero configuration to be useful. Grafana's stock "Node Exporter Full" community dashboard already covers it:

<figure>
  <img src="/images/posts/homelab-monitoring-stack/node-exporter-dashboard.webp" alt="Grafana's Node Exporter Full dashboard for a homelab host: 4 CPU cores at 23.6% busy, 76.9% RAM used, 84.3% root filesystem used, uptime 2.0 weeks, with CPU, memory, network, and disk graphs over the last 24 hours" width="2000" height="945" loading="lazy">
  <figcaption>The stock Node Exporter Full dashboard, no custom panels needed — CPU, memory, disk, and network for one host at a glance.</figcaption>
</figure>

The rest of the network took real exporter-hunting.

Switches, APs, and the router go through the SNMP exporter, with one YAML module per vendor — `if_mib` for interface counters, plus a MikroTik-specific module for its own health and wireless OIDs. This is where most of the setup time went, because SNMP community strings and MIB support vary by device and firmware.

<figure>
  <img src="/images/posts/homelab-monitoring-stack/network-dashboard.webp" alt="Grafana Network dashboard showing MikroTik, Cisco CBS350, and Aruba AP all UP with uptimes near three weeks, and MikroTik interface throughput broken out by VLAN over the last 6 hours" width="2000" height="1025" loading="lazy">
  <figcaption>SNMP exporter gives switches and APs the same kind of panel node_exporter gives a Linux host — an UP/DOWN tile per device, per-VLAN throughput underneath.</figcaption>
</figure>

Blackbox exporter answers a different question: is the thing even up. It does ICMP pings, DNS queries against [both AdGuard resolvers]({{< ref "2026-08-22-adguard-home-docker.md" >}}), and HTTP checks against anything with a web UI. It catches the case none of the above do — the device is fine, but the service on it isn't answering.

And then there's the GPON ONU, which has no SNMP support at all. Sometimes there's no clean exporter for a device, and you end up writing a thin wrapper around whatever read-only interface it does have — in my case, a third-party exporter that SSHes in and parses `diag get` output. That one's specific enough to a single piece of hardware that it isn't worth detailing here, but it still shows up in the same Grafana as everything else:

<figure>
  <img src="/images/posts/homelab-monitoring-stack/gpon-dashboard.webp" alt="Grafana GPON stats dashboard for the ODI DFP-34X-2C2 ONU: downstream Ethernet frame rate, BWmap rate, PLOAM and OMCI message rates, and GEM frame rate over 24 hours" width="2000" height="1042" loading="lazy">
  <figcaption>The GPON dashboard, fed entirely by SSH-scraped diag output instead of SNMP.</figcaption>
</figure>

None of these three got figured out in one sitting. I started with just node_exporter and cAdvisor, got that dashboard working, and added a category at a time over a couple of weekends.

## Where this is overkill

If your homelab is a NAS and a Pi, four extra containers and an SNMP module per switch vendor is a lot of infrastructure to watch infrastructure. A cron job that curls a health endpoint and pings you on failure covers most of that case for a tenth of the setup.

What earns the full stack, for me, is having enough different kinds of things — routed network gear, Docker services, a DNS layer, a fiber ONU — that "check `top` when something feels slow" stopped being a real strategy. The value isn't any single dashboard panel; it's that when something breaks now, I know within a minute which layer it's in instead of guessing.

The whole point was to stop finding out things were broken by using them. So far, that's the one metric that's actually improved.
