# Open Data Studio — Design System

## Overview

Open Data Studio is a single-page ClickHouse data exploration workbench. It uses a three-panel layout with a sidebar for database navigation, a center area for SQL editing and data grids, and a right panel for AI agent chat.

**Tech Stack**

- Next.js 16.2.7 + React 19.2.4 + TypeScript 5
- Tailwind CSS 4 (CSS-first configuration, no `tailwind.config.ts`)
- shadcn/ui 4.10.0 with `base-nova` style
- `@base-ui/react` ^1.5.0 as the primitive layer
- `lucide-react` ^1.17.0 for iconography
- `class-variance-authority` for component variants
- `tailwindcss-animate` for animations

---

## Color System

Colors are defined as CSS custom properties in `src/app/globals.css`. The system uses OKLCH values and supports light/dark modes via `prefers-color-scheme` and explicit `.light` / `.dark` classes.

### Semantic Tokens

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page background |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0.004 270)` | Primary text |
| `--card` | `oklch(1 0 0)` | `oklch(0.203 0.026 273.858)` | Card surfaces |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0.004 270)` | Card text |
| `--popover` | `oklch(1 0 0)` | `oklch(0.203 0.026 273.858)` | Dropdown/popover surfaces |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0.004 270)` | Popover text |
| `--primary` | `oklch(0.546 0.186 262.367)` | `oklch(0.636 0.236 264.244)` | Buttons, links, active states |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(1 0 0)` | Text on primary |
| `--secondary` | `oklch(0.962 0.016 264.648)` | `oklch(0.274 0.038 268.982)` | Secondary buttons, tags |
| `--secondary-foreground` | `oklch(0.351 0.081 263.426)` | `oklch(0.985 0.004 270)` | Text on secondary |
| `--muted` | `oklch(0.968 0.007 264.528)` | `oklch(0.274 0.038 268.982)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.553 0.034 261.425)` | `oklch(0.706 0.026 263.278)` | Placeholder, disabled text |
| `--accent` | `oklch(0.968 0.007 264.528)` | `oklch(0.274 0.038 268.982)` | Accent backgrounds |
| `--accent-foreground` | `oklch(0.351 0.081 263.426)` | `oklch(0.985 0.004 270)` | Text on accent |
| `--destructive` | `oklch(0.624 0.206 22.522)` | `oklch(0.506 0.206 22.522)` | Errors, destructive actions |
| `--destructive-foreground` | `oklch(0.971 0.013 17.38)` | `oklch(0.971 0.013 17.38)` | Text on destructive |
| `--border` | `oklch(0.921 0.012 266.088)` | `oklch(0.274 0.038 268.982)` | Borders, dividers |
| `--input` | `oklch(0.921 0.012 266.088)` | `oklch(0.274 0.038 268.982)` | Input borders |
| `--ring` | `oklch(0.546 0.186 262.367)` | `oklch(0.636 0.236 264.244)` | Focus rings |

### Chart Colors

| Token | Value |
|-------|-------|
| `--chart-1` | `oklch(0.646 0.222 41.116)` |
| `--chart-2` | `oklch(0.6 0.118 184.704)` |
| `--chart-3` | `oklch(0.398 0.07 227.392)` |
| `--chart-4` | `oklch(0.828 0.189 84.429)` |
| `--chart-5` | `oklch(0.769 0.188 70.08)` |

---

## Typography

### Font Stack

- **Sans**: `var(--font-geist-sans)` (Geist Sans from Next.js font optimization)
- **Mono**: `var(--font-geist-mono)` (Geist Mono for code and data values)
- **Heading**: `font-heading` (used in `DialogTitle` and `CardTitle`)

### Type Scale

| Size | Value | Usage |
|------|-------|-------|
| `text-[10px]` | 10px | Table metadata, row counts, engine names, comments |
| `text-xs` | 12px | Default UI text, sidebar labels, badges, agent chat, tabs, buttons |
| `text-sm` | 14px | Dialog titles, card descriptions, data grid headers |
| `text-base` | 16px | Inputs (overridden to `md:text-sm` on desktop) |

### Font Weights

| Weight | Usage |
|--------|-------|
| `font-normal` (400) | Body text, table cells |
| `font-medium` (500) | Buttons, tab triggers, labels, agent header |
| `font-semibold` (600) | Section headers, active tabs, app title |
| `font-bold` (700) | Markdown strong tags |

### Line Heights

