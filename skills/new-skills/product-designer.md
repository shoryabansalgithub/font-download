# Product Designer Skill · Studio-Grade UI

> Distilled from analysis of 5 production UIs by a $500K design studio: a dark-mode messaging app, a task management dashboard, a finance dashboard with AI sidebar, and two EdTech platforms. Every rule below is a pattern observed across ALL of them.

---

## 1. THE SHELL — Every screen shares this skeleton

```
┌─────────────────────────────────────────────────────────┐
│  Page Canvas (tinted neutral bg — never pure white)     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Container (white or dark, radius 12-16px, shadow) │  │
│  │  ┌────────┬────────────────────────────────────┐   │  │
│  │  │Sidebar │  Main Content                      │   │  │
│  │  │200-240 │  flex:1                            │   │  │
│  │  │        │  ┌──────────────────────────────┐  │   │  │
│  │  │        │  │ Header Bar                   │  │   │  │
│  │  │        │  │ Content Zone (scroll)        │  │   │  │
│  │  │        │  └──────────────────────────────┘  │   │  │
│  │  └────────┴────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hard rules:**
- Canvas bg is NEVER `#FFFFFF`. Use `#F0F0F0` (light) or `#0D0D0D` (dark).
- Container floats with `border-radius: 12-16px` and a soft outer shadow `0 4px 24px rgba(0,0,0,0.06-0.10)`.
- Sidebar width: `200-240px` fixed. Main content: `flex: 1`.
- Desktop artboard: `1440 × 900` or `1440 × 1024`.

---

## 2. SIDEBAR — The identity spine

**Structure (top → bottom, vertical flex, full height):**

| # | Zone | Details |
|---|------|---------|
| 1 | **Logo** | 28-36px icon (gradient or brand-colored circle/roundrect) + company name (bold 16-18px). Pad `20-24px`. |
| 2 | **Search** | Full-width input, muted bg, search icon, keyboard shortcut hint `"/"`. Optional — can be in header instead. |
| 3 | **Nav sections** | Grouped with section labels (all-caps 10-11px, `letter-spacing: 0.08em`, muted color). Items: icon 18px + label 14px medium. |
| 4 | **Active item** | Tinted bg matching brand hue at 10-15% opacity + left accent bar 3px solid brand color + text goes bold/dark. |
| 5 | **Spacer** | `flex: 1` pushes bottom section down. |
| 6 | **Bottom actions** | Settings, Help & Support. Sign Out in red if present. Separated by 1px divider. |
| 7 | **User profile** | 32-40px circular avatar + name (semibold 13px) + email (regular 11px, muted) + chevron. Border-top divider. |

**Notification badges:** 18-20px circles, red `#EF4444`, white text 10px bold. Right-aligned on nav items.

**Workspace selector (if present):** Dark pill (`#1E1E2D`), rounded 10px, contains: icon/badge + label + name + chevron.

---

## 3. HEADER BAR — Context + primary actions

**Layout:** Horizontal, `justify: space-between`, `align: center`, pad `20-32px`.

| Left Side | Right Side |
|-----------|------------|
| Breadcrumb `Parent › Page` (muted 13px) or page title (semibold 22-26px) + subtitle (regular 14px, muted) | Primary CTA buttons + secondary actions (dark mode toggle, notifications, profile avatars) |

**Welcome pattern (dashboards):**
```
Welcome Back, {Name}!
Here's how your {domain} are {verb} today
```
Title: semibold 22-26px. Subtitle: regular 14px, muted.

**Promotional banner:** Pill-shaped, gradient or solid brand bg, white text, icon left. e.g. `"🎉 Get 40% Discount"`. `radius: 20px`, pad `8px 20px`.

---

## 4. BUTTONS — Three tiers, no more

| Tier | Style | Use |
|------|-------|-----|
| **Primary** | Solid brand color, white text, radius 8px, pad `8-10px 16-20px`, 36-40px height | ONE per section max |
| **Secondary** | Dark solid (`#1E1E2D`), white text, same dimensions | Paired with primary |
| **Outline/Ghost** | 1px border `#D1D5DB`, transparent bg, dark text, same radius | Filters, toggles, sort |

