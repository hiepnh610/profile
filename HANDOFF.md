# Handoff: Personal Website (Hiep Nguyen)

## Overview
A personal site / dev blog for **Hiep Nguyen**, a software engineer based in Da Lat. Two pages:

1. **Index / Writing list** (`Personal Website v2.html`) — identity card on the left, featured post + filterable list of recent writing on the right.
2. **Post detail** (`Personal Website Post.html`) — long-form article with sticky meta sidebar + table of contents and reading progress bar.

Aesthetic: content-forward, black-and-white, modern sans (Geist) + literary serif (Newsreader) + mono (Geist Mono), restrained interactivity.

## About the Design Files
The HTML files in this bundle are **design references** — prototypes showing intended look and behavior, not production code to ship as-is. The task is to **recreate these designs in the target codebase's existing environment** (Next.js, Astro, SvelteKit, etc.) using its established patterns and component libraries. If no environment exists yet, **Astro + Tailwind** is a strong default for a content site of this shape (static-first, MDX posts, minimal JS).

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are intended as-shipped. Recreate pixel-perfectly, lifting exact values from the "Design Tokens" section.

---

## Screen 1 — Writing list (Home)

**File:** `Personal Website v2.html`
**Purpose:** Introduce Hiep, surface a featured post, let visitors scan recent writing filtered by tag.

### Layout
- Outer column: `max-width: 1180px`, centered, side padding `clamp(20px, 4vw, 48px)`.
- **Sticky top bar**, full-width, bordered bottom, blurred translucent white background. Single centered nav: `Writing` (current) · `Notes` · `Projects` · `Bookshelf` · `About` · `Search ⌘K` button.
- **Main**: 2-column grid, `320px` sidebar + `1fr` feed, gap `clamp(40px, 6vw, 88px)`, vertical padding `clamp(28px, 4vw, 56px)`.
- **Footer**: full-width, bordered top, mono small text. Left: copyright + tagline. Right: `Colophon` · `RSS` · `Sitemap`.

### Sidebar (`<aside class="intro">`, sticky `top: 96px`)
1. **Headline (`h1.who`)** — "I'm Hiep, *a software engineer in Da Lat.*" Newsreader serif, weight 500, italic on the second clause (muted color). `clamp(34px, 3.6vw, 44px)`, lh 1.05, ls -0.015em.
2. **Bio paragraph** — 15px Geist, lh 1.55. Second sentence muted, with one inline link "Astro + Cloudflare" (1px border-bottom, darkens to ink on hover).
3. **Now strip** — Bordered card, radius 10px, background `#f6f6f6`, padding 14×16, mono 11px. Three pairs inline: `Now` shipping a markdown CMS · `Reading` Calvino · `Listening` Nils Frahm.
4. **Socials** — pill chips, `1px solid rule`, radius 999px, padding 6×11, gap 6px. Items: GitHub, Mastodon, hi@hiepnguyen.dev, RSS. Hover inverts to ink + white text + 1px lift.
5. **Stats grid** — bordered top, 2-col grid. Three entries (`<dt>` mono 10px uppercase 0.1em quiet + `<dd>` 14px weight 500): Posts 142 · Since 2018 · Words this year 38,210.

### Feed (`<section class="feed">`)
1. **Featured card** — bordered, radius 10px, padding 26×28×24, gradient `#fcfcfc → #ffffff`. Star "FEATURED" label top-right (mono 10px). Meta line (mono 11px uppercase). H2 title in Newsreader serif (clamp 24-30px, weight 500). Dek paragraph (15px muted). "Read the post →" with underline; arrow translates 3px on card hover.
2. **Section header** — flex baseline. Left: `Recent — last 8` (Geist 13px uppercase 0.12em). Right: filter buttons row (mono 11px) — `all / dev / notes`. Active: ink color + `#f6f6f6` bg + 4px radius.
3. **Posts list** — each `li.post` is a 3-col grid: `90px` date · `1fr` body · `auto` tag. `1px solid #f6f6f6` separators. Hover: 6px left padding (slide). Date mono 12px quiet. Title Newsreader 19px weight 500 — hover draws a 1px underline left→right (300ms `background-size`). Dek 13.5px muted. Tag mono 10px uppercase 0.1em quiet.
4. **All-posts link** — `Browse all 142 posts →` in a dashed-bordered pill (mono 12px), hover fills `#f6f6f6`.

