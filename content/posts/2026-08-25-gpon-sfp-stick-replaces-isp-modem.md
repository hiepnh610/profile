---
title: "Replacing the ISP modem with a GPON SFP stick"
date: 2026-08-25T00:00:00Z
draft: false
tags: ["network"]
description: "Viettel would not put its weak ONT in bridge mode, so I replaced it with a DFP-34X-2C2 GPON stick in my MikroTik. Every flash field the ALU OLT checks."
dek: "Viettel would not put its weak ONT in bridge mode, so I replaced it with a DFP-34X-2C2 GPON stick in my MikroTik. Every flash field the ALU OLT checks."
showToc: true
---

For a long time the first box in my network wasn't mine. The fibre came into an ISP-issued ONT, a plastic all-in-one that does GPON, NAT, wifi and DHCP on a CPU that isn't really up to any of them. The wifi barely reached the next room. The NAT table filled up when a few devices torrented at once. The web UI was a locked-down ISP skin with half the pages missing.

I already had a MikroTik that could do the routing properly, so the obvious move was: put the ONT in bridge mode, let the MikroTik dial PPPoE, and use the ONT only as a media converter. That's where it got annoying.

Bridge mode isn't something I could turn on myself. The ISP's firmware hides the option, so you call support and ask them to push it from their side, then wait a few days for the ticket. Whether they'll do it at all depends on which local branch manages your line. I've moved between addresses where one branch flipped it without fuss and another flatly refused, saying bridge mode is only for enterprise plans. Same ISP, same box, different answer. And a firmware push from their side could reset it back to router mode at any time, which meant another call.

The ONT does exactly one thing I actually need: it talks GPON to the OLT at the exchange and hands me Ethernet. A GPON SFP module does the same thing in a package that plugs straight into the router's SFP cage, and it can only be a bridge; there is no router mode for anyone to switch it back to. So I bought a DFP-34X-2C2, taught it to introduce itself to the OLT as if it were the ISP's modem, and put the ONT in a drawer. Nobody at the ISP had to approve anything.