All buttons: Inter/system font semibold 13px, icon 14-16px left with 6-8px gap. Never more than 2 solid buttons side by side.

---

## 5. STAT CARDS — The dashboard opener

**Layout:** 3-4 cards in a horizontal row, equal width, `gap: 16-20px`.

**Anatomy per card:**
```
┌──────────────────────────────────┐
│  📊 Label              ↗        │  icon 16px + label 12-13px muted + expand icon
│  $24,847.83                     │  value: bold 24-28px, primary color
│  ▼ 12%   vs last 24 hours      │  trend arrow + percent (green/red 12px) + context muted 11px
└──────────────────────────────────┘
```

- Border: 1px `#E5E7EB` or subtle shadow.
- Radius: 12px.
- Padding: 16-20px.
- Trend up: green `#10B981` / `#34C759`. Trend down: red `#EF4444`.

---

## 6. TABLES — Dense but breathable

**Structure:** Table → Header Row → Data Rows. Each row → Cell frames → Cell content.

| Property | Header Row | Data Row |
|----------|-----------|----------|
| Height | 40px | 44-52px |
| Background | `#F7F7F7` (light) / `#1A1A2E` (dark) | white / dark |
| Text | Medium 12px, muted | Regular 13px, primary |
| Border-bottom | 1px `#E5E7EB` | 1px `#F3F4F6` (barely visible) |
| Padding | `0 24-32px` | `0 24-32px` |

**Section headers above tables:**
- Vertical bar indicator (3px × 16px, dark) + title semibold 16px + count badge (circle, tinted bg, brand text) + collapse chevron.
- Filter row: Sort + Filter + Import outline buttons, right-aligned.

**Cell component library (build ALL of these):**

| Cell Type | Pattern |
|-----------|---------|
| **Checkbox** | 16×16, radius 4px. Checked = blue fill + white check |
| **Entity name** | 8px colored dot + text. Dot color = unique per entity |
| **Truncated text** | 13px, max-width with ellipsis |
| **Progress bar** | 60-80px stripped/segmented bar (red/brand fill) + "46%" text 12px |
| **Avatar stack** | 28px circles, -8px overlap, 2px white border, "+N" gray badge |
| **Status/Stage** | Plain text 13px |
| **Priority badge** | Pill `radius: 12px`, dot 6px + text 11px. Variants: High (red), Medium (amber), Normal (blue), Low (gray) |
| **Date** | 13px, "Mon DD, YYYY". Overdue = red + ⚠ icon |
| **Category badge** | Pill, icon 12px + label 11px, colored per category |
| **Currency** | Right-align, regular 13px, mono or tabular nums |
| **Actions** | `⋮` more-vertical icon 16px, muted, 32px click target |

---

## 7. CARDS — Content containers

**Course/content card (observed in EdTech):**
```
┌──────────────────────────────────────┐
│  🟣 Title goes here          Free   │  icon 32px + title bold 15px + price badge
│  Subtitle / description muted       │  13px muted
│                                      │
│  Intermediate  ·  8h 20m  ·  Design │  metadata tags, 12px muted, pill or plain
│                                      │
│  Description paragraph text that     │  13px, muted, 3-4 lines, overflow hidden
│  wraps and truncates after ~3 lines  │
│                                      │
│  [Bookmark]           [Get Started →]│  outline btn left, primary btn right
└──────────────────────────────────────┘
```

- Border: 1px `#E5E7EB`. Radius: 12px. Pad: 20px.
- Grid layout: 3 columns, `gap: 20px`.
- Price badge: "Free" = green text, muted bg. "$45" = dark bold.
- Bookmark button: outline. CTA button: text + arrow icon →.

---

## 8. CHARTS — Clean data viz