### Sample posts (replace with real data)
| Date | Title | Tag |
|---|---|---|
| 28 Apr | A markdown CMS that fits in one Cloudflare Worker | dev |
| 21 Apr | View transitions are the most underused web feature of 2026 | dev |
| 07 Apr | On reading slowly | notes |
| 31 Mar | Self-hosting in 2026: a lazy person's setup | dev |
| 15 Mar | Tools I quietly stopped using this year | notes |
| 06 Mar | SQLite is plenty | dev |

Featured: **Goodbye WordPress, hello a folder of markdown files** (02 May 2026 · Essay · 9 min read).

---

## Screen 2 — Post detail

**File:** `Personal Website Post.html`
**Purpose:** Render a single long-form post with strong reading affordances.

### Layout
- Same top bar as the index.
- **Breadcrumb strip** (bordered bottom, mono 12px): `Writing / 2026 / <post title>` on the left, `← Back to all writing` on the right (the arrow translates -3px on hover).
- **Main**: 2-col grid, `220px` sticky sidebar + `1fr` article. Padding `clamp(36px, 5vw, 72px) … clamp(48px, 6vw, 96px)`.
- **Reading progress bar** at the very top (`position: fixed; height: 2px`); fills with `--ink` proportional to scroll.

### Sidebar (`<aside class="side">`, sticky `top: 96px`)
- **Meta block** (`dl.meta-block`, bordered bottom): Date · Read · Type · Words · Updated. Each row is a 70px label / 1fr value grid; labels mono 10px uppercase 0.1em quiet, values 12px ink.
- **TOC** (`nav.toc`): each entry is a left-bordered link, padding `4px 0 4px 12px`. `:hover` darkens border to quiet. `.active` thickens left border to 2px ink and switches text to ink. `.lvl-3` entries indent 12px more and use 11.5px quiet.
- **Share pills**: Copy link · Mastodon · Email — same pill chip style as the index socials.

### Article (`<article>`)
1. **Eyebrow line** — mono 11px uppercase 0.12em muted, with `<span class="dot">` separators (4px circles, quiet).
2. **Title (`h1.title`)** — Newsreader 500, `clamp(36px, 4.4vw, 60px)`, lh 1.04, ls -0.02em, `text-wrap: balance`, `max-width: 18ch`.
3. **Standfirst** — Newsreader italic, `clamp(18px, 1.8vw, 22px)`, lh 1.5, muted color, max-width 50ch.
4. **Byline** — bordered top + bottom, padding 14px. Avatar circle (28px, radial-gradient, italic serif initial) · `<b>` author name · "·" separator · location · right-aligned word count. Geist Mono 11px uppercase 0.06em.
5. **Body**, max-width `64ch`, font-size 17px, lh 1.65:
   - **Drop cap** on `p.lead`: `:first-letter` is Newsreader 500, `font-size: 3.6em`, `float: left`, lh 0.85, margin `0.05em 0.08em 0 -0.04em`.
   - **Inline links**: 1px gradient underline at baseline; thickens to 2px on hover (300ms).
   - **`h2.section-heading`** — Newsreader 500 28px lh 1.2, `scroll-margin-top: 88px`. A leading `.num` span (mono 12px quiet, vertical-align 0.45em) holds the "01–06" prefix.
   - **`h3`** — Geist 600 16px.
   - **Blockquote** — left 2px ink rule, 28px left padding, Newsreader italic 21px lh 1.45, `<cite>` mono 11px uppercase muted with leading "— ".
   - **Pull quote** — Newsreader italic 500 `clamp(24px, 2.6vw, 32px)`, lh 1.25, bordered top + bottom, padding 28px 0, `text-wrap: balance`.
   - **Inline code** — mono 0.88em, `#f6f6f6` background, 1×6 padding, 3px radius.
   - **Code block** (`<pre>`) — `#0c0c0c` background, `#f5f5f5` text, padding 18×22, radius 8px, mono 13px lh 1.6. Token classes: `.c` `#6f6f6f` (comment), `.k` `#c9d1d9` (keyword), `.s` `#b5e8a7` (string), `.n` `#f0a868` (name).
   - **Figure** — `aspect-ratio: 16/9`, hatched placeholder (`repeating-linear-gradient(45deg, #f6f6f6 0 8px, #ffffff 8px 16px)`), bordered, radius 8px. `figcaption` mono 11px muted centered, with bold "fig 1." prefix.
   - **Footnote refs** — `sup a` is a tiny mono pill (1px border, 3px radius); footnote list at the bottom is 13px muted.
   - **End mark** — 10px black square inline at the end of the closing paragraph.
