---
title: "How I segmented my home network with VLANs on MikroTik"
date: 2026-08-22T03:30:00Z
draft: false
tags: ["network"]
description: "Splitting one flat home LAN into six VLANs on a MikroTik router, with a default-deny firewall for guest and IoT traffic."
dek: "Splitting one flat home LAN into six VLANs on a MikroTik router, with a default-deny firewall for guest and IoT traffic."
showToc: true
---

For years my home network was just one flat `/24`. Laptop, NAS, phones, whatever smart plug I'd unboxed that week — all on the same subnet, all able to see each other. Never bothered me until I added a bunch of IP cameras and a pile of cheap IoT stuff, and it hit me that if any one of those got popped, it could walk straight over to my NAS. Nothing was stopping it. A flat network doesn't care that I trust my laptop a lot more than I trust a $12 smart plug from some brand I'd never heard of.

So I split it up. One VLAN per trust level, and a firewall that treats every VLAN as hostile to every other VLAN until I say otherwise.

Before you start down this road, you'll want:

- a router that does 802.1Q VLAN tagging and gives you real firewall rules — mine is a MikroTik running RouterOS
- a managed switch, so VLANs can be split back out to physical ports
- access points that can tag SSIDs onto VLANs, if wifi devices are going to land on different segments
- a way back in when you inevitably lock yourself out — for MikroTik that's WinBox over MAC address, or worst case a console cable

## The layout

Six VLANs, all trunked over a single physical uplink, split out again on a switch:

{{< mermaid >}}
flowchart TD
    WAN((Internet)) -- PPPoE --> RTR[MikroTik router]

    subgraph LAN["LACP bond — 3x1G trunk"]
        RTR === SW[Managed switch]
    end

    SW --> V10[VLAN 10 · Management]
    SW --> V20[VLAN 20 · Wifi Internal]
    SW --> V30[VLAN 30 · CCTV]
    SW --> V40[VLAN 40 · Core / DNS]
    SW --> V50[VLAN 50 · Wifi Guest]
    SW --> V60[VLAN 60 · IoT]

    V10 --> INF[Switches + AP controllers]
    V20 --> TRUST[Trusted wifi clients]
    V30 --> CAM[Cameras + NVR]
    V40 --> DNS[AdGuard resolvers x2]
    V50 --> GUEST[Guest devices]
    V60 --> IOT[Smart plugs, sensors, TVs]

    classDef isolated fill:#4a2626,stroke:#b35c5c,color:#f3dede
    class V50,V60,GUEST,IOT isolated
{{< /mermaid >}}

| VLAN | Subnet | Purpose |
|------|--------|---------|
| 10 | `10.0.10.0/24` | Switch and AP management |
| 20 | `10.0.20.0/24` | Trusted wifi |
| 30 | `10.0.30.0/24` | Cameras + NVR |
| 40 | `10.0.40.0/24` | Core services (DNS) |
| 50 | `10.0.50.0/24` | Guest wifi |
| 60 | `10.0.60.0/24` | IoT |

The router-to-switch uplink is a 3-port LACP bond (`802.3ad`, layer-2-and-3 hashing). That's not really about throughput — nobody in this house is pushing 3 Gbit — it's so one bad cable or a dying port doesn't take every VLAN down with it. WAN comes in as PPPoE on VLAN 35 off the fiber ONT, on its own physical port — I keep it off the trunk entirely so it's not sharing a wire with anything internal.

<figure>
  <img src="/images/posts/home-network-vlan-design/winbox-vlan-interfaces.webp" alt="WinBox Interfaces window listing the six internal VLAN interfaces on the trunk — VLAN-10-MGMT, VLAN-20-WIFI-INTERNAL, VLAN-30-CCTV, VLAN-40-CORE, VLAN-50-WIFI-GUEST, VLAN-60-IOT — plus VLAN35 for WAN on a separate port" width="2000" height="360" loading="lazy">
  <figcaption>The six internal VLANs in WinBox, all riding the trunk — and the WAN PPPoE VLAN on its own port at the bottom.</figcaption>
</figure>

## How wifi lands on the VLANs