**Bar charts (observed in Finance + EdTech):**
- Grouped or stacked bars, 2 colors max per chart.
- Y-axis: muted 11px, grid lines `#F3F4F6` (barely visible).
- X-axis labels: muted 11px (Jan, Feb... or Mon-Fri).
- Active bar: slightly different shade + tooltip on hover.
- Tooltip: white card, radius 8px, shadow, small text 12px.
- Legend: colored squares 8px + text 12px, top-right or inline.
- Time range tabs: `7D | 1M | 6M | 1Y`, pill-style toggle, active = brand bg.

**Progress gauges (observed in EdTech):**
- Semicircle/arc gauge, brand gradient stroke, large center number (bold 40-48px) + "%" suffix.
- Supportive text below: 13px muted, 2 lines max.
- Action buttons below gauge.

**Saving/Goal progress bars:**
- Label left + percentage bold + $ amounts right.
- Thin bar (6-8px), rounded, brand fill on gray track.
- Stacked vertically, `gap: 16-20px`.

---

## 9. RIGHT SIDEBAR — The companion panel

When a right panel exists (Finance AI, Learning Progress), apply:
- Width: 280-320px fixed.
- Separated by 1px border or gap, never overlapping.
- Contains: standalone widget cards stacked vertically.
- Each widget: own title (semibold 16px) + `⋮` or `↗` action icon.
- Calendar widget: 7-column grid, today highlighted with brand circle, past dates muted.
- AI chat: avatar/illustration + title + subtitle + tag pills + text input with send button.

---

## 10. COLOR SYSTEM — Two modes, strict tokens

**Light Mode Palette:**
| Role | Value |
|------|-------|
| Canvas | `#F0F0F0` to `#F5F5F5` |
| Surface | `#FFFFFF` |
| Surface elevated | `#FFFFFF` + shadow |
| Text primary | `#1A1A1A` |
| Text secondary | `#6B7280` |
| Text muted | `#9CA3AF` |
| Border | `#E5E7EB` |
| Border subtle | `#F3F4F6` |

**Dark Mode Palette:**
| Role | Value |
|------|-------|
| Canvas | `#0D0D0D` to `#111111` |
| Surface | `#1A1A2E` to `#1E1E2D` |
| Surface elevated | `#252538` |
| Text primary | `#F0F0F0` |
| Text secondary | `#9CA3AF` |
| Text muted | `#6B7280` |
| Border | `#2D2D3F` |
| Border subtle | `#1F1F30` |

**Brand accent:** ONE dominant hue per product. Apply at 100% for CTAs, 10-15% for tinted backgrounds.
- Green: `#34C759` (task mgmt)
- Purple: `#7C3AED` (EdTech)
- Blue: `#3B82F6` (general SaaS)
- Orange: `#F59E0B` (finance)

**Semantic colors (universal):**
- Success: `#10B981` | Error: `#EF4444` | Warning: `#F59E0B` | Info: `#3B82F6`

---

## 11. TYPOGRAPHY — One font, strict scale

**Font:** Inter (or SF Pro, system-ui fallback).

| Level | Size | Weight | Use |
|-------|------|--------|-----|
| Display | 28-32px | 700 | KPI values, hero numbers |
| H1 | 22-26px | 600 | Page titles |
| H2 | 16-18px | 600 | Section titles, card titles |
| H3 | 14-15px | 600 | Subsection titles |
| Body | 13-14px | 400 | Table cells, descriptions |
| Small | 11-12px | 400-500 | Labels, captions, badges, metadata |
| Tiny | 10px | 500 | Section group labels (uppercase, tracked) |

**Line heights:** Headings: 1.2-1.3. Body: 1.5. Small: 1.4.
**Letter spacing:** Normal for body. `+0.02-0.05em` for tiny uppercase labels.

---

## 12. SPACING — 4px base, 8px grid

```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48
```

| Context | Value |
|---------|-------|
| Sidebar padding | `16-24px` |
| Content area padding | `24-32px` |
| Card internal padding | `16-24px` |
| Between sections | `24-32px` |
| Between cards in grid | `16-20px` |
| Nav item gap | `2-4px` |
| Button padding | `8-10px 16-20px` |
| Table row height | `44-52px` |
| Icon-to-text gap | `6-10px` |

---