| Value | Usage |
|-------|-------|
| `leading-none` | Dialog titles |
| `leading-tight` | Table comments, compact text |
| `leading-snug` | Card titles |
| `leading-relaxed` | Markdown content in agent chat |

---

## Spacing & Layout

### Three-Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header (h-10 / 40px)                                        │
├──────────┬──────────────────────────────┬───────────────────┤
│ Sidebar  │ Center                       │ Agent Panel       │
│ w-56     │ flex-1                       │ w-[380px]         │
│ (224px)  │                              │ (configurable)    │
│          │                              │                   │
│ Tables   │ 网格 / 透视 / 仪表盘 tabs    │ Agent Chat        │
│ Schema   │ SQL Console + Data Grid      │                   │
│          │ or Pivot Config + VTable     │                   │
└──────────┴──────────────────────────────┴───────────────────┘
```

- **Sidebar**: `w-56` (224px) when open, collapsible to `w-0`. Persistent default: 240px
- **Center**: `flex-1`, contains view tabs and content
- **Right Panel**: default 380px, configurable via drag resize
- **Header**: `h-10` (40px), border-bottom separator

### Sidebar Schema Section

- Default height: 384px
- Resizable range: 80px – 600px
- Drag handle: `h-1` bar with `cursor-row-resize`

### Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--card-spacing` | `--spacing(4)` (16px) | Card internal padding |
| `--card-spacing` (sm) | `--spacing(3)` (12px) | Small card variant |
| `gap-1` | 4px | Tight icon+text groupings |
| `gap-1.5` | 6px | Button icon gaps, list items |
| `gap-2` | 8px | Common section gaps |
| `gap-3` | 12px | Dialog content gaps |
| `gap-4` | 16px | Card body gaps |
| `p-1.5` | 6px | Table list padding |
| `p-2` | 8px | Compact padding |
| `p-3` | 12px | Standard panel padding |
| `p-4` | 16px | Dialog/card padding |
| `px-2.5` | 10px | Input horizontal padding |
| `py-1.5` | 6px | Button vertical padding |

---

## Components

### Button

Defined in `src/components/ui/button.tsx` using `@base-ui/react/button` + `cva`.

**Variants**

| Variant | Style |
|---------|-------|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/80` |
| `outline` | `border-border bg-background hover:bg-muted hover:text-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `ghost` | `hover:bg-muted hover:text-foreground` |
| `destructive` | `bg-destructive/10 text-destructive hover:bg-destructive/20` |
| `link` | `text-primary underline-offset-4 hover:underline` |

**Sizes**

| Size | Height | Notes |
|------|--------|-------|
| `default` | `h-8` (32px) | Standard |
| `xs` | `h-6` (24px) | `text-xs`, icon `size-3` |
| `sm` | `h-7` (28px) | `text-[0.8rem]`, icon `size-3.5` |
| `lg` | `h-9` (36px) | Same padding as default |
| `icon` | `size-8` (32x32) | Square |
| `icon-xs` | `size-6` (24x24) | Square |
| `icon-sm` | `size-7` (28x28) | Square |
| `icon-lg` | `size-9` (36x36) | Square |

### Badge

Defined in `src/components/ui/badge.tsx`.

**Variants**

| Variant | Style |
|---------|-------|
| `default` | `bg-primary text-primary-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `destructive` | `bg-destructive/10 text-destructive` |
| `outline` | `border-border text-foreground` |
| `ghost` | `hover:bg-muted hover:text-muted-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

**Dimensions**: `h-5` (20px), pill shape (`rounded-4xl`), `px-2`, `text-xs`.

### Input

Defined in `src/components/ui/input.tsx`.

- Height: `h-8` (32px)
- Border: `border-input`
- Background: transparent (light), `dark:bg-input/30`
- Padding: `px-2.5 py-1`
- Text: `text-base` on mobile, `md:text-sm` on desktop
- Focus: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
- Invalid: `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20`

### Textarea

Defined in `src/components/ui/textarea.tsx`.

- Min height: `min-h-16` (64px)
- Same border/focus/invalid patterns as Input
- Field-sizing content enabled

### Select

Defined in `src/components/ui/select.tsx` using `@base-ui/react/select`.

**Trigger Sizes**

| Size | Height |
|------|--------|
| `default` | `h-8` (32px) |
| `sm` | `h-7` (28px) |

**Popup**: `bg-popover`, `shadow-md`, `ring-1 ring-foreground/10`, `rounded-lg`.

### Dialog

