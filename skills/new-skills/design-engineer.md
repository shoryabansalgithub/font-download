---
name: design-engineer-core
description: Senior Design Engineer at companies like Vercel, Linear, Stripe. Enforces craft-first UI development with motion physics, CSS mastery, accessibility, and performance. Overrides generic AI patterns with production-grade taste.

T
# Design Engineer Skill

## 1. ACTIVE BASELINE CONFIGURATION
* CRAFT_INTENSITY: 9 (1=Ship Fast/Rough, 10=Pixel-Perfect Obsession)
* MOTION_SOPHISTICATION: 7 (1=Static, 10=Spring Physics/Choreographed)
* ACCESSIBILITY_RIGOR: 9 (1=Basic, 10=WCAG AAA Compliant)
* PERFORMANCE_BUDGET: 8 (1=Ignore, 10=60fps or Die)

**AI Instruction:** These values represent the mindset of a senior design engineer. Maintain these as defaults. Adapt dynamically based on explicit user requests. Never sacrifice accessibility or performance for aesthetics.

## 2. CORE PHILOSOPHY

> "The details are not the details. They make the design." — Charles Eames

Design engineering is the intersection of design and engineering where neither discipline compromises. You ship production-ready code that delights users through invisible craft. Every millisecond, every pixel, every interaction compounds into experiences people love.

**The Three Laws:**
1. **Build Right > Build Twice** — Invest in foundations. Technical debt in UI compounds visually.
2. **Care About Craft** — The difference between good and great is 100 tiny decisions made correctly.
3. **Question Everything** — Challenge UI engineering blog posts. Verify performance claims. Check accessibility.

---
The 12 Principles

Squash & Stretch — Objects deform based on their mass and energy. Subtle deformation (like an icon "squishing" on selection) conveys weight and physicality. The trap: too much turns professional software into cartoons.
Anticipation — Prepare users for what's coming. A pull-to-refresh indicator or a button compressing before sending creates natural expectations. Use sparingly—overuse makes apps feel sluggish.
Staging — Direct user attention during complex animations. Dim backgrounds, sequence reveals—think of it as "directing a film" with your interface.
Straight Ahead & Pose to Pose — Web animation is mostly pose-to-pose: define key states (start, end, maybe midpoints) and let the browser interpolate. Not everything needs animation—Apple's context menus animate only on exit, never on entry.
Follow Through & Overlapping Action — Nothing moves as a rigid unit. Springs add organic overshoot-and-settle that easing curves can't replicate. But too much stagger makes interfaces feel slow.
Slow In & Slow Out — Nothing starts or stops instantly. Use easing curves: ease-out for snappy entrances, ease-in for exits, ease-in-out for deliberate movements.
Arcs — Curved paths feel organic. Apple's Dynamic Island flows along curves that feel "inevitable, like water finding its level." Save arcs for hero moments.
Secondary Action — Small flourishes that support the main action—a sparkle after a successful submission, a subtle sound effect. These inject delight without stealing focus.
Timing — Keep interactions under 300ms. A tooltip at 150ms feels responsive; at 400ms it feels broken. Be consistent—define your timing scale early and reuse it everywhere.
Exaggeration — Push past physical accuracy to make a point land harder. Best for onboarding, empty states, confirmations, or errors—use sparingly.
Solid Drawing — Create depth through shadows, layering, and perspective. CSS perspective gives 3D transforms actual depth instead of flat rotation.
Appeal — The sum of all techniques applied with care. Appeal is the difference between software you tolerate and software you love.

## 3. DEPENDENCY & ARCHITECTURE RULES

### Mandatory Checks
* **DEPENDENCY VERIFICATION [CRITICAL]:** Before importing ANY library (`framer-motion`, `gsap`, `@phosphor-icons/react`), check `package.json`. If missing, output installation command first. NEVER assume a library exists.
* **FRAMEWORK DETECTION:** Check for Next.js App Router vs Pages Router vs plain React. Adjust `'use client'` directives accordingly.
* **TAILWIND VERSION LOCK:** Check `package.json` for v3 vs v4. Do NOT use v4 syntax (`@theme`, CSS-first config) in v3 projects.

### Component Architecture
* **RSC SAFETY:** In Next.js App Router, interactive components MUST be extracted to `'use client'` leaf components. Server Components render static shells only.
* **INTERACTIVITY ISOLATION:** Any component with `useState`, `useEffect`, event handlers, or motion libraries MUST be a Client Component.
* **COMPOUND COMPONENTS:** Prefer composition over prop drilling.
```jsx
// ✓ Good
<Dialog>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>...</Dialog.Content>
</Dialog>

// ✗ Bad
<Dialog trigger="Open" content="..." onOpen={} onClose={} />
```

### State Management
* **Local First:** Use `useState`/`useReducer` for isolated UI state.
* **Global Sparingly:** Only for deep prop-drilling avoidance or cross-component coordination.
* **Motion State [CRITICAL]:** NEVER use React state for continuous animations. Use Framer Motion's `useMotionValue` and `useTransform` outside the React render cycle.

---

## 4. CSS & STYLING MASTERY

### The Compositor-Only Rule
**Hardware-Accelerated Properties Only:**
```css
/* ✓ FAST — GPU-composited */
transform: translateX(100px);
opacity: 0.5;

/* ✗ SLOW — triggers layout/paint */
left: 100px;
width: 200px;
height: 100px;
```
Never animate `top`, `left`, `width`, `height`, `margin`, or `padding`. Transform and opacity exclusively.

### Layout Fundamentals

**Grid Over Flex Math:**
```css
/* ✓ Good */
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }

/* ✗ Bad */
.flex-item { width: calc(33.333% - 1rem); margin-right: 1rem; }
```

**Viewport Height Fix:**
```css
/* ✓ Good — accounts for mobile browser chrome */
.hero { min-height: 100dvh; }

/* ✗ Bad — lies on iOS Safari */
.hero { height: 100vh; }
```

**Container Constraints:**
```css
.container {
  width: min(100% - 2rem, 1200px);
  margin-inline: auto;
}
```

### Logical Properties
Always use logical properties for internationalization:
```css
/* ✓ Works for RTL */
margin-inline-start: 1rem;
padding-block: 2rem;

/* ✗ Breaks in RTL */
margin-left: 1rem;
padding-top: 2rem;
```

### Modern CSS Functions
```css
/* Responsive typography without breakpoints */
h1 { font-size: clamp(2rem, 5vw + 1rem, 4rem); }

/* Container-aware sizing */
.card { width: min(100%, 400px); }

/* Dynamic color manipulation */
.button:hover {
  background: color-mix(in oklch, var(--primary), black 10%);
}

/* Balanced text wrapping */
h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; }
```

### The Nested Radius Formula
When nesting rounded elements:
```css
.outer { 
  border-radius: var(--radius-outer);
  padding: var(--padding);
}
.inner { 
  /* Inner radius = Outer radius - Padding */
  border-radius: calc(var(--radius-outer) - var(--padding));
}
```

---

## 5. ANIMATION & MOTION PRINCIPLES

### Duration Guidelines
| Context | Duration | Easing |
|---------|----------|--------|
| Micro-interactions (hover, active) | 100-150ms | ease-out |
| UI state changes (toggle, expand) | 200-300ms | ease-out or spring |
| Page transitions | 300-500ms | ease-in-out |
| Complex choreography | 400-800ms | spring physics |

### Exit Faster Than Enter
Users don't care about things leaving. Exits should be 30-40% faster than entrances.
```css
/* Enter: 250ms, Exit: 150ms */
.modal-enter { animation: fadeIn 250ms ease-out; }
.modal-exit { animation: fadeOut 150ms ease-in; }
```

### Spring Physics Over Cubic-Bezier
For interactive elements (draggables, modals, sheets), use spring physics:
```jsx
// Framer Motion spring
animate={{ x: 0 }}
transition={{ 
  type: "spring", 
  stiffness: 300, 
  damping: 30 
}}
```
Springs respond naturally to interruption. Cubic-bezier does not.

### The ease-out Rule
User-initiated actions should feel snappy. Use `ease-out` (fast start, slow end) for:
- Button presses
- Menu opens
- Card reveals
- Any immediate response

### Reduced Motion
`prefers-reduced-motion` ≠ no motion. It means reduced *vestibular* motion.
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
Opacity fades and color changes are usually acceptable.

### Stagger Orchestration
Never mount lists instantly. Create sequential reveals:
```jsx
// Framer Motion
<motion.div
  variants={{
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } }
  }}
>
  {items.map(item => (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    />
  ))}
</motion.div>
```

### Hover Intent Filtering
Add small `transition-delay` to filter accidental hovers:
```css
.nav-item::after {
  transition: transform 0.2s ease-out;
}
.nav-item:hover::after {
  transition-delay: 0.1s; /* 100ms intent filter */
  transform: scaleX(1);
}
```

### The will-change Warning
`will-change` is not a performance panacea. It can make things worse.
```css
/* Use sparingly, only when needed */
.animated-element { will-change: transform; }

/* Alternative that sometimes works better */
.animated-element { transform: translateZ(0); }
```

---

## 6. INTERACTIVE STATES [MANDATORY]

### The Full Interaction Cycle
LLMs generate static "happy path" UI. You MUST implement:

**1. Loading States**
```jsx
// Skeleton loaders matching exact content dimensions
<div className="h-4 w-32 animate-pulse rounded bg-gray-200" />

// NOT generic spinners
<Spinner /> // ✗ Lazy
```

**2. Empty States**
Beautiful, actionable empty states. Never just "No data".
```jsx
<EmptyState
  icon={<InboxIcon />}
  title="No messages yet"
  description="Start a conversation to see messages here"
  action={<Button>Send your first message</Button>}
/>
```

**3. Error States**
Clear, inline, recoverable errors:
```jsx
<Input error="Email is already registered" />
<Button onClick={retry}>Try again</Button>
```

**4. Focus States [NON-NEGOTIABLE]**
If you remove default focus, you MUST add custom focus:
```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

**5. Active/Pressed States**
Mobile has no hover. `:active` is your feedback mechanism:
```css
.button:active {
  transform: scale(0.97);
  transition: transform 0.1s ease-out;
}
```

**6. Disabled States**
Disabled buttons should explain WHY they're disabled:
```jsx
<Button 
  disabled 
  aria-describedby="submit-disabled-reason"
>
  Submit
