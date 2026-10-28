# Design decisions

Why the product looks and behaves the way it does. Each entry records what was
chosen, what it was chosen over, and the evidence behind it, so a later change
is made deliberately rather than by taste alone.

## Colour: deep teal, cool white and ink

**Decided 29 October 2026.** Teal over violet, and both over the original
burnt orange.

Three palettes were measured against the same rule: a brand colour must not
compete with the colours that carry meaning, and every pair a user reads must
clear WCAG AA.

| | White on primary | Collides with | Outcome |
| --- | --- | --- | --- |
| Burnt orange `#a63a0a` | 4.03:1 in dark mode | Warning / caution, and the app's own "design target" label | Rejected |
| Violet `#534ab7` | 6.93:1 | Nothing | Runner-up |
| **Teal `#0f766e`** | **5.47:1** | Success green, at a distance | **Chosen** |

The orange was the most characterful of the three and suited the
research-notebook tone, but it failed AA for button labels in dark mode and was
the *same hue* as the design-target evidence label, so the brand and a status
could not be told apart. Violet scored best on the merits and came from the
project's own archived identity. Teal was chosen by the project owner: it reads
as an instrument rather than a brand, which suits an assistive device.

Teal's one weakness is that it sits near success green. Two guards exist:

- Success (`--status-confirmed`) and warning (`--warning`) are separate tokens
  from the brand, and `theme.contrast.test.ts` asserts at least 25° of hue
  separation between the brand and success in every theme. Contrast ratio is
  meaningless between two light mints, so hue is the right measure.
- Colour never carries meaning alone. Evidence labels, status pills and contact
  states always pair their colour with an icon and words.

**Load-bearing values.** White on the light primary is 5.47:1. White on the
bright dark primary would be about 1.5:1, which is why dark primary buttons
carry the deep canvas ink as their label instead. The decorative divider is
1.33:1 and must never be used as a form-control boundary — anything a user has
to find and operate uses `--border-strong`.

Every pair in all four themes (light, dark, and both high-contrast variants) is
recomputed from `theme.css` by `theme.contrast.test.ts`, so a future repaint
cannot quietly drop below the line.

## Typography: self-hosted Inter, no serif

Inter is served from this repository (latin and latin-ext, weights 400–700,
`font-display: swap`, SIL Open Font License in `src/design-system/fonts/`).

Before this, the remote font import sat *after* Tailwind's rules in the
stylesheet, which is invalid CSS, so it was dropped from every production
bundle: the app shipped three font-family names with nothing behind them and
rendered in system fallbacks. Self-hosting also means no third-party request,
which is what lets the privacy copy say plainly that nothing is contacted.

There is no serif. The wordmark is Inter with tightened tracking. Monospace is
a system stack used only for measurements, identifiers and small labels.

## The hand map stays an SVG with real buttons

The eight contact points are real HTML `button` elements positioned over a
precise SVG drawing, never a canvas or an image map. Each button's accessible
name is the full phrase — "Index fingertip — Confirm" — so the IT/IB/MT
abbreviations are decoration, never the only way to operate the app. A list
view carries exactly the same commands and the same press semantics.

The public product drawing and the in-app map share one geometry source
(`src/components/hand/geometry.ts`), so the marketing page and the practice
surface can never disagree about where a point is.

Interactive points keep a 44×44 CSS px minimum. Below the width where
neighbouring points would overlap, the surface shows the list instead and says
why — a tap meant for Previous must never land on Shortcut 2.

## One mode indicator instead of repeated disclaimers

Screen-reader users were hearing the same "this is simulated" assurance on
every page and inside most cards. The app now states the mode once, in the
shell, and attaches evidence labels to the data that needs them. The full
limitations stay available in Help and About, and the emergency simulation
notice still appears at the moment a hold completes, where it matters.

## Design reference map

Patterns borrowed, and whether code or only the idea was reused. No component
library was installed; the existing tested components were restyled.

| Reference | What was taken | Where it landed | Code reused |
| --- | --- | --- | --- |
| [Oura app guide](https://support.ouraring.com/hc/en-us/articles/360058599753-How-to-Use-the-Oura-App) | A companion app organised around what is useful now, with device detail out of the main task | Dashboard Home: one next action, own recent practice, compact device link | No — hierarchy only |
| [shadcn Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) | Compact grouped navigation with a clear active item, labels always visible | `src/app/shell/Sidebar.tsx` | No |
| [shadcn Tabs](https://ui.shadcn.com/docs/components/radix/tabs) | Restrained line-style switching between same-page panels | Practice panels; radio semantics kept for Guided/Free | No |
| [shadcn Empty](https://ui.shadcn.com/docs/components/base/empty) | Quiet empty state: icon, useful explanation, one action | History "No activity yet", with samples as a separate action | No |
| [shadcn Native Select](https://ui.shadcn.com/docs/components/radix/native-select) | Compact labelled shortcut editors with native mobile behaviour | Shortcut editing, replacing two eight-option radio inventories | No |
| [Carbon progress indicator](https://www.carbondesignsystem.com/building-blocks/core/components/progress-indicator/guidelines) | Named completed / current / upcoming steps, and exact counts | First-use steps; calibration counts such as "1 of 24" | No |
| [Carbon notifications](https://www.carbondesignsystem.com/building-blocks/core/components/notification/guidelines) | Feedback beside the action that needs attention, not only a toast | Connect and save states; reuses the existing live announcer | No |
| [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) | Modal behaviour: titled, focus-contained, Escape, focus restored | The existing tested `Dialog`, kept and improved | No |
| [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | Distinct roles for background, component, border, solid action and text | The token scale in `theme.css` | No |
| [Motion accessibility](https://motion.dev/docs/react-accessibility) | Short state transitions that respect reduced motion | CSS transitions at 120–180 ms; no animated timing logic | No |
| [Lucide](https://lucide.dev/guide/) | One consistent outline icon family | Existing `lucide-react` dependency, standardised sizing | Yes — the library |
| [Inter](https://rsms.me/inter/) | Body and control typeface with tabular figures | `src/design-system/fonts/` | Yes — the font files, SIL OFL |
| [Linear design refresh](https://linear.app/now/behind-the-latest-design-refresh) | Calmer separation and predictable action placement | Dashboard density; large text and target sizes kept | No |

Motion explains real state changes only: activating, window open, contact
pressed, command accepted, retry, hold progress. Nothing animates a timing
rule, and no control is delayed behind an animation.