6. **Article footer** (`.article-foot`, bordered top, max-width 64ch):
   - **Tags** — pill chips with `#` prefix (rendered via `::before`).
   - **Author card** — bordered, radius 10px, gradient background. 56px avatar + name + bio + mono links row.
   - **Prev / Next** — 2-col grid of bordered cards (radius 10px). Lab line is mono 10px uppercase 0.12em quiet. Title is Newsreader 17px weight 500. Next card is right-aligned. Hover: border darkens, background `#f6f6f6`.

### Interactions
- **Reading progress**: passive scroll listener writes `--p: ##%` on the `.progress` bar pseudo-element; transitions `width 0.08s linear`.
- **TOC active state**: IntersectionObserver on every `h2[id]` / `h3[id]` in `.body` with `rootMargin: '-20% 0px -65% 0px'`. On intersect, clears `.active` from all TOC links and adds it to the matching one.
- **Smooth in-page jumps**: native anchor + `scroll-margin-top: 88px` on headings clears the sticky bar.

---

## Shared interactions (both pages)

- **Top bar**: `position: sticky; top: 0`; `backdrop-filter: saturate(180%) blur(8px)`; `rgba(255,255,255,0.85)`.
- **⌘K (or Ctrl+K)**: triggers a "pulse" scale animation (1 → 1.06 → 1) on the Search button as a stub. In production, open a real command palette / search modal.
- **Index — tag filters**: clicking `all / dev / notes` toggles `display: none` on `.post` rows whose `data-tag` doesn't match. Active button gets `.active` + `aria-selected="true"`; siblings clear both.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all animations and transitions globally.

## State Management
- `activeFilter: 'all' | 'dev' | 'notes'` — drives index post visibility.
- `searchOpen: boolean` — for the future ⌘K modal.
- Post detail reads from a single post record: `{ slug, title, dek, date, updated, tag, type, readingMinutes, words, body, prevSlug, nextSlug }`.
- TOC entries can be derived from `body` headings at build time (Astro/MDX) or by parsing the rendered DOM at runtime.

## Design Tokens

### Colors
| Token | Value | Use |
|---|---|---|
| `--ink` | `#0c0c0c` | Primary text, headings, hovered links |
| `--paper` | `#ffffff` | Page background |
| `--muted` | `#6f6f6f` | Secondary text, dek paragraphs, byline |
| `--quiet` | `#a3a3a3` | Tertiary (labels, dates, tags, separators) |
| `--rule` | `#ececec` | Borders, dividers |
| `--rule-2` | `#f6f6f6` | Subtle fills (now-strip, active filter, hover bg, inline code) |
| Code bg | `#0c0c0c` | `<pre>` background |
| Code text | `#f5f5f5` | `<pre>` foreground |
| Code tokens | `#6f6f6f` / `#c9d1d9` / `#b5e8a7` / `#f0a868` | comment / keyword / string / name |

### Typography
- **Geist** (sans, weights 400/500/600/700) — UI, body copy, nav, buttons
- **Geist Mono** (weights 400/500) — labels, dates, tags, small meta, code, eyebrow, footer
- **Newsreader** (serif, opsz 6..72, weights 400/500/600, italic 400/500) — headlines, post titles, drop cap, blockquote, pull quote, standfirst