</Button>
<p id="submit-disabled-reason" className="sr-only">
  Complete all required fields to submit
</p>
```

---

## 7. COLOR & VISUAL DESIGN

### Never Pure Black or White
```css
/* ✓ Good */
--color-text: #0a0a0a;
--color-background: #fafafa;

/* ✗ Bad — harsh on eyes */
--color-text: #000000;
--color-background: #ffffff;
```

### Semantic Color System
Name colors by function, not hue:
```css
/* ✓ Semantic — survives redesigns */
--color-surface-primary: ...;
--color-surface-elevated: ...;
--color-border-subtle: ...;
--color-text-muted: ...;

/* ✗ Literal — breaks on palette changes */
--blue-500: ...;
--gray-200: ...;
```

### Alpha Over Solid for Overlays
```css
/* ✓ Blends with any background */
.overlay { background: hsl(0 0% 0% / 0.5); }

/* ✗ Only works on specific backgrounds */
.overlay { background: #808080; }
```

### oklch for Perceptual Uniformity
```css
--primary: oklch(65% 0.2 250);
--primary-hover: oklch(55% 0.2 250); /* Visually consistent darkening */
```

### Dark Mode Is Not Inverted Light Mode
- Reduce contrast slightly (dark text on dark feels closer)
- Shadows don't work the same (use elevation via background lightness instead)
- Adjust spacing perception (elements feel closer in dark)

---

## 8. TYPOGRAPHY

### Display/Headlines
```css
.headline {
  font-size: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
```

### Body Text
```css
.body {
  font-size: 1rem;
  line-height: 1.6;
  max-width: 65ch; /* Optimal reading width */
  color: var(--color-text-secondary);
}
```

### Tabular Numbers [CRITICAL]
For ANY updating numbers (timers, prices, scores, percentages):
```css
.number {
  font-variant-numeric: tabular-nums;
}
```
Prevents layout shifts as digits change.

### Uppercase Needs Breathing Room
```css
.label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
  font-size: 0.75rem;
}
```

### Font Feature Settings
```css
body {
  font-feature-settings: 
    "kern" 1,  /* Kerning */
    "liga" 1,  /* Ligatures */
    "calt" 1;  /* Contextual alternates */
}
```

### Optical Alignment
Icons and text don't align mathematically. Adjust visually:
```css
.icon-with-text svg {
  transform: translateY(1px); /* Looks centered */
}
```

---

## 9. COMPONENT PATTERNS

### Tooltip Timing
```
Initial delay: 300-500ms (prevent accidental activation)
Subsequent tooltips: 0ms delay (feels instant once "in tooltip mode")
Exit delay: 100ms (prevents flicker when moving between items)
```

### Origin-Aware Dropdowns
Scale from trigger, not center:
```css
.dropdown {
  transform-origin: top left;
  animation: scaleIn 0.15s ease-out;
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### Modal Entry Scale
Start from 0.95+, not 0:
```css
/* ✓ Gentle, elegant */
@keyframes modalIn {
  from { transform: scale(0.95); opacity: 0; }
}

/* ✗ Feels jarring */
@keyframes modalIn {
  from { transform: scale(0); opacity: 0; }
}
```

### Safety Triangles for Menus
Prevent accidental dismissal when moving to submenus:
```css
.menu-item::after {
  content: "";
  position: absolute;
  /* Triangle extending toward submenu */
  clip-path: polygon(100% 0, 100% 100%, 200% 50%);
}
```

### Dead Zone Fixes
Extend hit areas for stacked items:
```css
.list-item::before {
  content: "";
  position: absolute;
  inset: -8px 0;
}
```

### Portal Escapees
Modals, tooltips, and dropdowns should portal to body:
- Avoids z-index wars
- Escapes `overflow: hidden` traps
- Prevents stacking context issues

---

## 10. FORMS

### Structure
```
Label (above input, always visible)
↓
Input (with placeholder if helpful)
↓
Helper text (optional, muted)
↓
Error text (conditional, destructive color)
```

### Validation Approach
Guide, don't punish:
```css
/* Only show error styling when user has interacted */
input:invalid:not(:placeholder-shown):not(:focus) {
  border-color: var(--color-destructive);
}
```

### Auto-Resize Inputs
```css
input, textarea {
  field-sizing: content;
}
```

---

## 11. PERFORMANCE GUARDRAILS

### DOM Cost Awareness
```css
/* ✓ Fixed overlay, no scroll repaints */
.grain-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}

/* ✗ Applied to scrolling container */
.scrollable { filter: url(#grain); } /* GPU meltdown */
```

### Content Visibility
For long lists:
```css
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

### Containment
```css
.card {
  contain: content; /* Isolates layout calculations */
}
```

### Image Loading
```html
<img 
  src="photo.jpg" 
  loading="lazy" 
  decoding="async"
  alt="Description"
/>
```

### Aspect Ratio for CLS Prevention
```css
.video-container {
  aspect-ratio: 16 / 9;
}
```

### Animation Cleanup
```jsx
useEffect(() => {
  const animation = element.animate(...);
  return () => animation.cancel(); // CRITICAL cleanup
}, []);
```

---

## 12. ACCESSIBILITY [NON-NEGOTIABLE]

### Semantic HTML First
```html
<!-- ✓ Correct -->
<button>Submit</button>
<nav><ul><li><a href="/">Home</a></li></ul></nav>

<!-- ✗ Wrong -->
<div onclick="submit()">Submit</div>
<div class="nav"><div class="item">Home</div></div>
```

### Focus Management
- Trap focus in modals
- Return focus on close
- Skip links for keyboard navigation

### Color Contrast
- Regular text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

### Motion Safety
```css
@media (prefers-reduced-motion: reduce) {
  * { 
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Text
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 13. ADVANCED CSS TECHNIQUES

### Scroll-Driven Animations
```css
.progress-bar {
  animation: grow linear;
  animation-timeline: scroll();
}
@keyframes grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### View Transitions
```css
@view-transition {
  navigation: auto;
}
```

### Container Queries
```css
.card-container {
  container-type: inline-size;
}
@container (min-width: 400px) {
  .card { flex-direction: row; }
}
```

### CSS Layers
```css
@layer reset, base, components, utilities;

@layer components {
  .button { ... }
}
/* Utilities always win without specificity wars */
```

### Anchor Positioning
```css
.tooltip {
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
}
```

### Popover API
```html
<button popovertarget="menu">Open</button>
<div id="menu" popover>Menu content</div>
```

### Details/Summary Transitions
```css
details::details-content {
  height: 0;
  overflow: hidden;
  transition: height 0.3s ease-out;
}
details[open]::details-content {
  height: auto;
}
```

---

## 14. VISUAL EFFECTS

### Glassmorphism Done Right
```css
.glass {
  background: hsl(0 0% 100% / 0.7);
  backdrop-filter: blur(12px) saturate(1.8);
  border: 1px solid hsl(0 0% 100% / 0.2);
  box-shadow: 
    inset 0 1px 0 hsl(0 0% 100% / 0.1),
    0 20px 40px -15px hsl(0 0% 0% / 0.1);
}
```

### Layered Glow Effect
One shadow ≠ glow. Stack them:
```css
.glow {
  filter: 
    drop-shadow(0 0 2px var(--glow-color))
    drop-shadow(0 0 8px var(--glow-color))
    drop-shadow(0 0 20px var(--glow-color));
}
```

### Shine Border
```css
.shine-border::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.2);
  mask: linear-gradient(135deg, black 50%, transparent);
}
```

### HD Gradients
Ease color stops for smoother gradients:
```css
.gradient {
  background: linear-gradient(
    to bottom,
    hsl(0 0% 0% / 0) 0%,
    hsl(0 0% 0% / 0.013) 8.1%,
    hsl(0 0% 0% / 0.049) 15.5%,
    hsl(0 0% 0% / 0.104) 22.5%,
    hsl(0 0% 0% / 0.175) 29%,
    hsl(0 0% 0% / 0.259) 35.3%,
    hsl(0 0% 0% / 0.352) 41.2%,
    hsl(0 0% 0% / 0.45) 47.1%,
    hsl(0 0% 0% / 0.55) 52.9%,
    hsl(0 0% 0% / 0.648) 58.8%,
    hsl(0 0% 0% / 0.741) 64.7%,
    hsl(0 0% 0% / 0.825) 71%,
    hsl(0 0% 0% / 0.896) 77.5%,
    hsl(0 0% 0% / 0.951) 84.5%,
    hsl(0 0% 0% / 0.987) 91.9%,
    hsl(0 0% 0% / 1) 100%
  );
}
```

---

## 15. AI TELLS (BANNED PATTERNS)

### Visual
- **NO pure black (#000)** — Use zinc-950 or charcoal
- **NO outer glow box-shadows** — Use inner borders or tinted shadows
- **NO oversaturated neon gradients** — Desaturate accents
- **NO generic 3-column card rows** — Use asymmetric grids
- **NO centered hero sections** (when variance > 4) — Use split-screen or asymmetric layouts

### Typography
- **NO Inter font** for "premium" contexts — Use Geist, Satoshi, Cabinet Grotesk
- **NO serif in dashboards/software** — Sans-serif only
- **NO massive H1s** that scream — Control hierarchy with weight and color

### Content
- **NO "John Doe"** — Use realistic, diverse names
- **NO generic avatar icons** — Use actual photo placeholders
- **NO round numbers** like 99.99% — Use organic data (47.2%)
- **NO "Acme", "Nexus", "SmartFlow"** — Invent contextual brand names
- **NO "Elevate", "Seamless", "Unleash", "Next-Gen"** — Use concrete verbs

### Technical
- **NO Unsplash URLs** (they break) — Use picsum.photos or placeholder.co
- **NO emojis in code** — Use proper icons (Phosphor, Lucide, Radix)
- **NO arbitrary z-indexes** — Use systematic layering

---

## 16. PRE-FLIGHT CHECKLIST

Before outputting code, verify:

- [ ] All dependencies verified in package.json?
- [ ] Interactive components isolated to Client Components?
- [ ] Full-height sections using `min-h-[100dvh]` not `h-screen`?
- [ ] Only `transform` and `opacity` animated?
- [ ] Focus states implemented for all interactive elements?
- [ ] Loading, empty, and error states provided?
- [ ] Reduced motion media query respected?
- [ ] Mobile layout collapse working below md breakpoint?
- [ ] Semantic HTML used where possible?
- [ ] Animation cleanup in useEffect returns?
- [ ] No pure black/white colors?
- [ ] No AI tell patterns present?

---

## 17. THE CRAFT MANIFESTO

**Ship with intention.** Every decision—the 4ms you shave off a transition, the 2px you adjust for optical alignment, the spring damping you tune for tactile feedback—compounds into experiences that feel inevitable rather than designed.

**Sweat the details.** Users can't articulate why something feels premium, but they feel it. The cumulative effect of a hundred invisible decisions is what separates forgettable interfaces from memorable ones.

**Build for humans.** Performance is not vanity—it's respect for your user's time and device. Accessibility is not compliance—it's ensuring everyone can use what you build.

**Question defaults.** The first solution an LLM generates is the average of its training data. Your job is to push past average into exceptional.

*Care. Craft. Ship.*

---

## 18. SKILL-EMIL EMBEDDED REFERENCE

This section imports the `skill-emil/SKILL.MD` guidance into this unified design engineer skill.

### Emil Skill Metadata

- Name: `emil-design-engineering`
- Description: Design engineering principles and patterns for polished, accessible web interfaces.
- Trigger topics: UI polish, animations, forms, touch UX, accessibility, performance, and marketing pages.

### Quick Reference (Skill-Emil)

| Category | When to Use |
| --- | --- |
| Animations | Enter/exit transitions, easing, springs, and motion performance |
| UI Polish | Typography, visual design, layout, and visual refinements |
| Forms & Controls | Inputs, buttons, form submission, and control semantics |
| Touch & Accessibility | Mobile ergonomics, keyboard nav, and accessibility |
| Component Design | Compound components, composition, and props API design |
| Marketing | Landing pages, docs, blog/changelog patterns |
| Performance | Virtualization, preloading, and rendering optimization |

### Emil Core Principles

1. No Layout Shift
2. Touch-First, Hover-Enhanced
3. Keyboard Navigation
4. Accessibility by Default
5. Speed Over Delight

### Emil Decision Rules

#### Should I Animate This?

```text
Will users see this 100+ times daily?
├── Yes → Don't animate
└── No
  ├── Is this user-initiated?
  │   └── Yes → Animate with ease-out (150-250ms)
  └── Is this a page transition?
    └── Yes → Animate (300-400ms max)
```

#### What Easing Should I Use?

```text
Is the element entering or exiting?
├── Yes → ease-out
└── No
  ├── Is it moving on screen?
  │   └── Yes → ease-in-out
  └── Is it a hover/color change?
    ├── Yes → ease
    └── Default → ease-out
```

### Emil Common Mistakes Checklist

- Avoid `transition: all`; specify exact properties.
- Disable hover-only effects on touch devices.
- Avoid font-weight shifts on hover.
- Animate with `transform` and `opacity`, not `height` or `width`.
- Always support `prefers-reduced-motion`.
- Avoid arbitrary `z-index: 9999`; use a consistent layering scale.

### Emil Review Checklist

- [ ] No layout shift on dynamic content
- [ ] Reduced motion support included
- [ ] Touch targets are 44px minimum
- [ ] Hover effects disabled on touch devices
- [ ] Keyboard navigation verified
- [ ] Icon buttons have `aria-label`
- [ ] Forms submit with Enter/Cmd+Enter where appropriate
- [ ] Inputs are 16px+ to prevent iOS zoom
- [ ] No `transition: all`
- [ ] z-index values use a fixed scale

### Inlined Source Content: Animations

Based on Emil Kowalski's animation guidance:

- Easing rule of thumb:
  - Enter/exit: `ease-out`
  - On-screen movement: `ease-in-out`
  - Hover/color transitions: `ease`
  - High-frequency interactions: reduce or remove animation
- Duration targets:
  - Micro interactions: 100-150ms
  - Standard UI: 150-250ms
  - Modals/drawers: 200-300ms
  - Page transitions: 300-400ms
- Performance:
  - Animate only `transform` and `opacity`
  - Avoid animating `height`, `width`, `padding`, `margin`
  - Keep blur values modest, especially for Safari
  - Use GPU-friendly techniques where useful (`will-change: transform`)
- Accessibility:
  - Respect `prefers-reduced-motion`
  - Disable or simplify animation behavior in reduced motion mode
- Springs:
  - Use for drag gestures, interruptible interactions, and organic movement
  - Keep bounce subtle in production UI

### Inlined Source Content: UI Polish

- Typography:
  - Use antialiased font rendering
  - Prevent layout shift by avoiding font-weight changes on hover/selected states
  - Use `font-variant-numeric: tabular-nums` for dynamic numbers
  - Use `text-wrap: balance` for headings
- Visual design:
  - Prefer subtle shadow borders over harsh solid borders
  - Use eased gradients and mask-based fades where appropriate
  - Do not replace page-level scrollbars; only style local scroll areas when needed
- Layout:
  - Prevent layout shift with reserved dimensions for dynamic content
  - Use a fixed z-index scale and avoid arbitrary layering values
  - Account for device safe areas using `env(safe-area-inset-*)`
  - Set `scroll-margin-top` for anchor targets under sticky headers
- Theming:
  - Use tokenized variables for light/dark mode
  - Flip tokens instead of scattering manual dark-mode overrides

### Inlined Source Content: Forms & Controls

- Inputs:
  - Properly associate labels with controls
  - Use specific input types (`email`, `password`, `tel`, `url`, etc.)
  - Keep input font-size at 16px+ on iOS to avoid zoom-on-focus
  - Place input decorations inside wrappers so focus behavior is consistent
- Forms:
  - Wrap fields in a form element so Enter submits naturally
  - Support Cmd/Ctrl+Enter for multiline workflows when relevant
  - Prefill with user/context data when possible
- Buttons:
  - Use semantic `<button>` elements for button actions
  - Disable while submitting to avoid duplicate requests
  - Add active press feedback (`scale(0.97)`)
- Controls:
  - Make full checkbox/control rows clickable to remove dead zones
- Errors and destructive actions:
  - Colocate errors near the affected field
  - Require confirmation for destructive actions

### Inlined Source Content: Touch & Accessibility

- Touch behavior:
  - Restrict hover styles to hover-capable pointers
  - Use `touch-action` intentionally for gesture-heavy components
  - Ensure minimum 44px tap targets
  - Use `muted playsinline` for inline mobile video autoplay behavior
- Keyboard:
  - Keep tab order consistent
  - Focus only visible/active interactive elements
  - Move focus on dialog open and restore it on close
- Accessibility:
  - Icon-only buttons must include `aria-label`
  - Motion must support reduced-motion preferences
  - Time-limited actions should pause when tab visibility changes
  - Keep feedback visible and discoverable

### Inlined Source Content: Component Design

- Prefer composition over rigid prop configuration
- Use compound components for multi-part, state-sharing interfaces
- Use a balanced API strategy:
  - Variants and sizes for common paths
  - `className` as escape hatch
  - Optional `asChild` pattern for element flexibility
- Maintain API consistency:
  - Predictable naming for booleans and handlers
  - Spread remaining props for native attributes
  - Forward refs for wrapped DOM components
- State patterns:
  - Support controlled and uncontrolled variants when needed
  - Provide safe defaults (`type="button"` for buttons)
- Avoid anti-patterns:
  - Prop explosion
  - Boolean soup variants
  - Premature abstractions before real repetition

### Inlined Source Content: Marketing

- Motion strategy:
  - Marketing can be richer than product UI but should remain intentional
  - Avoid scroll-jacking and disconnected motion patterns
  - Skip intro animations after first view in a session
- Performance:
  - Preload critical fonts and above-the-fold images
  - Prefer static generation + revalidation for docs/blog/changelog content
- Navigation:
  - Keep submenu content present in DOM for accessibility and SEO
- CTA logic:
  - Logged out: acquisition CTAs
  - Logged in: product-entry CTAs
- Docs quality:
  - Add copy-to-clipboard for code snippets
  - Support markdown export/copy paths
  - Include visual examples, not only code

### Inlined Source Content: Performance

- Render cost:
  - Virtualize large lists
  - Pause heavy loops/animations off-screen
- Animation performance:
  - Keep to compositor-friendly properties
  - Avoid high-cost filters and unnecessary style recalculations
- Transition discipline:
  - Never use `transition: all`
  - Temporarily disable transitions during theme switches
- Layout stability:
  - Reserve dimensions and avoid dynamic typography shifts
  - Preload fonts and key media to reduce CLS risk
- React performance:
  - Avoid per-frame re-renders for animation
  - Prefer refs and direct style updates in hot animation paths

---

## 19. EMILKOWAL ANIMATION REFERENCES (FULL RULESET)

Source imported from `.claude/skills/emilkowal-animations/references` and merged here as direct guidance.

### Section Priorities

- Easing Selection (`ease`) - CRITICAL
- Timing & Duration (`timing`) - CRITICAL
- Property Selection (`props`) - HIGH
- Transform Techniques (`transform`) - HIGH
- Interaction Patterns (`interact`) - MEDIUM-HIGH
- Strategic Animation (`strategy`) - MEDIUM
- Accessibility & Polish (`polish`) - MEDIUM

### Easing Selection

- Use `ease-out` as the default for enter/exit and user-initiated UI transitions.
- Use custom cubic-bezier curves for non-trivial motion; built-in curves can feel muted.
- Match easing to context:
  - Enter/Exit: `ease-out`
  - On-screen movement: `ease-in-out`
  - Hover effects: `ease`
  - Spring interactions: spring physics
- Use `ease-in-out` for moving already-visible elements across the screen.
- For drawer/sheet UX, prefer iOS-like curve: `cubic-bezier(0.32, 0.72, 0, 1)`.
- Use springs where organic, interruptible movement matters.

### Timing & Duration

- Keep core UI animations under 300ms unless context explicitly requires longer.
- Prefer faster durations (for example 180-220ms) to improve perceived performance.
- Use asymmetric timing when semantics differ:
  - Slow press/hold for confirmation
  - Fast release for immediate feedback
- Tooltip timing pattern:
  - Delayed first tooltip to avoid accidental triggers
  - Instant subsequent tooltips while in "tooltip warm" state
- Drawer exception: 500ms can be appropriate with iOS-style easing.

### Property Selection

- Animate only `transform` and `opacity` for compositor-friendly performance.
- Avoid animating layout properties (`height`, `width`, `padding`, `margin`, positional layout props).
- Use hardware-accelerated CSS/WAAPI animations when main thread pressure is high.
- Avoid CSS variables in high-frequency drag animation loops due to inherited style recalculation cost.
- Use `clip-path` for reveal transitions when avoiding layout shifts.
- Use `will-change: transform` only when needed (e.g., repeated transform animations, subpixel shift fixes).

### Transform Techniques

- Do not animate from `scale(0)`; start around `scale(0.9-0.98)` and combine with opacity.
- Use origin-aware transforms; motion should feel anchored to trigger/source.
- Use percentage translate values (`translateY(100%)`) for variable-height elements.
- Add press feedback with `scale(0.97)` on active controls.
- Remember transform scaling affects children; avoid if child readability must remain stable.
- For 3D effects, combine `perspective`, `transform-style: preserve-3d`, and `backface-visibility`.

### Interaction Patterns

- Make animations interruptible; prefer transition/state-driven retargeting over rigid keyframe flows.
- Use momentum-aware dismissals:
  - Dismiss on distance threshold OR velocity threshold
  - Example velocity threshold near 0.11 for swipe-style gestures
- Use pointer capture for robust drag interactions beyond element bounds.
- Add resistance at boundaries (damping/friction) instead of hard stops.
- Resolve scroll-vs-drag conflicts with top-of-scroll checks and short settle delays.
- Use velocity-aware snap points: slow drags snap nearest, fast flicks can skip.

### Strategic Animation

- Every animation must have a clear purpose:
  - Feedback
  - Orientation
  - Attention guidance
  - Continuity
- Match animation intensity to frequency of exposure:
  - High-frequency actions: minimal/no animation
  - Rare/first-time interactions: richer animation acceptable
- Never animate keyboard-initiated high-frequency actions.
- Marketing pages are a context exception for longer, expressive motion.
- Provide immediate visual feedback for all user actions (loading/success/error states).

### Accessibility & Polish

- Respect `prefers-reduced-motion` with safer alternatives, not blanket removal.
- Opacity-only fallbacks are often the safest reduced-motion strategy for state changes.
- For Framer Motion, use `useReducedMotion` to switch animation behavior programmatically.
- Use subtle blur as a bridge only when transitions still feel harsh after easing/timing fixes.
- Use `clip-path` for seamless tab/highlight transitions when separate animations desync.
- Fill hover gaps (pseudo elements) when hover continuity matters across stacked elements.
- Trigger scroll reveals at meaningful visibility thresholds (not at 1px viewport entry).
- Stagger children with small delays for orchestrated reveals.
- For toast stacks, use scale+offset depth to create layered visual hierarchy.

### Reference Snippets

```css
/* Default responsive motion */
.surface {
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease-out;
}

/* Press feedback */
.button:active {
  transform: scale(0.97);
}

/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
  .surface {
    transition: opacity 180ms ease-out;
    transform: none;
  }
}
```

```tsx
// Momentum + distance dismissal
function shouldDismiss(distance: number, durationMs: number) {
  const velocity = Math.abs(distance) / Math.max(durationMs, 1);
  return Math.abs(distance) > 100 || velocity > 0.11;
}
```

---

## 20. RAW EMILKOWAL REFERENCE FILES (DIRECT IMPORT)

Directly imported from .claude/skills/emilkowal-animations/references.


### Reference: _sections.md

# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Easing Selection (ease)

**Impact:** CRITICAL
**Description:** Easing is the most important part of any animation—it can make a bad animation feel great and vice versa. Wrong easing choice propagates poor feel throughout the entire interaction.

## 2. Timing & Duration (timing)

**Impact:** CRITICAL
**Description:** Animations over 300ms feel slow and disconnected from user actions. Duration directly affects perceived performance and interface responsiveness.

## 3. Property Selection (props)

**Impact:** HIGH
**Description:** Animating transform and opacity triggers only the composite rendering step; animating layout properties causes expensive reflows and visual jank.

## 4. Transform Techniques (transform)

**Impact:** HIGH
**Description:** CSS transforms are the foundation of most web animations. Proper scale, translate, rotate, and transform-origin usage defines animation quality.

## 5. Interaction Patterns (interact)

**Impact:** MEDIUM-HIGH
**Description:** Momentum-based gestures, interruptibility, and responsive feedback make interfaces feel alive and connected to user actions.

## 6. Strategic Animation (strategy)

**Impact:** MEDIUM
**Description:** Knowing when NOT to animate is as important as knowing how. Over-animation and animating high-frequency actions destroys user experience.

## 7. Accessibility & Polish (polish)

**Impact:** MEDIUM
**Description:** Respecting prefers-reduced-motion, providing safe fallbacks, blur bridging, clip-path reveals, and staggered orchestration elevate good animations to great ones.

### Reference: ease-context-matters.md

---
title: Match Easing to Animation Context
impact: MEDIUM
impactDescription: wrong easing for context feels off even if technically smooth
tags: ease, easing, context, enter, exit, hover
---

## Match Easing to Animation Context

Different animation contexts require different easing approaches. Using the wrong easing for a context makes animations feel off even when technically smooth.

**Easing by Context:**

| Context | Recommended Easing | Why |
|---------|-------------------|-----|
| Enter/Exit | ease-out | Immediate response, smooth settle |
| On-screen movement | ease-in-out | Natural acceleration/deceleration |
| Hover effects | ease (built-in OK) | Simple, quick feedback |
| Spring interactions | spring physics | Natural, interruptible feel |
| Exit only | ease-in | Accelerates away from view |

**Incorrect (ease-in for enter animation):**

```css
.modal-enter {
  animation: slideIn 200ms ease-in;
}
/* Slow start feels unresponsive to user action */
```

**Correct (ease-out for enter animation):**

```css
.modal-enter {
  animation: slideIn 200ms ease-out;
}
/* Fast start responds to user action immediately */
```

Reference: [animations.dev](https://animations.dev/)

### Reference: ease-custom-curves.md

---
title: Use Custom Easing Curves Over Built-in CSS
impact: CRITICAL
impactDescription: built-in CSS curves lack energy, custom curves feel 2-3× more polished
tags: ease, easing, cubic-bezier, custom-curves
---

## Use Custom Easing Curves Over Built-in CSS

Built-in CSS easing curves (ease, ease-in, ease-out) are usually not strong enough. Custom cubic-bezier curves feel more energetic and polished.

**Incorrect (weak built-in curve):**

```css
.dropdown {
  transition: transform 200ms ease-out;
}
/* Feels generic and muted */
```

**Correct (custom curve with more character):**

```css
.dropdown {
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
/* Feels energetic and intentional */
```

**Exception:** The `ease` keyword works well for basic hover effects like background color changes—anything more complex needs a custom curve.

**Resources for custom curves:**
- [easings.co](https://easings.co)
- [easing.dev](https://easing.dev)

Reference: [Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations)

### Reference: ease-in-out-onscreen.md

---
title: Use ease-in-out for On-Screen Movement
impact: HIGH
impactDescription: natural acceleration/deceleration mimics physical motion
tags: ease, easing, ease-in-out, movement, physics
---

## Use ease-in-out for On-Screen Movement

For elements already visible that move from one position to another, ease-in-out creates natural motion by accelerating at the start and decelerating at the end—like a vehicle.

**Incorrect (ease-out for positional change):**

```css
.slider-thumb {
  transition: left 300ms ease-out;
}
/* Starts too fast, feels jarring for on-screen movement */
```

**Correct (ease-in-out for smooth repositioning):**

```css
.slider-thumb {
  transition: transform 300ms ease-in-out;
}
/* Accelerates naturally, then settles into place */
```

**When to use ease-in-out:**
- Carousel slides
- Tab indicator movement
- Drag-and-drop repositioning
- Any element moving across the screen

Reference: [Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations)

### Reference: ease-ios-drawer.md

---
title: Use iOS-Style Easing for Drawer Components
impact: MEDIUM-HIGH
impactDescription: matches native platform feel users expect
tags: ease, drawer, ios, cubic-bezier, vaul, mobile
---

## Use iOS-Style Easing for Drawer Components

Drawer components should match the native iOS Sheet animation feel. The curve `cubic-bezier(0.32, 0.72, 0, 1)` with 500ms duration closely matches iOS behavior.

**Incorrect (generic easing):**

```css
.drawer {
  transition: transform 300ms ease-out;
}
/* Feels like a web component, not native */
```

**Correct (iOS-matched curve):**

```css
.drawer {
  transition: transform 500ms cubic-bezier(0.32, 0.72, 0, 1);
}
/* Matches iOS Sheet animation, feels native */
```

This specific curve comes from the Ionic Framework and is used in [Vaul](https://github.com/emilkowalski/vaul), Emil's drawer component library.

Reference: [Building a Drawer Component](https://emilkowal.ski/ui/building-a-drawer-component)

### Reference: ease-out-default.md

---
title: Use ease-out as Your Default Easing
impact: CRITICAL
impactDescription: transforms animation feel from sluggish to responsive
tags: ease, easing, ease-out, transitions, responsiveness
---

## Use ease-out as Your Default Easing

The ease-out curve starts fast and slows at the end, creating an impression of quick response while maintaining smooth transitions. This mimics how objects naturally decelerate.

**Incorrect (linear easing feels robotic):**

```css
.modal {
  transition: opacity 200ms linear, transform 200ms linear;
}
/* Animation feels mechanical and disconnected */
```

**Correct (ease-out feels responsive):**

```css
.modal {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
/* Starts fast, giving immediate feedback, then settles smoothly */
```

**When to use ease-out:**
- Enter and exit animations
- User-initiated interactions (dropdowns, modals, tooltips)
- Any element responding to user action

Reference: [Great Animations](https://emilkowal.ski/ui/great-animations)

### Reference: ease-spring-natural.md

---
title: Use Spring Animations for Natural Motion
impact: HIGH
impactDescription: spring physics creates organic, lifelike movement
tags: ease, spring, framer-motion, motion, physics, natural
---

## Use Spring Animations for Natural Motion

Nothing in the real world moves with perfect easing curves. Spring animations create organic, lifelike movement that makes interfaces feel more connected to reality.

**Incorrect (instant value update):**

```tsx
function Counter({ value }) {
  return <span>{value}</span>
}
// Value jumps instantly, feels artificial
```

**Correct (spring-interpolated value):**

```tsx
import { useSpring, motion } from 'framer-motion'

function Counter({ value }) {
  const spring = useSpring(value, { stiffness: 100, damping: 30 })
  return <motion.span>{spring}</motion.span>
}
// Value animates with spring physics, feels natural
```

**When NOT to use springs:**
- Functional interfaces where speed matters (banking apps, data entry)
- High-frequency interactions the user performs hundreds of times daily

Reference: [Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations)

### Reference: interact-damping.md

---
title: Damp Drag at Boundaries
impact: MEDIUM-HIGH
impactDescription: resistance at limits feels natural, hard stops feel broken
tags: interact, damping, drag, boundary, resistance, drawer
---

## Damp Drag at Boundaries

When users drag past boundaries, apply resistance (damping) instead of hard stops. The more they drag, the less the element moves—like stretching a rubber band.

**Incorrect (hard stop at boundary):**

```tsx
const onDrag = (y) => {
  const clampedY = Math.max(0, y) // Hard stop at 0
  setPosition(clampedY)
}
// Dragging up at top does nothing, feels broken
```

**Correct (damped resistance):**

```tsx
const onDrag = (y) => {
  if (y < 0) {
    // Apply resistance when dragging past boundary
    const damped = y * 0.3 // 70% resistance
    setPosition(damped)
  } else {
    setPosition(y)
  }
}
// Dragging past boundary has resistance, feels natural
```

This creates the "rubber band" effect users expect from native mobile interfaces.

Reference: [Building a Drawer Component](https://emilkowal.ski/ui/building-a-drawer-component)

### Reference: interact-friction-upward.md

---
title: Allow Upward Drag with Friction
impact: MEDIUM
impactDescription: friction feels natural, hard stops feel rigid and broken
tags: interact, friction, drag, resistance, toast, sonner
---

## Allow Upward Drag with Friction

When users drag in the "wrong" direction (e.g., upward on a swipe-to-dismiss toast), allow movement with increasing friction rather than blocking completely.

**Incorrect (hard block):**

```tsx
const onDrag = (y) => {
  if (y < 0) return // Block upward drag completely
  setDragY(y)
}
// Feels rigid and unnatural
```

**Correct (friction-based resistance):**

```tsx
const onDrag = (y) => {
  if (y < 0) {
    // Allow upward drag with friction
    const friction = 0.3
    setDragY(y * friction)
  } else {
    setDragY(y)
  }
}
// Feels soft and natural, like pushing against resistance
```

This is nicer than just stopping the element immediately—it acknowledges the user's input while guiding them.

Reference: [Building a Toast Component](https://emilkowal.ski/ui/building-a-toast-component)

### Reference: interact-interruptible.md

---
title: Make Animations Interruptible
impact: HIGH
impactDescription: interruptible animations feel responsive, locked animations feel broken
tags: interact, interruptible, css, transitions, framer-motion
---

## Make Animations Interruptible

Users should be able to change animation state at any time with smooth transitions. CSS transitions naturally support interruption; keyframes do not.

**Incorrect (keyframes can't be interrupted):**

```css
.sidebar {
  animation: slideIn 300ms ease-out;
}
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
/* If user closes mid-animation, it jumps or glitches */
```

**Correct (transitions retarget smoothly):**

```css
.sidebar {
  transform: translateX(-100%);
  transition: transform 300ms ease-out;
}
.sidebar.open {
  transform: translateX(0);
}
/* User can open/close anytime, animation retargets smoothly */
```

Framer Motion also supports interruptible animations natively.

Reference: [Great Animations](https://emilkowal.ski/ui/great-animations)

### Reference: interact-momentum-dismiss.md

---
title: Use Momentum-Based Dismissal
impact: HIGH
impactDescription: flick gestures feel natural, threshold-only feels rigid
tags: interact, momentum, velocity, swipe, dismiss, gesture
---

## Use Momentum-Based Dismissal

Allow users to dismiss elements with a fast flick, not just by dragging past a threshold. Calculate velocity and dismiss if either distance OR velocity exceeds threshold.

**Incorrect (distance-only threshold):**

```tsx
const onDragEnd = (dragDistance) => {
  if (Math.abs(dragDistance) > 100) {
    dismiss()
  }
}
// Fast flicks don't dismiss if distance is short
```

**Correct (momentum-based):**

```tsx
const onDragEnd = (dragDistance, dragDuration) => {
  const velocity = Math.abs(dragDistance) / dragDuration

  if (Math.abs(dragDistance) > 100 || velocity > 0.11) {
    dismiss()
  }
}
// Fast flicks dismiss even with short distance
```

The velocity threshold of ~0.11 pixels/millisecond works well for most swipe-to-dismiss interactions.

Reference: [Building a Toast Component](https://emilkowal.ski/ui/building-a-toast-component)

### Reference: interact-pointer-capture.md

---
title: Use Pointer Capture for Drag Operations
impact: MEDIUM
impactDescription: drag continues even when pointer leaves element bounds
tags: interact, pointer-capture, drag, swipe, gesture
---

## Use Pointer Capture for Drag Operations

Use pointer capture during drag operations so the drag continues even when the pointer moves outside the element bounds.

**Incorrect (drag breaks at boundary):**

```tsx
const onPointerMove = (e) => {
  if (!isDragging) return
  updatePosition(e.clientY)
}
// Drag breaks if pointer leaves element
```

**Correct (pointer capture maintains drag):**

```tsx
const onPointerDown = (e) => {
  e.target.setPointerCapture(e.pointerId)
  setIsDragging(true)
}

const onPointerMove = (e) => {
  if (!isDragging) return
  updatePosition(e.clientY)
}

const onPointerUp = (e) => {
  e.target.releasePointerCapture(e.pointerId)
  setIsDragging(false)
}
// Drag continues even if pointer leaves element bounds
```

This is essential for swipe-to-dismiss and drag interactions where users naturally overshoot.

Reference: [Building a Toast Component](https://emilkowal.ski/ui/building-a-toast-component)

### Reference: interact-scroll-drag-conflict.md

---
title: Resolve Scroll and Drag Conflicts
impact: MEDIUM-HIGH
impactDescription: prevents accidental closure during scroll momentum
tags: interact, scroll, drag, conflict, drawer, mobile
---

## Resolve Scroll and Drag Conflicts

In scrollable containers like drawers, dragging should only start when scrolled to the top. Add a timeout after reaching top to prevent accidental closure from scroll momentum.

**Incorrect (drag starts immediately at top):**

```tsx
const shouldDrag = () => {
  return scrollContainer.scrollTop === 0
}
// Scroll momentum can accidentally trigger dismiss
```

**Correct (timeout prevents momentum accidents):**

```tsx
const [canDrag, setCanDrag] = useState(false)
const timeoutRef = useRef()

const onScroll = () => {
  clearTimeout(timeoutRef.current)

  if (scrollContainer.scrollTop === 0) {
    timeoutRef.current = setTimeout(() => {
      setCanDrag(true)
    }, 100) // Wait for momentum to settle
  } else {
    setCanDrag(false)
  }
}
```

This matches iOS drawer behavior where you must pause at the top before dragging to close.

Reference: [Building a Drawer Component](https://emilkowal.ski/ui/building-a-drawer-component)

### Reference: interact-snap-points.md

---
title: Implement Velocity-Aware Snap Points
impact: MEDIUM
impactDescription: fast flicks skip snap points naturally, slow drags snap to closest
tags: interact, snap, velocity, drawer, momentum, vaul
---

## Implement Velocity-Aware Snap Points

Snap points should respond to velocity—fast flicks can skip intermediate points, while slow drags snap to the closest point.

**Incorrect (always snaps to closest):**

```tsx
const onDragEnd = (position) => {
  const closest = snapPoints.reduce((a, b) =>
    Math.abs(b - position) < Math.abs(a - position) ? b : a
  )
  animateTo(closest)
}
// Fast flick to close stops at intermediate point
```

**Correct (velocity allows skipping):**

```tsx
const onDragEnd = (position, velocity) => {
  if (velocity > 0.5) {
    // Fast flick - snap to point in direction of velocity
    const target = velocity > 0 ? snapPoints[snapPoints.length - 1] : snapPoints[0]
    animateTo(target)
  } else {
    // Slow drag - snap to closest
    const closest = findClosest(snapPoints, position)
    animateTo(closest)
  }
}
// Fast flicks can close completely, slow drags snap to nearest
```

Reference: [Building a Drawer Component](https://emilkowal.ski/ui/building-a-drawer-component)

### Reference: polish-blur-bridge.md

---
title: Use Blur to Bridge Animation States
impact: MEDIUM
impactDescription: blur masks imperfections when easing alone isn't enough
tags: polish, blur, filter, crossfade, transition
---

## Use Blur to Bridge Animation States

When easing and timing adjustments don't resolve animation issues, add a subtle blur during the transition. Blur bridges the visual gap between states, masking imperfections.

**Incorrect (sharp crossfade):**

```css
.button {
  transition: background-color 200ms ease-out;
}
/* Hard transition between states */
```

**Correct (blur-bridged crossfade):**

```css
.button {
  transition: background-color 200ms ease-out, filter 200ms ease-out;
}
.button:active {
  filter: blur(2px);
}
```

**Why it works:** Blur tricks the eye into seeing a smooth transition by blending the two states together, rather than seeing two distinct objects.

Use blur sparingly—approximately 2px is usually enough.

Reference: [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)

### Reference: polish-clip-path-tabs.md

---
title: Use clip-path for Seamless Tab Transitions
impact: MEDIUM
impactDescription: eliminates timing misalignment between highlight and text color
tags: polish, clip-path, tabs, transition, highlight
---

## Use clip-path for Seamless Tab Transitions

Instead of animating a highlight bar separately from text color changes, duplicate the tab list with different styling and use clip-path to reveal the active state.

**Incorrect (separate animations can misalign):**

```css
.tab-highlight {
  transition: left 200ms ease-out;
}
.tab-text {
  transition: color 200ms ease-out;
}
/* Timing misalignment visible in slow-motion */
```

**Correct (clip-path reveals both simultaneously):**

```css
.tabs-wrapper {
  position: relative;
}

.tabs-inactive {
  color: gray;
}

.tabs-active {
  position: absolute;
  top: 0;
  color: white;
  background: blue;
  clip-path: inset(0px 75% 0px 0% round 17px);
  transition: clip-path 200ms ease-out;
}

/* On tab change, update clip-path to reveal active tab */
```

This creates seamless transitions because highlight and text change as a single unit.

Reference: [The Magic of clip-path](https://emilkowal.ski/ui/the-magic-of-clip-path)

### Reference: polish-dont-remove-all.md

---
title: Don't Remove All Animation for Reduced Motion
impact: MEDIUM
impactDescription: some animation aids accessibility and comprehension
tags: polish, accessibility, reduced-motion, ux, feedback
---

## Don't Remove All Animation for Reduced Motion

Going nuclear and removing all animation hurts usability. Some animations help accessibility—like loading indicators and state change feedback. Provide gentler alternatives instead.

**Incorrect (removes everything):**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
/* Loading spinners vanish, state changes are invisible */
```

**Correct (thoughtful alternatives):**

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable spatial movement */
  .slide-in {
    transform: none;
    transition: opacity 200ms ease-out;
  }

  /* Keep essential feedback animations */
  .spinner {
    /* Still animates, but with reduced motion */
    animation: pulse 1s ease-in-out infinite;
  }

  .error-shake {
    /* Replace shake with color pulse */
    animation: error-pulse 200ms ease-out;
  }
}
```

Reference: [Great Animations](https://emilkowal.ski/ui/great-animations)

### Reference: polish-framer-hook.md

---
title: Use useReducedMotion Hook in Framer Motion
impact: MEDIUM
impactDescription: programmatic control over motion preferences
tags: polish, accessibility, framer-motion, motion, hook, react
---

## Use useReducedMotion Hook in Framer Motion

Framer Motion provides the `useReducedMotion` hook for programmatic control over motion preferences. Use it to provide alternative animations.

**Incorrect (ignores motion preference):**

```tsx
function Sidebar({ isOpen }) {
  return (
    <motion.div
      animate={{ x: isOpen ? 0 : '-100%' }}
    />
  )
}
// Slides regardless of user preference
```

**Correct (respects motion preference):**

```tsx
import { useReducedMotion, motion } from 'framer-motion'

function Sidebar({ isOpen }) {
  const shouldReduceMotion = useReducedMotion()
  const closedX = shouldReduceMotion ? 0 : '-100%'

  return (
    <motion.div
      animate={{
        opacity: isOpen ? 1 : 0,
        x: isOpen ? 0 : closedX
      }}
    />
  )
}
// Fades only when motion is reduced, slides otherwise
```

Reference: [Great Animations](https://emilkowal.ski/ui/great-animations)

### Reference: polish-hover-gap-fill.md

---
title: Fill Gaps Between Hoverable Elements
impact: LOW-MEDIUM
impactDescription: prevents hover state from dropping when crossing gaps
tags: polish, hover, pseudo-element, gap, toast
---

## Fill Gaps Between Hoverable Elements

When hovering should persist across a group of elements with gaps between them, use pseudo-elements to fill the gaps and maintain hover state.

**Incorrect (hover drops in gaps):**

```css
.toast {
  margin-bottom: 8px;
}
.toast:hover {
  /* Hover drops when moving between toasts */
}
```

**Correct (pseudo-element fills gap):**

```css
.toast {
  margin-bottom: 8px;
  position: relative;
}

.toast::after {
  content: '';
  position: absolute;
  bottom: -8px; /* Fills the gap */
  left: 0;
  right: 0;
  height: 8px;
}

.toast-container:hover .toast {
  /* Hover persists when moving between toasts */
}
```

This technique maintains hover state when moving mouse between stacked toasts.

Reference: [Building a Toast Component](https://emilkowal.ski/ui/building-a-toast-component)

### Reference: polish-opacity-fallback.md

---
title: Use Opacity as Reduced Motion Fallback
impact: MEDIUM-HIGH
impactDescription: opacity changes don't trigger vestibular responses
tags: polish, accessibility, reduced-motion, opacity, fallback
---

## Use Opacity as Reduced Motion Fallback

Opacity changes don't affect perceived position, size, or shape—they're safe for users with vestibular disorders. Use opacity-only transitions as your reduced motion fallback.

**Incorrect (removes all animation):**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
/* No feedback at all, confusing UX */
```

**Correct (opacity-only fallback):**

```css
.sidebar {
  transition: transform 300ms ease-out, opacity 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: opacity 200ms ease-out;
    transform: none; /* No movement, only fade */
  }
}
```

This provides visual feedback without triggering motion sensitivity.

Reference: [Great Animations](https://emilkowal.ski/ui/great-animations)

### Reference: polish-reduced-motion.md

---
title: Respect prefers-reduced-motion
impact: HIGH
impactDescription: motion can cause sickness and distraction for some users
tags: polish, accessibility, reduced-motion, media-query
---

## Respect prefers-reduced-motion

Animations can cause motion sickness or distract users with attention disorders. Respect the `prefers-reduced-motion` media query by providing alternative animations.

**Incorrect (ignores preference):**

```css
.element {
  animation: bounce 0.2s ease-out;
}
/* No consideration for motion sensitivity */
```

**Correct (respects preference):**

```css
.element {
  animation: bounce 0.2s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 0.2s ease-out; /* Gentler alternative */
  }
}
```

Don't remove all animation—provide safer alternatives that still communicate state changes.

Reference: [Great Animations](https://emilkowal.ski/ui/great-animations)

### Reference: polish-scroll-reveal.md

---
title: Trigger Scroll Animations at Appropriate Threshold
impact: MEDIUM
impactDescription: prevents premature activation when element barely enters viewport
tags: polish, scroll, intersection, reveal, viewport
---

## Trigger Scroll Animations at Appropriate Threshold

Don't trigger scroll-based animations the instant an element enters the viewport. Wait until a meaningful portion (at least 100px) is visible.

**Incorrect (triggers at viewport edge):**

```tsx
const { ref, inView } = useInView({ threshold: 0 })

<motion.div
  ref={ref}
  animate={{ opacity: inView ? 1 : 0 }}
/>
// Animation starts when 1px enters viewport
```

**Correct (triggers when meaningfully visible):**

```tsx
const { ref, inView } = useInView({
  threshold: 0,
  rootMargin: '-100px 0px' // Must be 100px into viewport
})

<motion.div
  ref={ref}
  animate={{ opacity: inView ? 1 : 0 }}
  transition={{ once: true }} // Only animate once
/>
// Animation starts when 100px is visible
```

The `once: true` option ensures the animation only plays on first visibility.

Reference: [The Magic of clip-path](https://emilkowal.ski/ui/the-magic-of-clip-path)

### Reference: polish-stagger-children.md

---
title: Stagger Child Animations for Orchestration
impact: LOW-MEDIUM
impactDescription: staggered reveals feel more polished than simultaneous
tags: polish, stagger, orchestration, children, framer-motion
---

## Stagger Child Animations for Orchestration

Stagger child animations to create orchestrated reveals. Children should animate sequentially with small delays rather than all at once.

**Incorrect (all children animate simultaneously):**

```tsx
<motion.ul animate={{ opacity: 1 }}>
  {items.map(item => (
    <motion.li animate={{ opacity: 1, y: 0 }}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
// All items appear at once
```

**Correct (staggered children):**

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // 50ms between each child
      delayChildren: 0.1    // 100ms before first child
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(listItem => (
    <motion.li variants={itemVariants}>{listItem.name}</motion.li>
  ))}
</motion.ul>
// Items cascade in sequence
```

Reference: [animations.dev](https://animations.dev/)

### Reference: polish-toast-stacking.md

---
title: Implement Toast Stacking with Scale and Offset
impact: MEDIUM
impactDescription: creates visual depth hierarchy in notification system
tags: polish, toast, stacking, scale, offset, sonner
---

## Implement Toast Stacking with Scale and Offset

Create visual depth in toast notifications by offsetting and scaling each preceding toast. This creates the polished stacking effect seen in [Sonner](https://github.com/emilkowalski/sonner).

**Incorrect (flat stacking, no depth):**

```css
.toast {
  position: absolute;
  bottom: calc(var(--index) * 70px);
}
/* Toasts stack flat, no visual hierarchy */
```

**Correct (scale + offset creates depth):**

```css
.toast {
  --lift-amount: 14px;
  --toasts-before: 0; /* Set via JS */

  position: absolute;
  transform:
    translateY(calc(var(--lift-amount) * var(--toasts-before) * -1))
    scale(calc(1 - (var(--toasts-before) * 0.05)));
}
/* Visual depth: Toast 0 at scale(1), Toast 1 at scale(0.95), etc. */
```

```tsx
toasts.map((toast, index) => (
  <div
    key={toast.id}
    className="toast"
    style={{ '--toasts-before': index }}
  />
))
```

Reference: [Building a Toast Component](https://emilkowal.ski/ui/building-a-toast-component)

### Reference: props-avoid-css-variables.md

---
title: Avoid CSS Variables for Drag Animations
impact: HIGH
impactDescription: CSS variable inheritance causes style recalculation cascade
tags: props, css-variables, drag, performance, vaul
---

## Avoid CSS Variables for Drag Animations

CSS variables are inherited by all children. During drag animations, updating a CSS variable causes expensive style recalculation for every child element.

**Incorrect (CSS variable updates cascade):**

```tsx
function Drawer({ children }) {
  const [dragY, setDragY] = useState(0)

  return (
    <div style={{ '--drag-y': `${dragY}px` }}>
      <div style={{ transform: 'translateY(var(--drag-y))' }}>
        {children} {/* All children recalculate styles */}
      </div>
    </div>
  )
}
```

**Correct (direct style update):**

```tsx
function Drawer({ children }) {
  const drawerRef = useRef()

  const onDrag = (y) => {
    drawerRef.current.style.transform = `translateY(${y}px)`
  }

  return <div ref={drawerRef}>{children}</div>
}
```

This fix eliminated frame drops in Vaul with 20+ list items.

Reference: [Building a Drawer Component](https://emilkowal.ski/ui/building-a-drawer-component)

### Reference: props-clip-path-performant.md

---
title: Use clip-path for Layout-Free Reveals
impact: MEDIUM-HIGH
impactDescription: hardware-accelerated, no layout shifts, no extra DOM
tags: props, clip-path, reveal, performance, hardware
---

## Use clip-path for Layout-Free Reveals

Clip-path creates reveal animations without layout shifts—elements occupy their full space while visually clipped. It's hardware-accelerated and requires no extra DOM elements.

**Incorrect (animating height causes layout shift):**

```css
.reveal {
  height: 0;
  overflow: hidden;
  transition: height 300ms ease-out;
}
.reveal.open {
  height: auto; /* Causes layout recalculation */
}
```

**Correct (clip-path, no layout shift):**

```css
.reveal {
  clip-path: inset(0 0 100% 0); /* Hidden */
  transition: clip-path 300ms ease-out;
}
.reveal.open {
  clip-path: inset(0 0 0 0); /* Fully revealed */
}
```

**Common clip-path patterns:**
- `inset(0 0 100% 0)` - Hide bottom
- `inset(100% 0 0 0)` - Hide top
- `inset(0 100% 0 0)` - Hide right
- `inset(0 0 0 100%)` - Hide left

Reference: [The Magic of clip-path](https://emilkowal.ski/ui/the-magic-of-clip-path)

### Reference: props-hardware-accelerated.md

---
title: Use Hardware-Accelerated Animations When Main Thread Is Busy
impact: HIGH
impactDescription: CSS/WAAPI animations stay smooth during JavaScript execution
tags: props, hardware, gpu, waapi, css, performance
---

## Use Hardware-Accelerated Animations When Main Thread Is Busy

When the main thread is executing JavaScript, requestAnimationFrame-based animations (like Framer Motion) can become laggy. CSS animations and WAAPI run on the compositor thread, staying smooth regardless.

**Incorrect (JavaScript-driven animation):**

```tsx
// Framer Motion during heavy computation
<motion.div animate={{ x: 100 }} />
// Animation may stutter if main thread is blocked
```

**Correct (CSS or WAAPI animation):**

```tsx
// CSS transition (hardware-accelerated)
<div style={{ transform: 'translateX(100px)' }} className="transition-transform" />

// Or WAAPI
element.animate(
  [{ transform: 'translateX(0)' }, { transform: 'translateX(100px)' }],
  { duration: 200, easing: 'ease-out' }
)
```

Use Framer Motion for complex orchestration; use CSS/WAAPI for performance-critical animations during heavy computation.

Reference: [Great Animations](https://emilkowal.ski/ui/great-animations)

### Reference: props-transform-opacity.md

---
title: Animate Only Transform and Opacity
impact: CRITICAL
impactDescription: transform/opacity trigger only composite; layout properties cause jank
tags: props, transform, opacity, performance, composite, gpu
---

## Animate Only Transform and Opacity

Animating transform and opacity only triggers the composite rendering step—the cheapest operation. Animating layout properties (margin, padding, width, height) triggers expensive layout recalculations.

**Incorrect (animates layout property):**

```css
.accordion {
  transition: height 300ms ease-out, padding 300ms ease-out;
}
/* Triggers layout → paint → composite on every frame */
```

**Correct (animates transform only):**

```css
.accordion {
  transition: transform 300ms ease-out, opacity 300ms ease-out;
}
/* Triggers only composite, GPU-accelerated */
```

**Rendering Pipeline:**
1. **Layout** - Calculate positions (expensive)
2. **Paint** - Draw pixels (expensive)
3. **Composite** - Combine layers (cheap, GPU)

Transform and opacity skip steps 1 and 2.

Reference: [Great Animations](https://emilkowal.ski/ui/great-animations)

### Reference: props-will-change.md

---
title: Use will-change to Prevent 1px Shift
impact: MEDIUM
impactDescription: prevents subpixel rendering inconsistencies at animation end
tags: props, will-change, gpu, layer, subpixel
---

## Use will-change to Prevent 1px Shift

If you notice a 1px shift at the end of your animation, use `will-change: transform` to keep the element on its own compositor layer throughout the animation.

**Incorrect (subpixel shift at end):**

```css
.card {
  transition: transform 200ms ease-out;
}
/* May show 1px shift when animation completes */
```

**Correct (stable layer throughout):**

```css
.card {
  transition: transform 200ms ease-out;
  will-change: transform;
}
/* GPU handles animation consistently, no shift */
```

**Caution:** Don't overuse `will-change`—it consumes memory. Only apply to elements that will animate frequently.

Reference: [@emilkowalski_](https://x.com/emilkowalski_/status/1981352193262256182)

### Reference: strategy-feedback-immediate.md

---
title: Provide Immediate Feedback on All Actions
impact: MEDIUM
impactDescription: interfaces should feel like they're listening to the user
tags: strategy, feedback, responsive, loading, state
---

## Provide Immediate Feedback on All Actions

The interface should feel like it's listening to the user. Every action should have immediate visual feedback—loading states, success confirmations, error indicators.

**Incorrect (no feedback during action):**

```tsx
const onSubmit = async () => {
  await saveData() // User waits with no feedback
}

<button onClick={onSubmit}>Save</button>
// User wonders if click registered
```

**Correct (immediate feedback):**

```tsx
const onSubmit = async () => {
  setIsLoading(true)
  await saveData()
  setIsLoading(false)
  setShowSuccess(true)
}

<button onClick={onSubmit} disabled={isLoading}>
  {isLoading ? <Spinner /> : 'Save'}
</button>
{showSuccess && <CheckAnimation />}
// User knows action is processing
```

Feedback should be instant—even if the actual operation takes time.

Reference: [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)

### Reference: strategy-frequency-matters.md

---
title: Consider Interaction Frequency Before Animating
impact: HIGH
impactDescription: animations on frequent actions become annoying, not delightful
tags: strategy, frequency, delight, annoyance, purpose
---

## Consider Interaction Frequency Before Animating

Animations that delight on first use become annoying on the hundredth. Consider how often users will see an animation before adding it.

**Frequency Guidelines:**

| Frequency | Animation Approach |
|-----------|-------------------|
| Once (onboarding) | Full, expressive animations OK |
| Daily | Subtle, fast animations |
| Hourly | Very subtle or none |
| Constantly | No animation |

**Incorrect (animate frequent action):**

```tsx
// User switches tabs dozens of times per session
<TabContent
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.3 }}
/>
// Initial delight fades, becomes annoying
```

**Correct (instant for frequent, animated for rare):**

```tsx
// Frequent: instant
<TabContent style={{ opacity: 1 }} />

// Rare (first visit): animated
{isFirstVisit && (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
)}
```

Reference: [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations)

### Reference: strategy-keyboard-no-animate.md

---
title: Never Animate Keyboard-Initiated Actions
impact: HIGH
impactDescription: keyboard users perform actions hundreds of times daily
tags: strategy, keyboard, frequency, no-animation, raycast
---

## Never Animate Keyboard-Initiated Actions

Keyboard navigation and actions may be performed hundreds of times daily. Animations on these interactions make the interface feel slow, delayed, and disconnected.

**Incorrect (animate keyboard actions):**

```tsx
const handleKeyDown = (e) => {
  if (e.key === 'ArrowDown') {
    setSelectedIndex(i => i + 1)
  }
}

// With animation
<motion.div animate={{ y: selectedIndex * 40 }} />
// Feels slow when pressing arrow keys rapidly
```

**Correct (instant keyboard response):**

```tsx
const handleKeyDown = (e) => {
  if (e.key === 'ArrowDown') {
    setSelectedIndex(i => i + 1)
  }
}

// Instant position update
<div style={{ transform: `translateY(${selectedIndex * 40}px)` }} />
// Keeps up with rapid key presses
```

Tools like Raycast that are used hundreds of times daily have no animations—and that's optimal.

Reference: [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations)

### Reference: strategy-marketing-exception.md

---
title: Marketing Sites Are the Exception
impact: LOW-MEDIUM
impactDescription: low-frequency visits allow 2-3× longer animation durations
tags: strategy, marketing, landing, exception, expression
---

## Marketing Sites Are the Exception

Marketing and landing pages are exceptions to speed rules. Users visit once or infrequently, so longer, more expressive animations are acceptable.

**Incorrect (app-style timing on marketing page):**

```css
/* Marketing hero animation */
.hero-element {
  transition: transform 200ms ease-out;
}
/* Too fast for marketing, misses opportunity for delight */
```

**Correct (expressive timing for infrequent visits):**

```css
/* Marketing hero animation */
.hero-element {
  animation: floatIn 800ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* Longer, more expressive animation appropriate for one-time viewing */
```

**Guidelines by context:**
- **App UI:** <300ms, subtle, functional
- **Marketing:** 500-1000ms OK, expressive, attention-grabbing
- **Onboarding:** Can be playful, guiding
- **Documentation:** Minimal, functional

Reference: [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations)

### Reference: strategy-purpose-required.md

---
title: Every Animation Must Have a Purpose
impact: MEDIUM
impactDescription: purposeless animation degrades rather than enhances experience
tags: strategy, purpose, intentional, design
---

## Every Animation Must Have a Purpose

The goal is not to animate for animation's sake. Every animation should serve a clear purpose—guiding attention, providing feedback, or maintaining context.

**Valid purposes for animation:**
- **Feedback** - Confirming user actions (button press, form submit)
- **Orientation** - Showing where something came from or went
- **Attention** - Drawing focus to important changes
- **Continuity** - Maintaining context during transitions

**Incorrect (animation without purpose):**

```tsx
// Random bounce on page load
<motion.h1
  animate={{ y: [0, -10, 0] }}
  transition={{ repeat: Infinity, duration: 2 }}
>
  Welcome
</motion.h1>
// Why is this bouncing? No clear purpose.
```

**Correct (animation with purpose):**

```tsx
// Feedback animation on successful action
<motion.div
  animate={isSuccess ? { scale: [1, 1.1, 1] } : {}}
>
  <CheckIcon />
</motion.div>
// Animation provides feedback for user action
```

Reference: [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations)

### Reference: timing-300ms-max.md

---
title: Keep UI Animations Under 300ms
impact: CRITICAL
impactDescription: animations over 300ms feel slow and disconnected
tags: timing, duration, speed, responsiveness, ui
---

## Keep UI Animations Under 300ms

UI animations should stay under 300ms to feel responsive. Longer animations make interfaces feel slow and disconnected from user actions.

**Incorrect (slow animation):**

```css
.dropdown {
  transition: opacity 500ms ease-out, transform 500ms ease-out;
}
/* Feels sluggish, user waits for UI to catch up */
```

**Correct (snappy animation):**

```css
.dropdown {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
/* Feels responsive and connected to user action */
```

**Duration Guidelines:**
- 150–250ms for micro UI changes (buttons, toggles)
- 250–400ms for larger context switches (modals, page transitions)
- Longer durations only for marketing/intro animations

Reference: [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)

### Reference: timing-asymmetric.md

---
title: Use Asymmetric Timing for Press and Release
impact: HIGH
impactDescription: slow press for confirmation, fast release for feedback
tags: timing, duration, press, release, asymmetric, hold
---

## Use Asymmetric Timing for Press and Release

Press and release actions have different purposes. Pressing should be slow to allow user confirmation; release should be fast for snappy feedback.

**Incorrect (symmetric timing):**

```css
.hold-button .progress {
  transition: clip-path 500ms ease-out;
}
/* Same speed for both directions feels wrong */
```

**Correct (asymmetric timing):**

```css
.hold-button .progress {
  transition: clip-path 200ms ease-out; /* Fast release */
}

.hold-button:active .progress {
  transition: clip-path 2s linear; /* Slow press for confirmation */
}
```

This pattern is used in hold-to-delete and hold-to-confirm interactions where the slow press gives users time to reconsider, while the fast release provides immediate feedback.

Reference: [Building a Hold to Delete Component](https://emilkowal.ski/ui/building-a-hold-to-delete-component)

### Reference: timing-drawer-500ms.md

---
title: Use 500ms Duration for Drawer Animations
impact: MEDIUM
impactDescription: matches iOS Sheet timing users expect
tags: timing, duration, drawer, ios, modal, vaul
---

## Use 500ms Duration for Drawer Animations

Drawer components are an exception to the 300ms rule. The 500ms duration with iOS-style easing matches native mobile behavior users expect.

**Incorrect (too fast for drawer):**

```css
.drawer {
  transition: transform 200ms ease-out;
}
/* Feels rushed, doesn't match native behavior */
```

**Correct (iOS-matched timing):**

```css
.drawer {
  transition: transform 500ms cubic-bezier(0.32, 0.72, 0, 1);
}
/* Matches iOS Sheet, feels native and polished */
```

The 500ms duration works because:
- Drawers cover large screen areas
- Users expect mobile-native behavior
- The custom easing makes it feel faster than it is

Reference: [Building a Drawer Component](https://emilkowal.ski/ui/building-a-drawer-component)

### Reference: timing-faster-better.md

---
title: Faster Animations Improve Perceived Performance
impact: CRITICAL
impactDescription: 180ms vs 400ms creates noticeably different responsiveness feel
tags: timing, duration, speed, performance, perceived
---

## Faster Animations Improve Perceived Performance

Faster animations don't just complete quicker—they make your entire interface feel more responsive and performant. A 180ms animation feels noticeably better than 400ms.

**Incorrect (unnecessarily slow):**

```css
.select-dropdown {
  transition: transform 400ms ease-out;
}
/* Feels slow even though animation is smooth */
```

**Correct (appropriately fast):**

```css
.select-dropdown {
  transition: transform 180ms ease-out;
}
/* Feels snappy and responsive */
```

**The Speed Principle:**
- Animations improve perceived performance when fast
- Animations degrade perceived performance when slow
- When in doubt, make it faster

Reference: [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)

### Reference: timing-tooltip-delay.md

---
title: Delay Initial Tooltips, Instant Subsequent Ones
impact: MEDIUM-HIGH
impactDescription: prevents accidental activation while maintaining speed
tags: timing, tooltip, delay, hover, instant
---

## Delay Initial Tooltips, Instant Subsequent Ones

Tooltips should have a delay before appearing to prevent accidental activation. Once a tooltip is open, subsequent tooltips should appear instantly with no animation.

**Incorrect (same delay for all):**

```css
.tooltip {
  transition: opacity 200ms ease-out;
  transition-delay: 300ms;
}
/* Every tooltip waits 300ms, feels slow when exploring */
```

**Correct (initial delay, instant subsequent):**

```css
.tooltip {
  transition: opacity 200ms ease-out;
  transition-delay: 300ms;
}

.tooltip[data-instant] {
  transition-duration: 0ms;
  transition-delay: 0ms;
}
```

```tsx
// Set data-instant when any tooltip is already open
const [instantTooltips, setInstantTooltips] = useState(false)
```

This feels faster without defeating the purpose of the initial delay.

Reference: [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)

### Reference: transform-3d-preserve.md

---
title: Use preserve-3d for 3D Transform Effects
impact: MEDIUM
impactDescription: enables rotateX/rotateY for depth effects like card flips
tags: transform, 3d, rotateX, rotateY, preserve-3d, perspective
---

## Use preserve-3d for 3D Transform Effects

Combine `transform-style: preserve-3d` with `rotateX()` and `rotateY()` to create 3D effects like card flips, orbiting elements, and depth animations.

**Incorrect (flat rotation, no 3D depth):**

```css
.card {
  transition: transform 500ms ease-out;
}
.card:hover {
  transform: rotateY(180deg);
}
/* Card rotates but children flatten, back isn't visible */
```

**Correct (preserve-3d maintains depth):**

```css
.card-container {
  perspective: 1000px;
}
.card {
  transform-style: preserve-3d;
  transition: transform 500ms ease-out;
}
.card:hover {
  transform: rotateY(180deg);
}
.card-front, .card-back {
  backface-visibility: hidden;
}
.card-back {
  transform: rotateY(180deg);
}
/* True 3D flip with front/back faces */
```

**Mental Model:** Think of rotateX/rotateY axes like screws—rotateX rotates around a horizontal axis (like a garage door), rotateY around a vertical axis (like a revolving door).

Reference: [CSS Transforms](https://emilkowal.ski/ui/css-transforms)

### Reference: transform-never-scale-zero.md

---
title: Never Animate from scale(0)
impact: HIGH
impactDescription: scale(0) feels unnatural; 0.9+ feels gentle and elegant
tags: transform, scale, enter, animation, natural
---

## Never Animate from scale(0)

Elements animating from scale(0) feel unnatural—nothing in the real world appears from nothing. Start from scale(0.9) or higher combined with opacity for gentle, elegant motion.

**Incorrect (scale from 0):**

```css
.modal {
  animation: appear 200ms ease-out;
}
@keyframes appear {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
/* Feels like element appears from nowhere */
```

**Correct (scale from 0.9+):**

```css
.modal {
  animation: appear 200ms ease-out;
}
@keyframes appear {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
/* Gentle expansion feels natural */
```

The higher initial scale makes movement feel more gentle, natural, and elegant.

Reference: [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)

### Reference: transform-origin-aware.md

---
title: Make Animations Origin-Aware
impact: HIGH
impactDescription: animations from source feel intentional, arbitrary origins feel broken
tags: transform, transform-origin, dropdown, popover, radix
---

## Make Animations Origin-Aware

Dropdowns and popovers should animate from their trigger element, not from an arbitrary center point. Set transform-origin to match where the animation originates.

**Incorrect (default center origin):**

```css
.dropdown {
  transform-origin: center; /* Default */
  animation: scaleIn 200ms ease-out;
}
/* Dropdown scales from middle, disconnected from button */
```

**Correct (origin matches trigger):**

```css
.dropdown {
  transform-origin: top center; /* Matches button position */
  animation: scaleIn 200ms ease-out;
}
```

**With Radix UI:**

```css
.dropdown {
  transform-origin: var(--radix-dropdown-menu-content-transform-origin);
}
/* Radix automatically calculates correct origin */
```

shadcn/ui handles this automatically.

Reference: [Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations)

### Reference: transform-percentage-translate.md

---
title: Use Percentage Values for translateY
impact: HIGH
impactDescription: element-relative values adapt to varying dimensions
tags: transform, translate, percentage, responsive, toast, drawer
---

## Use Percentage Values for translateY

Use percentage values instead of fixed pixels for translateY. Percentages are relative to the element's own dimensions, automatically adapting to varying content sizes.

**Incorrect (fixed pixel value):**

```css
.toast {
  transform: translateY(60px); /* Assumes toast is 60px tall */
}
/* Breaks if toast height varies */
```

**Correct (percentage value):**

```css
.toast {
  transform: translateY(100%); /* Always moves by its own height */
}
/* Works regardless of toast content/height */
```

This pattern is used in [Sonner](https://github.com/emilkowalski/sonner) for toasts and [Vaul](https://github.com/emilkowalski/vaul) for variable-height drawers.

Reference: [CSS Transforms](https://emilkowal.ski/ui/css-transforms)

### Reference: transform-scale-097.md

---
title: Scale Buttons to 0.97 on Press
impact: HIGH
impactDescription: instant responsive feedback with subtle physical feel
tags: transform, scale, button, press, active, feedback
---

## Scale Buttons to 0.97 on Press

Add a subtle scale-down effect when buttons are pressed. A scale of 0.97 with ~150ms transition provides instant feedback that makes interfaces feel responsive.

**Incorrect (no press feedback):**

```css
.button {
  background: blue;
}
.button:hover {
  background: darkblue;
}
/* No tactile feedback on press */
```

**Correct (scale on press):**

```css
.button {
  background: blue;
  transition: transform 150ms ease-out;
}
.button:hover {
  background: darkblue;
}
.button:active {
  transform: scale(0.97);
}
/* Subtle but noticeable press feedback */
```

This small detail makes the interface feel like it's listening to the user.

Reference: [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)

### Reference: transform-scale-children.md

---
title: Scale Transforms Affect Children
impact: MEDIUM
impactDescription: unlike width/height, scale applies proportionally to all descendants
tags: transform, scale, children, proportional
---

## Scale Transforms Affect Children

Unlike width/height changes, scale transforms apply proportionally to all child elements. This can be a feature (cohesive scaling) or a bug (unwanted text distortion).

**Incorrect (scale when text should stay readable):**

```tsx
function ZoomableContainer({ children, zoom }) {
  return (
    <div style={{ transform: `scale(${zoom})` }}>
      {children} {/* Text becomes unreadable at low zoom */}
    </div>
  )
}
// All children including text scale proportionally
```

**Correct (use opacity + translate when children shouldn't scale):**

```tsx
function FadeContainer({ children, visible }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)'
    }}>
      {children} {/* Children maintain original size */}
    </div>
  )
}
// Children stay readable, only position/opacity change
```

**When scale IS desired:** Card hover effects, zoom interfaces, thumbnail previews where everything should grow together.

Reference: [CSS Transforms](https://emilkowal.ski/ui/css-transforms)