This post is the field-by-field version of what I did. The sources I leaned on, the [RTL960x StickSetup guide](https://github.com/Anime4000/RTL960x/blob/main/Docs/StickSetup.md), a [long voz.vn thread](https://voz.vn/t/can-giup-bat-web-interface-spf-gpon-alcatel-g-010s-p.811163/page-27), and the [hack-gpon.org page for this exact stick](https://hack-gpon.org/ont-odi-realtek-dfp-34x-2c2/), are all good, but the information is spread across them and none of them is about Viettel.

## Before and after

{{< mermaid >}}
flowchart LR
    subgraph before["Before"]
        OLT1((OLT)) -- fibre --> ONT[ISP ONT<br/>bridge mode] -- ethernet --> RTR1[MikroTik<br/>PPPoE]
    end
    subgraph after["After"]
        OLT2((OLT)) -- fibre --> SFP[DFP-34X-2C2<br/>in SFP cage] --- RTR2[MikroTik<br/>PPPoE]
    end
{{< /mermaid >}}

The router barely changes. It still runs a PPPoE client on a VLAN 35 interface; that VLAN now hangs off `sfp1` instead of an Ethernet port. The difference is that the "bridge" in the middle is now something I own and configure, not something the ISP has to be talked into.

## Viettel and the ALU OLT

My line is Viettel, and the OLT on the other end of the fibre is Alcatel-Lucent (now Nokia). That matters more than which stick you buy.

Huawei and ZTE OLTs will bring up almost any ONT whose serial number is on the allow-list. ALU OLTs are pickier. After the serial and PLOAM password are accepted, the OLT reads the ONT's OMCI identity (vendor ID, equipment ID, hardware and software version) and compares it with the ONT profile it has for your subscription. If the profile says "Viettel vGP-42X6V1" and the stick answers "Realtek reference design", you get registered and then nothing: no service, no PPPoE, no error you can see. A fair number of people conclude from this that GPON SFP sticks don't work on Viettel. They do; the default identity doesn't.

So a bare serial + password clone isn't enough. Every identity field below has to be copied off the Viettel ONT exactly, and `OMCI_FAKE_OK` has to be on, because the ALU OLT sends vendor-specific OMCI messages the stick has no handler for, and it treats a NAK as a broken ONT.

The voz thread is mostly about the Alcatel G-010S-P, a Nokia-branded stick that people pick for ALU OLTs because it's the same vendor. I went with the DFP-34X-2C2 instead because the G-010S-P is 1G only and its config is less documented. With the identity cloned properly the DFP has been fine on Viettel's ALU.

## What you need from the old ONT first

The OLT authenticates the ONT by its GPON serial number and, depending on the ISP, a PLOAM password. Viettel uses both. After it's registered, the OLT also asks the ONT who it is over OMCI (vendor, model, hardware and software version) and refuses to provision service if it doesn't like the answers. So the stick has to lie convincingly at both steps.

Everything I needed was printed on the ONT's label or visible in its web UI:

- The GPON serial number: 4 ASCII vendor letters + 8 hex digits, e.g. `HWTC` + `35xxxxxx`. It's on the sticker as "SN" or "GPON SN".
- The PLOAM password, 10 characters. Some ISPs leave it at a default, some print it on the label, some don't use it. Mine is set, so I needed it.
- Vendor ID, manufacturer, model, hardware version and software version, from the ONT's status page. Viettel ships its own white-label ONT, so on my line these are `VTGR`, `vGP-42X6V1`, `VGP42X6M001` and `V1302250508`, not Huawei's, even though the serial starts with `HWTC`. On an ALU OLT every one of these is checked, so copy them character for character.
- Which VLAN the internet service rides on. For Viettel it's VLAN 35.

Take a photo of the label. You'll want it again.

## Getting a shell on the stick

<figure>
  <img src="/images/posts/gpon-sfp-stick-replaces-isp-modem/sfp.webp" alt="ODI DFP-34X-2C2 XPON ONU SFP stick, showing the SC fibre receptacle at the front and the label reading 1.25/2.5G 1310nm 20km" width="1109" height="1167" loading="lazy">
  <figcaption>The whole modem. Label says XPON ONU STICK, 1.25/2.5G, 1310 nm, 20 km; the SC receptacle on the left takes the ISP's patch cord directly.</figcaption>
</figure>

The DFP-34X-2C2 is a Realtek RTL9601D with 64 MB of RAM, 8 MB of flash and a tiny Linux (Luna SDK 1.9). There are two variants: `-2C2` has an SC/UPC receptacle and `-2C3` is SC/APC. Buy the one that matches the connector on your fibre patch cord; UPC and APC don't mate. Out of the box it answers on `192.168.1.1`, user `admin`, password `admin`, with a web UI and SSH. Telnet is off on the stock firmware, which catches out anyone following older guides.

The SSH daemon is ancient and a modern client will refuse to talk to it unless you re-enable the legacy algorithms:

```bash
ssh -oKexAlgorithms=+diffie-hellman-group1-sha1 \
    -oCiphers=+3des-cbc \
    -oHostKeyAlgorithms=+ssh-rsa \
    admin@192.168.1.1
```

There are also 3.3 V UART pads (TX, RX, GND, 115200 8-N-1) on the top of the board next to the SFP edge connector, if you ever brick the SSH side.

Reaching it is the fiddly part. The stick's management IP lives *inside* the SFP, on the same wire as your WAN traffic, so the router's SFP interface needs an address in that subnet. On RouterOS:

```
/ip address add address=192.168.1.10/24 interface=sfp1
```

Then from a machine on the LAN, SSH in with the command above (or open the web UI). If the router's firewall has a default-drop input/forward chain, it also needs to let that traffic through and masquerade it. Half the forum thread is people stuck on this step. A quick way to test is `/system ssh 192.168.1.1 user=admin` from the router itself; if that works and your laptop can't, it's a firewall rule, not the stick.

I later moved the stick's own IP to `192.168.123.123` so it can never collide with anything else I run:

```
flash set LAN_IP_ADDR 192.168.123.123
flash set LAN_SUBNET 255.255.255.0
```

The web UI is fine for looking at optical power, but every real setting is done at the shell with `flash get` / `flash set`. The key names are case-sensitive. There are lower-level tools too (`xmlconfig`, `nv`, `omcicli`, `diag`); `flash` is the safe one and the only one I needed for configuration.

## Back up the stick's own values before touching anything

The guide's first step, and the one I'm glad I didn't skip:

```
flash get PON_VENDOR_ID
flash get HW_CWMP_MANUFACTURER
flash get HW_CWMP_PRODUCTCLASS
flash get HW_HWVER
flash get OMCI_VEIP_SLOT_ID
flash get OMCI_OLT_MODE
flash get OMCI_FAKE_OK
flash get OMCI_SW_VER1
flash get OMCI_SW_VER2
flash get GPON_ONU_MODEL
flash get GPON_SN
flash get GPON_PLOAM_PASSWD
flash get ELAN_MAC_ADDR
flash get MAC_KEY
flash get OUI
flash get HW_SERIAL_NO
```

Paste the output into a file. The stick also has a "backup config" button in the web UI that dumps everything as XML; that's where the listing below comes from.

## The fields I set, and what each one does

### Identity: serial and PLOAM password

```
flash set GPON_SN HWTC35xxxxxx
flash set GPON_PLOAM_FORMAT 1
flash set GPON_PLOAM_PASSWD 31323334353637383930
```

`GPON_SN` is the serial from the label, verbatim. The first four letters have to agree with `PON_VENDOR_ID` below or the OLT will reject the ONT even though the serial "matches".

The PLOAM password on this firmware is stored as hex-encoded ASCII: `1234567890` becomes `31323334353637383930`. `GPON_PLOAM_FORMAT 1` tells the stick that's what it's looking at. Firmware `220304` and later only accepts the hex form over SSH, so I didn't bother trying the plain one.

### Who the stick claims to be over OMCI

```
flash set PON_VENDOR_ID VTGR
flash set GPON_ONU_MODEL vGP-42X6V1
flash set HW_HWVER VGP42X6M001
flash set OMCI_SW_VER1 V1302250508
flash set OMCI_SW_VER2 V1302250508
flash set HW_CWMP_MANUFACTURER VTGR
flash set HW_CWMP_PRODUCTCLASS vGP-42X6V1
flash set OUI 11,11,11
```

These are copied straight off the Viettel ONT. `OMCI_SW_VER1`/`SW_VER2` are the two firmware image slots the OLT sees; set both to the same string or the ALU OLT may decide the ONT has a pending upgrade and try to push firmware at it. `HW_CWMP_*` feed TR-069 and probably don't matter for a bridge, but they're one line each and I wanted the stick to look exactly like the real thing.

Two more settings are what separate "registered" from "has internet":

```
flash set OMCI_OLT_MODE 21
flash set OMCI_FAKE_OK 1
```

`OMCI_OLT_MODE` picks the compatibility profile the stick uses when answering the OLT. `0` is the Realtek default, `1` Huawei, `2` ZTE, `3` user-defined. `21` isn't an official mode at all. It overflows the mode table, and as a side effect the OMCI daemon reports the vendor/model/version strings above instead of its built-in ones. It also makes `/bin/checkomci` segfault on boot, which is harmless but looks alarming in the log. On newer firmware (`220530`, `220923`) the clean way is `OMCI_OLT_MODE 3` plus `nv setenv sw_custom_version0` / `sw_custom_version1` for the software strings. On my `220304`-era image only the overflow trick took, so that's what I run. Without it the stick reached O5 (the registered state) and sat there, because the OLT was seeing a Realtek reference ONT it had no service profile for.

`OMCI_FAKE_OK 1` makes the stick acknowledge vendor-specific OMCI messages it doesn't understand instead of NAKing them. The ALU OLT sends plenty of those during provisioning. With it off, provisioning stalls partway through.

### MAC address and the MAC_KEY

```
flash set ELAN_MAC_ADDR 781735000000
flash set MAC_KEY 46f4ea2e3f18ba3bc1f2671b5f7e1f62
```

GPON doesn't use the ONT's MAC for upstream transport, so in theory this doesn't matter. In practice, firmware `220304` and newer refuses to change `ELAN_MAC_ADDR` unless you also set `MAC_KEY` to the MD5 of a vendor secret plus the uppercase MAC:

```bash
echo -n "hsgq1.9a781735000000" | md5sum
```

Set the key first, then the MAC. If you don't care about the MAC, skip both.

### VLAN

```
flash set VLAN_CFG_TYPE 0
flash set VLAN_MANU_MODE 1
flash set VLAN_MANU_TAG_VID 35
flash set VLAN_MANU_TAG_PRI 0
```

This part differs by ISP. Viettel delivers the internet service on VLAN 35 on the PON side, and I do the tagging on the router: a `VLAN35` interface on `sfp1`, with the PPPoE client on top of it. `VLAN_MANU_MODE 1` with `VLAN_MANU_TAG_VID 35` tells the stick that 35 is the service VLAN it should carry between the PON and the host port, so the tag the MikroTik puts on comes out the other side unchanged. The other `VLAN_MANU_TAG_VID2..4` entries stay at `65535` (unused).

The alternative is to let the stick add and strip the tag so the router sees untagged PPPoE, which is how the old ONT behaved in bridge mode. I prefer the tag on the router side. It's visible in one place I already manage, and if I ever add Viettel's IPTV VLAN it's one more VLAN interface in WinBox rather than another SSH session into the stick.

### Bridge mode and the rest

```
flash set WAN_MODE 7
flash set DIRECT_BRIDGE_MODE 1
flash set DUAL_MGMT_MODE 1
flash set OMCI_VEIP_SLOT_ID 255
flash set HW_SERIAL_NO UONHUWH12341234123
```

`WAN_MODE 7` + `DIRECT_BRIDGE_MODE 1` is "just be a bridge". `DUAL_MGMT_MODE 1` keeps the local web/SSH management alive alongside OMCI, so the ISP can't lock me out of my own stick. `HW_SERIAL_NO` is the physical platform serial, a different thing from the GPON SN. The OLT doesn't check it, so I left the guide's placeholder in.

### Host-side link speed

```
flash get LAN_SDS_MODE
```

This is the SerDes mode between the stick and the router's SFP cage. `0` is auto-sense, and hack-gpon lists it as a known problem: the stick doesn't always pick correctly between SGMII (1G) and HiSGMII (2.5G). If the link flaps or never comes up, pin it:

| Mode | What it is |
|------|------------|
| `1` | 1G, 1000BASE-X with auto-neg |
| `2` | 1G, SGMII to a PHY |
| `3` | 1G, SGMII to a MAC |
| `4` | 2.5G, HiSGMII to a PHY |
| `5` | 2.5G, HiSGMII to a MAC |
| `6` | 2.5G, 2500BASE-X with auto-neg |
| `7` | 1G, forced, no auto-neg |

My MikroTik cage is 1G only, and auto (`0`) has been stable there, so I left it. On a 2.5G cage, `6` is usually the one that works.

Then:

```
reboot
```

Nothing takes effect until the reboot. Watch the PON state walk O1 → O2 → O3 → O5 within about thirty seconds, either on the web UI's status page or from the shell:

```
diag gpon get onu-state
```

O5 means registered; internet arriving a few seconds later means the OMCI profile was accepted.

The stick is dual-boot: `nv getenv sw_active` shows which of the two images (`k0`/`r0` or `k1`/`r1`) is running. If you ever flash firmware, that's what saves you from a bad image: `nv setenv sw_commit 0` (or `1`) and reboot to go back to the other one. Stock firmware worked for me, so I never flashed; the Anime4000 repo recommends the `hybrid_220527` or `hybrid_220916` builds if you need working VLAN translation on a newer base.

## The MikroTik side

The router needs a VLAN 35 interface on the SFP port, a PPPoE client on that VLAN, and a masquerade rule out of the PPPoE interface. In RouterOS terms:

```
/interface vlan add name=VLAN35 vlan-id=35 interface=sfp1
/interface pppoe-client add name=pppoe-out1 interface=VLAN35 \
    user=<your-pppoe-user> password=<your-pppoe-password> \
    add-default-route=yes use-peer-dns=no disabled=no
/ip firewall nat add chain=srcnat out-interface=pppoe-out1 \
    action=masquerade comment="WAN Masquerade"
```

The same thing in WinBox, which is how I actually did it:

<figure>
  <img src="/images/posts/gpon-sfp-stick-replaces-isp-modem/pppoe.webp" alt="WinBox PPPoE client dialog, General tab: name pppoe-out1, type PPPoE Client, actual MTU 1492, Interfaces set to VLAN35, status connected" width="1456" height="906" loading="lazy">
  <figcaption>PPP → Interface → pppoe-out1, General tab. The parent interface is <code>VLAN35</code>, not <code>sfp1</code> directly. MTU settles at 1492.</figcaption>
</figure>

<figure>
  <img src="/images/posts/gpon-sfp-stick-replaces-isp-modem/pppoe-credential.webp" alt="WinBox PPPoE client dialog, Dial Out tab: user and password fields, Add Default Route checked, Use Peer DNS unchecked, all four auth methods allowed" width="1448" height="1080" loading="lazy">
  <figcaption>Dial Out tab. The PPPoE username and password are the same ones the Viettel ONT was using; they're on the contract, or in the ONT's WAN page if you could still log into it. Use Peer DNS is off because AdGuard Home handles DNS for the LAN.</figcaption>
</figure>

<figure>
  <img src="/images/posts/gpon-sfp-stick-replaces-isp-modem/nat-rule.webp" alt="WinBox NAT rule dialog, General tab: chain srcnat, out interface pppoe-out1, comment WAN Masquerade" width="1522" height="1454" loading="lazy">
  <figcaption>IP → Firewall → NAT. The only match is <code>out-interface=pppoe-out1</code>; everything leaving via PPPoE gets NATed.</figcaption>
</figure>

<figure>
  <img src="/images/posts/gpon-sfp-stick-replaces-isp-modem/nat-rule-action.webp" alt="WinBox NAT rule dialog, Action tab: action set to masquerade" width="1524" height="532" loading="lazy">
  <figcaption>Action tab: <code>masquerade</code>. There is nothing else to the rule.</figcaption>
</figure>

If you had the MikroTik behind the ONT in bridge mode before, this is probably what you already had, minus the VLAN interface. Once the stick reaches O5, `pppoe-out1` goes to <em>connected</em> on its own.

## Things that bit me

**O5 but no traffic.** For me this was `OMCI_OLT_MODE`, covered above. On an ALU OLT, O5 with no service almost always means the OLT accepted your serial and password and is rejecting your identity. Check every string against the Viettel ONT (vendor ID, model, hardware version, both `OMCI_SW_VER` slots) and that `OMCI_FAKE_OK` is `1`.

**Heat.** The stick idles around 50 °C in the MikroTik's cage and the RTL9601D throttles badly above 70 °C or so. People in the voz thread saw a few lost pings per hundred that went away after they strapped a fan on. Mine stays under 60 °C in a ventilated rack. Check the temperature on the status page after an hour either way.

**Optical power.** The status page shows RX power in dBm. Anything between -8 and -24 dBm is fine, -18 is very good, and around -27 the link starts to flap. If it's worse than the old ONT reported on the same fibre, reseat the connector; the stick's receptacle is less forgiving than a full-size ONT's.

**The ISP can still reboot it.** Because the stick honours OMCI, the OLT can send it a reset just like it could the real ONT. I'm fine with that. Refusing OMCI resets is how you get de-provisioned, and it has happened once in a few months.

**MTU.** The bridge's max packet length defaults to something that just fits PPPoE at 1492. If you want baby jumbo frames for a 1500-byte PPPoE MTU, `diag switch set max-pkt-len port all length 2000` raises it, but the setting doesn't survive a reboot, so I didn't bother.

**Two ONTs, one serial.** Don't plug the old ONT back in on the same line while the stick is up. The OLT sees a duplicate serial and drops both.

## When not to do this

On a different ISP with a Huawei or ZTE OLT, most of the identity cloning is optional and serial + password is often enough; the recipe above is the strict version. If your ISP uses the ONT as a router (VoIP, IPTV multicast, TR-069 managed wifi), the stick can carry those VLANs but you have to rebuild all of that on your own router. I only need PPPoE, so I lost nothing. And if you're on a 10G-PON or XGS-PON line, this stick won't help; it's 2.5G/1.25G GPON only.

## Was it worth it

One fewer box and power supply, no more waiting for a black-box ONT to come back after a blip, and a status page I can read. The whole thing was about twenty `flash set` lines and a reboot. The next time I move, getting the MikroTik online means copying the new line's serial and PLOAM off the label instead of convincing a branch office that I deserve bridge mode.

The ISP's modem was never doing anything my router couldn't. Now nobody has to give me permission to skip it.