Wireless devices don't get to pick their VLAN — the SSID does it for them. The access points broadcast two networks: the trusted one is tagged onto VLAN 20 at the AP, and the guest one onto VLAN 50, so a phone joining guest wifi comes out of the AP already inside the guest segment with no say in the matter. The APs themselves are managed over VLAN 10 like the rest of the infrastructure, and the switch ports feeding them are trunks carrying exactly those three VLANs and nothing else.

That's the short version. The AP-side config — which VLANs to tag where, and keeping the management network reachable while you change it — has enough sharp edges that it deserves its own post.

## Default deny, not default allow

Honestly, the VLAN split isn't the part that matters. VLANs by themselves are just labels on a switchport — the firewall rules are what actually decide whether anything can cross between them. Guest and IoT both use roughly the same shape:

```
add action=accept chain=forward comment="IOT DNS UDP to AdGuard" \
    dst-address=10.0.40.199 dst-port=53 protocol=udp src-address=10.0.60.0/24
add action=accept chain=forward comment="IOT Internet Access" \
    out-interface=pppoe-out1 src-address=10.0.60.0/24
add action=drop chain=forward comment="Drop everything else from IOT" \
    src-address=10.0.60.0/24
```

DNS to the internal resolver gets through, outbound to the internet gets through, and then a drop rule catches whatever's left. There are two more rules I didn't paste above that do the same thing for traffic between devices on the same VLAN and for traffic aimed at the router's own management interface. Net effect: a camera or a smart bulb can phone home and resolve DNS, full stop. It can't reach my laptop, it can't reach my NAS, it can't open the router's web UI, and it can't even talk to the smart bulb sitting right next to it.

There's exactly one hole I punched in that wall on purpose — the living room TV, sitting on the IoT VLAN, is allowed to hit a Jellyfin server on the management VLAN over port 8096. Everything else stays shut unless I decide it shouldn't. I like that this forces the ruleset to double as documentation: if I read it in six months, every exception has a comment explaining why it's there, instead of me trying to remember what "isolate IoT" was supposed to mean.

<figure>
  <img src="/images/posts/home-network-vlan-design/winbox-firewall-rules.webp" alt="WinBox firewall filter rules list: commented accept rules letting Guest and IoT reach the two AdGuard resolvers on port 53 and the internet via PPPoE, drop-everything-else rules for each VLAN, WAN-side drops for WinBox and HTTP management, and a single Allow TV to Jellyfin exception on port 8096" width="2000" height="916" loading="lazy">
  <figcaption>The full ruleset. Every accept and drop carries a comment — including the one deliberate hole, "Allow TV to Jellyfin".</figcaption>
</figure>

## DNS as the one thing every VLAN needs

Every VLAN's DHCP server hands out the same two DNS servers instead of the ISP's resolver or `8.8.8.8` — [a pair of AdGuard Home instances I run in Docker]({{< ref "2026-08-22-adguard-home-docker.md" >}}), sitting on the core VLAN. Those `accept ... dst-port=53` rules above exist because of this: DNS is the one thing I let guest and IoT traffic reach across VLANs, and routing it through AdGuard means ad and telemetry domains get filtered before they ever leave the house, no matter which VLAN asked.

## Hardening the router itself

All of that segmentation protects the LAN from itself, but the router is also sitting right on the internet. A couple of rules here have nothing to do with VLANs:

```
add action=drop chain=input dst-port=8291 in-interface=pppoe-out1 protocol=tcp
add action=drop chain=input dst-port=80 in-interface=pppoe-out1 protocol=tcp
```

Winbox and HTTP management get dropped from the WAN side explicitly, and `ssh`, `telnet`, `ftp`, and the API services are disabled entirely under `/ip service` on top of that. None of it should be reachable from outside anyway, but I'd rather have a rule saying so on record than trust that nothing's currently listening.

## Where this is overkill

I'll admit six VLANs and a hand-rolled firewall ruleset is a lot more router than most people need. If your network is a phone, a laptop, and a smart speaker, one flat network with WPA3 is a completely fine place to stop. What all this complexity buys me specifically is cameras and IoT gadgets I don't fully trust, sitting on a network where I don't have to trust them — and in exchange I get a config file that basically only I can read when something breaks at 2am.

If there's a rule I keep coming back to, it's not "add more VLANs." It's that anything I didn't build, and can't patch myself, doesn't get to talk to anything I did.
