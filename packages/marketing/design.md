# Hermium Marketing — Design System

Extracted from [Anara.com](https://anara.com/) reference. Clean, minimal, content-first landing page aesthetic.

---

## Philosophy

- **Extreme minimalism** — every element must earn its place
- **Content-first** — no decorative gradients, no noise, no clutter
- **Whisper, don't shout** — confidence through restraint
- **Professional trust** — academic/research feel without being cold
- **Generous whitespace** — let the product screenshots breathe

---

## Typography

### Font Stack

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| **Primary** | `Inter` (variable) | 400–700 | Body, UI, nav, buttons |
| **Display** | `Inter Display` | 500–700 | Large headlines, hero |
| **Accent** | `Perfectly Nineties` (serif) | 400 | Optional: quote marks, special moments |

> **Current app font:** `Geist Variable` is already installed. For Anara parity, add Inter as primary and keep Geist as fallback. Or keep Geist — it's close enough in spirit (clean, modern, slightly geometric).

### Type Scale

| Level | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| **Hero H1** | `clamp(2.5rem, 5vw, 4rem)` | 700 | 1.05 | -0.02em | Main headline |
| **H2** | `clamp(1.75rem, 3vw, 2.25rem)` | 700 | 1.15 | -0.01em | Section titles |
| **H3** | `1.125rem` | 700 | 1.4 | 0 | Feature headings, FAQ |
| **Body** | `1rem` (16px) | 400 | 1.6 | 0 | Paragraphs |
| **Body Large** | `1.125rem` | 400 | 1.6 | 0 | Hero subtitle |
| **Small** | `0.875rem` | 400–550 | 1.5 | 0 | Nav, labels, captions |
| **Button** | `0.875rem` | 550 | 1 | 0 | CTA text |

> **Note on weight 550:** Anara uses `font-[550]` (between Medium and Semibold) for nav and buttons. If Inter/Geist doesn't support 550, use `font-medium` (500) with slightly larger size or `font-semibold` (600) with tracking.

---

## Color System

Anara uses **HSL** for all colors. We map to Tailwind CSS variables.

### Semantic Colors

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--background-primary` | `0 0% 100%` | `#FFFFFF` | Page background |
| `--background-app` | `60 1% 98%` | `#FAFAF9` | Subtle section alt |
| `--background-inverse` | `0 0% 9%` | `#171717` | Dark sections, primary CTA bg |
| `--text-primary` | `0 0% 6%` | `#0F0F0F` | Headlines, body |
| `--text-secondary` | `0 0% 40%` | `#666666` | Subtitles, descriptions |
| `--text-tertiary` | `0 0% 54%` | `#8A8A8A` | Meta, captions |
| `--text-muted` | `0 0% 74%` | `#BDBDBD` | Disabled, placeholders |
| `--text-inverse` | `0 0% 97%` | `#F7F7F7` | Text on dark bg |
| `--border-primary` | `0 0% 86%` | `#DBDBDB` | Dividers, borders |
| `--border-muted` | `0 0% 95%` | `#F2F2F2` | Subtle separators |
| `--control-primary` | `0 0% 92%` | `#EBEBEB` | Hover states, dropdowns |
| `--control-secondary` | `0 0% 88%` | `#E0E0E0` | Active states |
| `--ring` | `209 83% 65%` | `#4FA3F7` | Focus rings, links |

### Neutral Scale (Tailwind mapping)

```
neutral-50:   #FAFAFA   (bg alt)
neutral-100:  #F5F5F5   (hover)
neutral-200:  #E5E5E5   (borders)
neutral-300:  #D4D4D4   (dividers)
neutral-400:  #A3A3A3   (muted text)
neutral-500:  #737373   (secondary text)
neutral-600:  #525252   (tertiary text)
neutral-700:  #404040   (subtle dark)
neutral-800:  #262626   (dark elements)
neutral-900:  #171717   (inverse bg)
neutral-950:  #0A0A0A   (near black)
```

### Dark Mode

If supporting dark mode (Anara forces `light` on landing):

```
background:  0 0% 9%    (#171717)
foreground:  0 0% 97%   (#F7F7F7)
border:      0 0% 20%   (#333333)
```

---

## Spacing System

### Container

- **Max-width:** `1280px`
- **Padding:** 
  - Mobile: `24px` (`px-6`)
  - Tablet: `40px` (`md:px-10`)
  - Desktop: `56px` (`lg:px-14`)

### Section Spacing

| Size | Value | Usage |
|------|-------|-------|
| **Section XL** | `120px` (`py-30`) | Hero bottom padding |
| **Section LG** | `96px` (`py-24`) | Major feature sections |
| **Section MD** | `64px` (`py-16`) | Standard sections |
| **Section SM** | `40px` (`py-10`) | Tight sections (testimonials, FAQ) |

### Component Spacing

- **Button padding:** `px-5 py-2.5` (or `px-6 py-3` for large)
- **Card padding:** `p-6` to `p-8`
- **Grid gap:** `gap-8` to `gap-12`
- **Stack gap:** `gap-4` to `gap-6`

---

## Layout Patterns

### Header/Nav

- **Height:** `88px` desktop, `56px` mobile
- **Position:** `fixed` top with `z-50`
- **Background:** `bg-base-50/90 backdrop-blur-xl` (frosted glass)
- **Progressive blur:** Gradient fade from `background-primary` to transparent below header
- **Logo:** Left-aligned, `~64px` wide
- **Nav items:** Centered (on desktop), `font-[550] text-sm`, subtle hover bg
- **CTA group:** Right-aligned, gap of `10px`
- **Mobile:** Hamburger with slide-out drawer

### Hero Section

- **Alignment:** Left-aligned text (not center — Anara uses left alignment for credibility)
- **Max text width:** `640px` for headline
- **Headline:** Large, tight line-height (`1.05`), slight negative tracking
- **Subtitle:** `text-secondary`, `1.125rem`, max-width `560px`
- **CTA row:** Horizontal, gap `10px`, below subtitle
- **Screenshot:** Positioned to the right or below on mobile, subtle shadow, rounded corners
- **No background image** — pure whitespace

### Feature Sections

- **Heading + description** at top
- **Screenshots** as the hero element — large, prominent, slightly rounded (`rounded-xl` or `rounded-2xl`)
- **Feature grid:** 2–3 columns with icon + title + description
- **Alternating layout:** Text left / screenshot right, then reverse

### Testimonials

- **Clean quotes** — large quotation marks (optional: serif font for the mark)
- **Attribution:** Name + title, `text-sm text-secondary`
- **No cards/boxes** — just text on whitespace

### FAQ

- **Accordion style** — clean horizontal rows
- **Question:** `font-semibold` or `font-[550]`
- **Hover:** subtle background shift
- **Expand:** smooth height transition
- **No heavy borders** — just `border-b` with `border-muted`

### Footer

- **Multi-column:** Resources | Company | Product | Legal | Socials
- **Column heading:** `font-semibold text-sm`
- **Links:** `text-sm text-secondary hover:text-primary`
- **Bottom:** Copyright + social icons
- **Background:** same as page or `bg-neutral-50`

---

## Components

### Buttons

| Variant | Background | Text | Border | Radius | Padding |
|---------|-----------|------|--------|--------|---------|
| **Primary** | `#171717` (inverse) | `#F7F7F7` (inverse) | none | `rounded-full` | `px-5 py-2.5` |
| **Secondary** | `#F2F2F2` (muted) | `#0F0F0F` (primary) | none | `rounded-full` | `px-5 py-2.5` |
| **Ghost/Nav** | transparent | `#0F0F0F` | none | `rounded-lg` | `px-3 py-1.5` |
| **Ghost Hover** | `#EBEBEB` | `#0F0F0F` | none | `rounded-lg` | `px-3 py-1.5` |

**Hover states:**
- Primary: `opacity-90` or slight lightening
- Secondary: `bg-neutral-200`
- Ghost: `bg-neutral-100`

**Active states:**
- Ghost: `bg-neutral-200`

**Focus:**
- `ring-2 ring-[hsl(209_83%_65%)] ring-offset-2`

### Cards (if needed)

- **Background:** `bg-white` or `bg-neutral-50`
- **Border:** `1px solid #F2F2F2`
- **Radius:** `12px` (`rounded-xl`)
- **Shadow:** none or very subtle `0 1px 3px rgba(0,0,0,0.04)`
- **Padding:** `24px` to `32px`

### Screenshots / Product Images

- **Border radius:** `16px` (`rounded-2xl`)
- **Border:** `1px solid #E5E5E5` (subtle)
- **Shadow:** `0 4px 24px rgba(0,0,0,0.08)` — soft, diffused
- **Max-width:** `100%` of container, but constrained by parent
- **Background:** if showing UI, use subtle `#FAFAFA` behind it

---

## Shadows

| Name | Value | Usage |
|------|-------|-------|
| **none** | — | Default state |
| **subtle** | `0 1px 3px rgba(0,0,0,0.04)` | Cards, dropdowns |
| **soft** | `0 4px 24px rgba(0,0,0,0.08)` | Screenshots, modals |
| **medium** | `0 8px 32px rgba(0,0,0,0.12)` | Elevated elements |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| **sm** | `6px` | Small elements |
| **md** | `8px` | Inputs, small cards |
| **lg** | `12px` | Cards |
| **xl** | `16px` | Large cards, screenshots |
| **2xl** | `20px` | Modals |
| **full** | `9999px` | Buttons (pill), avatars |

> Anara uses `rounded-[10px]` for nav items and `rounded-full` for CTAs.

---

## Animation & Motion

### Philosophy

- **Invisible motion** — animations should feel natural, not flashy
- **Purposeful** — every animation guides attention
- **Fast** — 200–300ms max for micro-interactions

### Patterns

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| **Fade in up** | `600ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Sections on scroll |
| **Fade in** | `400ms` | `ease-out` | Images, text |
| **Scale hover** | `200ms` | `ease-out` | Buttons, cards |
| **Height expand** | `300ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Accordion/FAQ |
| **Chevron rotate** | `200ms` | `ease-in-out` | Dropdown arrows |
| **Backdrop blur** | `150ms` | `ease` | Header scroll |

### Scroll Behavior

- **Header:** Add `backdrop-blur-xl` + subtle border-bottom after scrolling `50px`
- **Sections:** IntersectionObserver-triggered fade-in-up
- **Stagger:** `100ms` delay between sibling elements

---

## Responsive Breakpoints

| Name | Width | Notes |
|------|-------|-------|
| **Mobile** | `< 768px` | Single column, stacked, hamburger nav |
| **Tablet** | `768px–1024px` | 2-column grids, condensed nav |
| **Desktop** | `> 1024px` | Full layout, 3-column grids, all nav visible |
| **Wide** | `> 1280px` | Max container width reached |

---

## Assets

### Logo

- **Current:** Hermium wordmark or icon
- **Style:** Simple, geometric, monochrome
- **Sizes:** `64px` (header), `128px` (footer)
- **Format:** SVG

### Screenshots

- **Resolution:** 2x for retina
- **Format:** WebP with JPEG fallback
- **Style:** Clean browser mockup or raw UI screenshot
- **Background:** Transparent or subtle gray
- **Shadow:** Soft diffused shadow (see Shadows)
- **Radius:** `16px`

### Icons

- **Library:** Lucide React (already used in main app)
- **Size:** `16px` inline, `20px` standalone, `24px` feature icons
- **Stroke width:** `1.5px` or `2px`
- **Color:** inherit from text color

---

## Copy & Voice

### Tone

- **Clear** — no jargon, no buzzwords
- **Direct** — "Understand any file" not "Leverage our cutting-edge platform"
- **Confident** — state benefits plainly
- **Academic** — trustworthy, precise, evidence-based

### Example Headlines

- ✅ "AI workspace for scientists, students, and research teams"
- ✅ "Understand any file or group of files, instantly"
- ✅ "Get concise, scholarly answers to any question"
- ❌ "Revolutionize your workflow with AI-powered insights"
- ❌ "The future of research is here"

### CTA Copy

- **Primary:** "Get Hermium free" / "Install Hermium"
- **Secondary:** "View on GitHub" / "Read docs"
- **Tertiary:** "See features" / "How it works"

---

## Implementation Notes

### Tailwind Config (v4)

The marketing app already uses Tailwind v4 with `@theme inline`. Update `src/styles.css`:

```css
@theme inline {
  --font-sans: 'Inter', 'Geist Variable', system-ui, sans-serif;
  --font-display: 'Inter Display', 'Inter', sans-serif;
  --font-serif: 'Perfectly Nineties', Georgia, serif;

  /* Semantic colors */
  --color-background-primary: #FFFFFF;
  --color-background-inverse: #171717;
  --color-background-app: #FAFAF9;
  --color-text-primary: #0F0F0F;
  --color-text-secondary: #666666;
  --color-text-tertiary: #8A8A8A;
  --color-text-muted: #BDBDBD;
  --color-text-inverse: #F7F7F7;
  --color-border-primary: #DBDBDB;
  --color-border-muted: #F2F2F2;
  --color-control-primary: #EBEBEB;
  --color-control-secondary: #E0E0E0;
  --color-ring-accent: #4FA3F7;

  /* Radius */
  --radius: 0.5rem;
}
```

### Font Loading

Add Inter to `index.html` or keep Geist (already installed via `@fontsource-variable/geist`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;550;600;700&display=swap" rel="stylesheet">
```

Or use `fontsource`:
```bash
npm install @fontsource-variable/inter
```

### Shadcn Component Overrides

Update `components/ui/button.tsx` variants:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#171717] text-[#F7F7F7] hover:bg-[#171717]/90 rounded-full",
        secondary: "bg-[#F2F2F2] text-[#0F0F0F] hover:bg-[#E5E5E5] rounded-full",
        ghost: "hover:bg-[#EBEBEB] rounded-lg",
        outline: "border border-[#DBDBDB] hover:bg-[#FAFAFA] rounded-lg",
      },
      size: {
        default: "px-5 py-2.5 h-10",
        sm: "px-3 py-1.5 h-8 text-xs",
        lg: "px-6 py-3 h-11",
      },
    },
  }
)
```

---

## Checklist

- [ ] Install Inter font (variable preferred)
- [ ] Update `styles.css` with Anara color tokens
- [ ] Override shadcn Button to match pill/radius styles
- [ ] Build Header: fixed, backdrop-blur, progressive blur below
- [ ] Build Hero: left-aligned, large headline, subtitle, dual CTAs, screenshot right
- [ ] Build Features: alternating layout, large screenshots
- [ ] Build Testimonials: clean quotes, no card boxes
- [ ] Build FAQ: accordion, subtle borders
- [ ] Build Footer: 5-column, clean links
- [ ] Add scroll-triggered fade-in animations
- [ ] Responsive: mobile stack, tablet 2-col, desktop full
- [ ] Dark mode (optional — Anara forces light on landing)

---

*Reference: anara.com landing page, extracted 2026-05-15*
