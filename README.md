# Tactiq user app

The app a Tactiq user opens to connect the ring, calibrate it, learn the commands,
customise shortcuts, practise gestures, review activity and manage settings.

Tactiq is an assistive smart-ring concept for blind and low-vision smartphone users.
A deliberate squeeze of the ring opens a short command window. The thumb touches one
of eight contact points on the same hand. The phone would carry out the mapped command
through VoiceOver or TalkBack, and a haptic pattern would confirm it.

## What is real and what is not

- **No finished wearable ring exists.** A bench prototype firmware and a simulation
  pipeline exist in the separate research repository. Nothing has been validated on a
  worn device, and no participant data exists.
- **The app is fully usable in Demo Mode.** A simulated ring runs the same squeeze,
  window, tap and hold rules as the bench firmware. Every result it produces is labelled
  **Simulated**.
- **Thresholds are labelled Design target.** For example, at least 95% per-contact
  accuracy and at most one false activation per hour. They were fixed before testing and
  are not results.
- **The emergency command never contacts anyone.** Completing the five-second hold shows
  "Simulation only — no emergency message was sent."
- **Battery is never shown as a number.** The bench firmware sends a fixed placeholder,
  not a reading.
- **Bluetooth values come from the research repository.** The device name and the
  Nordic UART Service UUIDs match `docs/PROTOCOL.md` there. A bench ring connected over
  Web Bluetooth produces records labelled **Measured (bench prototype)**.

## Command map

| Contact point | Touch | Command | Type |
| --- | --- | --- | --- |
| Index fingertip | Brief tap | Confirm | Fixed |
| Index finger base | Brief tap | Dismiss / Back | Fixed |
| Middle fingertip | Brief tap | Undo | Fixed |
| Middle finger base | Brief tap | Next | Fixed |
| Ring fingertip | Brief tap | Read / Repeat | Fixed |
| Ring finger base | Brief tap | Previous | Fixed |
| Pinky fingertip | Brief tap | Shortcut 1 | Customisable |
| Pinky finger base | Brief tap | Shortcut 2 | Customisable |
| Pinky fingertip | Hold 5 seconds | Emergency | Fixed, never remappable |

A tap lasts at most 500 ms. A press longer than a tap but shorter than the emergency hold
is dropped, never guessed. The command window lasts 3 s, as set by the bench firmware.
Longer interaction time extends it to 6 s in Demo Mode only.

## Run it locally

Requires Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:5187. The product homepage opens first: **Get started** creates a
local profile, **Try the demo** opens the app as a guest. No backend is needed.

### Checks

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript, strict
npm test            # Vitest unit and component tests
npm run build       # Type-check and production build to dist/
```

Browser and accessibility tests use Playwright with Chromium, at 1440 px desktop and
375 px mobile:

```bash
npm run test:e2e:install   # once: downloads Chromium
npm run test:e2e           # all end-to-end specs, starts a dev server on port 5188
npm run test:a11y          # axe accessibility scans only
```

### Optional real accounts

Without configuration, accounts run in Demo Mode. Profiles live in this browser, and no
password is stored or checked; the sign-in screen says so. To use real email and password
accounts, create a Supabase project, copy `.env.example` to `.env`, fill in
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and restart the dev server.

### Connecting a bench ring

Choose **Bluetooth ring (bench prototype)** on the Connect screen. Web Bluetooth needs
Chrome or Edge on desktop or Android, over https or localhost. The ring must be flashed
with `firmware/tactiq_ring_ble` from the research repository. The browser asks for
Bluetooth permission only after you choose **Connect a ring**.

## Screens

| Route | Purpose |
| --- | --- |
| `/` | Public product homepage: what Tactiq is, the command map, how it would work, and what is not built |
| `/demo` | The whole app as a guest, with no account. Every dashboard screen has a `/demo` address |
| `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` | Accounts (Demo Mode or Supabase) |
| `/onboarding` | Four-step setup: which hand, a few preferences, your first command, you are ready |
| `/dashboard` | Home: next step, ring status, training, calibration, commands, recent activity |
| `/dashboard/connect` | Demo Mode or Bluetooth; every connection state, reconnect and forget |
| `/dashboard/calibrate` | Voice-guided calibration of all eight points, three taps each |
| `/dashboard/train` and `/dashboard/train/:lessonId` | Five lessons, from the squeeze to the emergency hold |
| `/dashboard/simulator` | Guided and free practice with a hand view and a list view |
| `/dashboard/commands` | The command map, and editing the two shortcuts |
| `/dashboard/history` | Filters, performance by command, recent attempts, export and clear |
| `/dashboard/settings` | Appearance, feedback, timing, hand, device, calibration, privacy, account, about |
| `/dashboard/help` | Getting started, practising, accessibility, troubleshooting, limitations |

Navigation is grouped rather than flat: **Home**, **Practice** (Train, Simulator,
Commands), **Device** (Connect, Calibrate), **Activity** and **Settings**, with **Help**
always reachable from the top bar. The sidebar shows the groups expanded; below the `lg`
breakpoint the five parents become a bottom bar and their children are reached from the
parent's own page.

The shell states the mode once, next to the pill naming it — "Simulated ring. Nothing in
the app is a hardware measurement." — instead of repeating a disclaimer inside every
card, which screen reader users were hearing on every page until they stopped hearing it
at all.

## Architecture

```
src/
  domain/        Typed product facts: contact points, commands, timing, evidence labels,
                 Bluetooth protocol, lessons, onboarding steps, and the data models
  services/      Infrastructure behind interfaces, so screens never touch storage or Bluetooth
    storage/       StorageAdapter (localStorage, or in-memory for tests), and the per-profile
                   view that puts one person's records under 'tactiq.u.<account>.'
    preferences/   Theme, text size, contrast, motion, feedback, timing, hand, onboarding
    auth/          AuthService: LocalDemoAuthService, or SupabaseAuthService when configured
    device/        DeviceAdapter: MockDeviceAdapter (the simulated ring, RingStateMachine)
                   and WebBluetoothDeviceAdapter (Nordic UART, bench firmware line protocol)
    history/       Gesture events, filters, summaries, CSV and JSON export
    calibration/   Calibration profile and coverage
    training/      Lesson progress
    commands/      Shortcut mapping (only Shortcut 1 and 2 can change)
    feedback/      Live-region announcements, optional speech and vibration
    demo/          Seeded, labelled sample history for Demo Mode
  components/    Accessible building blocks: buttons, fields, dialogs, tables, evidence labels,
                 and the line-drawn HandMap with its ContactList alternative
  features/      One folder per screen, plus practice/, the shared ring interaction core
                 used by the simulator, lessons, calibration and onboarding
  app/           Router, route guards, app shell, navigation, focus management
    supabase/      Account-scoped mirror: row mappers and the sync engine. Dormant unless
                   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
  design-system/ Deep-teal tokens with dark and both high-contrast themes, and self-hosted Inter