Type scale:
- Index sidebar H1: `clamp(34px, 3.6vw, 44px)` lh 1.05 ls -0.015em w500
- Post H1 title: `clamp(36px, 4.4vw, 60px)` lh 1.04 ls -0.02em w500
- Featured H2: `clamp(24px, 2.4vw, 30px)` lh 1.15 ls -0.01em w500
- Body H2: 28px lh 1.2 ls -0.01em w500
- Body H3: 16px w600
- Post row title: 19px lh 1.3 ls -0.005em w500
- Body: 17px lh 1.65 (post) / 15px lh 1.55 (sidebar bio)
- Standfirst: `clamp(18px, 1.8vw, 22px)` italic
- Pull quote: `clamp(24px, 2.6vw, 32px)` italic w500
- Mono labels: 10–12px uppercase ls 0.06–0.12em
- Body measure: `64ch`

### Spacing
- Page padding: `clamp(28px, 4vw, 56px)` v · `clamp(20px, 4vw, 48px)` h (post page expands vertical to `clamp(36px, 5vw, 72px)` / `clamp(48px, 6vw, 96px)`)
- Sidebar/feed gap: `clamp(40px, 6vw, 88px)`
- Section internal rhythm: 18–28px between blocks; post-list rows 18px vertical
- H2 sections in body: `2.2em` top / `0.6em` bottom
- Stats grid gaps: 16px row · 12px column
- Sticky offset: `top: 96px` (sidebars), `scroll-margin-top: 88px` (headings)

### Borders & radii
- Card radius: `10px` (featured, now-strip, all-link pill, prev/next, author card)
- Pill radius: `999px` (socials, nav chips, tags, share)
- Small radius: `4–6px` (filter buttons, search button, code inline)
- Code block radius: `8px`
- Borders: `1px solid var(--rule)`; inner separators `1px solid var(--rule-2)`; blockquote `2px solid var(--ink)` left

### Shadows
None. Design relies on borders and tonal contrast.

## Responsive Behavior
- `≤880px`: Both pages collapse to single column; sidebars `position: static`. On the post page the sidebar moves to `order: 2` (TOC below the article). Most nav items hide; only Search remains.
- `≤560px`: Index post grid drops the trailing tag column. Post body drops to 16px. Prev/Next becomes single column.

## Accessibility
- Filter buttons use `role="tab"` + `aria-selected`. Pair with `role="tablist"` on the wrapper in production.
- Add visible focus rings (`outline: 2px solid var(--ink); outline-offset: 2px`) — the prototypes lean on browser defaults.
- Use semantic landmarks: `<header>` for the top bar, `<aside>` for sidebar, `<article>` for the post, `<footer>` for site footer.
- Honor `prefers-reduced-motion`.
- The reading progress bar is `aria-hidden="true"`; do not add it to the a11y tree.

## Assets
No images or icons — all visual elements are typography, borders, gradients, and CSS hatching. Unicode glyphs used: `→` `←` `↗` `★` `·` `↩`. Avatars are CSS radial-gradients with an italic serif initial. If you want crisper icon control, swap to inline SVG or Lucide.

## Files
- `Personal Website v2.html` — index / writing list prototype
- `Personal Website Post.html` — post detail prototype

## Implementation suggestions

1. **Routing**: index at `/`, post detail at `/writing/[year]/[month]/[slug]` (matches the breadcrumb structure in the prototype).
2. **Content**: MDX with frontmatter `{ title, date, updated, dek, tag, type, featured, readingMinutes, words }`. Compute `readingMinutes` and `words` at build time.
3. **TOC**: extract at build time from headings in MDX (rehype-slug + rehype-autolink-headings + a small remark plugin), render the structured tree in the sidebar.
4. **Suggested component split**:
   - Shared: `<TopBar />`, `<SiteFooter />`, `<SearchTrigger />`
   - Index: `<IntroCard />`, `<NowStrip />`, `<Socials />`, `<StatsGrid />`, `<FeaturedPost />`, `<FilterTabs />`, `<PostList />` + `<PostRow />`
   - Post: `<Crumbs />`, `<PostMeta />`, `<TOC />` (with active-section hook), `<ProgressBar />`, `<Byline />`, `<TagPills />`, `<AuthorCard />`, `<PrevNext />`
5. **Search**: when implementing ⌘K, use a client-side index — Pagefind for static sites, or Fuse.js over post metadata.
6. **Code highlighting**: Shiki at build time, mapped to the prototype's token palette (or use the shipped class names `.c .k .s .n` if you want to keep the existing CSS).