Defined in `src/components/ui/dialog.tsx` using `@base-ui/react/dialog`.

- Overlay: `bg-black/10`, `backdrop-blur-xs`, animate fade-in/out
- Content: `rounded-xl`, `bg-popover`, `p-4`, `ring-1 ring-foreground/10`
- Max width: `sm:max-w-sm`
- Close button: absolute top-right, `variant="ghost"`, `size="icon-sm"`, `XIcon`
- Header: flex column, `gap-2`
- Footer: `bg-muted/50`, `border-t`, `rounded-b-xl`, `p-4`, flex row-reverse on desktop
- Title: `font-heading text-base leading-none font-medium`
- Description: `text-sm text-muted-foreground`

#### Fixed-Size Dialog Pattern

For dialogs with tabbed content that must not resize with content (e.g., WidgetConfigEditor):

- **Dimensions**: Fixed `w-[680px] h-[560px]` — no `max-w` / `max-h`, no content-driven sizing
- **Layout**: `flex flex-col` on DialogContent
  - `DialogHeader` / `DialogFooter`: `shrink-0` (pinned top/bottom)
  - `Tabs`: `flex flex-col flex-1 min-h-0` (fills remaining space)
  - `TabsContent`: `flex-1 min-h-0 overflow-y-auto` (scrollable tab body)
- **Inner padding**: Tab content uses `pt-3` for breathing room
- **Never** use `max-h-[Nvh]` or `max-w-[Npx]` — fixed size prevents layout shift when switching tabs

### Tabs

Defined in `src/components/ui/tabs.tsx` using `@base-ui/react/tabs`.

**List Variants**

| Variant | Style |
|---------|-------|
| `default` | `bg-muted`, `rounded-lg`, `p-[3px]` |
| `line` | `bg-transparent`, `gap-1` |

**Trigger**

- Default inactive: `text-foreground/60`
- Default active: `bg-background text-foreground shadow-sm`
- Dark active: `dark:data-active:border-input dark:data-active:bg-input/30`
- Line variant active indicator: `after:bg-foreground`, horizontal bottom bar or vertical right bar
- Focus: `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`

### Card

Defined in `src/components/ui/card.tsx`.

- Container: `rounded-xl`, `bg-card`, `ring-1 ring-foreground/10`
- Spacing variable: `--card-spacing: --spacing(4)` (16px)
- Small variant: `--card-spacing: --spacing(3)` (12px)
- Header: grid with `has-data-[slot=card-action]:grid-cols-[1fr_auto]`
- Footer: `bg-muted/50`, `border-t`, `rounded-b-xl`
- Title: `font-heading text-base leading-snug font-medium`
- Description: `text-sm text-muted-foreground`

### Tooltip

Defined in `src/components/ui/tooltip.tsx`.

- Background: `bg-foreground` (inverted)
- Text: `text-background` (inverted)
- Padding: `px-3 py-1.5`
- Border radius: `rounded-md`
- Arrow: `bg-foreground fill-foreground`, sized `size-2.5`
- Max width: `max-w-xs`
- Delay: 0ms default

### Switch

Defined in `src/components/ui/switch.tsx`.

| Size | Height | Width | Thumb |
|------|--------|-------|-------|
| `default` | `h-[18.4px]` | `w-[32px]` | `size-4` |
| `sm` | `h-[14px]` | `w-[24px]` | `size-3` |

- Checked: `bg-primary`
- Unchecked: `bg-input`
- Thumb: `bg-background`

### ScrollArea

Defined in `src/components/ui/scroll-area.tsx`.

- Scrollbar width: `w-2.5` (10px)
- Thumb: `rounded-full bg-border`
- Orientation: vertical default, horizontal supported

### Skeleton

Defined in `src/components/ui/skeleton.tsx`.

- `animate-pulse rounded-md bg-muted`

### Separator

Defined in `src/components/ui/separator.tsx`.

- Horizontal: `h-px w-full`
- Vertical: `w-px self-stretch`
- Color: `bg-border`

---

## Iconography

- **Library**: `lucide-react` ^1.17.0
- **Default size**: `size-4` (16px)
- **Small size**: `size-3` (12px) — used in xs/sm buttons and badges
- **Medium size**: `size-3.5` (14px)

### Common Icons

| Icon | Usage |
|------|-------|
| `XIcon` | Dialog close |
| `ChevronDownIcon` | Select trigger, scroll buttons |
| `ChevronUpIcon` | Select scroll up |
| `CheckIcon` | Select item indicator |
| `LayoutDashboard` | Dashboard widget actions |