```

Key decisions:

- **One event stream for simulated and real rings.** The mock adapter emits the same gate,
  token and reject events a bench ring sends. Practice screens therefore work unchanged
  when hardware replaces the simulation.
- **Truthfulness lives in data, not just copy.** Every gesture event carries `evidence`
  (`simulated` or `measured`) and a `seeded` flag. The battery model cannot hold a number
  from the stub firmware. The shortcut service rejects any attempt to remap a fixed
  command.
- **No gesture-only interaction.** Every contact point is a real button that works with
  pointer, touch and keyboard, and the list view offers the same commands. The five-second
  hold has a toggle button for screen-reader and switch users.
- **Local-first, per profile.** Preferences, calibration, lessons, shortcuts and history
  persist in `localStorage` under the `tactiq.` prefix, and everything belonging to a
  person sits under that profile's own prefix, so two profiles in one browser cannot read
  each other's records. Appearance stays device-wide, because a display choice belongs to
  the screen in front of you. Users can export or delete everything in Settings.
- **The database is a mirror, never the source.** Every service reads synchronously, so a
  screen never waits on a round trip before it can draw — which is also why the app works
  with no network at all. See `supabase/migrations/` and `src/services/supabase/`.

## Accessibility

The target is WCAG 2.2 AA. The app provides:

- landmarks, one h1 per page, and focus moved to the page heading on navigation
- a skip link and a visible focus ring
- targets of at least 44 × 44 px
- live-region announcements for connection, calibration and command results
- no information conveyed by colour alone
- reduced motion, via the operating system setting or the in-app setting
- light, dark and high-contrast themes
- three text sizes
- layouts that reflow at 320 px and at 200% zoom

The Playwright suite runs axe on every route in all four themes and checks overflow,
target size and focus visibility.

## Deployment

`netlify.toml` builds with `npm run build`, publishes `dist/`, adds a single-page-app
fallback and sets security headers. Its `Permissions-Policy` allows only Bluetooth.

## Privacy

`docs/privacy-policy.md` is a **draft, not published**, with `[CONFIRM: …]` wherever a
fact has not been established. `docs/privacy-notices.md` holds the short summary and the
in-app collection notices, and `docs/privacy-open-questions.md` lists what has to be
answered — including two questions about Australian law that genuinely need a lawyer —
before any of it goes live.

What the shipped build does, verified against the source rather than assumed: it makes no
network requests of its own, sets no cookies, loads no third-party resources, and asks for
no camera, microphone or location. See `docs/privacy-open-questions.md` for the full list
and how to re-check it.

## Design and performance

- `docs/design-decisions.md` — why the product looks and behaves as it does, including the
  colour decision with its measured contrast ratios.
- `docs/performance.md` — measured Core Web Vitals, the method, and what is still slow.