## 13. ICONS — Consistent family, two sizes

- **Icon set:** Lucide (preferred), Feather, or Phosphor. Pick ONE per project.
- **Nav icons:** 18-20px, 1.5-2px stroke.
- **Inline icons:** 14-16px.
- **Icon color:** Matches adjacent text color. Active = primary. Default = muted.
- **Never** mix filled and outlined icons in the same context.

---

## 14. CORNER RADIUS — Consistent scale

| Element | Radius |
|---------|--------|
| Outer container | `12-16px` |
| Cards, modals | `12px` |
| Buttons, inputs | `8px` |
| Badges, pills | `12px` (full pill) |
| Avatars | `50%` (circle) |
| Checkboxes | `4px` |
| Small tags | `6px` |
| Tiny indicators | `2-3px` |

---

## 15. SHADOWS — Barely there

| Use | Value |
|-----|-------|
| Outer container | `0 4px 24px rgba(0,0,0,0.06-0.10)` |
| Elevated cards | `0 2px 8px rgba(0,0,0,0.04-0.06)` |
| Dropdowns | `0 4px 16px rgba(0,0,0,0.10-0.14)` |
| Tooltips | `0 2px 12px rgba(0,0,0,0.12)` |
| Dark mode | Use `rgba(0,0,0,0.3-0.5)` — stronger to compensate |

**Rule:** If you can obviously see a shadow, it's too strong. Shadows should be felt, not seen.

---

## 16. MESSAGING / CHAT UI (if applicable)

- **Message bubble:** No bubble bg for sent/received in channel view. Avatar 36px left + name bold 13px + timestamp 11px muted right.
- **Message text:** Regular 14px, `line-height: 1.6`.
- **@mentions:** Brand color, semibold.
- **Reactions:** Pill with emoji + count, border `#E5E7EB`, radius 12px, 11px text.
- **File attachments:** Mini card with icon + filename + download arrow, 1px border, radius 8px.
- **Threaded replies:** Collapsed: avatar stack mini (20px) + "N more replies" muted. Expanded: indented thread.
- **Composer:** Bottom-pinned, 1px top border, text area + rich formatting toolbar (B, I, S, code, link, lists, emoji, attach).
- **"Quick Actions"** button with ⚡ icon left of toolbar.

---

## 17. FILTER / TOOLBAR PATTERNS

**Filter bar (above tables):**
```
[All Workspaces] [⊙ Priority] [↕ Sort] [▽ Filter]  ··· [⊞ ≡ ⊞]  [🔍 Search...]
```
- Outline pills: 1px border, 32px height, radius 8px, gap 8px.
- View toggle group: 3 icons touching, one active (tinted bg).
- Search: right-aligned, muted bg, 200px, keyboard shortcut badge.

**Category tabs (above card grids):**
```
[All Course] [Business] [UI Design] [Marketing] [Data] [Programming]
```
- Active tab: solid brand bg, white text, radius 20px.
- Inactive: no bg, dark text, hover = subtle bg.
- Height: 32-36px. Gap: 4-8px.

---

## 18. THE NON-NEGOTIABLE CHECKLIST

Before considering ANY screen done, verify:

- [ ] Canvas bg is tinted, not pure white or pure black
- [ ] ONE brand accent color dominates — others are semantic only
- [ ] No two adjacent text elements share the same size + weight
- [ ] Every section has a clear hierarchy: title → subtitle → content
- [ ] Tables have header styling distinct from data rows
- [ ] All interactive elements have visible hover states in design
- [ ] Sidebar active state uses brand color (tint bg + left bar)
- [ ] User profile is at the bottom of sidebar with avatar
- [ ] Spacing is from the 4/8px system — no arbitrary numbers
- [ ] Shadows are subtle — if you can see them clearly, reduce
- [ ] Icons are from ONE family, same stroke weight
- [ ] No orphaned text — every string feels purposeful
- [ ] Status/priority uses colored badges, not plain text
- [ ] Numbers/currency use tabular/monospace spacing
- [ ] Container radius decreases as elements get smaller (16 → 12 → 8 → 4)---