---

## Patterns

### Empty States

- Text: `text-muted-foreground`, centered
- Examples: "No tables found", "Select a table from the sidebar"

### Loading States

- `Skeleton` with `animate-pulse bg-muted`
- Used in sidebar table list (8 skeleton rows)
- Agent chat: "Thinking" with `SnakeSpinner` animation

### Error States

- Text: `text-destructive`
- Used in sidebar connection errors, query errors

### Agent Chat Messages

- **User**: `bg-primary/10 text-foreground rounded-lg px-3 py-1.5 max-w-[85%]`, right-aligned
- **Assistant**: left-aligned, markdown rendered with `MD_CLASS` styles
- **Animation**: `animate-fade-slide-in` (0.25s ease-out, fade + slide up 8px)

### Focus Rings

All interactive elements use the same focus pattern:

```
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
```

This creates a 3px ring at 50% opacity around the `--ring` color, with a visible border.

### Invalid States

```
aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20
dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40
```

---

## Accessibility

- **Focus management**: `focus-visible` rings on all interactive elements. No focus rings on mouse clicks.
- **ARIA**: `aria-invalid` for form validation, `aria-expanded` for button states, `aria-label` for icon-only buttons.
- **Screen readers**: `sr-only` text for close buttons and icon-only actions.
- **Contrast**: OKLCH values chosen for WCAG 2.1 AA compliance. Primary blue (`--primary`) on white passes for UI components.
- **Keyboard**: All shadcn/Base UI primitives support full keyboard navigation (Tab, Enter, Escape, arrow keys).
- **Reduced motion**: Animation durations are short (100ms for dialogs, 250ms for fade-slide). No `prefers-reduced-motion` overrides currently defined.

---

## i18n

- **Languages**: `zh` (default) / `en`
- **Storage**: `localStorage` key `lang`
- **Hook**: `useLang()` from `src/components/lang-provider.tsx`
- **Dictionary**: `src/lib/i18n.ts`
- **Pattern**: `_t("key.subkey")` throughout components

### Key UI Labels

| Key | Chinese | English |
|-----|---------|---------|
| `tab.grid` | 网格 | Grid |
| `tab.pivot` | 透视 | Pivot |
| `tab.dashboard` | 仪表盘 | Dashboard |
| `tab.schema` | 结构 | Schema |
| `tab.sql` | SQL | SQL |
| `tab.agent` | 智能 | Agent |
| `sidebar.tables` | 表 | Tables |
| `agent.placeholder` | 提问数据问题... | Ask a question about your data... |
| `sql.run` | 运行 | Run |
| `pivot.rows` | 行维度 | Row Dimensions |
| `pivot.columns` | 列维度 | Column Dimensions |
| `pivot.indicators` | 指标 | Indicators |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.5rem` (8px) | Global default |
| `rounded-md` | 6px | Tooltip, menu items, small elements |
| `rounded-lg` | 8px | Buttons, inputs, selects, tabs list |
| `rounded-xl` | 12px | Cards, dialogs, popups |
| `rounded-4xl` | Pill | Badges |
| `rounded-full` | 9999px | Switches, avatars |

---

## Shadows

The design avoids heavy drop shadows. Instead it uses:

- **Ring borders**: `ring-1 ring-foreground/10` on cards, dialogs, popovers, and select popups
- **Subtle shadow**: `shadow-md` on select popup only
- **Overlay backdrop**: `bg-black/10` with `backdrop-blur-xs` for dialog overlays

---

## Animation

### Custom Keyframes

```css
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Applied via `.animate-fade-slide-in` (0.25s ease-out) for agent chat messages.

### Tailwind Animations

- `animate-in` / `animate-out`: used in dialogs, select, tooltip
- `fade-in-0` / `fade-out-0`: opacity transitions
- `zoom-in-95` / `zoom-out-95`: scale transitions for popups
- `animate-pulse`: skeleton loading

---

## File References

- Colors & theme: `src/app/globals.css`
- Theme provider: `src/components/theme-provider.tsx`
- Utility: `src/lib/utils.ts` (`cn` = `clsx` + `tailwind-merge`)
- i18n: `src/lib/i18n.ts` + `src/components/lang-provider.tsx`
- UI components: `src/components/ui/*.tsx`
- Layout: `src/app/page.tsx`
- Sidebar: `src/components/sidebar.tsx`
